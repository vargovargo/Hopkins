/**
 * SegmentVolumeChart — vehicle volume by segment with 95% CI whiskers
 *
 * Data: streetlight_verified.json → network_performance (All Days / All Day)
 *       + prediction_intervals for confidence bands
 *
 * Design system: dark card, sage bars, amber accent on commercial strip,
 * monospace numbers, JetBrains Mono data labels.
 *
 * Data source: Streetlight 2025 · All Vehicles · Average Daily Segment Traffic (StL Volume)
 */

import { scaleLinear } from 'd3'
import verifiedData from '../data/streetlight_verified.json'

// ---------------------------------------------------------------------------
// Zone ordering: east → west along Hopkins, then parallel routes
// ---------------------------------------------------------------------------

const HOPKINS_ORDER = [
  'Alameda to Sutter',
  'McGee to Alameda',
  'Sacramento to McGee',   // commercial strip — parking debate zone
  'Gilman to Sacramento',
  'Peralta to Gilman',
  'San Pablo to Peralta',
  'Stannage to San Pablo',
]

const PARALLEL_ZONES = {
  'Cedar to Sacramento': 'Cedar St (parallel)',
  'Rose to Sacramento':  'Rose St (parallel)',
}

const COMMERCIAL_STRIP = 'Sacramento to McGee'  // commercial core — Monterey Ave intersection, cafes/shops
const CONNECTOR_ZONE   = 'Gilman to Sacramento'  // connector to West Berkeley — highest volume, all parking removed

const NP_KEY = '0: All Days (M-Su) / 0: All Day (12am-12am)'

// ---------------------------------------------------------------------------
// Parse data
// ---------------------------------------------------------------------------

function parseData() {
  const { network_performance, prediction_intervals } = verifiedData

  const allZones = [...HOPKINS_ORDER, ...Object.keys(PARALLEL_ZONES)]

  return allZones.map(zone => {
    const np  = network_performance[zone]?.[NP_KEY] ?? {}
    const pi  = prediction_intervals[zone]
    const piVal = pi ? Object.values(pi)[0] : null

    return {
      zone,
      label:      PARALLEL_ZONES[zone] ? PARALLEL_ZONES[zone] : zone,
      volume:     np.segment_traffic ?? null,
      lower95:    piVal?.lower_95 ?? null,
      upper95:    piVal?.upper_95 ?? null,
      isParallel:   !!PARALLEL_ZONES[zone],
      isCommercial: zone === COMMERCIAL_STRIP,
      isConnector:  zone === CONNECTOR_ZONE,
    }
  }).filter(d => d.volume !== null)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const COLORS = {
  bar:        '#8a9a78',
  amber:      '#c4713b',
  blue:       '#6a9bcc',
  text:       '#e8e4db',
  muted:      '#8a9a78',
  surface:    '#252523',
  border:     'rgba(255,255,255,0.08)',
  refLine:    'rgba(255,255,255,0.12)',
}

export default function SegmentVolumeChart() {
  const data = parseData()

  // SVG dimensions
  const W   = 560
  const ML  = 178   // left margin for zone labels
  const MR  = 72    // right margin for volume numbers
  const MT  = 12
  const MB  = 32
  const BAR_H  = 18
  const BAR_GAP = 12
  const chartW = W - ML - MR
  const chartH = data.length * (BAR_H + BAR_GAP)
  const H = chartH + MT + MB

  const maxVol = Math.max(...data.map(d => d.upper95 ?? d.volume)) * 1.08
  const xScale = scaleLinear([0, maxVol], [0, chartW])

  return (
    <div style={{ background: COLORS.surface, borderRadius: 4, border: `1px solid ${COLORS.border}`, padding: '1.25rem 1rem 1rem' }}>
      <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.05rem', color: COLORS.text, margin: '0 0 0.2rem' }}>
        Vehicle Volume by Segment
      </h3>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: COLORS.muted, margin: '0 0 1rem' }}>
        Estimated daily zone activity (Streetlight Volume) · All vehicles · All days · 95% CI shown
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        aria-label="Horizontal bar chart of vehicle volumes by Hopkins corridor segment"
        style={{ overflow: 'visible' }}
      >
        {data.map((d, i) => {
          const y    = MT + i * (BAR_H + BAR_GAP)
          const barW = xScale(d.volume)
          const cx   = xScale(d.volume)

          // CI whisker positions
          const x1 = d.lower95 !== null ? xScale(d.lower95) : null
          const x2 = d.upper95 !== null ? xScale(d.upper95) : null

          const barColor = d.isParallel ? COLORS.blue : COLORS.bar

          return (
            <g key={d.zone}>
              {/* Amber left accent for commercial core and connector zones */}
              {(d.isCommercial || d.isConnector) && (
                <rect
                  x={ML - 6} y={y - 2}
                  width={3} height={BAR_H + 4}
                  fill={COLORS.amber}
                  opacity={d.isConnector ? 1 : 0.6}
                  aria-hidden="true"
                />
              )}

              {/* Zone label */}
              <text
                x={ML - 10} y={y + BAR_H / 2 + 4}
                textAnchor="end"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fill: (d.isCommercial || d.isConnector) ? COLORS.amber
                      : d.isParallel ? COLORS.blue
                      : COLORS.text,
                }}
              >
                {d.label}
              </text>

              {/* Bar */}
              <rect
                x={ML} y={y}
                width={barW} height={BAR_H}
                fill={barColor}
                opacity={d.isParallel ? 0.6 : 0.75}
                rx={2}
              />

              {/* 95% CI whisker */}
              {x1 !== null && x2 !== null && (
                <g aria-label={`95% CI: ${d.lower95}–${d.upper95}`}>
                  {/* whisker line */}
                  <line
                    x1={ML + x1} x2={ML + x2}
                    y1={y + BAR_H / 2} y2={y + BAR_H / 2}
                    stroke={COLORS.text} strokeWidth={1} strokeOpacity={0.4}
                  />
                  {/* end caps */}
                  <line x1={ML + x1} x2={ML + x1} y1={y + 4} y2={y + BAR_H - 4}
                    stroke={COLORS.text} strokeWidth={1} strokeOpacity={0.4} />
                  <line x1={ML + x2} x2={ML + x2} y1={y + 4} y2={y + BAR_H - 4}
                    stroke={COLORS.text} strokeWidth={1} strokeOpacity={0.4} />
                </g>
              )}

              {/* Volume number */}
              <text
                x={ML + Math.max(barW, x2 ?? barW) + 6}
                y={y + BAR_H / 2 + 4}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fill: COLORS.muted }}
              >
                {d.volume.toLocaleString()}
              </text>
            </g>
          )
        })}

        {/* X-axis gridlines + labels */}
        {[0, 3000, 6000, 9000, 12000].filter(v => v <= maxVol).map(tick => (
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
              {tick === 0 ? '0' : `${tick / 1000}k`}
            </text>
          </g>
        ))}

        {/* Annotation: commercial core (Sacramento to McGee, index 2) */}
        <text
          x={ML - 6} y={MT + 2 * (BAR_H + BAR_GAP) + BAR_H / 2 + 4 + 14}
          textAnchor="end"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fill: COLORS.amber, opacity: 0.7 }}
        >
          ← commercial core · Monterey Ave
        </text>
        {/* Annotation: connector zone (Gilman to Sacramento, index 3) */}
        <text
          x={ML - 6} y={MT + 3 * (BAR_H + BAR_GAP) + BAR_H / 2 + 4 + 14}
          textAnchor="end"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fill: COLORS.amber, opacity: 0.9 }}
        >
          ← connector · all parking removed · 35 spaces
        </text>
      </svg>

      {/* Legend + source */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: COLORS.muted }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: COLORS.bar, opacity: 0.75, borderRadius: 2 }} />
          Hopkins corridor
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: COLORS.muted }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: COLORS.blue, opacity: 0.6, borderRadius: 2 }} />
          Parallel route
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: COLORS.muted }}>
          <span style={{ display: 'inline-block', width: 24, height: 1, background: COLORS.text, opacity: 0.4 }} />
          95% CI
        </span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: COLORS.muted, marginLeft: 'auto' }}>
          Data from Streetlight · 2025 · All Vehicles
        </span>
      </div>
    </div>
  )
}
