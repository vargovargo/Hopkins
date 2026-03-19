# Hopkins Street Data Story — Claude Code Session Prompts

> **DATA INTEGRITY — READ THIS FIRST**
> This project is part of a live public policy debate. Every number that appears
> in the UI must come directly from a source file in `data/processed/` or `data/raw/`.
> Do not fabricate, estimate, interpolate, or use placeholder numbers that could be
> mistaken for real findings. If a visualization can't be built from available data,
> build the shell and label it explicitly as awaiting data. See the "Data integrity"
> section of CLAUDE.md for the full rules — they are non-negotiable.
> Read CLAUDE.md fully before starting any prompt.

A sequential set of prompts to run in Claude Code after connecting it to the repo.
Run them in order. Each builds on the previous. Don't skip ahead until the prior
step is confirmed working.

-----

## Prompt 1 — Project scaffold

```
Read CLAUDE.md fully before doing anything else.

Then scaffold the project structure described in the repo structure section:

- Create all the directories: data/raw/tims, data/raw/streetlight, data/processed, data/geo, analysis/, web/, docs/
- Initialize a React + Vite app inside /web with: react, react-dom, scrollama, mapbox-gl, d3
- Add a .gitignore that excludes node_modules, .env, and data/raw (we don't want raw data in the repo)
- Create a .env.example with VITE_MAPBOX_TOKEN=your_token_here
- Create a README.md at the root with a one-paragraph project description and setup instructions

Do not build any components yet. Just the scaffold.
```

-----

## Prompt 2 — GeoJSON corridor boundary from Streetlight shapefiles

```
Read CLAUDE.md before starting.

The Streetlight data export includes shapefiles for each analysis zone. These are
the authoritative corridor geometries — use them as the primary source for all
map geometry. Do not guess or approximate coordinates.

STEP 1 — Convert shapefiles to GeoJSON

The shapefiles are in data/raw/streetlight/. There are two shapefile types:
- *.shp / *.dbf / *.shx / *.prj — polygon zone boundaries
- *_line.shp etc — LineString zone centerlines with gate lat/lon

Use geopandas to convert both to GeoJSON:

  import geopandas as gpd
  gdf = gpd.read_file('data/raw/streetlight/[filename].shp')
  gdf = gdf.to_crs('EPSG:4326')  # ensure WGS84
  gdf.to_file('data/geo/streetlight_zones.geojson', driver='GeoJSON')

Do this for both the polygon and line shapefiles. Save as:
- data/geo/streetlight_zones.geojson (polygons)
- data/geo/streetlight_lines.geojson (linestrings)

Print the zone names and geometry types to confirm what's there.

STEP 2 — Build the corridor GeoJSON

From the converted data, create data/geo/hopkins_corridor.geojson:
- A FeatureCollection of the individual zone LineStrings, each as a separate
  Feature with properties: zone_id, zone_name, is_pass_through, direction_degrees
- This gives us named, segmented corridor geometry that matches the analysis zones

STEP 3 — Fatality locations

The two 2017 fatalities are NOT in the Streetlight data. For these two points only,
use Google Maps to pin the exact locations and record coordinates manually:
1. Hopkins St & Monterey Ave intersection — pedestrian fatality 2017
2. Sacramento Ave near Hopkins St — cyclist fatality 2017

Record both as a separate data/geo/fatality_locations.geojson with properties:
- type: "fatality"
- mode: "pedestrian" | "cyclist"
- year: 2017
- intersection: [cross street description]
- source: "Berkeley City Council budget referral, January 2018"
- coordinates_source: "manually verified via Google Maps"

STEP 4 — data/geo/README.md

Document:
- What each GeoJSON file contains
- Coordinate reference system (WGS84 / EPSG:4326)
- That streetlight_zones and streetlight_lines derive directly from Streetlight shapefiles
- That fatality_locations coordinates were manually verified
- Any zone names from the Streetlight data that don't match the segment labels
  used elsewhere in the project (flag for reconciliation)

Install geopandas if needed: pip install geopandas --break-system-packages
```

-----

## Prompt 3 — Streetlight data processing script

```
Read CLAUDE.md before starting. Data integrity rules are strictly enforced here.
Do not proceed past Step 1 without printing the audit output and confirming it
matches what is expected.

The Streetlight export contains four file types across multiple folders.
We know their structure from the READMEs:

FILE TYPE SUMMARY (confirmed from READMEs):
  za_*.csv              — Zone Activity: volume by zone, day type, day part
                          Modes: All Vehicles (2025), Pedestrian (2022), Bicycle (2022)
                          Day parts: All Day, Early AM (12am-6am), Peak AM (6am-10am),
                                     Mid-Day (10am-3pm), Peak PM (3pm-7pm), Late PM (7pm-12am)
                          Day types: All Days, Weekday (M-Th), Weekend (Sa-Su)
                          Key field: "Zone Traffic" (volume or index — must verify)

  *_prediction_intervals.csv — Daily avg volume + 95% confidence intervals
                          Mode: All Vehicles only
                          Day part: All Day only (no time-of-day breakdown)
                          Key fields: "Average Daily Zone Traffic (StL Volume)",
                                      "Lower 95 Percent Prediction Range",
                                      "Upper 95 Percent Prediction Range"

  *_network_performance_seg_metrics_*.csv — Speed + volume by segment
                          Mode: All Vehicles only (2025)
                          Day parts: same 5 bands as za_*.csv
                          Key fields: "Segment Traffic", "Avg Segment Speed",
                                      "Free Flow Speed", "Free Flow Factor",
                                      "Congestion", speed percentiles (5th, 15th, 85th, 95th)

  Analysis.txt          — Confirms: Output Type = "StL All Vehicles Volume" for vehicles

---

STEP 1 — Full file audit (DO NOT SKIP)

Walk data/raw/streetlight/ recursively. For every CSV found, print:
- Full relative path and file size
- Column names
- Unique values in Mode of Travel (if present)
- Unique values in Day Type and Day Part (if present)
- The exact column name containing the primary metric value
- Row count
- Data Periods range

Also check: is the primary metric "StreetLight Volume", "StreetLight Index",
or "StreetLight Calibrated Index"? Print this clearly for each file.

Per Streetlight documentation: Index values for different modes CANNOT be
compared. If ped/bike use Index while vehicles use Volume, print a prominent
WARNING and document it in data/processed/data_integrity_notes.md before
doing any further processing.

---

STEP 2 — Process zone activity (za_*.csv)

For each mode found (All Vehicles, Pedestrian, Bicycle):
  - Extract: zone_id, zone_name, day_type, day_part, zone_traffic, output_unit
  - Preserve the exact column name as output_unit — do not rename or normalize it
  - Save separate files:
      data/processed/za_vehicles.csv
      data/processed/za_pedestrians.csv  (if present)
      data/processed/za_bicycles.csv     (if present)

---

STEP 3 — Process prediction intervals

From *_prediction_intervals.csv:
  - Extract: zone_id, zone_name, year_month, avg_daily_volume,
             lower_95, upper_95
  - These are All Vehicles only, All Day only
  - Save to: data/processed/vehicle_prediction_intervals.csv

---

STEP 4 — Process network performance (speed data)

From *_network_performance_seg_metrics_*.csv:
  - Extract: zone_id, zone_name, day_type, day_part,
             segment_traffic, avg_speed_mph, free_flow_speed_mph,
             free_flow_factor, congestion,
             speed_p5, speed_p15, speed_p85, speed_p95
             (use whatever percentile columns are present — confirm names from audit)
  - Save to: data/processed/network_performance.csv

Note: The 85th percentile speed is the California standard for speed limit
setting. Flag this field clearly in the output and in the metadata.

---

STEP 5 — Build streetlight_verified.json

Produce data/processed/streetlight_verified.json:
{
  "_metadata": {
    "status": "VERIFIED",
    "generated": "[timestamp]",
    "analysis_id": "2012902",
    "analysis_name": "Hopkins Rose Cedar AV 2025",
    "output_units": {
      "vehicles_za": "[exact column name from za CSV]",
      "vehicles_prediction": "Average Daily Zone Traffic (StL Volume)",
      "vehicles_network": "Segment Traffic (StL Volume)",
      "pedestrians": "[exact column name — Volume or Index]",
      "bicycles": "[exact column name — Volume or Index]"
    },
    "modes_comparable": true/false,
    "comparability_warning": "[only if false — explain what cannot be compared]",
    "data_periods": {
      "vehicles": "Jan 01 2025 - Dec 31 2025",
      "pedestrians": "[from file]",
      "bicycles": "[from file]"
    },
    "day_parts_available": ["All Day", "Early AM", "Peak AM", "Mid-Day", "Peak PM", "Late PM"],
    "day_types_available": ["All Days", "Weekday", "Weekend"],
    "speed_percentiles_available": [5, 15, 85, 95],
    "zones": ["[list exactly as they appear in the data]"],
    "confidence_intervals_available": true,
    "notes": "[any data quality issues, missing zones, inferred values flagged]"
  },
  "zone_activity": { ... keyed by mode, then zone, then day_type/day_part ... },
  "prediction_intervals": { ... keyed by zone ... },
  "network_performance": { ... keyed by zone, then day_type/day_part ... }
}

---

STEP 6 — Update streetlight_summary.json

Correct any values that differ from the screenshot-derived estimates.
Change status from "UNVERIFIED" to "VERIFIED".
Log each correction with: field, old_value, new_value, source.

---

STEP 7 — Final stdout summary

Print:
- All zones found (by name)
- All modes found
- Day parts confirmed available
- Output unit for each mode
- Whether cross-mode volume comparison is valid
- Whether speed data is available and which percentiles
- Whether confidence intervals are available
- Any zones with "Inferred Volume = Yes" in network performance (flag these)
- Any data quality concerns
```

-----

## Prompt 3b — City of Berkeley traffic count PDFs

```
Read CLAUDE.md before starting.

The City of Berkeley provided four PDFs of traffic count data for the Hopkins
corridor via a public records request. These are independent ground-truth counts
that can validate the Streetlight estimates.

The PDFs are in data/raw/city_counts/.

STEP 1 — Extract and audit

For each PDF:
- Extract all numeric count data (vehicle counts, turning movements, or
  pedestrian/bike counts — whatever each PDF contains)
- Note: location (intersection or segment), count type, date/time of count,
  count duration, and any methodology notes in the document
- If the PDF is image-based and text extraction fails, note this and describe
  what is visually present

Print a summary of what each PDF contains before doing any further processing.

STEP 2 — Structure the data

Save extracted data to data/processed/city_counts.json:
{
  "_metadata": {
    "source": "City of Berkeley public records request",
    "request_date": "[if shown in documents]",
    "documents": [
      {
        "filename": "[pdf name]",
        "location": "[intersection or segment]",
        "count_type": "[vehicle / pedestrian / bike / turning movement]",
        "count_date": "[date of count if shown]",
        "count_duration": "[e.g. 24-hour, peak hour]",
        "notes": "[anything relevant about methodology]"
      }
    ]
  },
  "counts": [ ... structured count records ... ]
}

STEP 3 — Comparison with Streetlight

Where city count locations overlap with Streetlight zones:
- Compare the city count volume to Streetlight's estimated volume for the
  same location and time period (note: they may use different time periods)
- Calculate the difference as both absolute and percentage
- Save to data/processed/counts_comparison.json
- If counts diverge by more than 25%, flag for review and note in
  data/processed/data_integrity_notes.md — do not suppress discrepancies

The goal is validation, not reconciliation. If the data sources disagree,
we say so and explain why (different years, different methodologies, etc.).
Do not average them or pick the more favorable number.

STEP 4 — Document for public transparency

Add a section to data/processed/data_integrity_notes.md:
"City of Berkeley Traffic Counts — Comparison with Streetlight"
Summarize: what matched, what diverged, and what the divergence likely means.
This section may be surfaced in the site's methodology note.
```

-----

## Correction Prompts — Data Structure Fixes

*Run these after the initial audit output from Prompt 3. These address structural
mismatches discovered when the raw data was loaded. Run them in order before
proceeding to Prompt 4 (TIMS) or Prompt 8 (visualizations).*

---

## Correction A — Fix Streetlight vehicle data source

```
Read CLAUDE.md before starting.

The Prompt 3 audit revealed a structural mismatch in the Streetlight processing:

PROBLEM:
The original script looks for za_*.csv for vehicle data, but vehicle data is in
*_network_performance_seg_metrics_*.csv only. No vehicle zone activity file exists.
Ped and bike data ARE in za_*.csv as expected.

This means the three modes have different file structures:
  - Vehicles:    *_network_performance_seg_metrics_*.csv (segment-based)
  - Pedestrian:  za_*.csv (zone activity)
  - Bicycle:     za_*.csv (zone activity)

GOOD NEWS confirmed by audit:
All three modes use StL Volume (not Index). Cross-mode comparison IS valid —
but note the structural difference (segment metrics vs zone activity) in all
metadata and UI labels. They are measuring the same thing differently, not
different things.

FIXES NEEDED:

1. Update analysis/streetlight.py:

   Vehicle processing:
   - Read from *_network_performance_seg_metrics_*.csv
   - Extract: zone_id, zone_name, day_type, day_part,
              segment_traffic (this is the volume field),
              avg_speed_mph, free_flow_speed_mph, free_flow_factor, congestion,
              speed percentile columns (whatever is present — check column names)
   - Save to data/processed/vehicles_network_performance.csv
     (rename from vehicles_by_zone_daypart.csv — the old name implied zone
     activity which is wrong for this data)

   Ped/bike processing: unchanged — za_*.csv is correct

2. Update data/processed/streetlight_verified.json _metadata:
   - output_units.vehicles: clarify it comes from network performance,
     not zone activity
   - Add: "vehicle_file_type": "network_performance_seg_metrics"
   - Add: "ped_bike_file_type": "zone_activity"
   - Add: "structural_note": "Vehicle volumes are segment-based (network
     performance); ped/bike volumes are zone-based (zone activity). Both use
     StL Volume. Segment and zone boundaries roughly correspond but are not
     identical — do not treat as precisely equivalent geographic units."
   - Set modes_comparable: true (confirmed — all StL Volume)

3. Update data/processed/data_integrity_notes.md with a section:
   "Vehicle vs Ped/Bike File Structure"
   Document the difference clearly. This should be surfaced as a methodology
   note in the site UI wherever vehicle and ped/bike data appear together.

4. Rerun the processing and verify output files exist and have expected structure.
   Print row counts and zone/segment names for each output file.
```

---

## Correction B — Fix TIMS collision script for relational tables

```
Read CLAUDE.md before starting.

The TIMS export is three separate relational tables, not the single flat CSV
the original collisions.py was written for.

FILES in data/raw/tims/:
  Crashes.csv   — one row per collision event (has CASE_ID, date, location, severity)
  Parties.csv   — one row per party involved (has CASE_ID, party type, at-fault flag)
  Victims.csv   — one row per victim (has CASE_ID, victim role, degree of injury)

THE FIX: Rewrite analysis/collisions.py to join the three tables on CASE_ID.

STEP 1 — Load and inspect

For each CSV, print:
- Column names
- Row count
- Sample of 3 rows
- Unique values in key categorical fields:
  Crashes: COLLISION_SEVERITY, TYPE_OF_COLLISION, ROAD_SURFACE, LIGHTING
  Parties: PARTY_TYPE, AT_FAULT, STATEWIDE_VEHICLE_TYPE
  Victims: VICTIM_ROLE, DEGREE_OF_INJURY

Do not proceed until this is printed and confirmed.

STEP 2 — Build the joined dataset

joined = Crashes.merge(Parties, on='CASE_ID', how='left')
         then merge Victims on CASE_ID, how='left'

After joining:
- Filter to corridor bounding box using Crashes lat/lon:
    Latitude:  37.877 to 37.882
    Longitude: -122.304 to -122.272
- Parse COLLISION_DATE to datetime
- Extract year, month, hour from date/time fields

STEP 3 — Classify mode involvement

A collision "involves a pedestrian" if:
  ANY party row for that CASE_ID has PARTY_TYPE = 'Pedestrian'
  OR any victim row has VICTIM_ROLE = 'Pedestrian'

A collision "involves a cyclist" if:
  ANY party row has PARTY_TYPE = 'Bicycle'
  OR any victim row has VICTIM_ROLE = 'Bicyclist' (check exact value from audit)

Flag each collision-level record with:
  involves_pedestrian: bool
  involves_cyclist: bool
  involves_ped_or_cyclist: bool

STEP 4 — Severity standardization

Map COLLISION_SEVERITY codes to readable labels. Check exact codes from the
audit output — SWITRS typically uses:
  1 → fatal
  2 → severe_injury
  3 → other_injury
  4 → property_damage_only

If codes differ from above, use whatever the audit shows — do not assume.

STEP 5 — Outputs (same as original spec)

  data/processed/collisions_clean.csv — full joined, filtered, classified record
  data/processed/collisions_summary.json — aggregates:
    * collisions by year (full time series — all years in the data)
    * collisions by severity
    * collisions involving ped or cyclist
    * collisions by nearest named cross-street
  data/processed/collisions_geo.geojson — point features, severity + mode as properties

STEP 6 — Print final summary to stdout:
  Total collisions in corridor
  Date range (earliest to latest)
  Severity breakdown
  Ped/cyclist involvement count and percentage
  Any CASE_IDs that appear in Parties or Victims but not Crashes (orphaned records)
  Any collisions missing lat/lon (could not be geo-filtered)
```

---

## Correction C — City count PDF interpretation

```
Read CLAUDE.md before starting.

The city count PDFs have been identified:
- All dated 2019-09-27
- All on Hopkins between Stannage and Cornell
- Filename convention: C_ = cycling counts, S_ = speed/motor vehicle counts
- EB/WB suffixes = eastbound/westbound

This is a single-location, single-date count — not a corridor-wide dataset.
Adjust the processing and framing accordingly.

STEP 1 — Extract data from each PDF

For each PDF in data/raw/city_counts/:
- Extract all numeric count data
- Identify: count type (cycling vs speed/volume), direction (EB/WB),
  time periods covered, count methodology if stated
- If PDF is image-based, describe what is visible

Print a full summary before any further processing.

STEP 2 — Structure the data

Save to data/processed/city_counts.json as before, but update metadata:
  "location": "Hopkins Street between Stannage Ave and Cornell Ave"
  "count_date": "2019-09-27"
  "coverage_note": "Single location, single date. Does not cover full corridor."
  "directions": ["EB", "WB"]
  "count_types": ["cycling", "speed_volume"]  (confirm from actual files)

STEP 3 — Comparison with Streetlight — adjust scope

The city counts are from 2019. Streetlight vehicle data is 2025. Ped/bike is 2022.
Do not present these as direct validations — the time gap is too large and
COVID intervened between 2019 and the Streetlight data periods.

Instead, document them as:
"Independent count data for one Hopkins segment (Stannage to Cornell), September 2019.
Useful as a reference point but not a direct validation of Streetlight estimates
due to the difference in data years."

In data/processed/data_integrity_notes.md, add:
"City Traffic Counts — Scope and Limitations"
  - Single location (Stannage to Cornell only)
  - Single date (September 27 2019)
  - Pre-COVID — travel patterns changed significantly 2020-2022
  - Streetlight vehicle data is 2025, ped/bike is 2022
  - These counts inform context but cannot validate Streetlight estimates
    for different years and locations

Do not run a numerical comparison that implies validation. Present the counts
as a separate historical data point with clear date labeling.
```

---

*These corrections should be run before Prompt 8 (visualizations).
After all three corrections are complete, verify:*
- *data/processed/vehicles_network_performance.csv exists and has speed columns*
- *data/processed/za_pedestrians.csv and za_bicycles.csv exist*
- *data/processed/streetlight_verified.json has modes_comparable: true*
- *data/processed/collisions_clean.csv exists with involves_ped_or_cyclist column*
- *data/processed/city_counts.json exists with correct scope metadata*

-----

## Prompt 4 — TIMS collision data processing script

```
Read CLAUDE.md before starting.

I'm going to pull collision data from TIMS (tims.berkeley.edu) for the Hopkins corridor.
The export will be a CSV with SWITRS fields. Before I do that pull, write the processing
script so it's ready to run the moment the data arrives.

Create analysis/collisions.py that:

1. Reads a CSV from data/raw/tims/ (handle whatever filename is there)
2. Filters to collisions within the Hopkins corridor bounding box:
   - Latitude: 37.877 to 37.882
   - Longitude: -122.304 to -122.272
3. Parses and standardizes:
   - collision_date (datetime)
   - severity (SWITRS COLLISION_SEVERITY codes → readable labels: fatal, severe_injury,
     other_injury, property_damage)
   - party_at_fault mode (SWITRS PARTY_TYPE fields → pedestrian, cyclist, motor_vehicle)
   - victim mode where available
   - year, month, day_of_week, hour
4. Outputs:
   - data/processed/collisions_clean.csv — full cleaned record
   - data/processed/collisions_summary.json — aggregate stats:
     * total collisions by year (2010–present to show full time series)
     * collisions by severity
     * collisions involving ped or cyclist (victim OR party)
     * collisions by named cross-street (Gilman, Sacramento, Monterey, McGee, Alameda, Sutter)
   - data/processed/collisions_geo.geojson — point features with severity and mode as properties

5. Prints a summary to stdout: total records, date range, severity breakdown,
   ped/cyclist involvement count

Important: the full time series (back to 2010 minimum) is needed to address the
opposition's claim that the 2016–2019 period was an anomaly. Do not filter to
any specific year range — include everything TIMS returns.

Include analysis/requirements.txt. Use pandas and geopandas. Write commented code.
```

-----

## Prompt 5 — Base map component (was Prompt 4)

```
Read CLAUDE.md before starting. Pay close attention to the design system section —
this component must follow Jason's aesthetic exactly.

Build the corridor map component: web/src/components/CorridorMap.jsx

This is the hero map that anchors the data story. It should:

VISUAL REQUIREMENTS (non-negotiable):
- Mapbox GL JS dark basemap (style: mapbox://styles/mapbox/dark-v11)
- Map is full-bleed / full-width, height 480px on desktop, 320px mobile
- Minimal chrome: no zoom controls visible by default, attribution bottom-right at smallest legal size
- Colors from the design system: green (#4a7c59) for corridor line, amber (#c4713b) for collision/incident markers

FUNCTIONAL REQUIREMENTS:
- Loads and displays the Hopkins corridor LineString from data/geo/hopkins_corridor.geojson
- Renders the corridor as a thick green line (width 4px, opacity 0.85)
- Renders named intersections as small labeled points (muted sage color, DM Sans labels, small text)
- Renders fatality locations as amber pulsing markers with a tooltip on hover
- Map initializes centered on the Hopkins/Monterey intersection, zoom 14.5
- Accepts a prop `highlightSegment` (string: 'sutter-alameda' | 'alameda-mcgee' | 'mcgee-gilman') that visually highlights that segment in brighter green — this will be driven by scroll position later

TECHNICAL:
- Use mapbox-gl directly (not react-map-gl)
- Use useRef + useEffect for map initialization
- Accept Mapbox token from import.meta.env.VITE_MAPBOX_TOKEN
- Handle map cleanup on unmount
- Export as default

Also create web/src/components/CorridorMap.css for any styles that can't be inline.
```

-----

## Prompt 6 — Collision visualization component (was Prompt 5)

```
Read CLAUDE.md before starting.

Build web/src/components/CollisionChart.jsx

This component visualizes the TIMS collision data for the Hopkins corridor.
It should feel like the "cost of doing nothing" section — serious, factual, not sensational.

Use the processed data at data/processed/collisions_summary.json (import directly as JSON).

DESIGN:
- Dark card background (#252523), subtle 1px border
- Heading: "36 Collisions. Two Lives Lost." in DM Serif Display
- Subhead in DM Sans, small, muted: "Hopkins Corridor · 2015–2018 (source: TIMS/SWITRS)"

VISUALIZATIONS (use D3 or Recharts):

1. A timeline bar chart showing collisions by year (2010–present).
   - Bars in muted sage (#8a9a78) for property damage only
   - Bars in amber (#c4713b) for injury collisions
   - Bars in deep red (#8b2c2c) for fatal collisions
   - X axis: years. Y axis: count. Gridlines barely visible (rgba(255,255,255,0.08))
   - Annotate the 2015–2018 period with a subtle bracket or shaded region labeled "City's cited period"
   - This directly addresses the opposition's "anomaly" claim — the full time series context matters

2. A single "big stat" callout row:
   - "36 collisions" | "36% involved ped or cyclist" | "2 fatalities"
   - Each stat: large monospace number, small sans-serif label below
   - Amber color for the numbers

PROPS:
- data: the collision summary JSON object (with fallback to import)
- yearRange: [startYear, endYear] — highlighted range for the "city's cited period" bracket

Export as default.
```

-----

## Prompt 7 — Scrollama page shell (was Prompt 6)

```
Read CLAUDE.md before starting.

Build the main scrollytelling page shell: web/src/App.jsx

This is the outer wrapper that connects the scroll narrative to the map and data components.

STRUCTURE:
- A sticky map panel (left side, ~55% width on desktop, full width mobile) containing <CorridorMap />
- A scrolling narrative panel (right side, ~45% width on desktop) with the five story sections
- As the user scrolls through each section, pass the appropriate props to CorridorMap to update what's highlighted

SECTIONS (create as placeholder cards for now — content will fill in later):
1. "Who's on Hopkins?" — placeholder text, will receive Streetlight mode split viz
2. "The street doesn't match how people use it" — placeholder, will receive infrastructure gap layer on map
3. "What's actually at stake with parking" — placeholder, will receive parking count visualization
4. "The cost of doing nothing" — render <CollisionChart /> here
5. "Berkeley already decided" — placeholder, render a static policy list card

SCROLLAMA SETUP:
- Use scrollama to detect which section is active
- Each section updates a `activeSection` state
- Pass `activeSection` to CorridorMap as `highlightSegment`
- Transitions between sections should be smooth (CSS transitions, 250ms)

TYPOGRAPHY AND STYLE:
- Page background: #1a1a18
- Section headings: DM Serif Display, large (2rem+), #e8e4db
- Body text: DM Sans, 1rem, line-height 1.65, #e8e4db
- Section cards have padding 2rem, sit on #252523 surface
- On mobile: map collapses to top of page, narrative scrolls below it (not sticky)

Also update web/index.html to load Google Fonts: DM Serif Display, DM Sans, JetBrains Mono.
```

-----

## Prompt 8 — Streetlight data visualizations

```
Read CLAUDE.md before starting.

All data comes from data/processed/streetlight_verified.json.
Before writing any component, read _metadata carefully:
- Check modes_comparable — if false, do NOT put vehicle and ped/bike on same axis
- Check confidence_intervals_available — if true, show error bars on volume charts
- Note the exact output_unit for each mode and use that label in every chart

---

COMPONENT 1: SegmentVolumeChart.jsx

Vehicle volume by segment with confidence intervals.

DATA: streetlight_verified.json → network_performance (All Days, All Day)
      + prediction_intervals for confidence bands

DESIGN:
- Horizontal bar chart, one bar per segment, sorted east-to-west
  (Alameda/Sutter → Stannage/San Pablo)
- Bar color: muted sage (#8a9a78)
- Error bars from lower_95 / upper_95 — thin whiskers, labeled "95% confidence interval"
- Amber left border on Sacramento-to-McGee bar, labeled "Commercial strip —
  proposed parking removal"
- Monospace volume numbers at bar end
- Source label: "Streetlight 2025 · All Vehicles · Average Daily Volume"
- Mark any inferred-volume zones with † and footnote

---

COMPONENT 2: SpeedChart.jsx

Vehicle speeds by segment — the safety evidence.

DATA: streetlight_verified.json → network_performance
      Fields: avg_speed_mph, speed_p85, free_flow_speed_mph
      Day Type: All Days default; Weekday/Weekend toggle

DESIGN:
- Horizontal dot plot: average speed (filled dot) + 85th percentile (open dot),
  connected by thin line — one row per segment
- Color segments amber (#c4713b) where 85th percentile exceeds 25 mph,
  sage (#8a9a78) at or below
- Vertical reference line at 25 mph: "Berkeley Vision Zero target"
- Weekday / Weekend toggle buttons
- Footnote: "85th percentile speed is the California standard measure for
  speed limit setting (CVC §22358.5)"
- Source: "Streetlight 2025 · All Vehicles · Network Performance"
- Do not render speeds for zones where Inferred Volume = Yes

---

COMPONENT 3: CedarDiversionChart.jsx

Suppressed bike demand — cyclists routing around unprotected Hopkins.

DATA: streetlight_verified.json → zone_activity → bicycles (All Days, All Day)
      Distinguish Hopkins zones from parallel route zones (Cedar, Rose)

DESIGN:
- Horizontal bar chart
- Hopkins zones: amber (#c4713b)
- Cedar/Rose zones: slate blue (#6a9bcc), labeled "Cedar St (parallel)"
  or "Rose St (parallel)"
- If output unit is Index (not Volume): axis label must read
  "StreetLight Index (relative activity — not trip counts)"
  and include footnote: "Bicycle and vehicle volumes use different output
  units and cannot be directly compared."
- Source: "Streetlight 2022 · Bicycle · [exact unit from metadata]"

---

File locations:
- web/src/components/SegmentVolumeChart.jsx
- web/src/components/SpeedChart.jsx
- web/src/components/CedarDiversionChart.jsx

Wiring in App.jsx:
- SegmentVolumeChart → Section 1 "Who's on Hopkins"
- SpeedChart → Section 4 "The cost of doing nothing" (alongside CollisionChart)
- CedarDiversionChart → Section 2 "The street doesn't match how people use it"
```

-----

## Prompt 9 — Vercel deployment config (was Prompt 8)

```
Read CLAUDE.md before starting.

Set up Vercel deployment for the /web directory.

1. Create vercel.json at the repo root that:
   - Sets the build root to /web
   - Sets the build command to: npm run build
   - Sets the output directory to: dist
   - Configures SPA routing (all paths → index.html)

2. Update web/package.json if needed to ensure `npm run build` works correctly

3. Create a GitHub Actions workflow at .github/workflows/deploy.yml that:
   - Triggers on push to main
   - Installs dependencies and runs the build
   - Reports build success/failure
   (We'll connect Vercel's GitHub integration separately — this workflow is just for build validation)

4. Add a DEPLOYMENT.md to the repo root with:
   - Steps to connect the repo to Vercel
   - Required environment variables (VITE_MAPBOX_TOKEN)
   - Note that data/raw/ is gitignored and must be populated locally before building
```

-----

-----

## Prompt 10 — "The Record" background section (was Prompt 9)

```
Read CLAUDE.md before starting.

Build a Background section of the site — a standalone page or scrollable section
titled "The Record" that documents the full project history, source library, and
context for the Hopkins Street corridor improvements.

This section serves two purposes: credibility (we engaged with all sides and the
full documentary record) and context (the data story makes more sense with the
history behind it).

---

### DATA SOURCE

All content for this section lives in data/processed/project_history.json.
Import it directly — do not hardcode content into the components.

The JSON has two top-level keys:
- `timeline`: array of events with date, type, description, and sources
- `sources`: object with four keys: government, journalism, advocacy, opposition

---

### COMPONENT 1: ProjectTimeline.jsx

A vertical timeline visualization of the `timeline` array.

DESIGN:
- Left-edge vertical line in muted sage (#8a9a78), 2px
- Each event is a card sitting to the right of the line, connected by a short
  horizontal rule
- Date label: JetBrains Mono, small, muted, uppercase — sits ABOVE the card
- Event title: DM Serif Display, 1.1rem, warm white
- Description: DM Sans, 0.875rem, muted (#8a9a78), line-height 1.6
- Source links below description: small, underlined, slate blue (#6a9bcc)
- Cards use the standard card style (#252523 bg, 1px border, 4px radius)

EVENT TYPE COLOR CODING (left border on card, 3px):
- "fatality"    → deep amber/red (#8b2c2c)
- "policy"      → forest green (#4a7c59)
- "process"     → slate blue (#6a9bcc)
- "controversy" → burnt amber (#c4713b)
- "setback"     → muted sage (#8a9a78)
- "safety"      → forest green (#4a7c59)

INTERACTION:
- Cards are collapsed by default on mobile (show title + date only, expand on tap)
- On desktop: fully expanded
- No animation needed — just CSS show/hide on mobile

PROPS: none (imports data directly)

---

### COMPONENT 2: SourceLibrary.jsx

A tabbed source library organized by the four source categories:
Government Documents | Journalism | Advocacy | Opposition

DESIGN:
- Tab bar: DM Sans, small, letterspaced, uppercase
- Active tab: green accent underline (3px, #4a7c59), not a background fill
- Each source renders as a compact card:
  - Title in warm white, DM Serif Display
  - Organization/outlet + year in monospace muted
  - Summary in DM Sans small
  - "Open source →" link in slate blue
  - If key_facts array is non-empty: render as small bullet list in muted sage
- Opposition tab: include a brief framing note at the top:
  "We read the opposition's arguments carefully. Understanding their concerns
  is essential to responding to them with data."

PROPS: none (imports data directly)

---

### COMPONENT 3: BackgroundPage.jsx

The outer wrapper. Can be either a separate route (/the-record) or a full-page
section below the main scrollytelling story.

Structure:
1. Section header: "The Record" in DM Serif Display, large
   Subhead in DM Sans: "Seven years of process, two fatalities, and one unfinished street."
2. A two-column intro block (on desktop): left column is a short framing paragraph;
   right column is three "at a glance" stat cards:
   - "7 years" — from first fatality (2017) to today
   - "8–1" — Council vote approving the design
   - "36 collisions" — documented on the corridor 2015–2018
   (Use the big-number / small-label pattern from the design system)
3. <ProjectTimeline /> full width
4. <SourceLibrary /> full width

---

### NAVIGATION

Add a minimal top navigation bar:
- Left: site title in DM Serif Display
- Right: two links — "The Data" (main story) | "The Record" (this page)
- Style: #252523 background, 1px bottom border, DM Sans small caps letterspaced
- Active link: green underline, not background fill

If adding routing, use react-router-dom v6. Add to package.json if not present.

FILE LOCATIONS:
- web/src/components/ProjectTimeline.jsx + .css
- web/src/components/SourceLibrary.jsx
- web/src/components/BackgroundPage.jsx
- Update web/src/App.jsx for routing
```

-----

## Notes for all sessions

- Always read CLAUDE.md before starting any task
- Commit after each prompt completes with a descriptive message
- If a prompt requires a decision about data structure, make the most flexible choice and note it in a comment
- The `/data/raw/` directory is gitignored — never commit raw data files
- When the Streetlight data arrives, the primary task will be writing `analysis/mode_split.py` and swapping real data into `ModeSplitChart.jsx` — the `isPlaceholder` prop makes this a clean swap
