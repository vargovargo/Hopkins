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

**Status:** UNVERIFIED — pending raw export files in `data/raw/streetlight/`

The `streetlight_summary.json` values were transcribed from screenshots of the
Streetlight platform, not from the raw CSV exports. All numbers must be verified
by running `analysis/streetlight.py` against the actual export files before any
public use.

**Output unit status (from CLAUDE.md):**
- Vehicle data: StreetLight Volume (confirmed from Analysis.txt)
- Pedestrian data: UNVERIFIED — must confirm Volume vs Index via audit (Step 1 of streetlight.py)
- Bicycle data: UNVERIFIED — must confirm Volume vs Index via audit

**Cross-mode comparability:** UNVERIFIED until output units confirmed for ped/bike.
Per Streetlight documentation: "Trip Index values for different modes of travel
cannot be compared with each other." If ped/bike use Index while vehicles use
Volume, they cannot appear on the same chart axis.

**Action required:**
1. Place Streetlight export CSVs in `data/raw/streetlight/`
2. Run `python analysis/streetlight.py`
3. Review Step 1 audit output — confirm output units for all modes
4. If modes_comparable = false in streetlight_verified.json, update all charts
   to use separate axes with explicit unit labels

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

**Status:** PENDING — data pull from tims.berkeley.edu not yet completed

The 36-collision figure cited by Bike East Bay (2015–2018) is from a secondary
source (city staff report). This has NOT been independently verified against
TIMS records yet.

**What we can claim before TIMS pull:**
- "Bike East Bay reported 36 collisions 2015–2018, citing city staff data"
- Do NOT present this as independently verified

**What we need from TIMS:**
- Full time series back to 2010 minimum (to address "anomaly" argument)
- Query the Hopkins corridor polygon (lat 37.877–37.882, lon -122.304 to -122.272)
- Once CSV is in `data/raw/tims/`, run `python analysis/collisions.py`

---

## Known Data Gaps

| Gap | Impact | Resolution |
|-----|--------|------------|
| Ped/bike output unit unverified (Volume vs Index) | Cannot confirm cross-mode comparability | Run streetlight.py Step 1 audit |
| No Streetlight data for Monterey Ave segment | Fatality location may not appear in zone data | Fatality coordinates are in corridor.geojson |
| TIMS data not yet pulled | 36-collision figure is secondary-source only | Pull from tims.berkeley.edu |
| City count single location (Stannage-Cornell) | Cannot validate commercial strip Streetlight estimates | Use as independent speed corroboration only |
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
