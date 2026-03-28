/**
 * ExploreTimeChart.jsx — time-of-day line chart for the explore sandbox.
 *
 * Shows all day parts (Early AM through Late PM) on the x-axis,
 * with one line per selected segment.
 *
 * Only available for Streetlight datasets (vehicles, pedestrians, bicycles).
 *
 * Props:
 *   segmentIds  string[]    - selected segment ids
 *   mode        string      - 'vehicles' | 'pedestrians' | 'bicycles'
 *   dayType     string      - '0' | '1' | '2'
 */

import { getTimeOfDayRows, SEGMENT_ZONE_META, DATASET_META } from '../utils/exploreData'

const SEGMENT_COLORS = ['#4a7c59', '#6a9bcc', '#c4713b', '#c4a03b']

const CHART_H    = 200
const CHART_PADL = 56
const CHART_PADR = 16
const CHART_PADT = 16
const CHART_PADB = 36

export default function ExploreTimeChart({ segmentIds, mode, dayType }) {
  if (!segmentIds || segmentIds.length === 0) {
    return (
      <p className="explore-empty-msg">
        Select one or more segments on the map to see the time-of-day pattern.
      </p>
    )
  }

  const meta = DATASET_META[mode]

  // Build series: one per segment
  const series = segmentIds.map((segId, i) => {
    const segMeta = SEGMENT_ZONE_META[segId]
    const rows    = getTimeOfDayRows(segId, mode, dayType)
    return {
      segmentId:    segId,
      segmentLabel: segMeta?.label ?? segId,
      color:        SEGMENT_COLORS[i % SEGMENT_COLORS.length],
      rows,
    }
  })

  // Compute overall max for y-axis scale
  const allValues = series.flatMap((s) => s.rows.map((r) => r.value)).filter((v) => v !== null)
  if (allValues.length === 0) {
    return <p className="explore-empty-msg">No time-of-day data available for this selection.</p>
  }
  const maxVal = Math.max(...allValues) * 1.1
  const yTicks = 4
  const chartW = 520

  const innerW = chartW - CHART_PADL - CHART_PADR
  const innerH = CHART_H - CHART_PADT - CHART_PADB

  const dayParts = series[0]?.rows ?? []
  const xStep    = dayParts.length > 1 ? innerW / (dayParts.length - 1) : 0

  const toX = (i) => CHART_PADL + i * xStep
  const toY = (v) => (v === null)
    ? null
    : CHART_PADT + innerH - (v / maxVal) * innerH

  return (
    <div className="explore-time-chart">
      <svg
        viewBox={`0 0 ${chartW} ${CHART_H}`}
        className="explore-time-chart__svg"
        role="img"
        aria-label={`Time of day chart — ${meta?.label}`}
      >
        {/* Gridlines + y-axis ticks */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const v    = (maxVal / yTicks) * i
          const y    = toY(v)
          const nice = Math.round(v)
          return (
            <g key={i}>
              <line
                x1={CHART_PADL} y1={y}
                x2={chartW - CHART_PADR} y2={y}
                className="explore-time-chart__gridline"
              />
              <text x={CHART_PADL - 6} y={y + 4} className="explore-time-chart__tick-label" textAnchor="end">
                {nice.toLocaleString()}
              </text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {dayParts.map((dp, i) => (
          <text
            key={dp.dayPart}
            x={toX(i)}
            y={CHART_H - 6}
            className="explore-time-chart__x-label"
            textAnchor="middle"
          >
            {dp.label}
          </text>
        ))}

        {/* Lines + dots per segment */}
        {series.map((s) => {
          const pts = s.rows
            .map((r, i) => ({ x: toX(i), y: toY(r.value), v: r.value }))
            .filter((p) => p.y !== null)

          if (pts.length < 2) return null

          const pathD = pts
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ')

          return (
            <g key={s.segmentId}>
              <path
                d={pathD}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                className="explore-time-chart__line"
              />
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={3.5}
                  fill={s.color}
                  className="explore-time-chart__dot"
                >
                  <title>{`${s.segmentLabel} — ${s.rows[i]?.label}: ${p.v?.toLocaleString()}`}</title>
                </circle>
              ))}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      {series.length > 1 && (
        <div className="explore-time-chart__legend">
          {series.map((s) => (
            <span key={s.segmentId} className="explore-time-chart__legend-item">
              <span
                className="explore-time-chart__legend-swatch"
                style={{ background: s.color }}
              />
              {s.segmentLabel}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
