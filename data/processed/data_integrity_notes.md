# Data Integrity Notes — Hopkins Street Safety Project

This file documents data quality issues, cross-source discrepancies, and
methodological caveats for the Hopkins Street data story. It is updated
automatically by the processing scripts and manually as issues are discovered.

It may be surfaced in the site's methodology note. Every discrepancy is
documented here — none are suppressed.

---

## Standing Data Integrity Rules

Per CLAUDE.md (non-negotiable):

1. Only render data that exists in source files — no estimates or illustrative placeholders presented as real.
2. Never interpolate between data points to fill gaps.
3. Label every number for what it actually is (zone distribution ≠ segment count).
4. Show data years prominently — vehicle data is 2025, ped/bike data is 2022.
5. Cite the source on every chart. "Data from Streetlight" / "Source: TIMS/SWITRS".
6. StreetLight Volume ≠ StreetLight Index — never mix them on the same axis.
7. `streetlight_summary.json` was transcribed from screenshots — all values must be verified against raw exports before publication.

---

## Streetlight Data Status

**Status:** VERIFIED — 2026-03-20

All three modes confirmed as StL Volume (not Index) via audit of Analysis.txt files in raw CSVs. All 16 ped/bike All Days / All Day zone values spot-checked against raw CSV exports — zero mismatches. See `_metadata.notes` in `data/processed/streetlight_verified.json`.

**Output unit status:**
- Vehicle data: `Average Daily Segment Traffic (StL Volume)` — Analysis 2012902
- Pedestrian data: `StL Pedestrian Volume` — Analysis 2013191
- Bicycle data: `StL Bicycle Volume` — Analysis 2013334

**Cross-mode comparability:** VALID in unit terms. All three modes use StL Volume. Structural caveat remains: vehicle data is segment-based (network performance); ped/bike are zone-based (zone activity). This must be disclosed in any UI showing modes together.

**Remaining action:**
- Streetlight volume estimates vs. independent Berkeley traffic counts still pending (city PDFs processed for speed; volume comparison not yet done — see City of Berkeley Traffic Counts Status below).

---

## City of Berkeley Traffic Counts Status

**Status:** PROCESSED — 2026-03-18

Four PDFs processed from public records request (Traffic Counts Plus, pneumatic tube count, Hopkins St between Stannage Ave and Cornell Ave, 2019-09-26 to 2019-10-03). Output files:
- `data/processed/city_counts.json` — full structured data
- `data/processed/city_counts_speed_summary.json` — site-facing speed summary
- `data/processed/city_counts_speed_WB.csv` — WB hourly data (primary day 09/27/19)
- `data/processed/city_counts_speed_EB.csv` — EB hourly data (primary day 09/27/19)

**Key finding:** 85th percentile speed = 29 MPH both directions (4 MPH over 25 MPH Vision Zero target). 49.3% WB / 51.9% EB exceeded 25 MPH on primary day. Independent of Streetlight.

**Streetlight comparison:** PENDING — Streetlight network_performance.csv not yet processed. Do not compare numerically until processed; present both sources with full provenance.

**Comparison goal:** Validation, not reconciliation. If city counts and
Streetlight estimates disagree, we document it and explain why. We do not
average the sources or select the more favorable number.

---

## TIMS Collision Data Status

**Status:** PROCESSED — 2026-03-20

TIMS export pulled and processed via `analysis/collisions.py`. Output files:
- `data/processed/collisions_clean.csv` — 53 collision-level records, 2014–2025
- `data/processed/collisions_summary.json` — aggregate statistics
- `data/processed/collisions_geo.geojson` — point features for map

**Key figures (from collisions_summary.json):**
- 53 total collisions, 2 fatal, date range 2014-04-12 to 2025-12-12
- 36 of 53 collisions (67.9%) involved a pedestrian or cyclist
- NOTE: The 36 ped/cyclist collision figure here is a coincidence of numbers — it is NOT the same as the Bike East Bay "36 total collisions 2015–2018" figure. Do not conflate.

**Geographic scope caveat — important:**
The script applies a bounding box filter (lat 37.875–37.892, lon -122.300 to -122.270), NOT a strict Hopkins-only polygon. Some records from adjacent streets are included:
- The 2017 cyclist fatality (Sacramento/Ada, CASE_ID 7200177) IS in the dataset
- The 2025 pedestrian fatality (California/Ada, CASE_ID 9866852) IS in the dataset
- A handful of records from Gilman/Acton, Solano Ave, and Sacramento/Ada area are included
- The 2017 pedestrian fatality (Hopkins/Monterey) does NOT appear as fatal in the dataset

The CollisionChart.jsx footnote is accurate: it only states the 2017 pedestrian falls outside the polygon, and describes the other two fatalities as occurring "on or near" the corridor.

---

## Known Data Gaps

| Gap | Impact | Resolution |
|-----|--------|------------|
| TIMS bounding box includes some non-Hopkins records | Total collision count (53) includes records from Sacramento/Ada, California/Ada, Gilman/Acton area | Document in chart footnote; consider polygon refinement on future re-pull |
| No Streetlight data for Monterey Ave segment | Fatality location may not appear in zone data | Fatality coordinates are in corridor.geojson |
| City count single location (Stannage-Cornell) | Cannot validate commercial strip Streetlight estimates | Use as independent speed corroboration only |
| Streetlight volume vs. city count volume not yet compared | Cannot confirm Streetlight vehicle volume accuracy | Process network_performance.csv for Stannage–San Pablo zone and compare |
| Streetlight stannage_sanpablo segment has no ped/bike data | Gap in corridor-wide multimodal picture | Document in chart footnotes |

---

*This file is updated by `analysis/streetlight.py` and `analysis/city_counts.py`.*
*Manual additions are marked with the date they were added.*

---

## ⚑ KEY CITABLE FINDING — City Traffic Count, Independent of Streetlight

**49.3% of westbound vehicles exceeded Berkeley's 25 mph Vision Zero target at Hopkins/Stannage-Cornell in a city-commissioned count (Traffic Counts Plus, 2019-09-27). 85th percentile speed = 29 MPH, which is the California standard for speed limit setting.**

- WB 85th percentile: 29 MPH (4 MPH over the 25 MPH Vision Zero target)
- EB 85th percentile: 29 MPH (same)
- WB vehicles over 25 MPH on primary day: 1,881 of 3,815 (49.3%)
- EB vehicles over 25 MPH on primary day: 1,891 of 3,643 (51.9%)
- Source: City of Berkeley, Traffic Counts Plus, mietekm@comcast.net, 2019-09-27
- **This is independent of Streetlight. Cite separately and specifically in site UI.**

---

## City Count C_ Files — Classification Not Cycling

*Added 2026-03-18*

- The C_ prefix in city count filenames stands for vehicle **Classification** (axle-configuration vehicle type breakdown), NOT **Cycling**.
- Files C_Hopkins_WB and C_Hopkins_EB contain counts of vehicle types: motorcycles, cars and trailers, 2-axle long trucks/vans, buses, multi-axle commercial vehicles, etc.
- **No bicycle counts exist in the city records request dataset.**
- Bicycle data for this project comes from Streetlight 2022 zone activity files only.
- No independent ground-truth validation for bicycle volumes is currently available from the city count dataset.
- This limitation must be noted wherever bicycle data is displayed in the site UI.

---

## Speed Cross-Validation: City Counts vs. Streetlight

*Added 2026-03-18*

- **Geographic alignment:** Stannage-Cornell count location is within the Stannage–San Pablo zone used in Streetlight network performance data. Zones are not identical to point locations — disclose this.
- **Time gap:** City count is 2019 (pre-COVID). Streetlight vehicle data is 2025. Six years separate the datasets; COVID-era travel disruption occurred in between.
- **City count result:** WB 85th percentile = 29 MPH; EB 85th percentile = 29 MPH (2019-09-27, full-day count)
- **Streetlight comparison:** PENDING — `vehicles_network_performance.csv` not yet processed for speed percentiles. Compare Stannage–San Pablo zone 85th percentile speed (2025) against city count WB 85th = 29 MPH (2019) when available.
- **Do not present as direct validation.** Present both sources with full provenance when Streetlight speed data is processed.
- If Streetlight and city count speeds diverge significantly, document and disclose — do not suppress.

---

## City Traffic Counts — Scope and Limitations

*Added 2026-03-18*

- **Single location only:** The city count covers Hopkins St between Stannage Ave and Cornell Ave (near 1154 Hopkins). This is west of the most contested segment (Sacramento–McGee commercial strip) and west of the project corridor boundary (Sutter–Gilman).
- **Count period:** 2019-09-26 to 2019-10-03 — a week-long continuous pneumatic tube count. This is NOT a single-day snapshot.
- **Pre-COVID travel patterns:** 2019 vehicle volumes and speeds reflect pre-pandemic conditions. Travel patterns shifted post-COVID and have not fully returned to 2019 baselines everywhere.
- **Streetlight data years:** Vehicle data is 2025; ped/bike data is 2022. These datasets cannot be directly compared to the 2019 city count. The city count is a separate historical data point, not a validator.
- **Use as:** Independent corroboration that Hopkins carries real vehicle volume and that speeds exceed the Vision Zero target. Do not use to validate Streetlight zone-level estimates numerically.

---

## Direction 2 in S_EB — Sensor Artifact

*Added 2026-03-18*

- The S_Hopkins_EB file contains 16 pages: 8 labeled **EASTBOUND** (valid data) and 8 labeled **Direction 2** (artifact — excluded).
- **Direction 2 grand total:** 220 vehicles over 8 days.
- **S_WB grand total for the same period:** 24,741 vehicles.
- **Volume ratio:** Direction 2 = 0.9% of WB volume — implausible for any real traffic direction.
- **Direction 2 speed:** 85th percentile is 4–8 mph on all days except one day at 19 mph. This is walking speed, not vehicle speed.
- **Speed bin distribution:** 93%+ of Direction 2 "vehicles" are in the 1–8 mph bin.
- **Cross-check result:** Direction 2 fails every cross-check against S_WB — volumes are 100x lower, speeds are at walking pace.
- **Conclusion:** Direction 2 is sensor artifact — likely caused by parked cars, pedestrians, or pneumatic tube vibration noise. It is NOT a valid westbound traffic measurement.
- **Do not use Direction 2 data for any analysis.** Only the 8 EASTBOUND pages of S_EB contain valid traffic data.

---

*Added by analysis/streetlight.py, 2026-03-19*

## Vehicle vs Ped/Bike File Structure

Vehicle volumes come from network performance segment metrics (`*_network_performance_seg_metrics*.csv`), not zone activity files. Pedestrian and bicycle volumes come from zone activity files (`*_za_ped.csv`, `*_za_bike.csv`). All three modes use StL Volume — cross-mode comparison is valid in unit terms. However, vehicle data is segment-based and ped/bike data is zone-based. Segment and zone boundaries roughly correspond but are not identical. This structural difference must be disclosed in any UI element that displays vehicle and ped/bike volumes together.
