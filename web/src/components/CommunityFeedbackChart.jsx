/**
 * CommunityFeedbackChart.jsx — Prompt 12
 *
 * Horizontal bar chart: community priority feedback from Workshop 2 (March 2021).
 * Belongs in Section 3 "What's actually at stake with parking."
 *
 * DATA: data/processed/community_feedback_workshop2.json
 * Status: APPROXIMATE — values estimated from city chart image, not a data table.
 *
 * Props: none (imports data directly)
 */

import defaultData from '@data/processed/community_feedback_workshop2.json'
import './CommunityFeedbackChart.css'

const CATEGORY_COLORS = {
  safety:         '#4a7c59',
  parking:        '#c4713b',
  vehicle:        '#8a9a78',
  placemaking:    '#6a9bcc',
  transit:        '#7a6b5d',
  environment:    '#7a6b5d',
  pedestrian:     '#7a6b5d',
  infrastructure: '#7a6b5d',
}

const CATEGORY_LABELS = {
  safety:         'Safety',
  parking:        'Parking',
  vehicle:        'Vehicle / traffic',
  placemaking:    'Placemaking',
  transit:        'Transit / other',
  environment:    'Transit / other',
  pedestrian:     'Transit / other',
  infrastructure: 'Transit / other',
}

// Deduplicated legend entries in display order
const LEGEND = [
  { category: 'safety',      label: 'Safety',           color: '#4a7c59' },
  { category: 'vehicle',     label: 'Vehicle / traffic', color: '#8a9a78' },
  { category: 'placemaking', label: 'Placemaking',       color: '#6a9bcc' },
  { category: 'parking',     label: 'Parking',           color: '#c4713b' },
  { category: 'transit',     label: 'Transit / other',   color: '#7a6b5d' },
]

export default function CommunityFeedbackChart({ data = defaultData }) {
  const meta  = data?._metadata ?? {}
  const items = data?.feedback_items ?? []

  if (!items.length) return null

  const maxVal = Math.max(...items.map((d) => d.total_approximate))

  return (
    <div className="community-chart">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <h2 className="community-chart__heading">What the community said it wanted <span className="community-chart__heading-year">(2021)</span></h2>
      <p className="community-chart__subhead">
        Workshop 2 participant feedback · March 10, 2021 · City of Berkeley
      </p>
      <p className="community-chart__caveat-header">
        Values are approximate — estimated from city workshop chart. Reflects
        early-process community input before specific design proposals were finalized.
      </p>

      {/* ── Callout card ───────────────────────────────────────────── */}
      <div className="community-chart__callout" role="note">
        <strong>Parking ranked 9th out of 16 community concerns.</strong>
        {' '}Pedestrian safety, speeding, and cyclist safety ranked 1st, 2nd, and 3rd.
      </div>

      {/* ── Bar chart ──────────────────────────────────────────────── */}
      <div
        className="community-chart__bars"
        role="list"
        aria-label="Community feedback priorities, Workshop 2, March 2021"
      >
        {items.map((item) => {
          const pct        = (item.total_approximate / maxVal) * 100
          const color      = CATEGORY_COLORS[item.category] ?? '#8a9a78'
          const isParking  = item.rank === 9
          const isTopRank  = item.rank === 1

          return (
            <div
              key={item.rank}
              className={`community-chart__row${isParking ? ' community-chart__row--parking' : ''}`}
              role="listitem"
            >
              <span
                className="community-chart__label"
                title={item.issue}
              >
                {item.issue}
              </span>

              <div className="community-chart__bar-track">
                <div
                  className="community-chart__bar"
                  style={{ width: `${pct}%`, background: color }}
                  aria-label={`${item.issue}: approximately ${item.total_approximate}`}
                />
              </div>

              <span className="community-chart__value">
                ~{item.total_approximate}
                {isTopRank  && <span className="community-chart__rank-label community-chart__rank-label--first">Ranked 1st</span>}
                {isParking  && <span className="community-chart__rank-label community-chart__rank-label--parking">Ranked 9th</span>}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Approximate note ───────────────────────────────────────── */}
      <p className="community-chart__approx-note">
        All values approximate · Data from Streetlight not applicable here ·
        Source: City of Berkeley Workshop 2 chart
      </p>

      {/* ── Legend ─────────────────────────────────────────────────── */}
      <div className="community-chart__legend" aria-label="Category legend">
        {LEGEND.map(({ category, label, color }) => (
          <span key={category} className="community-chart__legend-item">
            <span
              className="community-chart__legend-swatch"
              style={{ background: color }}
              aria-hidden="true"
            />
            {label}
          </span>
        ))}
      </div>

      {/* ── Source footnote ────────────────────────────────────────── */}
      <div className="community-chart__footnote">
        <p>
          Source: City of Berkeley Hopkins Corridor Workshop 2, March 10 2021.
          Values are approximate counts estimated from the city&rsquo;s published
          chart — not exact figures. Feedback reflects community input from early
          2021, before specific parking removal numbers were proposed.
        </p>
        <a
          className="community-chart__source-link"
          href={meta.source_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          View original city document →
        </a>
      </div>

    </div>
  )
}
