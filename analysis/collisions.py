"""
TIMS collision data processing script — Hopkins Street Safety Data Story

The TIMS export is three relational tables:
  Crashes.csv  — one row per collision event
  Parties.csv  — one row per party involved (joined on CASE_ID)
  Victims.csv  — one row per victim (joined on CASE_ID + PARTY_NUMBER)

Join strategy (confirmed from TIMS documentation at tims.berkeley.edu/help/SWITRS.php):
  Crashes → Parties:  join on CASE_ID alone
  Parties → Victims:  join on CASE_ID + PARTY_NUMBER (composite key)
  For collision-level flags, aggregate party/victim rows per CASE_ID.

Outputs:
  data/processed/collisions_clean.csv     — collision-level cleaned record
  data/processed/collisions_summary.json  — aggregate statistics
  data/processed/collisions_geo.geojson   — point features (severity + mode)

Run from repo root:
  python analysis/collisions.py

Cite as "Source: TIMS/SWITRS" in all public-facing visualizations.
"""

import sys
import json
from datetime import datetime
from pathlib import Path

import pandas as pd
import geopandas as gpd
from shapely.geometry import Point

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

REPO_ROOT     = Path(__file__).resolve().parent.parent
RAW_DIR       = REPO_ROOT / "data" / "raw" / "tims"
PROCESSED_DIR = REPO_ROOT / "data" / "processed"

OUTPUT_CLEAN_CSV    = PROCESSED_DIR / "collisions_clean.csv"
OUTPUT_SUMMARY_JSON = PROCESSED_DIR / "collisions_summary.json"
OUTPUT_GEO_GEOJSON  = PROCESSED_DIR / "collisions_geo.geojson"

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Bounding box — Hopkins corridor
# ---------------------------------------------------------------------------

BBOX = {
    "lat_min": 37.875,
    "lat_max": 37.892,
    "lon_min": -122.300,
    "lon_max": -122.270,
}

# Named cross-streets to flag in summary
CROSS_STREETS = ["Gilman", "Sacramento", "Monterey", "McGee", "Alameda", "Sutter"]

DAY_OF_WEEK_MAP = {
    0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday",
    4: "Friday", 5: "Saturday", 6: "Sunday",
}


# ---------------------------------------------------------------------------
# STEP 1 — Load and audit all three tables
# ---------------------------------------------------------------------------

def load_tims_tables():
    """
    Load Crashes.csv, Parties.csv, Victims.csv from data/raw/tims/.
    Print a full audit of each table before returning.
    """
    if not RAW_DIR.exists():
        print(f"[ERROR] {RAW_DIR} does not exist.")
        sys.exit(1)

    expected = {"Crashes.csv": None, "Parties.csv": None, "Victims.csv": None}
    for fname in expected:
        fpath = RAW_DIR / fname
        if not fpath.exists():
            # Try case-insensitive fallback
            matches = list(RAW_DIR.glob(f"*{fname.split('.')[0]}*.csv"))
            if matches:
                fpath = matches[0]
                print(f"  [INFO] Found {fname} as {fpath.name}")
            else:
                print(f"[ERROR] Could not find {fname} in {RAW_DIR}")
                sys.exit(1)
        expected[fname] = fpath

    print("\n" + "=" * 70)
    print("STEP 1 — LOAD AND AUDIT TIMS TABLES")
    print("=" * 70)

    tables = {}
    audit_fields = {
        "Crashes.csv": ["COLLISION_SEVERITY", "TYPE_OF_COLLISION", "ROAD_SURFACE", "LIGHTING"],
        "Parties.csv": ["PARTY_TYPE", "AT_FAULT", "STWD_VEHICLE_TYPE"],
        "Victims.csv": ["VICTIM_ROLE", "VICTIM_DEGREE_OF_INJURY"],
    }

    for fname, fpath in expected.items():
        df = pd.read_csv(fpath, low_memory=False)
        print(f"\n{'─'*60}")
        print(f"TABLE: {fname}  ({len(df):,} rows, {len(df.columns)} columns)")
        print(f"  Columns: {list(df.columns)}")
        print(f"  Sample (3 rows):")
        print(df.head(3).to_string(index=False))

        for field in audit_fields.get(fname, []):
            if field in df.columns:
                vals = df[field].dropna().unique()
                print(f"  Unique {field}: {sorted(str(v) for v in vals)}")
            else:
                # Try case-insensitive
                match = next((c for c in df.columns if c.upper() == field.upper()), None)
                if match:
                    vals = df[match].dropna().unique()
                    print(f"  Unique {match}: {sorted(str(v) for v in vals)}")
                else:
                    print(f"  [NOT FOUND] {field}")

        tables[fname.split(".")[0].lower()] = df

    return tables["crashes"], tables["parties"], tables["victims"]


# ---------------------------------------------------------------------------
# STEP 2 — Filter crashes to corridor bounding box
# ---------------------------------------------------------------------------

def filter_crashes_to_corridor(crashes):
    """
    Filter Crashes to the Hopkins corridor bounding box.
    Returns filtered DataFrame and the lat/lon column names used.
    """
    # TIMS exports use LATITUDE/LONGITUDE or POINT_Y/POINT_X
    lat_candidates = ["POINT_Y", "LATITUDE", "LAT", "point_y", "latitude"]
    lon_candidates = ["POINT_X", "LONGITUDE", "LON", "LONG", "point_x", "longitude"]

    lat_col = next((c for c in lat_candidates if c in crashes.columns), None)
    lon_col = next((c for c in lon_candidates if c in crashes.columns), None)

    if lat_col is None or lon_col is None:
        print(f"[ERROR] Could not find lat/lon columns.")
        print(f"  Available: {list(crashes.columns)}")
        sys.exit(1)

    print(f"\nUsing coordinate columns: lat={lat_col!r}, lon={lon_col!r}")

    crashes[lat_col] = pd.to_numeric(crashes[lat_col], errors="coerce")
    crashes[lon_col] = pd.to_numeric(crashes[lon_col], errors="coerce")

    total = len(crashes)
    mask = (
        crashes[lat_col].between(BBOX["lat_min"], BBOX["lat_max"]) &
        crashes[lon_col].between(BBOX["lon_min"], BBOX["lon_max"])
    )
    filtered = crashes[mask].copy()
    filtered["_lat"] = filtered[lat_col]
    filtered["_lon"] = filtered[lon_col]

    missing_coords = crashes[lat_col].isna().sum() + crashes[lon_col].isna().sum()
    print(f"Bounding box filter: {total:,} total → {len(filtered):,} in corridor")
    print(f"  ({missing_coords} rows had missing coordinates)")

    return filtered


# ---------------------------------------------------------------------------
# STEP 3 — Build collision-level mode flags from parties + victims
# ---------------------------------------------------------------------------

def build_collision_flags(corridor_case_ids, parties, victims):
    """
    For each CASE_ID in the corridor, determine whether the collision involved
    a pedestrian or cyclist — based on any party row or any victim row.

    Join logic per TIMS docs:
      Parties → Crashes:  CASE_ID
      Victims → Parties:  CASE_ID + PARTY_NUMBER

    Returns a DataFrame indexed by CASE_ID with boolean flag columns.
    """
    ids = set(corridor_case_ids)

    # Filter to corridor case IDs only
    parties_corr = parties[parties["CASE_ID"].isin(ids)].copy()
    victims_corr = victims[victims["CASE_ID"].isin(ids)].copy()

    # Check for orphaned records
    party_ids  = set(parties_corr["CASE_ID"].unique())
    victim_ids = set(victims_corr["CASE_ID"].unique())
    orphaned_parties = party_ids - ids
    orphaned_victims = victim_ids - ids
    if orphaned_parties:
        print(f"  [INFO] {len(orphaned_parties)} CASE_IDs in Parties not in filtered Crashes")
    if orphaned_victims:
        print(f"  [INFO] {len(orphaned_victims)} CASE_IDs in Victims not in filtered Crashes")

    # Party-level flags — PARTY_TYPE values (confirm from audit output)
    # SWITRS: "Pedestrian" and "Bicycle" are common text values; numeric codes vary
    def _is_ped(val):
        v = str(val).strip().upper()
        return v in ("PEDESTRIAN", "2", "B")

    def _is_bike(val):
        v = str(val).strip().upper()
        return v in ("BICYCLE", "BICYCLIST", "4", "C")

    party_type_col = next(
        (c for c in parties_corr.columns if c.upper() == "PARTY_TYPE"), None
    )

    party_flags = pd.DataFrame({"CASE_ID": list(ids)})
    party_flags["party_has_pedestrian"] = False
    party_flags["party_has_cyclist"]    = False

    if party_type_col:
        ped_cases  = set(parties_corr[parties_corr[party_type_col].apply(_is_ped)]["CASE_ID"])
        bike_cases = set(parties_corr[parties_corr[party_type_col].apply(_is_bike)]["CASE_ID"])
        party_flags["party_has_pedestrian"] = party_flags["CASE_ID"].isin(ped_cases)
        party_flags["party_has_cyclist"]    = party_flags["CASE_ID"].isin(bike_cases)

    # Victim-level flags — VICTIM_ROLE
    victim_role_col = next(
        (c for c in victims_corr.columns if c.upper() == "VICTIM_ROLE"), None
    )

    victim_flags = pd.DataFrame({"CASE_ID": list(ids)})
    victim_flags["victim_has_pedestrian"] = False
    victim_flags["victim_has_cyclist"]    = False

    if victim_role_col:
        vped_cases  = set(victims_corr[victims_corr[victim_role_col].apply(_is_ped)]["CASE_ID"])
        vbike_cases = set(victims_corr[victims_corr[victim_role_col].apply(_is_bike)]["CASE_ID"])
        victim_flags["victim_has_pedestrian"] = victim_flags["CASE_ID"].isin(vped_cases)
        victim_flags["victim_has_cyclist"]    = victim_flags["CASE_ID"].isin(vbike_cases)

    flags = party_flags.merge(victim_flags, on="CASE_ID", how="left")
    flags["involves_pedestrian"]    = flags["party_has_pedestrian"] | flags["victim_has_pedestrian"]
    flags["involves_cyclist"]       = flags["party_has_cyclist"]    | flags["victim_has_cyclist"]
    flags["involves_ped_or_cyclist"] = flags["involves_pedestrian"] | flags["involves_cyclist"]

    print(f"  Collisions involving pedestrian: {flags['involves_pedestrian'].sum()}")
    print(f"  Collisions involving cyclist:    {flags['involves_cyclist'].sum()}")
    print(f"  Either ped or cyclist:           {flags['involves_ped_or_cyclist'].sum()}")

    return flags[["CASE_ID", "involves_pedestrian", "involves_cyclist", "involves_ped_or_cyclist"]]


# ---------------------------------------------------------------------------
# STEP 4 — Standardize Crashes fields + merge flags
# ---------------------------------------------------------------------------

SEVERITY_MAP = {
    "1": "fatal", "2": "severe_injury", "3": "other_injury",
    "4": "property_damage_only", "0": "property_damage_only",
    1: "fatal", 2: "severe_injury", 3: "other_injury",
    4: "property_damage_only", 0: "property_damage_only",
    "Fatal": "fatal", "FATAL": "fatal",
    "Severe Injury": "severe_injury", "SEVERE INJURY": "severe_injury",
    "Other Injury": "other_injury", "OTHER INJURY": "other_injury",
    "Property Damage Only": "property_damage_only", "PDO": "property_damage_only",
}


def standardize_and_merge(crashes, flags):
    """
    Standardize date/time/severity fields on the corridor Crashes DataFrame,
    then merge in the collision-level mode flags.
    """
    df = crashes.copy()

    # collision_date
    date_col = next(
        (c for c in df.columns if c.upper() in ("COLLISION_DATE", "ACCIDENT_DATE")), None
    )
    if date_col:
        df["collision_date"] = pd.to_datetime(df[date_col], errors="coerce")
    else:
        df["collision_date"] = pd.NaT
        print("  [WARNING] No collision date column found")

    df["year"]  = df["collision_date"].dt.year
    df["month"] = df["collision_date"].dt.month

    dow_col = next((c for c in df.columns if c.upper() == "DAY_OF_WEEK"), None)
    df["day_of_week"] = (
        df[dow_col] if dow_col
        else df["collision_date"].dt.dayofweek.map(DAY_OF_WEEK_MAP)
    )

    time_col = next((c for c in df.columns if c.upper() == "COLLISION_TIME"), None)
    if time_col:
        df["hour"] = pd.to_numeric(df[time_col], errors="coerce").floordiv(100).astype("Int64")
    else:
        df["hour"] = pd.NA

    # severity
    sev_col = next((c for c in df.columns if c.upper() == "COLLISION_SEVERITY"), None)
    if sev_col:
        df["severity"] = df[sev_col].map(SEVERITY_MAP).fillna("unknown")
        unmapped = df[df["severity"] == "unknown"][sev_col].dropna().unique()
        if len(unmapped):
            print(f"  [WARNING] Unmapped COLLISION_SEVERITY values: {unmapped}")
            print(f"    → These will appear as 'unknown' in output")
    else:
        df["severity"] = "unknown"
        print("  [WARNING] COLLISION_SEVERITY column not found")

    # cross street
    cs_col = next(
        (c for c in df.columns if c.upper() in ("SECONDARY_RD", "CROSS_STREET", "CROSS_ST")), None
    )
    if cs_col:
        df["cross_street_raw"] = df[cs_col].astype(str)
        def _named_cross_street(val):
            v = val.upper()
            for cs in CROSS_STREETS:
                if cs.upper() in v:
                    return cs
            return None
        df["named_cross_street"] = df["cross_street_raw"].apply(_named_cross_street)
    else:
        df["cross_street_raw"]  = None
        df["named_cross_street"] = None

    # merge flags
    df = df.merge(flags, on="CASE_ID", how="left")
    df["involves_ped_or_cyclist"] = df["involves_ped_or_cyclist"].fillna(False)

    print(f"\n  collision_date range: {df['collision_date'].min()} → {df['collision_date'].max()}")
    print(f"  Severity distribution:\n{df['severity'].value_counts().to_string()}")

    return df


# ---------------------------------------------------------------------------
# STEP 5 — Save outputs
# ---------------------------------------------------------------------------

def save_clean_csv(df):
    df.to_csv(OUTPUT_CLEAN_CSV, index=False)
    print(f"\n✓ Clean CSV: {len(df):,} rows → {OUTPUT_CLEAN_CSV.relative_to(REPO_ROOT)}")


def build_summary_json(df):
    total = len(df)
    date_min = str(df["collision_date"].min().date()) if not df["collision_date"].isna().all() else "unknown"
    date_max = str(df["collision_date"].max().date()) if not df["collision_date"].isna().all() else "unknown"

    by_year = {}
    if "year" in df.columns:
        for yr, grp in df.groupby("year"):
            if pd.notna(yr):
                sev = grp["severity"].value_counts().to_dict()
                by_year[int(yr)] = {
                    "fatal":                int(sev.get("fatal", 0)),
                    "severe_injury":        int(sev.get("severe_injury", 0)),
                    "other_injury":         int(sev.get("other_injury", 0)),
                    "property_damage_only": int(sev.get("property_damage_only", 0)),
                }

    by_severity = {k: int(v) for k, v in df["severity"].value_counts().items()}

    ped_total  = int(df.get("involves_pedestrian",    pd.Series(False)).sum())
    bike_total = int(df.get("involves_cyclist",        pd.Series(False)).sum())
    pc_total   = int(df.get("involves_ped_or_cyclist", pd.Series(False)).sum())
    pc_pct     = round(pc_total / total * 100, 1) if total else 0

    by_cross_street = {}
    if "named_cross_street" in df.columns:
        cs_counts = df[df["named_cross_street"].notna()]["named_cross_street"].value_counts()
        by_cross_street = {k: int(v) for k, v in cs_counts.items()}

    fatal_count = int((df["severity"] == "fatal").sum())

    summary = {
        "_metadata": {
            "source": "TIMS/SWITRS — tims.berkeley.edu",
            "attribution": "Source: TIMS/SWITRS. Must be cited in all public-facing visualizations.",
            "generated": datetime.utcnow().isoformat() + "Z",
            "processing_script": "analysis/collisions.py",
            "join_method": (
                "Three relational tables joined: Crashes + Parties on CASE_ID; "
                "Parties + Victims on CASE_ID + PARTY_NUMBER. "
                "Mode flags aggregated to collision level before output."
            ),
            "bounding_box": BBOX,
            "date_range": {"min": date_min, "max": date_max},
            "total_records": total,
            "note": (
                "Full time series retained — no minimum year filter. "
                "The 2015–2018 period cited by Bike East Bay and city staff is highlighted "
                "in the UI but the full dataset is preserved for context."
            ),
        },
        "total_collisions": total,
        "fatal_collisions": fatal_count,
        "by_year": by_year,
        "by_severity": by_severity,
        "ped_cyclist_involvement": {
            "total": pc_total,
            "pct_of_all_collisions": pc_pct,
            "pedestrian_involved": ped_total,
            "bicyclist_involved": bike_total,
            "note": (
                "A collision is counted if a pedestrian or cyclist was any party "
                "(Parties table, PARTY_TYPE) or any victim (Victims table, VICTIM_ROLE)."
            ),
        },
        "by_cross_street": by_cross_street,
    }

    with open(OUTPUT_SUMMARY_JSON, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"✓ Summary JSON → {OUTPUT_SUMMARY_JSON.relative_to(REPO_ROOT)}")
    return summary


def build_geojson(df):
    df_geo = df[df["_lat"].notna() & df["_lon"].notna()].copy()
    skipped = len(df) - len(df_geo)
    if skipped:
        print(f"  [INFO] {skipped} record(s) skipped — missing coordinates")

    geometry = [Point(row["_lon"], row["_lat"]) for _, row in df_geo.iterrows()]
    gdf = gpd.GeoDataFrame(df_geo, geometry=geometry, crs="EPSG:4326")

    props = ["collision_date", "year", "severity",
             "involves_pedestrian", "involves_cyclist", "involves_ped_or_cyclist",
             "named_cross_street", "hour"]
    props = [p for p in props if p in gdf.columns]
    gdf_out = gdf[props + ["geometry"]].copy()

    if "collision_date" in gdf_out.columns:
        gdf_out["collision_date"] = gdf_out["collision_date"].dt.strftime("%Y-%m-%d")

    gdf_out.to_file(OUTPUT_GEO_GEOJSON, driver="GeoJSON")
    print(f"✓ GeoJSON: {len(gdf_out):,} features → {OUTPUT_GEO_GEOJSON.relative_to(REPO_ROOT)}")


# ---------------------------------------------------------------------------
# STEP 6 — Print final summary
# ---------------------------------------------------------------------------

def print_summary(df, summary, crashes, parties, victims):
    print("\n" + "=" * 70)
    print("COLLISION DATA SUMMARY — Hopkins Corridor (TIMS/SWITRS)")
    print("=" * 70)
    meta = summary["_metadata"]
    print(f"  Total records:    {summary['total_collisions']:,}")
    print(f"  Date range:       {meta['date_range']['min']} → {meta['date_range']['max']}")
    print(f"  Fatal:            {summary['fatal_collisions']}")

    print(f"\n  By severity:")
    for sev, count in sorted(summary["by_severity"].items()):
        pct = round(count / summary["total_collisions"] * 100, 1) if summary["total_collisions"] else 0
        print(f"    {sev:30s} {count:4d}  ({pct}%)")

    pi = summary["ped_cyclist_involvement"]
    print(f"\n  Ped/cyclist involved: {pi['total']} ({pi['pct_of_all_collisions']}%)")
    print(f"    Pedestrian:  {pi['pedestrian_involved']}")
    print(f"    Bicyclist:   {pi['bicyclist_involved']}")

    if summary["by_cross_street"]:
        print(f"\n  By named cross-street:")
        for cs, count in sorted(summary["by_cross_street"].items(), key=lambda x: -x[1]):
            print(f"    {cs:20s} {count}")

    # Orphaned record check
    corridor_ids = set(df["CASE_ID"].unique())
    party_ids    = set(parties["CASE_ID"].unique())
    victim_ids   = set(victims["CASE_ID"].unique())
    orphan_p = party_ids - set(crashes["CASE_ID"].unique())
    orphan_v = victim_ids - set(crashes["CASE_ID"].unique())
    print(f"\n  Orphaned CASE_IDs (in Parties but not Crashes): {len(orphan_p)}")
    print(f"  Orphaned CASE_IDs (in Victims but not Crashes): {len(orphan_v)}")

    missing_coords = df["_lat"].isna().sum()
    print(f"  Collisions missing lat/lon (excluded from GeoJSON): {missing_coords}")

    print(f"\n  Output files:")
    for p in [OUTPUT_CLEAN_CSV, OUTPUT_SUMMARY_JSON, OUTPUT_GEO_GEOJSON]:
        exists = "✓" if p.exists() else "—"
        print(f"    {exists}  {p.relative_to(REPO_ROOT)}")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("Hopkins Street Safety — TIMS Collision Data Processing")
    print(f"Output: {PROCESSED_DIR}")

    # Step 1: load and audit
    crashes, parties, victims = load_tims_tables()

    # Step 2: filter crashes to corridor
    print("\n" + "=" * 70)
    print("STEP 2 — FILTER TO CORRIDOR BOUNDING BOX")
    print("=" * 70)
    crashes_corr = filter_crashes_to_corridor(crashes)

    if len(crashes_corr) == 0:
        print("\n[ERROR] No records remain after bounding box filter.")
        print(f"  Box: lat {BBOX['lat_min']}–{BBOX['lat_max']}, lon {BBOX['lon_min']}–{BBOX['lon_max']}")
        sys.exit(1)

    # Step 3: build mode flags from parties + victims
    print("\n" + "=" * 70)
    print("STEP 3 — BUILD COLLISION-LEVEL MODE FLAGS")
    print("=" * 70)
    flags = build_collision_flags(crashes_corr["CASE_ID"], parties, victims)

    # Step 4: standardize and merge
    print("\n" + "=" * 70)
    print("STEP 4 — STANDARDIZE FIELDS")
    print("=" * 70)
    df = standardize_and_merge(crashes_corr, flags)

    # Step 5: save outputs
    print("\n" + "=" * 70)
    print("STEP 5 — SAVE OUTPUTS")
    print("=" * 70)
    save_clean_csv(df)
    summary = build_summary_json(df)
    build_geojson(df)

    # Step 6: summary
    print_summary(df, summary, crashes, parties, victims)


if __name__ == "__main__":
    main()
