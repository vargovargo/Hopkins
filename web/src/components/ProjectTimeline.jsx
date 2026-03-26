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
