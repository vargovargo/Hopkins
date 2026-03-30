"""
process_collisions_geojson.py

Converts raw TIMS/SWITRS Crashes.csv into a GeoJSON FeatureCollection
for use in the Hopkins Street corridor map.

Output: data/geo/collisions.geojson

Rules:
- Records with LATITUDE/LONGITUDE in TIMS → use those coords
- Case 7200177 (2017 cyclist fatality, Sacramento @ Ada) has no TIMS coords
  but is verified in fatality_locations.geojson → use [-122.2833, 37.8810]
- All other records missing coords are omitted and counted in _metadata
- Severity codes: 1=fatal, 2=severe, 3=injury, 4=pdo
"""

import csv
import json
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent

CRASHES_CSV = REPO_ROOT / "data/raw/tims/Crashes.csv"
OUTPUT_GJ   = REPO_ROOT / "data/geo/collisions.geojson"

# Hand-verified coordinates for the 2017 cyclist fatality (missing from TIMS export)
# Source: data/geo/fatality_locations.geojson, case 7200177
GEOCODED_COORDS = {
    "7200177": [-122.2833, 37.8810],
}

SEVERITY_MAP = {
    "1": "fatal",
    "2": "severe",
    "3": "injury",
    "4": "pdo",
}

def fmt_date(raw):
    """Convert YYYY-MM-DD to more readable form, return as-is if fails."""
    try:
        parts = raw.split("-")
        months = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"]
        return f"{months[int(parts[1])-1]} {int(parts[2])}, {parts[0]}"
    except Exception:
        return raw

def mode_label(row):
    ped  = row.get("PEDESTRIAN_ACCIDENT", "").strip().upper() == "Y"
    bike = row.get("BICYCLE_ACCIDENT", "").strip().upper() == "Y"
    if ped and bike:
        return "Pedestrian and cyclist involved"
    if ped:
        return "Pedestrian involved"
    if bike:
        return "Cyclist involved"
    return "Vehicle collision"

def main():
    features = []
    total    = 0
    omitted  = 0

    with open(CRASHES_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            total += 1
            case_id  = row["CASE_ID"].strip()
            lat_raw  = row["LATITUDE"].strip()
            lon_raw  = row["LONGITUDE"].strip()

            # Resolve coordinates
            if lat_raw and lon_raw:
                coords = [float(lon_raw), float(lat_raw)]
            elif case_id in GEOCODED_COORDS:
                coords = GEOCODED_COORDS[case_id]
            else:
                omitted += 1
                continue

            severity_code = row["COLLISION_SEVERITY"].strip()
            severity = SEVERITY_MAP.get(severity_code, "unknown")

            feature = {
                "type": "Feature",
                "properties": {
                    "case_id":      case_id,
                    "date":         row["COLLISION_DATE"].strip(),
                    "date_display": fmt_date(row["COLLISION_DATE"].strip()),
                    "severity":     severity,
                    "severity_code": int(severity_code) if severity_code.isdigit() else None,
                    "ped_involved":  row.get("PEDESTRIAN_ACCIDENT", "").strip().upper() == "Y",
                    "bike_involved": row.get("BICYCLE_ACCIDENT", "").strip().upper() == "Y",
                    "mode_label":   mode_label(row),
                    "primary_rd":   row.get("PRIMARY_RD", "").strip().title(),
                    "secondary_rd": row.get("SECONDARY_RD", "").strip().title(),
                    "coords_source": "TIMS/SWITRS" if (lat_raw and lon_raw) else "hand-verified (fatality_locations.geojson)",
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": coords,
                },
            }
            features.append(feature)

    shown = total - omitted
    geojson = {
        "type": "FeatureCollection",
        "_metadata": {
            "description": "TIMS/SWITRS collision records within the Hopkins Street corridor bounding box, 2014–2025",
            "source": "TIMS/SWITRS (tims.berkeley.edu)",
            "bounding_box": "lat 37.875–37.892, lon -122.300 to -122.270",
            "total_records": total,
            "shown_on_map": shown,
            "omitted_no_coords": omitted,
            "omission_note": f"{omitted} records lack GPS coordinates in the TIMS export and could not be geocoded.",
            "geocoded_from_fatality_locations": list(GEOCODED_COORDS.keys()),
            "generated_by": "analysis/process_collisions_geojson.py",
        },
        "features": features,
    }

    with open(OUTPUT_GJ, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)

    print(f"Done. {shown} of {total} records written to {OUTPUT_GJ}")
    print(f"Omitted (no coords): {omitted}")
    severity_counts = {}
    for feat in features:
        s = feat["properties"]["severity"]
        severity_counts[s] = severity_counts.get(s, 0) + 1
    for s, n in sorted(severity_counts.items()):
        print(f"  {s}: {n}")

if __name__ == "__main__":
    main()
