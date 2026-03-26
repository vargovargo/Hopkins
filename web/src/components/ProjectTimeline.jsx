/**
 * ProjectTimeline.jsx — vertical timeline (Prompt 10)
 *
 * Renders the `timeline` array from data/processed/project_history.json.
 *
 * Event type → left border color:
 *   fatality    #8b2c2c  (deep red)
 *   policy      #4a7c59  (forest green)
 *   process     #6a9bcc  (slate blue)
 *   controversy #c4713b  (burnt amber)
 *   setback     #8a9a78  (muted sage)
 *   safety      #4a7c59  (forest green)
 *
 * Mobile: cards collapsed by default (title + date only), expand on tap.
 * Desktop: fully expanded.
 */

import { useState } from 'react'
import historyData from '@data/processed/project_history.json'
import './ProjectTimeline.css'

const TYPE_COLOR = {
  fatality:    '#8b2c2c',
  policy:      '#4a7c59',
  process:     '#6a9bcc',
  controversy: '#c4713b',
  setback:     '#8a9a78',
  safety:      '#4a7c59',
}

// ---------------------------------------------------------------------------
// Horizontal duration bar
// ---------------------------------------------------------------------------

const MONTH_MAP = {
  January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
  July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
}

function dateToYear(dateStr) {
  const parts = dateStr.trim().split(/[\s–]+/)
  const yearNum = parseInt(parts[parts.length - 1])
  if (isNaN(yearNum)) return null

  // "January 2018" → 2018.0, "October 2022" → 2022.75
  const monthName = MONTH_MAP[parts[0]] !== undefined ? parts[0] : null
  if (monthName) return yearNum + MONTH_MAP[monthName] / 12

  // Just a year or season — mid-year
  return yearNum + 0.5
}

const SPAN_START = 2017
const SPAN_END   = 2027   // padding beyond last event
const SPAN_RANGE = SPAN_END - SPAN_START

function HorizontalTimeline({ events }) {
  const W  = 640
  const H  = 80
  const X0 = 8
  const X1 = W - 8
  const trackW = X1 - X0
  const LINE_Y = 44

  const toX = (yr) => X0 + ((yr - SPAN_START) / SPAN_RANGE) * trackW

  const TICK_YEARS = [2017, 2019, 2021, 2023, 2025]

  return (
    <div className="timeline-bar" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none">
        {/* Track line */}
        <line x1={X0} x2={X1} y1={LINE_Y} y2={LINE_Y}
          stroke="var(--color-muted)" strokeWidth={1} strokeOpacity={0.4} />

        {/* Year ticks */}
        {TICK_YEARS.map(yr => (
          <g key={yr}>
            <line
              x1={toX(yr + 0.5)} x2={toX(yr + 0.5)}
              y1={LINE_Y - 4} y2={LINE_Y + 4}
              stroke="var(--color-muted)" strokeWidth={1} strokeOpacity={0.3}
            />
            <text
              x={toX(yr + 0.5)} y={LINE_Y + 16}
              textAnchor="middle"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fill: 'var(--color-muted)', opacity: 0.6 }}
            >
              {yr}
            </text>
          </g>
        ))}

        {/* Start label */}
        <text x={toX(2017)} y={LINE_Y - 12}
          textAnchor="start"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fill: '#8b2c2c' }}
        >
          2017
        </text>

        {/* End label */}
        <text x={toX(2026.5)} y={LINE_Y - 12}
          textAnchor="end"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fill: 'var(--color-amber, #c4713b)' }}
        >
          2026 — unbuilt
        </text>

        {/* Duration bracket line above */}
        <line x1={toX(2017)} x2={toX(2026.5)} y1={LINE_Y - 7} y2={LINE_Y - 7}
          stroke="var(--color-muted)" strokeWidth={1} strokeOpacity={0.25} strokeDasharray="2,4" />

        {/* Event dots */}
        {events.map((event) => {
          const yr = dateToYear(event.date)
          if (yr === null) return null
          const cx = toX(yr)
          const color = TYPE_COLOR[event.type] ?? '#8a9a78'
          return (
            <circle key={event.id}
              cx={cx} cy={LINE_Y} r={4}
              fill={color} fillOpacity={0.85}
            />
          )
        })}
      </svg>
    </div>
  )
}

// Legend entries — 'safety' shares the policy color, not shown separately
const LEGEND_ENTRIES = [
  { type: 'fatality',    label: 'Fatality' },
  { type: 'policy',      label: 'Policy / planning' },
  { type: 'process',     label: 'Project process' },
  { type: 'controversy', label: 'Controversy' },
  { type: 'setback',     label: 'Setback' },
]

function TimelineCard({ event }) {
  const [expanded, setExpanded] = useState(false)
  const color = TYPE_COLOR[event.type] ?? '#8a9a78'

  return (
    <li className="timeline-item">
      <span className="timeline-item__date">{event.date}</span>

      <div
        className="timeline-item__card"
        style={{ '--event-color': color }}
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setExpanded((v) => !v)}
      >
        <h3 className="timeline-item__title">{event.title}</h3>

        <div className={`timeline-item__body${expanded ? ' timeline-item__body--expanded' : ''}`}>
          <p className="timeline-item__description">{event.description}</p>
          {event.sources?.length > 0 && (
            <ul className="timeline-item__sources">
              {event.sources.map((src, i) => (
                <li key={i}>
                  {src.url ? (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="timeline-item__source-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {src.label} ↗
                    </a>
                  ) : (
                    <span className="timeline-item__source-text">{src.label}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  )
}

export default function ProjectTimeline() {
  const events = historyData?.timeline ?? []

  return (
    <section className="project-timeline" aria-label="Project timeline">
      <HorizontalTimeline events={events} />
      <div className="timeline-legend" aria-label="Event type key">
        {LEGEND_ENTRIES.map(({ type, label }) => (
          <span key={type} className="timeline-legend__item">
            <span
              className="timeline-legend__dot"
              style={{ background: TYPE_COLOR[type] }}
              aria-hidden="true"
            />
            {label}
          </span>
        ))}
      </div>
      <ul className="timeline-list">
        {events.map((event) => (
          <TimelineCard key={event.id} event={event} />
        ))}
      </ul>
      <p className="timeline-mobile-hint" aria-hidden="true">
        Tap any card to expand
      </p>
    </section>
  )
}
