/**
 * MethodsPage.jsx — /methods
 *
 * "About the Data" — methodology, data sources, integrity rules, known gaps.
 * Written for journalists, council members, and opponents who want to
 * scrutinize the analysis. Every claim links back to a primary source.
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import './MethodsPage.css'

// ── Data source summaries ──────────────────────────────────────────────────

const SOURCES = [
  {
    id: 'streetlight',
    title: 'Streetlight Data',
    type: 'Mobility analytics',
    heading: 'Mode volumes by segment and zone',
    intro: `Streetlight Data models trip volumes using location signals from connected
      devices, calibrated against ground-truth counts. Walk Bike Berkeley contracted
      Streetlight to run analyses on the Hopkins corridor. Three separate analyses
      were ordered — one per mode.`,
    datasets: [
      {
        label: 'Vehicles',
        year: '2025 (full year)',
        unit: 'Average Daily Segment Traffic (StL Volume)',
        analysis: 'Analysis 2012902',
        geography: 'Network performance segments — linear road segments',
        notes: 'Most current data available. Includes 95% confidence intervals.',
      },
      {
        label: 'Pedestrians',
        year: 'January–August 2022 (8 months)',
        unit: 'StL Pedestrian Volume',
        analysis: 'Analysis 2013191',
        geography: 'Zone activity — area-based polygons, not linear segments',
        notes: 'Eight-month window only. Full-year data not available for this analysis.',
      },
      {
        label: 'Bicycles',
        year: 'January–August 2022 (8 months)',
        unit: 'StL Bicycle Volume',
        analysis: 'Analysis 2013334',
        geography: 'Zone activity — area-based polygons, not linear segments',
        notes: 'Same 8-month window as pedestrian data. Includes Cedar St and Rose St as parallel-route comparison zones.',
      },
    ],
    caveats: [
      {
        heading: 'Unit verification',
        body: `All three modes confirmed as StL Volume — not StL Index. This distinction matters: per Streetlight's own documentation, Index values for different modes cannot be compared. Volume values can be compared across modes, with disclosure. All 16 pedestrian and bicycle "All Days / All Day" zone values were spot-checked against the raw CSV exports on 2026-03-20. Zero mismatches.`,
      },
      {
        heading: 'Segment vs. zone geography',
        body: `Vehicle data is segment-based (road centerline). Pedestrian and bicycle data is zone-based (area polygons). The zones roughly correspond to the vehicle segments but are not identical geographic units. Any chart showing modes together discloses this structural difference.`,
      },
      {
        heading: 'Ped/bike data is 2022, vehicle data is 2025',
        body: `The three modes were not collected in the same year. This means they cannot be used to calculate mode share — that would require simultaneous counts. They are shown in separate visualizations with separate year labels. No chart implies they are contemporaneous.`,
      },
      {
        heading: 'Attribution',
        body: `Walk Bike Berkeley holds a data contract with Streetlight. All visualizations using Streetlight data must display "Data from Streetlight." This is a contractual requirement, not optional.`,
      },
    ],
  },
  {
    id: 'collisions',
    title: 'TIMS / SWITRS',
    type: 'Collision records',
    heading: 'Collision history on the Hopkins corridor',
    intro: `The Traffic Injury Mapping System (TIMS) at UC Berkeley provides public
      access to California's Statewide Integrated Traffic Records System (SWITRS).
      SWITRS is the official statewide collision database, compiled from local law
      enforcement records.`,
    datasets: [
      {
        label: 'Collision records',
        year: '2014–2025',
        unit: 'Individual collision cases with severity, date, location, party type',
        analysis: 'tims.berkeley.edu — free, requires account',
        geography: 'Bounding box: lat 37.875–37.892, lon -122.300 to -122.270',
        notes: '53 collisions total. 2 fatal, 4 severe injury, 27 other injury, 20 property damage only.',
      },
    ],
    caveats: [
      {
        heading: 'Bounding box geography',
        body: `The filter is a rectangular bounding box, not a Hopkins-only polygon. It captures all collisions within the box — which includes some records from Sacramento St, California St, Ada St, and other streets adjacent to Hopkins. The 53-collision figure reflects the corridor study area, not strictly Hopkins Street itself. This is labeled in every chart that shows this figure.`,
      },
      {
        heading: 'The 2017 Hopkins/Monterey pedestrian fatality',
        body: `The pedestrian fatality at Hopkins and Monterey in 2017 — the collision that directly triggered the Hopkins Street Safety Project — does not appear as fatal in this dataset. A severe injury collision at that intersection (CASE_ID 8446899) is present, but the fatality record appears to be geocoded outside the bounding box or filed under a different case ID. The fatality is documented in city staff records, the Council budget referral, and the Vision Zero Action Plan. It is noted explicitly in the chart footnote and plotted as a marker on the map.`,
      },
      {
        heading: 'Relationship to other cited figures',
        body: `Two other collision counts appear in public discussion of this project. Bike East Bay (2018), citing city staff, found 36 collisions from 2015–2018 across the broader corridor area. City workshop presentations (March 2022) separately documented 18 injury and fatal collisions from 2016–2019. These are different time periods, different geographic scopes, and different severity filters — they are not contradictory. All three figures are cited in this project with their respective sources and scope.`,
      },
      {
        heading: 'Processing script',
        body: `The raw TIMS export is processed by analysis/collisions.py, available in the project repository. The script performs a three-table join (Crashes → Parties → Victims) per TIMS documentation, derives pedestrian and cyclist involvement flags, and applies the bounding box filter. The script can be re-run whenever raw TIMS files are replaced.`,
      },
    ],
  },
  {
    id: 'city-counts',
    title: 'City of Berkeley Traffic Count',
    type: 'Independent ground-truth count',
    heading: 'Independent speed and volume validation',
    intro: `The City of Berkeley conducted a week-long pneumatic tube traffic count on
      Hopkins Street in 2019, obtained via public records request. This count is
      independent of Streetlight and provides an independent corroboration of vehicle
      speeds on the corridor.`,
    datasets: [
      {
        label: 'Pneumatic tube count',
        year: '2019-09-26 through 2019-10-03',
        unit: 'Vehicle counts by direction and 15-minute interval; speed percentiles',
        analysis: 'City of Berkeley public records',
        geography: 'Hopkins St between Stannage Ave and Cornell Ave (single location)',
        notes: '85th percentile: 29 mph westbound and eastbound. 49–52% of vehicles exceeded 25 mph.',
      },
    ],
    caveats: [
      {
        heading: 'Single location',
        body: `The count covers one location on the western end of the corridor (Stannage–Cornell), west of the project boundary. It cannot be used to validate Streetlight estimates on the commercial strip or eastern segments.`,
      },
      {
        heading: 'Pre-COVID baseline',
        body: `The count was conducted in September–October 2019, before COVID-19 significantly altered travel patterns. It cannot be directly compared to 2022 or 2025 Streetlight data, and is cited separately from those datasets.`,
      },
      {
        heading: 'No bicycle data',
        body: `Pneumatic tube counts detect axle pressure and classify vehicles by axle configuration. They do not count cyclists. There is no independent ground-truth bicycle volume data for the Hopkins corridor.`,
      },
      {
        heading: 'Use in this project',
        body: `The city count is used solely to corroborate that vehicle speeds on Hopkins exceed Berkeley's 25 mph Vision Zero target. The 85th percentile of 29 mph from the independent count is consistent with Streetlight speed estimates. The two datasets are cited separately and not numerically combined.`,
      },
    ],
  },
]

// ── What the data can and cannot support ──────────────────────────────────

const CLAIMS_TABLE = [
  {
    data: 'Sacramento-to-McGee has highest pedestrian zone activity (1,026)',
    can: '"Pedestrian activity is highest in the contested commercial strip"',
    cannot: '"X% of visitors arrive on foot"',
  },
  {
    data: 'Cedar St carries 266 estimated daily bicycle zone trips',
    can: '"Cyclists are using Cedar as a parallel route"',
    cannot: '"Cedar diverts X% of Hopkins bike demand"',
  },
  {
    data: 'Sacramento-to-McGee vehicle volume: 5,553',
    can: '"Vehicle volume on the commercial strip"',
    cannot: '"Only X% of commercial strip visitors drive"',
  },
  {
    data: '85th percentile speeds exceed 25 mph on multiple segments',
    can: '"Speeds exceed the Vision Zero target on these segments"',
    cannot: '"X% reduction in collisions if speeds reduced" (no exposure data)',
  },
  {
    data: '53 collisions in study area bounding box, 2014–2025',
    can: '"53 collisions documented in the Hopkins corridor study area"',
    cannot: '"53 collisions on Hopkins Street" (bounding box includes adjacent streets)',
  },
  {
    data: '36 collisions 2015–2018 (Bike East Bay, citing city staff)',
    can: 'Cite the secondary source accurately',
    cannot: 'Present as independently verified (not our analysis)',
  },
  {
    data: 'Community ranked parking 9th out of 16 concerns (Workshop 2, 2021)',
    can: '"Parking was not a top community priority in early planning"',
    cannot: 'Present as precise — values are estimated from a city chart image',
  },
]

// ── Known data gaps ───────────────────────────────────────────────────────

const GAPS = [
  {
    gap: 'No independent bicycle volume validation',
    detail: 'There are no ground-truth bicycle counts for the Hopkins corridor to validate Streetlight bicycle estimates against. The city\'s 2019 count used pneumatic tubes, which do not detect cyclists.',
  },
  {
    gap: 'Ped/bike data is 2022; vehicle data is 2025',
    detail: 'The three modes were not measured in the same year. This means mode share cannot be calculated from these datasets. Each mode is labeled with its data year in every visualization.',
  },
  {
    gap: '2017 Hopkins/Monterey fatality not coded as fatal in TIMS',
    detail: 'The pedestrian fatality that triggered this project does not appear as fatal in the TIMS export within the study bounding box. It is documented in city records and is plotted on the map, but is not counted in the chart\'s fatal collision total.',
  },
  {
    gap: 'Community feedback values are approximate',
    detail: 'Workshop 2 feedback rankings are estimated from a city chart image, not a raw data table. Rankings are real; absolute counts carry a margin of error.',
  },
  {
    gap: 'City traffic count covers one location, 2019 only',
    detail: 'Independent speed validation is limited to a single point on the western corridor, pre-COVID. It cannot validate Streetlight estimates for the commercial strip or eastern segments.',
  },
  {
    gap: 'No before/after comparison',
    detail: 'No comparable data exists for a time before the 2017 fatalities. The Streetlight data cannot be used to show how conditions have changed over time — only what the current baseline is.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function MethodsPage() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="methods-page">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="methods-page__header">
        <h1 className="methods-page__title">About the Data</h1>
        <p className="methods-page__subtitle">
          Sources, methodology, and known limitations — for reporters,
          officials, and anyone who wants to check the work.
        </p>
      </header>

      {/* ── Intro ──────────────────────────────────────────────────── */}
      <div className="methods-page__intro">
        <p>
          This project is part of a live public policy debate. The analysis has
          been built to withstand scrutiny — from opponents, journalists, and
          elected officials. That means being explicit about what each dataset
          is, what time period it covers, how it was processed, and what it
          cannot show.
        </p>
        <p>
          Every number in this data story comes from one of three primary
          sources. None are estimated, interpolated, or adjusted without
          disclosure. Where gaps exist, they are documented below rather than
          papered over.
        </p>
      </div>

      {/* ── Data source jump links ──────────────────────────────────── */}
      <nav className="methods-page__jump" aria-label="Jump to data source">
        <span className="methods-page__jump-label">Jump to:</span>
        {SOURCES.map(s => (
          <a key={s.id} href={`#${s.id}`} className="methods-page__jump-link">
            {s.title}
          </a>
        ))}
        <a href="#claims" className="methods-page__jump-link">What the data supports</a>
        <a href="#gaps" className="methods-page__jump-link">Known gaps</a>
      </nav>

      {/* ── Per-source sections ─────────────────────────────────────── */}
      {SOURCES.map(source => (
        <section key={source.id} id={source.id} className="methods-page__source-section">
          <div className="methods-page__source-header">
            <span className="methods-page__source-type">{source.type}</span>
            <h2 className="methods-page__source-title">{source.title}</h2>
            <p className="methods-page__source-heading">{source.heading}</p>
          </div>

          <p className="methods-page__source-intro">{source.intro}</p>

          {/* Dataset specs table */}
          <div className="methods-page__datasets">
            {source.datasets.map(ds => (
              <div key={ds.label} className="methods-page__dataset-card">
                <div className="methods-page__dataset-label">{ds.label}</div>
                <dl className="methods-page__dataset-dl">
                  <div className="methods-page__dataset-row">
                    <dt>Period</dt>
                    <dd>{ds.year}</dd>
                  </div>
                  <div className="methods-page__dataset-row">
                    <dt>Unit</dt>
                    <dd>{ds.unit}</dd>
                  </div>
                  <div className="methods-page__dataset-row">
                    <dt>Reference</dt>
                    <dd>{ds.analysis}</dd>
                  </div>
                  <div className="methods-page__dataset-row">
                    <dt>Geography</dt>
                    <dd>{ds.geography}</dd>
                  </div>
                  <div className="methods-page__dataset-row methods-page__dataset-row--notes">
                    <dt>Notes</dt>
                    <dd>{ds.notes}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          {/* Caveats */}
          <div className="methods-page__caveats">
            {source.caveats.map(c => (
              <div key={c.heading} className="methods-page__caveat">
                <h4 className="methods-page__caveat-heading">{c.heading}</h4>
                <p className="methods-page__caveat-body">{c.body}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* ── What the data can and cannot support ───────────────────── */}
      <section id="claims" className="methods-page__claims-section">
        <h2 className="methods-page__section-heading">What the data supports — and what it doesn't</h2>
        <p className="methods-page__section-intro">
          Overstating what data shows is as damaging as having no data. The
          table below documents the specific claims this project makes and
          explicitly rules out claims the data doesn't support.
        </p>
        <div className="methods-page__claims-table" role="table" aria-label="Claims the data supports and does not support">
          <div className="methods-page__claims-header" role="row">
            <div role="columnheader">What the data shows</div>
            <div role="columnheader">What we can claim</div>
            <div role="columnheader">What we cannot claim</div>
          </div>
          {CLAIMS_TABLE.map((row, i) => (
            <div key={i} className="methods-page__claims-row" role="row">
              <div className="methods-page__claims-data" role="cell">{row.data}</div>
              <div className="methods-page__claims-can" role="cell">{row.can}</div>
              <div className="methods-page__claims-cannot" role="cell">{row.cannot}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Known gaps ─────────────────────────────────────────────── */}
      <section id="gaps" className="methods-page__gaps-section">
        <h2 className="methods-page__section-heading">Known data gaps</h2>
        <p className="methods-page__section-intro">
          These are gaps in the dataset that affect what can be said about the
          corridor. They are not hidden — they are documented here and disclosed
          in the relevant visualizations.
        </p>
        <div className="methods-page__gaps">
          {GAPS.map(g => (
            <div key={g.gap} className="methods-page__gap">
              <h4 className="methods-page__gap-heading">{g.gap}</h4>
              <p className="methods-page__gap-body">{g.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer note ────────────────────────────────────────────── */}
      <div className="methods-page__footer-note">
        <p>
          Data processing scripts are available in the project repository under{' '}
          <code>analysis/</code>. Raw source files are in{' '}
          <code>data/raw/</code>; processed outputs in <code>data/processed/</code>.
          The Streetlight data is under a data contract with Walk Bike Berkeley —
          raw exports are not publicly redistributable, but the processing methodology
          and all derived outputs shown here are fully documented.
        </p>
      </div>

    </div>
  )
}
