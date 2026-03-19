/**
 * CedarDiversionChart — cyclist zone activity on Hopkins vs parallel routes
 *
 * Data: streetlight_verified.json → zone_activity → bicycles (All Days / All Day)
 *
 * Hopkins zones are shown in amber. Cedar and Rose (parallel routes) are shown
 * in slate blue — these are east-west streets running parallel to Hopkins where
 * cyclists divert due to the lack of protection on Hopkins.
 *
 * OUTPUT UNIT: Average Daily Zone Traffic (StL Volume)
 * This is not a trip count — it is estimated zone-based activity.
 * Axis label reflects this exactly.
 *
 * Data source: Streetlight 2022 · Bicycle · Average Daily Zone Traffic (StL Volume)
 */

import { scaleLinear } from 'd3'
import verifiedData from '../data/streetlight_verified.json'

// ---------------------------------------------------------------------------
// Zone classification
// ---------------------------------------------------------------------------

// Hopkins corridor segments (east → west)
const HOPKINS_ZONES = [
  'Alameda to Sutter',
  'McGee to Alameda',
  'Sacramento to McGee',
  'Gilman to Sacramento',
  'Peralta to Gilman',
  'San Pablo to Peralta',
]

// Parallel routes included in the Streetlight analysis for comparison
const PARALLEL_ZONES = {
  'Cedar to Sacramento': 'Cedar St (parallel)',
  'Rose to Sacramento':  'Rose St (parallel)',
}

const NP_KEY = '0: All Days (M-Su) / 0: All Day (12am-12am)'

const COLORS = {
  amber:   '#c4713b',
  blue:    '#6a9bcc',
  text:    '#e8e4db',
  muted:   '#8a9a78',
  surface: '#252523',
  border:  'rgba(255,255,255,0.08)',
}

// ---------------------------------------------------------------------------
// Parse data
// ---------------------------------------------------------------------------

function parseData() {
  const bikes = verifiedData.zone_activity?.bicycles ?? {}

  const allZones = [...HOPKINS_ZONES, ...Object.keys(PARALLEL_ZONES)]

  return allZones.map(zone => {
    const val = bikes[zone]?.[NP_KEY] ?? null
    return {
      zone,
      label:      PARALLEL_ZONES[zone] ?? zone,
      volume:     val,
      isParallel: !!PARALLEL_ZONES[zone],
    }
  })
    .filter(d => d.volume !== null)
    .sort((a, b) => b.volume - a.volume)  // sort by volume descending
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CedarDiversionChart() {
  const data = parseData()

  const W      = 560
  const ML     = 178
  const MR     = 64
  const MT     = 12
  const MB     = 36
  const BAR_H  = 18
  const BAR_GAP = 12
  const chartW = W - ML - MR
  const chartH = data.length * (BAR_H + BAR_GAP)
  const H = chartH + MT + MB

  const maxVol = Math.max(...data.map(d => d.volume)) * 1.1
  const xScale = scaleLinear([0, maxVol], [0, chartW])

  return (
    <div style={{ background: COLORS.surface, borderRadius: 4, border: `1px solid ${COLORS.border}`, padding: '1.25rem 1rem 1rem' }}>
      <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.05rem', color: COLORS.text, margin: '0 0 0.2rem' }}>
        Where Cyclists Are Going
      </h3>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: COLORS.muted, margin: '0 0 1rem' }}>
        Estimated daily zone activity · All days · Bicycle
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        aria-label="Horizontal bar chart of bicycle zone activity on Hopkins and parallel routes"
        style={{ overflow: 'visible' }}
      >
        {data.map((d, i) => {
          const y    = MT + i * (BAR_H + BAR_GAP)
          const barW = xScale(d.volume)
          const color = d.isParallel ? COLORS.blue : COLORS.amber

          return (
            <g key={d.zone}>
              <text
                x={ML - 10} y={y + BAR_H / 2 + 4}
                textAnchor="end"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fill: color,
                }}
              >
                {d.label}
              </text>

              <rect
                x={ML} y={y}
                width={barW} height={BAR_H}
                fill={color} opacity={0.75} rx={2}
              />

              <text
                x={ML + barW + 6} y={y + BAR_H / 2 + 4}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fill: COLORS.muted }}
              >
                {d.volume.toLocaleString()}
              </text>
            </g>
          )
        })}

        {/* X-axis gridlines */}
        {[0, 200, 400, 600].filter(v => v <= maxVol).map(tick => (
          <g key={tick}>
            <line
              x1={ML + xScale(tick)} x2={ML + xScale(tick)}
              y1={MT} y2={MT + chartH}
              stroke={COLORS.border} strokeWidth={1}
            />
            <text
              x={ML + xScale(tick)} y={MT + chartH + 16}
              textAnchor="middle"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: COLORS.muted }}
            >
              {tick}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend + source */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: COLORS.muted }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: COLORS.amber, opacity: 0.75, borderRadius: 2 }} />
          Hopkins corridor
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: COLORS.muted }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: COLORS.blue, opacity: 0.75, borderRadius: 2 }} />
          Parallel route (Cedar St / Rose St)
        </span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: COLORS.muted, marginLeft: 'auto' }}>
          Data from Streetlight · 2022 · Bicycle
        </span>
      </div>

      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', color: COLORS.muted, marginTop: '0.5rem', lineHeight: 1.4 }}>
        Values are estimated zone-based activity (Average Daily Zone Traffic, StL Volume) — not trip counts.
        Bicycle and vehicle volumes use different measurement types and cannot be directly compared on the same axis.
      </p>
    </div>
  )
}
