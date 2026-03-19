# Hopkins Street Safety — Data Story Project

## Project overview

A public-facing data story advocating for the Hopkins Street corridor safety improvements in Berkeley, CA. The project uses mode-specific volume data (Streetlight), collision records (TIMS/SWITRS), and official city planning documents to make the case that the street improvements — including protected bike lanes and the associated parking reductions — should move forward.

The central argument: **Hopkins is already used by far more people on foot and bike than the parking opposition acknowledges. The street's design has failed those users for years. The data makes the invisible visible.**

Primary audiences: City Council members, general public and neighbors, press.

-----

## Political and project context

- The Hopkins Corridor project has been approved by Berkeley City Council **twice** (May 2022, then again after a reconsideration motion failed in October 2022), but has faced repeated delays due to staffing, political pressure, and unresolved design questions on the commercial strip (McGee to Gilman).
- The core opposition argument centers on **parking loss** — originally estimated at 30–35 spaces, later revised to 60, which was not disclosed before the vote.
- The corridor (Sutter to Gilman, ~1 mile) was formally designated a **high-injury street** in Berkeley's Vision Zero Action Plan (2020).
- Two fatalities occurred in 2017 — one pedestrian at Hopkins/Monterey, one cyclist on Sacramento near Hopkins — which triggered the study. A third fatal collision occurred one block south of Hopkins (California St & Ada) in January 2025, after the project had already been approved and shelved.
- Bike East Bay found **36 collisions from 2015–2018**, 36% involving a pedestrian or cyclist.
- One opposition researcher disputed the "high injury" designation, calling the cited period (2016–2019) an anomaly — our data work should address this directly with a longer time series.
- As of 2025–2026, political winds have shifted: voters passed Measure FF (street safety parcel tax) while rejecting a competing measure with weaker bike/ped commitments.

-----

## Data sources

### In hand (or publicly available now)

|Dataset                        |Source                                                         |URL / Notes                               |
|-------------------------------|---------------------------------------------------------------|------------------------------------------|
|Collision records              |TIMS / SWITRS                                                  |tims.berkeley.edu — free, requires account|
|High Injury Street designation |Berkeley Vision Zero Action Plan (2020)                        |PDF: berkeleyca.gov                       |
|Corridor geometry              |OpenStreetMap / City staff report                              |Sutter St to Gilman St                    |
|Design concept + parking counts|City staff report, May 2022                                    |PDF: berkeleyca.gov                       |
|Policy alignment docs          |Vision Zero, Bicycle Plan, Climate Action Plan, Pedestrian Plan|10+ city documents                        |

### In hand — Streetlight Data

|Dataset                          |File type                                |Modes                            |Year                          |Day parts             |
|---------------------------------|-----------------------------------------|---------------------------------|------------------------------|----------------------|
|Zone Activity volumes            |`za_*.csv`                               |All Vehicles, Pedestrian, Bicycle|Vehicles: 2025; Ped/bike: 2022|All Day + 5 time bands|
|Volume + 95% confidence intervals|`*_prediction_intervals.csv`             |All Vehicles                     |2025                          |All Day only          |
|Speed + congestion by segment    |`*_network_performance_seg_metrics_*.csv`|All Vehicles                     |2025                          |All Day + 5 time bands|
|Zone shapefiles                  |`*.shp` / `*_line.shp`                   |—                                |—                             |Corridor geometry     |

**Speed percentiles available:** 5th, 15th, 85th, 95th (85th = California standard for speed limit setting)

**Day types:** All Days, Weekday (M–Th), Weekend (Sa–Su)

**Day parts:** All Day, Early AM (12am–6am), Peak AM (6am–10am), Mid-Day (10am–3pm), Peak PM (3pm–7pm), Late PM (7pm–12am)

**Attribution required:** All Streetlight data must be labeled "Data from Streetlight" in any public display. WBB signed a data contract.

**Output unit status:** UNVERIFIED — must confirm Volume vs Index for ped/bike modes before any cross-mode comparison. See Prompt 3 audit step.

### In hand — City of Berkeley Traffic Counts

|Dataset                      |Source                                 |Notes                                                              |
|-----------------------------|---------------------------------------|-------------------------------------------------------------------|
|4 PDF traffic count documents|City of Berkeley public records request|Location(s), count methodology, and dates TBD from document content|

These are independent ground-truth counts. Use to validate Streetlight estimates. If they diverge significantly, document and disclose — do not suppress.

-----

## Repo structure

```
/
├── CLAUDE.md               ← this file
├── data/
│   ├── raw/                ← original downloads, never modified
│   │   ├── tims/           ← collision CSVs from TIMS export
│   │   └── streetlight/    ← Streetlight exports when received
│   ├── processed/          ← cleaned, analysis-ready versions
│   └── geo/                ← GeoJSON corridor boundaries, intersection points
├── analysis/
│   ├── collisions.R or .py ← collision data cleaning + analysis
│   └── mode_split.py       ← Streetlight data processing (stub for now)
├── web/
│   ├── src/
│   │   ├── components/     ← React components
│   │   ├── data/           ← processed data as JS/JSON imports
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   └── index.html
├── docs/                   ← reference documents, PDFs, research notes
└── README.md
```

-----

## Tech stack

- **Frontend:** React + Vite
- **Deployment:** Vercel
- **Mapping:** Mapbox GL JS (dark basemap, warm accent markers)
- **Scrollytelling:** Scrollama
- **Charts:** D3 or Recharts
- **Data processing:** Python (pandas, geopandas) or R
- **Styling:** CSS modules or Tailwind — follow the design system below

-----

## Design system

This project follows Jason Vargo's personal design aesthetic. Key rules:

**Colors**

- Background: `#1a1a18` (near-black, warm)
- Surface/cards: `#252523`
- Text: `#e8e4db`
- Accent green (primary): `#4a7c59`
- Accent amber (urgency, collision data): `#c4713b`
- Accent blue (links, info): `#6a9bcc`
- Muted/borders: `#8a9a78`

**Typography**

- Headings: DM Serif Display or Playfair Display
- Body/UI: DM Sans or IBM Plex Sans
- Data labels, numbers, coordinates: JetBrains Mono

**Rules**

- Dark mode is home base for this project (public-facing advocacy tool)
- Cards with `border-radius: 4px`, subtle `1px` borders
- Serif headings, sans-serif body — always
- Data numbers are hero elements: large, monospace, with smaller lighter units
- Map: Mapbox dark basemap, minimal chrome, green primary markers, amber for collision hotspots
- Axes and gridlines barely visible (`rgba(255,255,255,0.08)`)
- No pure black, no pure white, no pill shapes, no purple/violet, no neon

-----

## Narrative structure

The site has two main sections:

### "The Data" — scrollytelling data story (main page)

Five scroll-driven sections:

1. **"Who's on Hopkins?"** — Mode split hero. Even before improvements, a meaningful share of people arriving on Hopkins are not in cars. Time-of-day slider. Headline does the work.
1. **"The street doesn't match how people use it"** — Corridor map showing infrastructure gaps (where bike protection exists vs. doesn't) overlaid with pedestrian and cyclist volume. Tension: people concentrate where protection is worst.
1. **"What's actually at stake with parking"** — Addresses the opposition's core claim head-on. How many spaces lost vs. how many trips arrive by car? How far is the farthest replacement space? Reframes the loss as manageable.
1. **"The cost of doing nothing"** — Collision history mapped spatially. Two fatalities, 36 collisions. Amber/terracotta color for severity. Short and visceral, not overloaded.
1. **"Berkeley already decided"** — Policy alignment callout. Vision Zero, Climate Action Plan, Bicycle Plan, Pedestrian Plan, and six others. Reframes inaction as the anomaly.

### "The Record" — background section (/the-record)

A documented history of the project with:

- **Vertical timeline** of key events from the 2017 fatalities through today, color-coded by event type, with source links at each node
- **Source library** tabbed by category: Government Documents | Journalism | Advocacy | Opposition
- **At-a-glance stats:** "7 years" / "8–1 Council vote" / "36 collisions"

Data for this section lives in `data/processed/project_history.json`.
This section establishes credibility — it shows the work engaged with all sides.

-----

## Key claims to support with data

- [x] The highest pedestrian activity zone on Hopkins is Sacramento to McGee — the exact commercial strip where parking removal is most contested (Streetlight 2022 — pending unit verification)
- [x] Cyclists are diverting to Cedar Street due to lack of protection on Hopkins — protected lanes would consolidate existing desire lines (Streetlight 2022 — pending unit verification)
- [x] Eastern Hopkins segments carry low vehicle volumes — no data justification for current road width allocation (Streetlight 2025)
- [x] The commercial strip is NOT the busiest vehicle segment on the corridor (Streetlight 2025)
- [ ] Vehicle speeds by segment vs. Berkeley's 25 mph Vision Zero target — 85th percentile data available (Streetlight 2025 Network Performance — pending processing)
- [ ] Streetlight volume estimates validated against independent Berkeley traffic counts (city PDFs — pending processing)
- [ ] Collision rate and time series on Hopkins (TIMS — pending data pull)
- [ ] 36 collisions 2015–2018 — verify and extend to full time series (TIMS — pending)
- [ ] Parking spaces lost vs. nearest replacement distance (city docs — already in record)

-----

## Data integrity — non-negotiable

This project is part of a live public policy debate. The analysis will be scrutinized by opponents, journalists, and elected officials. **Fabricated or extrapolated numbers would be worse than no numbers at all** — they would discredit the entire effort and hand ammunition to the opposition.

### Hard rules for every component and every session

1. **Only render data that exists in the source files.** If a number isn't in `data/processed/` or `data/raw/`, it does not appear in the visualization. No estimates, no illustrative placeholders presented as real, no rounding that changes meaning.
1. **Never interpolate between data points to fill gaps.** If we have pedestrian volumes for 8 zones but not time-of-day breakdowns, we show 8 zones. We do not estimate what the time-of-day breakdown might look like.
1. **Clearly label what each number actually is.** Streetlight zone distribution values are not "trips on Hopkins" — they are estimated zone-based activity. The distinction matters. Every chart axis, tooltip, and caption must say exactly what is being measured.
1. **Show data years prominently.** Vehicle data is 2025. Ped/bike data is 2022. These must be labeled in every visualization that uses them. Do not blend the years without explicit disclosure.
1. **Placeholder UI is clearly marked as placeholder.** If a component renders before its data source is available, it must display a prominent visual indicator that it contains no real data. Never style a placeholder to look like findings.
1. **Cite the source on every chart.** "Data from Streetlight" on every Streetlight visualization. "Source: TIMS/SWITRS" on every collision visualization. The attribution is not optional — WBB has a data contract and the analysis must be traceable.
1. **Do not make comparative claims the data doesn't support.** The Streetlight data shows volumes by segment and zone. It does not show mode share percentages, it does not show what share of commercial strip customers arrive by car, and it does not show before/after comparisons. Do not manufacture these from what we have.
1. **Flag data limitations in the UI.** Where the data has known gaps or caveats (ped/bike data is 2022, zone distribution ≠ segment counts, Cedar/Rose are parallel routes not Hopkins), surface that in a visible footnote or info tooltip — not buried in a README.
1. **StreetLight Volume ≠ StreetLight Index — never mix them.** Per Streetlight's own documentation: "Trip Index values for different modes of travel cannot be compared with each other." If vehicle data uses Volume and ped/bike data uses Index (or vice versa), they cannot appear on the same chart implying comparability. The Prompt 3 data audit will determine which output units are present. If modes use different units, keep them in separate visualizations with separate labels. This is a hard rule.
1. **When in doubt, show less.** A chart with fewer claims that are all defensible is better than a chart with more claims that require assumptions.
1. **The `streetlight_summary.json` file was transcribed from screenshots** — not from the raw export. When the full export files land in `data/raw/streetlight/`, recheck every number against them and correct any transcription errors before publishing.

### What we actually have vs. what we can claim

|What the data shows                                             |What we can claim                                                 |What we cannot claim                                |
|----------------------------------------------------------------|------------------------------------------------------------------|----------------------------------------------------|
|Sacramento-to-McGee has highest pedestrian zone activity (1,026)|"Pedestrian activity is highest in the contested commercial strip"|"X% of visitors arrive on foot"                     |
|Cedar carries 266 bike zone trips                               |"Cyclists are using Cedar as a parallel route"                    |"Cedar diverts X% of Hopkins bike demand"           |
|Sacramento-to-McGee vehicle volume: 5,553                       |"Vehicle volume on the commercial strip"                          |"Only X% of commercial strip visitors drive"        |
|36 collisions 2015–2018 (from Bike East Bay citing city staff)  |Cite the secondary source accurately                              |Present as independently verified until we pull TIMS|
|Two fatalities in 2017                                          |State the fact with sourcing                                      |Imply causation without design analysis             |

-----

## Tone and framing guidance

- **Factual, not polemical.** The data should do the arguing. Avoid charged language like "parking NIMBYs" or "bike mafia."
- **Acknowledge the opposition's concerns** — parking matters to businesses, seniors, and hills residents. Don't dismiss this.
- **Center safety and equity.** The corridor connects West Berkeley (historically redlined) to Hopkins amenities, schools, the library. That's a material equity argument.
- **The improvements serve everyone, including drivers.** Narrower lanes + protected tracks → slower speeds → fewer conflicts for all modes.
- **Don't over-claim on the data.** TIMS is a collision record system, not a full exposure dataset. Be transparent about what the data can and cannot show.

-----

## Deployment

**Host:** Vercel (connected to GitHub repo via Vercel GitHub integration)

**Setup steps (one-time):**

1. Go to vercel.com → Add New Project → Import from GitHub
1. Set Root Directory to `web`
1. Build command: `npm run build` | Output directory: `dist`
1. Add environment variable: `VITE_MAPBOX_TOKEN` → your Mapbox token
1. Deploy — every push to `main` auto-deploys; every branch gets a preview URL

**Environment variables required:**

- `VITE_MAPBOX_TOKEN` — get from mapbox.com, free tier is fine for this project

**Domain:** TBD — either a subdomain of vargo.city or a standalone domain for the project

-----

## Current status

- [x] TIMS data pull — Hopkins Street polygon (Sutter to Gilman), 39 collisions 2014–2025
- [x] GeoJSON corridor boundary created — `data/geo/corridor.geojson`
- [x] City staff report and Vision Zero plan PDFs saved to `/docs`
- [x] Web scaffold created (React + Vite + Scrollama)
- [x] Collision analysis script written — `analysis/collisions.py`
- [x] Map component built — `CorridorMap.jsx`, Mapbox dark basemap, segment click → SegmentPanel
- [x] Mode split section built — `SegmentVolumeChart.jsx` (vehicles 2025) + `CedarDiversionChart.jsx` (bicycle 2022)
- [x] Streetlight data received and processed — `data/processed/streetlight_verified.json`
- [x] Speed chart built — `SpeedChart.jsx`, 85th percentile by segment vs 25 mph Vision Zero target
- [x] Parking chart built — `ParkingChart.jsx`, original vs revised estimates, segment-level breakdown
- [x] Community feedback chart built — `CommunityFeedbackChart.jsx`, Workshop 2 (2021), parking ranked 9th
- [x] The Record page built — `BackgroundPage.jsx` with `ProjectTimeline.jsx` + `SourceLibrary.jsx`
- [x] Project history data — `data/processed/project_history.json`, 14 timeline events through 2026
- [ ] Streetlight volume estimates validated against independent Berkeley traffic counts (city PDFs in hand)
- [ ] Parking spaces lost vs. nearest replacement distance (city docs — in record, not yet visualized)

### TIMS data notes

- **Polygon:** Hopkins Street only, Sutter to Gilman. Rose, Cedar, and San Pablo excluded.
- **39 collisions, 0 fatal as coded.** The 2017 fatalities (pedestrian at Hopkins/Monterey; cyclist on Sacramento) are coded to cross-street coordinates in TIMS and fall outside the Hopkins polygon. They are documented in city staff records and cited in the timeline from those sources.
- **2025 corridor-area fatality:** A fatal collision occurred at California St & Ada (one block south of Hopkins) on January 26, 2025. It is in the timeline as a corridor-area event but is NOT in the Hopkins TIMS polygon count.
- **Script:** `analysis/collisions.py` — re-run whenever raw TIMS files are replaced. BBOX in script is set wide enough to pass all TIMS results through; filtering is done by the TIMS polygon at query time.

### Collision figures in public record (all correct, different subsets)

| Figure | Source | Period | Scope |
|--------|--------|--------|-------|
| 39 collisions | TIMS/SWITRS (this project) | 2014–2025 | Hopkins polygon, all severities |
| 36 collisions | Bike East Bay (2018), citing city staff | 2015–2018 | Broader corridor area, all severities |
| 18 injury/fatal | City workshop presentations (March 2022) | 2016–2019 | Corridor, injury + fatal only |

-----

## Contacts and references

- City contact: Farid Javandel, Deputy Director of Public Works for Transportation
- Advocacy: Walk Bike Berkeley (walkbikeberkeley.org), Bike East Bay, North Berkeley Now!
- Opposition: Save Hopkins (savehopkins.org) — understand their arguments
- Key Berkeleyside coverage: see `/docs/research_notes.md`
