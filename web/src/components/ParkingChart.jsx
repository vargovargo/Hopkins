/**
 * ParkingChart.jsx — Prompt 13
 *
 * Section 3: "What's actually at stake with parking."
 * Three visualizations from data/processed/parking_data.json:
 *   1. Per-segment parking impact (east of Gilman)
 *   2. The two public estimates side by side
 *   3. West-of-Gilman occupancy context (conditional)
 *
 * DATA INTEGRITY: spaces_lost === null means count not available from text
 * portions of city documents. Do not display a number — show treatment
 * description only. Never fabricate a count.
 */

import defaultData from '@data/processed/parking_data.json'
import './ParkingChart.css'

export default function ParkingChart({ data = defaultData }) {
  const east    = data?.east_of_gilman ?? {}
  const west    = data?.west_of_gilman ?? null
  const segs    = east?.segments ?? []
  const estimates = east?.corridor_total_estimates ?? {}

  // Look up segments by id
  const seg = (id) => segs.find((s) => s.id === id) ?? {}

  const sutterAlameda  = seg('sutter-alameda')
  const alamedaMcgee   = seg('alameda-mcgee')
  const mcgeeMonterey  = seg('mcgee-monterey')
  const montereyGilman = seg('monterey-gilman')

  return (
    <div className="parking-chart">

      {/* ══ VISUALIZATION 1 — Segment summary ═══════════════════════════ */}
      <section className="parking-chart__section">
        <div className="parking-chart__callout parking-chart__callout--green">
          <strong>Most of the corridor loses little or no parking.</strong>
          {' '}The contested removal is concentrated on two blocks:
          Monterey Avenue to Gilman Street.
        </div>

        <h3 className="parking-chart__section-heading">Parking impact by segment</h3>

        <div className="parking-chart__segment-rows">

          {/* Sutter to Alameda */}
          <SegmentRow
            label={sutterAlameda.label ?? 'Sutter St to The Alameda'}
            treatment={sutterAlameda.proposed_design?.parking}
            pill={{ variant: 'green', text: 'No loss' }}
          />

          {/* Alameda to McGee */}
          <SegmentRow
            label={alamedaMcgee.label ?? 'The Alameda to McGee Ave'}
            treatment={alamedaMcgee.proposed_design?.parking}
            pill={{ variant: 'amber', text: 'Most retained' }}
          />

          {/* McGee to Gilman — group header with two sub-segments */}
          <div className="parking-chart__group">
            <div className="parking-chart__group-label">McGee Ave to Gilman St</div>

            <SegmentRow
              label={mcgeeMonterey.label ?? 'McGee Ave to Monterey Ave'}
              treatment={mcgeeMonterey.proposed_design?.parking}
              pill={{ variant: 'green', text: '1 space lost' }}
              indented
            />

            <SegmentRow
              label={montereyGilman.label ?? 'Monterey Ave to Gilman St'}
              treatment={montereyGilman.proposed_design?.parking}
              pill={{ variant: 'red', text: 'All removed' }}
              indented
            />
          </div>

        </div>

        <p className="parking-chart__source-note">
          Source: City of Berkeley staff report, May 2022; Workshop 4.3, March 14 2022
        </p>
      </section>

      {/* ══ VISUALIZATION 2 — The two estimates ═════════════════════════ */}
      <section className="parking-chart__section">
        <h3 className="parking-chart__section-heading">Two estimates. One wasn't disclosed.</h3>

        <div className="parking-chart__estimates">
          <div className="parking-chart__estimate">
            <span className="parking-chart__estimate-number">
              {estimates.original_estimate_lost?.low ?? 30}–{estimates.original_estimate_lost?.high ?? 35}
            </span>
            <span className="parking-chart__estimate-label">spaces</span>
            <span className="parking-chart__estimate-desc">Original estimate</span>
            <span className="parking-chart__estimate-timing">
              {estimates.original_estimate_lost?.source ?? 'Disclosed before May 2022 Council vote'}
            </span>
          </div>

          <div className="parking-chart__estimate parking-chart__estimate--revised">
            <span className="parking-chart__estimate-number">
              {estimates.revised_estimate_lost?.value ?? 60}
            </span>
            <span className="parking-chart__estimate-label">spaces</span>
            <span className="parking-chart__estimate-desc">Revised estimate</span>
            <span className="parking-chart__estimate-timing">
              {estimates.revised_estimate_lost?.source ?? 'Not disclosed before May 2022 vote — revealed October 2022'}
            </span>
          </div>
        </div>

        <p className="parking-chart__estimate-note">
          The revision was not disclosed to Council or the public before the May 2022 vote.{' '}
          <a className="parking-chart__record-link" href="/the-record">
            See The Record for full context →
          </a>
        </p>
      </section>

      {/* ══ VISUALIZATION 3 — West of Gilman occupancy (conditional) ════ */}
      {west && (
        <section className="parking-chart__section">
          <h3 className="parking-chart__section-heading">
            West of Gilman: context for the western extension debate
          </h3>

          <div className="parking-chart__callout parking-chart__callout--amber">
            <strong>At peak, 40% of spaces west of Gilman are empty.</strong>
            {' '}Even the largest extension option would displace ~70 vehicles
            against a backdrop of 62 empty spaces at that same moment.
          </div>

          {/* Occupancy fill bar */}
          <div className="parking-chart__occupancy">
            <div className="parking-chart__occupancy-label">
              Peak occupancy — {west.existing_parking_inventory?.peak_occupancy_pct ?? 60}% of {west.existing_parking_inventory?.total ?? 155} spaces
            </div>
            <div className="parking-chart__occupancy-track" role="img" aria-label={`${west.existing_parking_inventory?.peak_occupancy_pct ?? 60}% occupied at peak`}>
              <div
                className="parking-chart__occupancy-fill"
                style={{ width: `${west.existing_parking_inventory?.peak_occupancy_pct ?? 60}%` }}
              />
              <span className="parking-chart__occupancy-pct">
                {west.existing_parking_inventory?.peak_occupancy_pct ?? 60}% occupied at peak
              </span>
            </div>
          </div>

          {/* Extension options table */}
          <div className="parking-chart__options">
            {(west.options ?? []).map((opt) => (
              <div key={opt.id} className="parking-chart__option-row">
                <span className="parking-chart__option-label">{opt.label}</span>
                <span className="parking-chart__option-distance">
                  {opt.extension_feet?.toLocaleString()} ft
                </span>
                <span className="parking-chart__option-removed">
                  {opt.spaces_removed != null
                    ? `${opt.spaces_removed} spaces removed`
                    : `${opt.spaces_removed_low}–${opt.spaces_removed_high} spaces removed`}
                </span>
                {opt.peak_displaced_vehicles != null && (
                  <span className="parking-chart__option-displaced">
                    ~{opt.peak_displaced_vehicles} vehicles displaced at peak
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="parking-chart__source-note">
            Source: City parking survey, December 2022 community meeting.
            Western extension not approved — project postponed April 2023.
          </p>
        </section>
      )}

      {/* ══ Design caveat ════════════════════════════════════════════════ */}
      <p className="parking-chart__design-caveat">
        These figures reflect the 2022 conceptual design approved by Council.
        Detailed engineering is ongoing — final figures may differ.
      </p>

    </div>
  )
}

// ── SegmentRow sub-component ─────────────────────────────────────────────────
function SegmentRow({ label, treatment, pill, indented }) {
  return (
    <div className={`parking-chart__row${indented ? ' parking-chart__row--indented' : ''}`}>
      <span className="parking-chart__row-label">{label}</span>
      {treatment && (
        <span className="parking-chart__row-treatment">{treatment}</span>
      )}
      <span className={`parking-chart__pill parking-chart__pill--${pill.variant}`}>
        {pill.text}
      </span>
    </div>
  )
}
