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

## Prompt 2 — GeoJSON corridor boundary

```
Read CLAUDE.md before starting.

I need a GeoJSON file representing the Hopkins Street corridor study area for this project.

Create data/geo/hopkins_corridor.geojson with:
- A LineString representing Hopkins Street from Sutter Street to Gilman Street in Berkeley, CA
- Use accurate coordinates for this route (it runs roughly east-west through North Berkeley)
- Key intersection points to include as properties or separate features: Sutter/Henry, The Alameda, Josephine, McGee, Monterey/California, Sacramento, Gilman
- A separate GeoJSON for the two fatality locations: (1) Hopkins/Monterey intersection — pedestrian fatality 2017, (2) Sacramento Ave near Hopkins — cyclist fatality 2017

Also create data/geo/README.md documenting what each file contains and its coordinate reference system (WGS84).

Use accurate Berkeley street geometry. If you're uncertain about exact coordinates for any intersection, note it in the README with [VERIFY] so I can check against the city maps.
```

-----

## Prompt 3 — TIMS collision data processing script

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
   - severity (SWITRS COLLISION_SEVERITY codes → readable labels: fatal, severe_injury, other_injury, property_damage)
   - party_at_fault mode (SWITRS TYPE_OF_COLLISION, PARTY_TYPE fields → pedestrian, cyclist, motor_vehicle, other)
   - victim mode where available
   - year, month, day_of_week, hour
4. Outputs:
   - data/processed/collisions_clean.csv — full cleaned record
   - data/processed/collisions_summary.json — aggregate stats:
     - total collisions by year (2010–present)
     - collisions by severity
     - collisions involving ped or cyclist (victim OR at-fault)
     - collisions by intersection (grouped to nearest named cross-street)
   - data/processed/collisions_geo.geojson — point features with severity and mode as properties

5. Prints a summary to stdout on completion: total records, date range, severity breakdown, ped/cyclist involvement count

Include a requirements.txt for the analysis/ directory.

Use pandas and geopandas. Write clean, commented code — this script may be shared.
```

-----

## Prompt 4 — Base map component

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

## Prompt 5 — Collision visualization component

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

## Prompt 6 — Scrollama page shell

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

## Prompt 7 — Streetlight data visualizations (REAL DATA — no placeholder needed)

```
Read CLAUDE.md before starting.

Streetlight data has been received. Build two components using real data from
data/processed/streetlight_summary.json. Import the JSON directly.

Attribution is required in both components: "Data from Streetlight" must appear
as a visible data source label. The vehicle data is 2025; ped and bike data are 2022.
Note the year difference where both appear together.

---

COMPONENT 1: SegmentVolumeChart.jsx

Shows vehicle, pedestrian, and bicycle volumes side by side by corridor segment.
This is the "who's on Hopkins" evidence — what each mode is doing, where.

DATA:
- vehicle_volumes.segments (2025)
- pedestrian_volumes.zones (2022)
- bicycle_volumes.zones (2022)

Note: vehicle data is segment-based; ped/bike are zone-based. They roughly
correspond. Match by segment label where possible; note any mismatches.

DESIGN:
- Three grouped horizontal bars per segment, one row per segment
  (or a small-multiples approach with three separate bar charts side by side)
- Sort segments east-to-west (Alameda/Sutter → Stannage/San Pablo)
  so the map orientation matches a viewer looking west down Hopkins
- Colors: vehicles in muted sage (#8a9a78), pedestrians in forest green (#4a7c59),
  cyclists in amber (#c4713b)
- Highlight the Sacramento-to-McGee row with a subtle amber left border or
  background tint — this is the commercial strip, the contested zone
- Annotate: "Highest pedestrian activity" label on that row
- Monospace numbers, DM Sans labels
- Data source label: "Vehicle data: Streetlight 2025 | Ped/bike data: Streetlight 2022"

KEY CALLOUT to render above the chart:
"The blocks with the most foot traffic are the same blocks where parking
 removal is proposed — and where cyclists have no protection today."

---

COMPONENT 2: CedarDiversionChart.jsx

Makes the suppressed bike demand argument visually explicit.
Shows that Cedar Street carries significant bike volume — not because Cedar is
preferred, but because Hopkins has no protection.

DATA:
- bicycle_volumes.zones — show Hopkins segments alongside Cedar and Rose parallel routes
- Flag parallel_route: true entries distinctly

DESIGN:
- Simple horizontal bar chart
- Hopkins segments: amber (#c4713b)
- Cedar/Rose parallel route bars: slate blue (#6a9bcc), with a label "Cedar St (parallel route)"
- Annotation on Cedar bar: "Cyclists avoiding unprotected Hopkins"
- A callout box or pull-quote below the chart:
  "Cedar Street carries as many cyclists as several Hopkins segments —
   because Hopkins offers no protection. These are not new cyclists.
   They are Hopkins cyclists using a detour."
- Data source: "Streetlight 2022"

---

File locations:
- web/src/components/SegmentVolumeChart.jsx
- web/src/components/CedarDiversionChart.jsx

Wire both into App.jsx in Section 1 ("Who's on Hopkins") and Section 2
("The street doesn't match how people use it") respectively.
```

-----

## Prompt 8 — Vercel deployment config

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

## Prompt 9 — "The Record" background section

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
