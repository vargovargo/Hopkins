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

---

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

---

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

---

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

---

## Prompt 3b — City of Berkeley traffic count PDFs

```
Read CLAUDE.md before starting.

The City of Berkeley provided four PDFs of traffic count data via a public
records request. All dated 2019-09-27. Location: Hopkins St between Stannage
Ave and Cornell Ave (near 1154 Hopkins). Produced by Traffic Counts Plus.

FILE NAMING CONVENTION (confirmed):
  S_  prefix = speed / motor vehicle counts
  C_  prefix = cycling counts
  WB  suffix = westbound
  EB  suffix = eastbound

Files: S_WB, S_EB, C_WB, C_EB — confirm exact filenames from data/raw/city_counts/

---

SPEED FILE STRUCTURE (S_ prefix files)

24-hour speed-binned count tables. Layout:
- Column headers: speed bin lower bounds in mph (1, 9, 11, 13, 15, 17, 19,
  21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45...)
  Each pair defines a bin: 1-8 mph, 9-10 mph, 11-12 mph, etc.
- Leftmost column: hour of day (00:00 through 23:00)
- Cell values: count of vehicles at that speed during that hour
- Bottom statistics block: 15th/50th/85th/95th percentile speeds, mean speed,
  pace speed range, number and percent of vehicles > 25 MPH

IMPORTANT — S_EB FILE HAS TWICE AS MANY PAGES:
S_EB contains 16 pages total: first 8 labeled "EASTBOUND", second 8 labeled
"Direction 2". This is a common artifact from bidirectional pneumatic tube
counters — the tube captures both directions and the counter logs them
separately. Direction 2 is likely westbound traffic captured by the EB sensor.

Process S_EB as three separate datasets:
  1. S_WB (from S_WB file) — westbound, primary
  2. S_EB EASTBOUND (pages 1-8) — eastbound, primary
  3. S_EB Direction 2 (pages 9-16) — likely westbound, label as
     "Direction 2 (S_EB counter — direction unconfirmed)"

Cross-check Direction 2 against S_WB:
- If 85th percentile speeds within 2 mph AND daily totals within 10%:
  note "Direction 2 consistent with S_WB — likely independent westbound
  measurement. Agreement strengthens confidence in both."
- If they diverge significantly: flag without drawing conclusions.
Do NOT assume or assert Direction 2 = westbound — let the data confirm it.

CONFIRMED VALUES from S_WB screenshot:
  Total vehicles:      3,815
  15th percentile:     18 MPH
  50th percentile:     24 MPH
  85th percentile:     29 MPH
  95th percentile:     31 MPH
  Mean speed:          24 MPH
  Pace speed:          21-30 MPH (70.1% of vehicles)
  Vehicles > 25 MPH:   1,881
  Percent > 25 MPH:    49.3%
  Peak hour:           08:00 (420 vehicles)

Use confirmed values for S_WB — do not re-extract if they match.
Extract equivalent statistics from S_EB EASTBOUND and S_EB Direction 2.
Also extract hourly totals for all three for time-of-day profiling.

PROCESSING:
1. Parse speed bin columns — reconstruct labels as ranges
   (e.g. col "9" → "9-10 mph", col "11" → "11-12 mph")
   For the last column use "[N]+ mph"

2. For each hour compute:
   - total_vehicles (sum across bins)
   - vehicles_over_25 (sum where bin lower bound >= 25)
   - pct_over_25

3. Use the document's statistics block as authoritative for percentiles

Save:
  data/processed/city_counts_speed_WB.csv
  data/processed/city_counts_speed_EB.csv
  data/processed/city_counts_speed_EB_direction2.csv
  data/processed/city_counts_speed_summary.json
  (summary includes all three datasets, direction labels, and the
  WB vs Direction-2 consistency check result)

---

VEHICLE CLASSIFICATION FILE STRUCTURE (C_ prefix files)

NOTE: "C_" stands for Classification, not Cycling. These are vehicle
classification counts by axle configuration — not bicycle data.

Confirmed column structure (westbound):
  Motor, Cars & Trailers, 2 Axle Long, Buses, 2 Axle 6-Tire Single,
  3 Axle Single, 4 Axle Single, <5 Axl Double, 5 Axle Double,
  >6 Axl Double, <6 Axl Multi, 6 Axle Multi, >6 Axl Multi, Not Classed, Total

Confirmed values from C_WB:
  Total vehicles: 3,815 (matches S_WB total — confirms same count period)
  Cars & Trailers: 3,258 (85.4% of traffic)
  2-Axle Long (trucks/vans): 405 (10.6%)
  Buses: 15 (0.4%)
  AM Peak: 08:00, 420 vehicles
  PM Peak: 17:00, 327 vehicles

PROCESSING for C_ files:

1. Extract hourly totals by vehicle class
2. Calculate percentage breakdown for the daily total
3. Identify the "passenger vehicle" share (Motors + Cars & Trailers)
   vs. "commercial/freight" share (trucks, buses, multi-axle)

Save:
  data/processed/city_counts_classification_WB.csv
  data/processed/city_counts_classification_EB.csv

Add to city_counts.json:
  "classification": {
    "WB": {
      "total": 3815,
      "passenger_vehicles_pct": "[Motors + Cars & Trailers] / total",
      "commercial_pct": "[all truck/bus classes] / total",
      "not_classed_pct": 1.6,
      "am_peak_hour": "08:00",
      "am_peak_volume": 420,
      "pm_peak_hour": "17:00",
      "pm_peak_volume": 327,
      "hourly": [ ... ]
    },
    "EB": { ... }
  }

IMPORTANT CORRECTION to data_integrity_notes.md:
  "City count C_ files are vehicle classification counts, not cycling counts.
   No independent cycling counts are available from the city records request
   for this location. Bicycle activity data comes from Streetlight 2022 only."

This means the site has no independent validation for bicycle volumes —
note this limitation clearly wherever bicycle data is displayed.

---

BUILD: data/processed/city_counts.json

{
  "_metadata": {
    "source": "City of Berkeley — Traffic Counts Plus",
    "contact": "mietekm@comcast.net",
    "location": "Hopkins St between Stannage Ave and Cornell Ave (near 1154 Hopkins)",
    "count_date": "2019-09-27",
    "coverage_note": "Single location (Stannage-Cornell only). Single 24-hour count. Does not cover full corridor.",
    "scope_warning": "2019 data. Pre-COVID. Cannot directly validate Streetlight 2022-2025 estimates. Use as historical reference and partial cross-check for Stannage-Cornell segment only.",
    "file_types": {
      "S_WB_S_EB": "Speed-binned vehicle counts — speed distribution by hour",
      "C_WB_C_EB": "Vehicle classification counts — axle/type breakdown by hour. NOTE: C_ = Classification, not Cycling. No bicycle counts in this dataset."
    },
    "directions": ["WB", "EB"],
    "no_bicycle_data": true,
    "bicycle_data_source": "Streetlight 2022 only — no independent validation available"
  },
  "speed": { "WB": { ...stats + hourly... }, "EB": { ... } },
  "classification": { "WB": { ... }, "EB": { ... } }
}

---

STREETLIGHT COMPARISON — scoped correctly

The Streetlight network performance data has 85th percentile speed for
Stannage-to-San Pablo (2025). The city count covers Stannage-to-Cornell
(a subset of that segment) in 2019.

Compare 85th percentile speeds where geographically overlapping:
  City count WB 2019:  29 MPH
  Streetlight 2025:    [pull from data/processed/network_performance.csv,
                        zone "Stannage to San Pablo"]

Document in data/processed/data_integrity_notes.md under
"Speed Cross-Validation: City Counts vs Streetlight":
- Geographic note: Stannage-Cornell is within Stannage-San Pablo zone
- Time gap: 6 years, COVID intervened
- If within ~5 mph: "broadly consistent across different methodologies and years"
- If diverges > 5 mph: explain likely reasons, present both with metadata
- Do not average or reconcile — present both with full provenance

KEY CITABLE FINDING — flag prominently:
  "49.3% of westbound vehicles exceeded Berkeley's 25 mph Vision Zero target
   at Hopkins/Stannage-Cornell in a city-commissioned count, September 2019."
  Source: "City of Berkeley traffic count, Traffic Counts Plus, 2019-09-27"

This is independent of Streetlight. Cite it separately and specifically.
Surface it in data_integrity_notes.md for use in the site UI.
```

---

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

---

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

---

## Prompt 6 — Collision visualization component

```
Read CLAUDE.md before starting.

DESIGN RATIONALE (read before building):
Three different collision figures appear in the public record — 51 total (TIMS
full dataset), 36 (Bike East Bay citing city staff, 2015–2018), and 18
(city workshop presentations, injury/fatal only, 2016–2019). All three are
correct; they measure different time periods and severity subsets. The
opposition has scrutinized this data and will notice if the chart conflates
them. The heading must pull the TIMS total (51) — hardcoding 36 would be
wrong and attributable to the wrong source. The four-stack bar chart
(including property-damage-only as a distinct layer) makes clear the chart
is showing all severities, not just the injury/fatal subset the city cited.
The two period annotations mark the different date ranges used in each
secondary source. The mandatory footnote is the primary defense against
misuse — do not remove or shorten it.

Build web/src/components/CollisionChart.jsx

This component visualizes TIMS collision data for the Hopkins corridor.
Serious, factual, not sensational. Data integrity is critical here — the
opposition has scrutinized this data and will notice inconsistencies.

DATA: data/processed/collisions_summary.json (import directly)

CRITICAL — THREE DISTINCT COLLISION SUBSETS:
Three different figures appear in the public record, all correct, all
measuring different things. The component must distinguish them clearly
and never mix them.

  1. ALL COLLISIONS (TIMS full dataset):
     - What: every collision in the corridor bounding box, all severities
     - Source: TIMS/SWITRS, pulled for this project
     - Use for: the timeline bar chart (full time series)
     - Label as: "All collisions including property damage only"

  2. INJURY + FATAL SUBSET (city workshop figures):
     - What: collisions resulting in injury or death only
     - Source: SWITRS 2016–2019, cited in Workshop 4.2 and 4.3 (March 2022)
     - Figures: 18 collisions, 78% involving ped or cyclist
     - Use for: the "city's cited period" annotation and workshop reference
     - Label as: "Injury and fatal collisions only, 2016–2019 (city workshop data)"

  3. ALL COLLISIONS CITED BY BIKE EAST BAY (secondary source):
     - What: all collisions 2015–2018
     - Source: Bike East Bay citing city staff, 2018
     - Figures: 36 collisions, 36% involving ped or cyclist
     - Use for: historical reference only — superseded by TIMS pull
     - Label as: "All collisions 2015–2018 (Bike East Bay, citing city staff)"
     - Note: TIMS pull is primary — Bike East Bay figure is secondary source

The heading should reflect TIMS data, not the secondary source.
Pull the actual total from collisions_summary.json — do not hardcode 36.

---

DESIGN:

Heading: "[N] Collisions. Two Lives Lost." — N from collisions_summary.json total
Subhead: "Hopkins Corridor · [date range from data] · Source: TIMS/SWITRS"

VISUALIZATION 1 — Timeline bar chart (full TIMS dataset):
- Stacked bars by year, full time series (all years in data)
- Stack layers: property_damage_only (sage #8a9a78), other_injury (amber #c4713b),
  severe_injury (deep amber #a85a2a), fatal (deep red #8b2c2c)
- Annotate 2015–2018 with subtle shaded region, label:
  "Bike East Bay cited period (all collisions)"
- Annotate 2016–2019 with a second subtle bracket, label:
  "City's cited period (injury/fatal only)"
- Gridlines rgba(255,255,255,0.08), x-axis years, y-axis count
- Legend below chart showing all four severity colors

VISUALIZATION 2 — Stat callout row:
Pull these from collisions_summary.json — do NOT hardcode:
  - Total collisions (full TIMS dataset, all years, all severities)
  - Percent involving ped or cyclist
  - Total fatalities
Each stat: large monospace number (#c4713b), small DM Sans label below

FOOTNOTE (required — renders below the chart):
"Three collision figures appear in public discussion of this corridor:
(1) [N] total collisions, all severities, [date range] — this chart, source: TIMS/SWITRS.
(2) 36 collisions, all severities, 2015–2018 — Bike East Bay citing city staff (2018).
(3) 18 injury and fatal collisions, 2016–2019 — City workshop presentations (March 2022).
All three figures are correct — they measure different time periods and severity subsets."

This footnote is non-negotiable. It preempts the most likely attack surface.

PROPS:
- data: collisions_summary.json (with import fallback)

Export as default.
```

---

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

---

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

---

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

---

---

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

---

## Prompt 11 — Interactive segment panel on map click

```
Read CLAUDE.md before starting.

Add click interactivity to the corridor map so that clicking a segment
surfaces the relevant design proposal and data for that segment.

Also read data/processed/parking_data.json before writing segments.js —
use the verified parking figures from that file, not values from memory.

---

### DATA

Create web/src/data/segments.js — a structured data file containing
the per-segment information. This is sourced from the May 2022 city
staff report and Workshop 4.3 presentation (public documents). Do not
fabricate any design details — use only what is documented.

export const SEGMENTS = [
  {
    id: "sutter-alameda",
    label: "Sutter St to The Alameda",
    character: "Residential — single-family homes, North Branch Library",
    proposed_design: {
      southside: "Parking-protected bike lane (eastbound/uphill)",
      northside: "Class II buffered bike lane (westbound/downhill)",
      parking: "Retained on both sides",
      intersection_treatment: "Modified Alameda intersection — beveled curbs, rose-colored islands"
    },
    parking_impact: "No net loss",
    parking_spaces_lost: 0,
    source_page: 3,
    source_doc: "Hopkins Corridor Project Conceptual Design, May 2022",
    streetlight: {
      vehicle_volume_daily: null, // populate from streetlight_verified.json
      note: "Eastern end — lowest vehicle volumes on corridor"
    },
    design_images: [], // array of Cloudinary URLs, east to west — populated in data/processed/parking_data.json and data/geo/corridor.geojson
    intersection_image: null // image of the western intersection treatment
  },
  {
    id: "alameda-mcgee",
    label: "The Alameda to McGee Ave",
    character: "Transitional — residential to commercial approach",
    proposed_design: {
      southside: "Two-way protected bikeway with buffer zone",
      parking: "Most on-street parking retained both sides",
      lane_width: "Narrowed from 11ft to 10.5ft",
      intersection_treatment: "Bulbouts at Josephine St, raised crosswalk"
    },
    parking_impact: "Minimal loss",
    parking_spaces_lost: null, // exact count requires design map images
    source_page: 3,
    source_doc: "Hopkins Corridor Project Conceptual Design, May 2022",
    streetlight: {
      vehicle_volume_daily: null,
      note: null
    },
    design_images: [], // array of Cloudinary URLs, east to west — populated in data/processed/parking_data.json and data/geo/corridor.geojson
    intersection_image: null // image of the western intersection treatment
  },
  {
    id: "mcgee-monterey",
    label: "McGee Ave to Monterey Ave",
    character: "Commercial strip approach",
    proposed_design: {
      southside: "Bi-directional protected bikeway, protected by parked vehicles",
      parking: "All parking retained on south side except one stall",
      loading: "Buffer zone for separation and loading"
    },
    parking_impact: "One space lost",
    parking_spaces_lost: 1,
    source_page: 3,
    source_doc: "Workshop 4.3, March 14 2022",
    streetlight: {
      vehicle_volume_daily: null,
      note: "Sacramento to McGee — highest pedestrian zone on corridor"
    },
    design_images: [], // array of Cloudinary URLs, east to west — populated in data/processed/parking_data.json and data/geo/corridor.geojson
    intersection_image: null // image of the Monterey Ave intersection treatment
  },
  {
    id: "monterey-gilman",
    label: "Monterey Ave to Gilman St",
    character: "Commercial strip core — most contested blocks",
    proposed_design: {
      southside: "Bi-directional bikeway protected by raised concrete median",
      parking: "All parking removed both sides",
      intersection_treatment: "Bulbout at California/Monterey, raised crosswalk across Monterey (fatality location), raised median on northeast corner"
    },
    parking_impact: "All on-street parking removed",
    parking_spaces_lost: null, // exact count requires design map images
    parking_spaces_retained: 0,
    fatality_note: "2017 pedestrian fatality at Hopkins/Monterey — raised crosswalk proposed here",
    source_page: "3-4",
    source_doc: "Workshop 4.3, March 14 2022",
    streetlight: {
      vehicle_volume_daily: null,
      note: "Site of 2017 pedestrian fatality at Hopkins/Monterey"
    },
    design_images: [], // array of Cloudinary URLs, east to west — populated in data/processed/parking_data.json and data/geo/corridor.geojson
    intersection_image: null // image of the Monterey Ave intersection treatment (shared with mcgee-monterey)
  }
]

export const SOURCE_DOC = {
  title: "Hopkins Corridor Project Conceptual Design",
  organization: "City of Berkeley City Manager's Office",
  date: "May 10, 2022",
  url: "https://berkeleyca.gov/sites/default/files/2022-04/2022-05-10%20Item%2033%20Hopkins%20Corridor%20Project.pdf"
}

Populate vehicle_volume_daily from data/processed/streetlight_verified.json
where zone names match. Use null where no match. Do not estimate.

---

### COMPONENT: SegmentPanel.jsx

A panel appearing when a map segment is clicked.

TRIGGER: User clicks on a corridor segment line on the map.

LAYOUT (mobile — bottom sheet sliding up from bottom):
- Drag handle at top
- Segment label in DM Serif Display
- Character description in DM Sans muted small
- "Proposed design" section — two columns: treatment label (muted) + value
- Parking impact line: amber (#c4713b) if parking removed, green (#4a7c59) if retained
- If parking_spaces_lost is null: show "Exact count pending — design maps required"
  in muted text rather than showing nothing or a wrong number
- If vehicle volume data exists: show as a small inline stat with source label
- If design_images is non-empty: show images as a horizontal scrollable strip with caption; if only one image, just show it full-width. Below the images (or below the single image), show a visible caveat in muted text: "These drawings show the 2022 conceptual design approved by City Council. Detailed engineering design is ongoing — final designs may differ. Source: City of Berkeley, May 2022."
- If segment has fatality_note: show amber note with warning icon
- "Source" row at bottom: document title, date, "View PDF →" link
- Close button (×) top right

LAYOUT (desktop — right panel, 280px wide, slides in from right):
- Same content, vertical layout
- Stays open until user clicks elsewhere or closes

DESIGN:
- Panel background: #252523
- 1px border top (mobile) or left (desktop): rgba(255,255,255,0.1)
- Heading: DM Serif Display 1.1rem
- Labels: DM Sans small caps letterspaced muted (#8a9a78)
- Values: DM Sans regular warm white (#e8e4db)
- Parking removed: amber (#c4713b)
- Parking retained: forest green (#4a7c59)
- Source link: slate blue (#6a9bcc)
- Transition: slide in 200ms ease, slide out 150ms ease

---

### MAP CHANGES: CorridorMap.jsx

1. Split corridor GeoJSON into individual segment features (one per SEGMENTS
   entry) with id matching SEGMENTS[].id as a GeoJSON property.
   If already segmented from Prompt 2, verify IDs match.

2. Add transparent hit area layer (lineWidth: 20, opacity: 0) for easier
   mobile tapping without changing visual appearance.

3. On segment click:
   - Set selectedSegment state to clicked segment id
   - Highlight clicked segment (lineColor: brighter green, lineWidth: 6)
   - Open SegmentPanel with matching SEGMENTS data

4. On map click outside segment: clear selectedSegment, close panel,
   return to default style

5. "Tap a segment" hint label — appears 3 seconds on first load then fades

---

### WIRING

- selectedSegment state in App.jsx, passed as props
- scroll-driven highlightSegment and click-selected use different visual
  treatments (color shift vs color + width) — both can be active
- File locations:
  web/src/data/segments.js (new)
  web/src/components/SegmentPanel.jsx (new)
  web/src/components/SegmentPanel.css (new)
  web/src/components/CorridorMap.jsx (updated)
```

---

## Prompt 12 — Community feedback visualization

```
Read CLAUDE.md before starting.

Build web/src/components/CommunityFeedbackChart.jsx

This component displays the community priority feedback from Workshop 2
(March 2021). It belongs in Section 3 "What's actually at stake with parking"
because it directly addresses the opposition's claim that the community's
primary concern is parking.

DATA: data/processed/community_feedback_workshop2.json (import directly)

CRITICAL CAVEATS — must be reflected in the UI:

1. APPROXIMATE VALUES: The data was read from a chart image, not a data
   table. Every display of these numbers must be visually labeled as
   "approximate" — a small "(approx.)" suffix or a footnote is required.
   Do not display these as precise counts.

2. TIMING: This feedback is from March 2021 — before specific parking
   removal numbers were proposed. The opposition's intensity grew later
   as the design became concrete. The chart shows early-process community
   priorities, not a settled verdict on parking. A visible note is required.

3. SOURCE: City of Berkeley Workshop 2, March 10 2021. Label clearly.

---

DESIGN:

Heading: "What the community said it wanted"
Subhead: "Workshop 2 participant feedback · March 2021 · City of Berkeley"
Small caveat line below subhead: "Values are approximate — estimated from
city workshop chart. Reflects early-process community input before specific
design proposals were finalized."

VISUALIZATION — Horizontal bar chart:
- One bar per feedback item, sorted by total (descending, as in original)
- Color bars by category:
    safety: forest green (#4a7c59)
    parking: amber (#c4713b) — makes parking visually distinct
    vehicle: muted sage (#8a9a78)
    placemaking: slate blue (#6a9bcc)
    transit/other: warm brown (#7a6b5d)
- Parking Improvement bar gets an additional label: "Ranked 9th"
- Pedestrian Crossing Safety bar gets label: "Ranked 1st"
- X axis: approximate count. Y axis: issue labels (left-aligned, DM Sans small)
- No gridlines — clean, readable

CALLOUT above the chart (amber card):
"Parking ranked 9th out of 16 community concerns.
Pedestrian safety, speeding, and cyclist safety ranked 1st, 2nd, and 3rd."

SOURCE + CAVEAT footnote (required):
"Source: City of Berkeley Hopkins Corridor Workshop 2, March 10 2021.
Values are approximate counts estimated from the city's published chart —
not exact figures. Feedback reflects community input from early 2021,
before specific parking removal numbers were proposed."

Link: "View original city document →" pointing to the PDF URL

---

WIRING:
- Place in Section 3 "What's actually at stake with parking"
- Renders after the parking space count visualization
- The juxtaposition is the argument: here's what spaces are lost,
  here's what the community said it actually cared about

File: web/src/components/CommunityFeedbackChart.jsx
Export as default.
```

---

## Notes for all sessions

- Always read CLAUDE.md before starting any task
- Commit after each prompt completes with a descriptive message
- If a prompt requires a decision about data structure, make the most flexible choice and note it in a comment
- The `/data/raw/` directory is gitignored — never commit raw data files
- When the Streetlight data arrives, the primary task will be writing `analysis/mode_split.py` and swapping real data into `ModeSplitChart.jsx` — the `isPlaceholder` prop makes this a clean swap
