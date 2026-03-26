/**
 * SpeedChart — vehicle speeds by segment (avg + 85th percentile dot plot)
 *
 * Data: streetlight_verified.json → network_performance
 *       Fields: avg_speed_mph, speed_p85
 *
 * 85th percentile is the California standard for speed limit setting (CVC §22358.5).
 * Segments where p85 > 25 mph (Berkeley Vision Zero target) are colored amber.
 *
 * Weekday / Weekend toggle available.
 *
 * Data source: Streetlight 2025 · All Vehicles · Network Performance
 */

import { useState } from 'react'
import { scaleLinear } from 'd3'
import verifiedData from '../data/streetlight_verified.json'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Hopkins corridor segments only — speed comparison is a Hopkins safety story
const HOPKINS_ORDER = [
  'Alameda to Sutter',
  'McGee to Alameda',
  'Sacramento to McGee',
  'Gilman to Sacramento',
  'Peralta to Gilman',
  'San Pablo to Peralta',
  'Stannage to San Pablo',
]

const VISION_ZERO_MPH = 25

const DAY_TYPE_KEYS = {
  'All Days': '0: All Days (M-Su)',
  'Weekday':  '1: Weekday (M-Th)',
  'Weekend':  '2: Weekend (Sa-Su)',
}
const ALL_DAY_PART = '0: All Day (12am-12am)'

const COLORS = {
  amber:   '#c4713b',
  sage:    '#8a9a78',
  green:   '#4a7c59',
  text:    '#e8e4db',
  muted:   '#8a9a78',
  surface: '#252523',
  border:  'rgba(255,255,255,0.08)',
  refLine: 'rgba(196,113,59,0.35)',
}

// ---------------------------------------------------------------------------
// Parse data for a given day type
// ---------------------------------------------------------------------------

function parseData(dayTypeLabel) {
  const { network_performance } = verifiedData
  const dtKey = DAY_TYPE_KEYS[dayTypeLabel]
  const key   = `${dtKey} / ${ALL_DAY_PART}`

  return HOPKINS_ORDER.map(zone => {
    const np = network_performance[zone]?.[key] ?? {}
    return {
      zone,
      avgSpeed: np.avg_speed_mph ?? null,
      p85:      np.speed_p85 ?? null,
      exceeds:  (np.speed_p85 ?? 0) > VISION_ZERO_MPH,
    }
  }).filter(d => d.avgSpeed !== null)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SpeedChart() {
  const [dayType, setDayType] = useState('All Days')
  const data = parseData(dayType)

  // SVG dimensions
  const W    = 560
  const ML   = 178
  const MR   = 40
  const MT   = 24
  const MB   = 32
  const ROW_H  = 30
  const chartW = W - ML - MR
  const chartH = data.length * ROW_H
  const H = chartH + MT + MB

  const xScale = scaleLinear([0, 45], [0, chartW])
  const refX   = ML + xScale(VISION_ZERO_MPH)

  return (
    <div style={{ background: COLORS.surface, borderRadius: 4, border: `1px solid ${COLORS.border}`, padding: '1.25rem 1rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.05rem', color: COLORS.text, margin: '0 0 0.2rem' }}>
            Vehicle Speeds by Segment
          </h3>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: COLORS.muted, margin: 0 }}>
            Average speed · 85th percentile · All day
          </p>
        </div>

        {/* Day type toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          {Object.keys(DAY_TYPE_KEYS).map(label => (
            <button
              key={label}
              onClick={() => setDayType(label)}
              style={{
                background: dayType === label ? COLORS.green : 'transparent',
                border: `1px solid ${dayType === label ? COLORS.green : COLORS.muted}`,
                borderRadius: 3,
                color: dayType === label ? COLORS.text : COLORS.muted,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.7rem',
                padding: '10px 12px',
                cursor: 'pointer',
                touchAction: 'manipulation',
                minHeight: 44,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        aria-label="Dot plot of vehicle speeds by Hopkins corridor segment"
        style={{ overflow: 'visible' }}
      >
        {/* Vision Zero reference line */}
        <line
          x1={refX} x2={refX} y1={MT - 10} y2={MT + chartH + 4}
          stroke={COLORS.amber} strokeWidth={1} strokeDasharray="3,3" strokeOpacity={0.6}
        />
        <text
          x={refX} y={MT - 14}
          textAnchor="middle"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9.5, fill: COLORS.amber }}
        >
          25 mph Vision Zero target
        </text>

        {/* X-axis gridlines */}
        {[0, 10, 20, 30, 40].map(tick => (
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
        <text
          x={ML + xScale(40) + 4} y={MT + chartH + 16}
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fill: COLORS.muted }}
        >
          mph
        </text>

        {/* Data rows */}
        {data.map((d, i) => {
          const cy    = MT + i * ROW_H + ROW_H / 2
          const cx1   = ML + xScale(d.avgSpeed)
          const cx2   = d.p85 !== null ? ML + xScale(d.p85) : null
          const color = d.exceeds ? COLORS.amber : COLORS.sage

          return (
            <g key={d.zone}>
              {/* Zone label */}
              <text
                x={ML - 10} y={cy + 4}
                textAnchor="end"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fill: d.exceeds ? COLORS.amber : COLORS.text,
                }}
              >
                {d.zone}
              </text>

              {/* Connector line between avg and p85 */}
              {cx2 !== null && (
                <line
                  x1={cx1} x2={cx2} y1={cy} y2={cy}
                  stroke={color} strokeWidth={1.5} strokeOpacity={0.5}
                />
              )}

              {/* Avg speed — filled dot */}
              <circle
                cx={cx1} cy={cy} r={5}
                fill={color}
                aria-label={`${d.zone} avg speed: ${d.avgSpeed} mph`}
              />

              {/* 85th percentile — open dot */}
              {cx2 !== null && (
                <circle
                  cx={cx2} cy={cy} r={5}
                  fill={COLORS.surface} stroke={color} strokeWidth={1.5}
                  aria-label={`${d.zone} 85th percentile: ${d.p85} mph`}
                />
              )}

              {/* P85 label */}
              {cx2 !== null && (
                <text
                  x={cx2 + 8} y={cy + 4}
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: d.exceeds ? COLORS.amber : COLORS.muted }}
                >
                  {d.p85}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: COLORS.muted }}>
          <svg width={20} height={12}>
            <circle cx={6} cy={6} r={5} fill={COLORS.sage} />
          </svg>
          Avg speed
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: COLORS.muted }}>
          <svg width={20} height={12}>
            <circle cx={6} cy={6} r={5} fill={COLORS.surface} stroke={COLORS.sage} strokeWidth={1.5} />
          </svg>
          85th percentile
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: COLORS.amber }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: COLORS.amber, borderRadius: '50%' }} />
          Exceeds 25 mph target
        </span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: COLORS.muted, marginLeft: 'auto' }}>
          Data from Streetlight · 2025
        </span>
      </div>

      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', color: COLORS.muted, marginTop: '0.5rem', lineHeight: 1.4 }}>
        85th percentile speed is the California standard for speed limit setting (CVC §22358.5).{' '}
        {(() => {
          const exceeding = data.filter(d => d.exceeds).length
          return exceeding > 0
            ? `${exceeding} of ${data.length} segments exceed Berkeley's 25 mph Vision Zero target.`
            : null
        })()}
      </p>

      {/* Independent city count corroboration */}
      <div style={{
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: `1px solid ${COLORS.border}`,
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.7rem',
        color: COLORS.muted,
        lineHeight: 1.5,
      }}>
        <span style={{ color: COLORS.text, fontWeight: 600 }}>Independent check:</span>{' '}
        A 2019 city-commissioned pneumatic tube count at Stannage Ave measured a 29 mph 85th percentile
        westbound — consistent with the Streetlight estimates above. (49% of westbound vehicles exceeded 25 mph.)
        {' '}<span style={{ opacity: 0.7 }}>Source: City of Berkeley traffic count, 2019 · different methodology and location — corroborating, not directly validating.</span>
      </div>
    </div>
  )
}
