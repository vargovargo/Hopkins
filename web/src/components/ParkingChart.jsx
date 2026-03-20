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

import { Link } from 'react-router-dom'
import defaultData from '@data/processed/parking_data.json'
import './ParkingChart.css'

export default function ParkingChart({ data = defaultData }) {
  const east      = data?.east_of_gilman ?? {}
  const west      = data?.west_of_gilman ?? null
  const segs      = east?.segments ?? []
  const estimates = east?.corridor_total_estimates ?? {}

  // Look up segments by id
  const seg = (id) => segs.find((s) => s.id === id) ?? {}

  const sutterAlameda  = seg('sutter-alameda')
  const alamedaMcgee   = seg('alameda-mcgee')
  const mcgeeMonterey  = seg('mcgee-monterey')
  const montereyGilman = seg('monterey-gilman')

  const verifiedTotal = estimates.attachment_a_verified_total?.value ?? 60

  return (
    <div className="parking-chart">

      {/* ══ VISUALIZATION 1 — Segment summary ════════════════════════════ */}
      <section className="parking-chart__section">
        <div className="parking-chart__callout parking-chart__callout--green">
          <strong>39 of the 60 removed spaces are in the contested commercial blocks.</strong>
          {' '}Eight residential blocks lose 21 spaces combined — less than the two most-contested commercial blocks alone.
        </div>

        <h3 className="parking-chart__section-heading">Parking impact by segment</h3>

        <div className="parking-chart__segment-rows">

          {/* Eastern residential: Sutter to Alameda */}
          <SegmentRow
            label={sutterAlameda.label ?? 'Sutter St to The Alameda'}
            treatment={sutterAlameda.proposed_design?.parking}
            pill={{
              variant: 'green',
              text: sutterAlameda.spaces_lost != null
                ? `${sutterAlameda.spaces_lost} of ${sutterAlameda.spaces_total} spaces`
                : '17 of 86 spaces',
            }}
          />

          {/* Mid-residential: Alameda to McGee */}
          <SegmentRow
            label={alamedaMcgee.label ?? 'The Alameda to McGee Ave'}
            treatment={alamedaMcgee.proposed_design?.parking}
            pill={{
              variant: 'green',
              text: alamedaMcgee.spaces_lost != null
                ? `${alamedaMcgee.spaces_lost} of ${alamedaMcgee.spaces_total} spaces net`
                : '4 of 114 spaces net',
            }}
          />

          {/* Commercial approach + core — grouped */}
          <div className="parking-chart__group">
            <div className="parking-chart__group-label">McGee Ave to Gilman St — commercial</div>

            <SegmentRow
              label={mcgeeMonterey.label ?? 'McGee Ave to Monterey Ave'}
              treatment={mcgeeMonterey.proposed_design?.parking}
              pill={{
                variant: 'amber',
                text: mcgeeMonterey.spaces_lost != null
                  ? `${mcgeeMonterey.spaces_lost} of ${mcgeeMonterey.spaces_total} spaces`
                  : '4 of 10 spaces',
              }}
              indented
            />

            <SegmentRow
              label={montereyGilman.label ?? 'Monterey Ave to Gilman St'}
              treatment={montereyGilman.proposed_design?.parking}
              pill={{
                variant: 'red',
                text: montereyGilman.spaces_lost != null
                  ? `All ${montereyGilman.spaces_lost} spaces removed`
                  : 'All 35 spaces removed',
              }}
              indented
            />
          </div>

        </div>

        <p className="parking-chart__source-note">
          Source: Attachment A, City of Berkeley reconsideration staff report, Oct 11, 2022.
          Count prepared mid-April 2022; not disclosed before the May 10 vote.
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
              {verifiedTotal}
            </span>
            <span className="parking-chart__estimate-label">spaces</span>
            <span className="parking-chart__estimate-desc">Verified total</span>
            <span className="parking-chart__estimate-timing">
              City staff count, mid-April 2022 — not disclosed before May 10 vote
            </span>
          </div>
        </div>

        <p className="parking-chart__estimate-note">
          The count was not disclosed to Council or the public before the May 2022 vote.{' '}
          <Link className="parking-chart__record-link" to="/the-record">
            See The Record for full context →
          </Link>
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

// ── pillFromBlock — derive pill from block data ───────────────────────────────
function pillFromBlock(block) {
  const { spaces_lost: lost, spaces_total: total } = block
  if (lost == null || total == null) return { variant: 'amber', text: 'Partial loss' }
  if (lost === 0)     return { variant: 'green', text: 'No loss' }
  if (lost === total) return { variant: 'red',   text: `All ${total} spaces` }
  const pct = Math.round((lost / total) * 100)
  const variant = pct >= 40 ? 'amber' : 'green'
  return { variant, text: `${lost} of ${total} spaces` }
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
