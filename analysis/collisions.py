"""
Prompt 4 — TIMS collision data processing script
Hopkins Street Safety Data Story

Reads a SWITRS/TIMS collision CSV from data/raw/tims/, filters to the
Hopkins corridor bounding box, cleans and standardizes fields, and produces:
  data/processed/collisions_clean.csv     — full cleaned record
  data/processed/collisions_summary.json  — aggregate statistics
  data/processed/collisions_geo.geojson   — point features (severity + mode)

The full time series back to 2010 is preserved to address the opposition's
claim that the 2016–2019 period was an anomaly. No year range filter is applied.

Run from repo root:
  python analysis/collisions.py [path/to/tims_export.csv]

If no path is provided, the script looks for any CSV in data/raw/tims/.

Data from TIMS (tims.berkeley.edu). Cite as "Source: TIMS/SWITRS" in all
public-facing visualizations.
"""

import os
import sys
import json
import glob
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

OUTPUT_CLEAN_CSV      = PROCESSED_DIR / "collisions_clean.csv"
OUTPUT_SUMMARY_JSON   = PROCESSED_DIR / "collisions_summary.json"
OUTPUT_GEO_GEOJSON    = PROCESSED_DIR / "collisions_geo.geojson"

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Bounding box — Hopkins corridor, per prompts.md
# ---------------------------------------------------------------------------

BBOX = {
    "lat_min": 37.877,
    "lat_max": 37.882,
    "lon_min": -122.304,
    "lon_max": -122.272,
}

# ---------------------------------------------------------------------------
# SWITRS field mappings
# See: https://tims.berkeley.edu/help/SWITRS.php
# ---------------------------------------------------------------------------

# COLLISION_SEVERITY codes
SEVERITY_MAP = {
    1: "fatal",
    2: "severe_injury",
    3: "other_injury",
    4: "property_damage",
    0: "property_damage",   # some exports use 0 for PDO
    "1": "fatal",
    "2": "severe_injury",
    "3": "other_injury",
    "4": "property_damage",
    "0": "property_damage",
    # Text variants that may appear in some exports
    "Fatal": "fatal",
    "FATAL": "fatal",
    "Severe Injury": "severe_injury",
    "SEVERE INJURY": "severe_injury",
    "Other Injury": "other_injury",
    "OTHER INJURY": "other_injury",
    "Property Damage Only": "property_damage",
    "PDO": "property_damage",
}

# PARTY_TYPE codes — used to identify pedestrians and cyclists
PARTY_TYPE_MAP = {
    1: "motor_vehicle",
    2: "pedestrian",
    3: "parked_vehicle",
    4: "bicyclist",
    5: "other",
    "1": "motor_vehicle",
    "2": "pedestrian",
    "3": "parked_vehicle",
    "4": "bicyclist",
    "5": "other",
    "A": "motor_vehicle",    # some exports use letter codes
    "B": "pedestrian",
    "C": "bicyclist",
    # Text variants
    "Driver": "motor_vehicle",
    "Pedestrian": "pedestrian",
    "Bicyclist": "bicyclist",
    "Bicycle": "bicyclist",
    "Parked Vehicle": "parked_vehicle",
}

# Named cross-streets to flag in summary (from prompts.md)
CROSS_STREETS = ["Gilman", "Sacramento", "Monterey", "McGee", "Alameda", "Sutter"]

DAY_OF_WEEK_MAP = {0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday",
                   4: "Friday", 5: "Saturday", 6: "Sunday"}


# ---------------------------------------------------------------------------
# 1. Load data
# ---------------------------------------------------------------------------

def load_tims_csv(path=None):
    """
    Load the TIMS collision CSV from data/raw/tims/.
    If path is None, auto-detect any CSV file in the directory.
    """
    if path:
        fpath = Path(path)
    else:
        if not RAW_DIR.exists():
            print(f"[ERROR] Directory does not exist: {RAW_DIR}")
            print("  → Create data/raw/tims/ and place the TIMS export CSV there.")
            sys.exit(1)
        csvs = sorted(RAW_DIR.glob("*.csv"))
        if not csvs:
            print(f"[ERROR] No CSV files found in {RAW_DIR}")
            print("  → Download collision data from tims.berkeley.edu and place the CSV in")
            print("    data/raw/tims/ — use the Hopkins corridor polygon for the query.")
            sys.exit(1)
        fpath = csvs[0]
        if len(csvs) > 1:
            print(f"[WARNING] Multiple CSVs found in {RAW_DIR}; using: {fpath.name}")

    print(f"Loading: {fpath}  ({fpath.stat().st_size/1024:.1f} KB)")
    df = pd.read_csv(fpath, low_memory=False)
    print(f"Loaded {len(df):,} rows, {len(df.columns)} columns")
    print(f"Columns: {list(df.columns)}")
    return df


# ---------------------------------------------------------------------------
# 2. Filter to bounding box
# ---------------------------------------------------------------------------

def filter_to_corridor(df):
    """
    Filter to collisions within the Hopkins corridor bounding box.
    Handles multiple possible coordinate column name formats from TIMS exports.
    """
    # TIMS exports may use any of these column names
    lat_candidates = ["POINT_Y", "LATITUDE", "LAT", "point_y", "latitude"]
    lon_candidates = ["POINT_X", "LONGITUDE", "LON", "LONG", "point_x", "longitude"]

    lat_col = next((c for c in lat_candidates if c in df.columns), None)
    lon_col = next((c for c in lon_candidates if c in df.columns), None)

    if lat_col is None or lon_col is None:
        print(f"[ERROR] Could not find lat/lon columns.")
        print(f"  Looked for lat: {lat_candidates}")
        print(f"  Looked for lon: {lon_candidates}")
        print(f"  Available columns: {list(df.columns)}")
        sys.exit(1)

    print(f"\nUsing coordinate columns: lat={lat_col!r}, lon={lon_col!r}")

    # Convert to numeric, coerce errors to NaN
    df[lat_col] = pd.to_numeric(df[lat_col], errors="coerce")
    df[lon_col] = pd.to_numeric(df[lon_col], errors="coerce")

    total = len(df)
    mask = (
        df[lat_col].between(BBOX["lat_min"], BBOX["lat_max"]) &
        df[lon_col].between(BBOX["lon_min"], BBOX["lon_max"])
    )
    df_corridor = df[mask].copy()

    print(f"Bounding box filter: {total:,} total → {len(df_corridor):,} in corridor "
          f"({BBOX['lat_min']}–{BBOX['lat_max']} lat, "
          f"{BBOX['lon_min']}–{BBOX['lon_max']} lon)")

    df_corridor["_lat"] = df_corridor[lat_col]
    df_corridor["_lon"] = df_corridor[lon_col]

    return df_corridor, lat_col, lon_col


# ---------------------------------------------------------------------------
# 3. Parse and standardize fields
# ---------------------------------------------------------------------------

def _find_col(df, *candidates):
    """Return the first column from candidates that exists in df (case-insensitive)."""
    col_lower = {c.lower(): c for c in df.columns}
    for c in candidates:
        if c in df.columns:
            return c
        if c.lower() in col_lower:
            return col_lower[c.lower()]
    return None


def standardize_fields(df):
    """
    Parse and standardize: collision_date, severity, party_at_fault mode,
    victim mode, year, month, day_of_week, hour.
    """
    print("\nStandardizing fields...")

    # --- collision_date ---
    date_col = _find_col(df, "COLLISION_DATE", "ACCIDENT_DATE", "collision_date", "DATE")
    if date_col:
        df["collision_date"] = pd.to_datetime(df[date_col], errors="coerce")
    else:
        # Try to assemble from YEAR/MONTH columns
        year_col  = _find_col(df, "ACCIDENT_YEAR", "YEAR", "accident_year")
        month_col = _find_col(df, "ACCIDENT_MONTH", "MONTH", "accident_month")
        if year_col and month_col:
            df["collision_date"] = pd.to_datetime(
                df[year_col].astype(str) + "-" + df[month_col].astype(str).str.zfill(2) + "-01",
                errors="coerce"
            )
            print(f"  [INFO] collision_date assembled from {year_col} + {month_col}")
        else:
            df["collision_date"] = pd.NaT
            print("  [WARNING] Could not find a date column — collision_date will be NaT")

    # --- year, month, day_of_week, hour ---
    df["year"]  = df["collision_date"].dt.year
    df["month"] = df["collision_date"].dt.month

    # Day of week: try TIME_CAT or derive from date
    dow_col = _find_col(df, "DAY_OF_WEEK", "day_of_week")
    if dow_col:
        df["day_of_week"] = df[dow_col]
    else:
        df["day_of_week"] = df["collision_date"].dt.dayofweek.map(DAY_OF_WEEK_MAP)

    # Hour: try COLLISION_TIME
    time_col = _find_col(df, "COLLISION_TIME", "collision_time", "TIME")
    if time_col:
        # SWITRS stores time as HHMM integer
        df["hour"] = pd.to_numeric(df[time_col], errors="coerce").floordiv(100).astype("Int64")
    else:
        df["hour"] = pd.NA

    # --- severity ---
    sev_col = _find_col(df, "COLLISION_SEVERITY", "collision_severity", "SEVERITY")
    if sev_col:
        df["severity"] = df[sev_col].map(SEVERITY_MAP).fillna("unknown")
    else:
        df["severity"] = "unknown"
        print(f"  [WARNING] No severity column found (looked for COLLISION_SEVERITY)")

    # --- party_at_fault mode ---
    # SWITRS: PARTY_AT_FAULT = Y on the row where the party was at fault
    # We identify the at-fault party's type from the party-level records.
    # TIMS exports may include party data as columns (flattened) or as separate rows.
    # Handle the most common flattened single-record format here.

    ptype_col    = _find_col(df, "PARTY_TYPE", "party_type", "TYPE_OF_COLLISION")
    at_fault_col = _find_col(df, "PARTY_AT_FAULT", "party_at_fault", "AT_FAULT")

    if ptype_col and at_fault_col:
        # Map the at-fault party type
        df["party_at_fault_mode"] = df.apply(
            lambda row: PARTY_TYPE_MAP.get(row[ptype_col], "unknown")
            if str(row.get(at_fault_col, "")).upper() in ("Y", "YES", "1", "TRUE")
            else "unknown",
            axis=1
        )
    elif ptype_col:
        # No at-fault column — use primary party type as proxy
        df["party_at_fault_mode"] = df[ptype_col].map(PARTY_TYPE_MAP).fillna("unknown")
    else:
        # Try to infer from collision type description
        type_col = _find_col(df, "TYPE_OF_COLLISION", "COLLISION_TYPE", "ACCIDENT_TYPE")
        if type_col:
            type_lower = df[type_col].astype(str).str.lower()
            df["party_at_fault_mode"] = "unknown"
            df.loc[type_lower.str.contains("pedestrian", na=False), "party_at_fault_mode"] = "pedestrian"
            df.loc[type_lower.str.contains("bicycle|bike", na=False), "party_at_fault_mode"] = "bicyclist"
            df.loc[type_lower.str.contains("vehicle|auto|car|truck", na=False), "party_at_fault_mode"] = "motor_vehicle"
        else:
            df["party_at_fault_mode"] = "unknown"
            print("  [WARNING] Could not determine party_at_fault_mode")

    # --- victim mode ---
    vict_type_col = _find_col(df, "VICTIM_ROLE", "victim_role", "VICTIM_TYPE",
                               "VICT_TYPE", "PEDESTRIAN_ACTION", "BICYCLE_COLLISION")
    if vict_type_col:
        df["victim_mode"] = df[vict_type_col].map(PARTY_TYPE_MAP).fillna("unknown")
    else:
        # Fallback: look for boolean pedestrian/bicycle involved columns
        ped_col  = _find_col(df, "PEDESTRIAN_INVOLVED", "PED_INVOLVED", "PEDESTRIAN_ACCIDENT")
        bike_col = _find_col(df, "BICYCLE_INVOLVED", "BIKE_INVOLVED", "BICYCLE_ACCIDENT")
        df["victim_mode"] = "unknown"
        if ped_col:
            df.loc[df[ped_col].astype(str).str.upper().isin(["Y", "YES", "1", "TRUE"]),
                   "victim_mode"] = "pedestrian"
        if bike_col:
            df.loc[df[bike_col].astype(str).str.upper().isin(["Y", "YES", "1", "TRUE"]),
                   "victim_mode"] = "bicyclist"

    # --- ped/cyclist involved flag (party OR victim) ---
    df["involves_ped_or_cyclist"] = (
        df["party_at_fault_mode"].isin(["pedestrian", "bicyclist"]) |
        df["victim_mode"].isin(["pedestrian", "bicyclist"])
    )

    # --- cross street ---
    cs_col = _find_col(df, "SECONDARY_RD", "secondary_rd", "CROSS_STREET",
                        "INTERSECTION", "CROSS_ST", "AT_INTERSECTION")
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
        df["cross_street_raw"] = None
        df["named_cross_street"] = None

    print(f"  collision_date range: {df['collision_date'].min()} → {df['collision_date'].max()}")
    print(f"  Severity distribution:\n{df['severity'].value_counts().to_string()}")
    print(f"  Party at fault:\n{df['party_at_fault_mode'].value_counts().to_string()}")
    print(f"  Ped/cyclist involved: {df['involves_ped_or_cyclist'].sum()} of {len(df)}")

    return df


# ---------------------------------------------------------------------------
# 4a. Save clean CSV
# ---------------------------------------------------------------------------

def save_clean_csv(df):
    """Save the full cleaned record to data/processed/collisions_clean.csv."""
    df.to_csv(OUTPUT_CLEAN_CSV, index=False)
    print(f"\n✓ Clean CSV: {len(df):,} rows → {OUTPUT_CLEAN_CSV.relative_to(REPO_ROOT)}")


# ---------------------------------------------------------------------------
# 4b. Build and save summary JSON
# ---------------------------------------------------------------------------

def build_summary_json(df):
    """
    Build aggregate statistics and save to data/processed/collisions_summary.json.

    Includes:
    - total collisions by year (full time series, no year filter)
    - collisions by severity
    - ped/cyclist involvement count
    - collisions by named cross-street
    """
    print("\nBuilding collisions_summary.json...")

    total = len(df)
    date_min = str(df["collision_date"].min().date()) if not df["collision_date"].isna().all() else "unknown"
    date_max = str(df["collision_date"].max().date()) if not df["collision_date"].isna().all() else "unknown"

    # By year — full time series, sorted ascending
    by_year = {}
    if "year" in df.columns:
        yr_counts = df.groupby("year").size()
        for yr, count in yr_counts.sort_index().items():
            if pd.notna(yr):
                by_year[int(yr)] = int(count)

    # By severity
    by_severity = df["severity"].value_counts().to_dict()
    by_severity = {k: int(v) for k, v in by_severity.items()}

    # Ped or cyclist involvement
    ped_cyclist_total = int(df["involves_ped_or_cyclist"].sum())
    ped_cyclist_pct = round(ped_cyclist_total / total * 100, 1) if total else 0

    ped_only  = int((df["party_at_fault_mode"] == "pedestrian").sum() |
                    (df["victim_mode"] == "pedestrian").sum())
    bike_only = int((df["party_at_fault_mode"] == "bicyclist").sum() |
                    (df["victim_mode"] == "bicyclist").sum())

    # By named cross-street
    by_cross_street = {}
    if "named_cross_street" in df.columns:
        cs_counts = df[df["named_cross_street"].notna()]["named_cross_street"].value_counts()
        by_cross_street = {k: int(v) for k, v in cs_counts.items()}

    # Fatal count
    fatal_count = int((df["severity"] == "fatal").sum())

    summary = {
        "_metadata": {
            "source": "TIMS/SWITRS — tims.berkeley.edu",
            "attribution": "Source: TIMS/SWITRS. Must be cited in all public-facing visualizations.",
            "generated": datetime.utcnow().isoformat() + "Z",
            "processing_script": "analysis/collisions.py",
            "bounding_box": BBOX,
            "date_range": {"min": date_min, "max": date_max},
            "total_records": total,
            "note": (
                "Full time series retained — no minimum year filter applied. "
                "This is necessary to address claims that any sub-period was anomalous. "
                "The 2015–2018 period cited by Bike East Bay and city staff is highlighted "
                "in the UI but the full dataset is available for context."
            ),
        },
        "total_collisions": total,
        "fatal_collisions": fatal_count,
        "by_year": by_year,
        "by_severity": by_severity,
        "ped_cyclist_involvement": {
            "total": ped_cyclist_total,
            "pct_of_all_collisions": ped_cyclist_pct,
            "pedestrian_involved": ped_only,
            "bicyclist_involved": bike_only,
            "note": "A collision is counted here if a pedestrian or cyclist was either "
                    "the at-fault party or a victim.",
        },
        "by_cross_street": by_cross_street,
    }

    with open(OUTPUT_SUMMARY_JSON, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"✓ Summary JSON → {OUTPUT_SUMMARY_JSON.relative_to(REPO_ROOT)}")
    return summary


# ---------------------------------------------------------------------------
# 4c. Build GeoJSON
# ---------------------------------------------------------------------------

def build_geojson(df):
    """
    Build data/processed/collisions_geo.geojson — point features with
    severity and mode as properties.
    """
    print("\nBuilding collisions_geo.geojson...")

    df_geo = df[df["_lat"].notna() & df["_lon"].notna()].copy()
    skipped = len(df) - len(df_geo)
    if skipped:
        print(f"  [INFO] {skipped} record(s) skipped — missing coordinates")

    # Build GeoDataFrame
    geometry = [Point(row["_lon"], row["_lat"]) for _, row in df_geo.iterrows()]
    gdf = gpd.GeoDataFrame(df_geo, geometry=geometry, crs="EPSG:4326")

    # Select properties to include in GeoJSON
    props = ["collision_date", "year", "severity", "party_at_fault_mode",
             "victim_mode", "involves_ped_or_cyclist", "named_cross_street", "hour"]
    props = [p for p in props if p in gdf.columns]

    gdf_out = gdf[props + ["geometry"]].copy()

    # Serialize date column to string for JSON compatibility
    if "collision_date" in gdf_out.columns:
        gdf_out["collision_date"] = gdf_out["collision_date"].dt.strftime("%Y-%m-%d")

    gdf_out.to_file(OUTPUT_GEO_GEOJSON, driver="GeoJSON")
    print(f"✓ GeoJSON: {len(gdf_out):,} features → {OUTPUT_GEO_GEOJSON.relative_to(REPO_ROOT)}")


# ---------------------------------------------------------------------------
# 5. Stdout summary
# ---------------------------------------------------------------------------

def print_summary(df, summary):
    """Print the final summary to stdout."""
    print("\n" + "=" * 70)
    print("COLLISION DATA SUMMARY — Hopkins Corridor (TIMS/SWITRS)")
    print("=" * 70)
    meta = summary["_metadata"]
    print(f"  Total records:      {summary['total_collisions']:,}")
    print(f"  Date range:         {meta['date_range']['min']} → {meta['date_range']['max']}")
    print(f"  Fatal collisions:   {summary['fatal_collisions']}")
    print(f"\n  By severity:")
    for sev, count in sorted(summary["by_severity"].items()):
        pct = round(count / summary["total_collisions"] * 100, 1) if summary["total_collisions"] else 0
        print(f"    {sev:25s} {count:4d}  ({pct}%)")
    pi = summary["ped_cyclist_involvement"]
    print(f"\n  Ped/cyclist involved: {pi['total']} ({pi['pct_of_all_collisions']}% of all)")
    print(f"    Pedestrian:         {pi['pedestrian_involved']}")
    print(f"    Bicyclist:          {pi['bicyclist_involved']}")
    if summary["by_cross_street"]:
        print(f"\n  By named cross-street:")
        for cs, count in sorted(summary["by_cross_street"].items(), key=lambda x: -x[1]):
            print(f"    {cs:20s} {count}")
    print(f"\n  Output files:")
    for p in [OUTPUT_CLEAN_CSV, OUTPUT_SUMMARY_JSON, OUTPUT_GEO_GEOJSON]:
        exists = "✓" if p.exists() else "—"
        print(f"    {exists}  {p.relative_to(REPO_ROOT)}")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    import argparse
    parser = argparse.ArgumentParser(
        description="Process TIMS/SWITRS collision data for the Hopkins corridor"
    )
    parser.add_argument(
        "csv_path", nargs="?", default=None,
        help="Path to TIMS export CSV (default: auto-detect in data/raw/tims/)"
    )
    args = parser.parse_args()

    print("Hopkins Street Safety — TIMS Collision Data Processing")
    print(f"Output directory: {PROCESSED_DIR}")

    # 1. Load
    df = load_tims_csv(args.csv_path)

    # 2. Filter to corridor bounding box
    df, lat_col, lon_col = filter_to_corridor(df)

    if len(df) == 0:
        print("\n[ERROR] No records remain after bounding box filter.")
        print(f"  Bounding box: lat {BBOX['lat_min']}–{BBOX['lat_max']}, "
              f"lon {BBOX['lon_min']}–{BBOX['lon_max']}")
        print("  Check that the TIMS export covers the Hopkins corridor.")
        sys.exit(1)

    # 3. Standardize fields
    df = standardize_fields(df)

    # 4a. Save clean CSV
    save_clean_csv(df)

    # 4b. Summary JSON
    summary = build_summary_json(df)

    # 4c. GeoJSON
    build_geojson(df)

    # 5. Print summary
    print_summary(df, summary)


if __name__ == "__main__":
    main()
