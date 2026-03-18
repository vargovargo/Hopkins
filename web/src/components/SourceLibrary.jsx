/**
 * SourceLibrary.jsx — tabbed source library (Prompt 10)
 *
 * Four tabs: Government Documents | Journalism | Advocacy | Opposition
 * Data: data/processed/project_history.json → sources
 *
 * Opposition tab includes a framing note at the top.
 */

import { useState } from 'react'
import historyData from '@data/processed/project_history.json'
import './SourceLibrary.css'

const TABS = [
  { key: 'government',  label: 'Government Documents' },
  { key: 'journalism',  label: 'Journalism' },
  { key: 'advocacy',    label: 'Advocacy' },
  { key: 'opposition',  label: 'Opposition' },
]

function SourceCard({ source }) {
  return (
    <article className="source-card">
      <div className="source-card__meta">
        <h3 className="source-card__title">{source.title}</h3>
        <span className="source-card__byline">
          {source.organization}
          {source.year ? ` · ${source.year}` : ''}
        </span>
      </div>

      {source.summary && (
        <p className="source-card__summary">{source.summary}</p>
      )}

      {source.key_facts?.length > 0 && (
        <ul className="source-card__facts">
          {source.key_facts.map((fact, i) => (
            <li key={i}>{fact}</li>
          ))}
        </ul>
      )}

      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="source-card__link"
        >
          Open source ↗
        </a>
      )}
    </article>
  )
}

export default function SourceLibrary() {
  const [activeTab, setActiveTab] = useState('government')
  const sources = historyData?.sources ?? {}
  const currentSources = sources[activeTab] ?? []

  return (
    <section className="source-library" aria-label="Source library">
      {/* Tab bar */}
      <div className="source-library__tabs" role="tablist">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            className={`source-library__tab${activeTab === key ? ' source-library__tab--active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Opposition framing note */}
      {activeTab === 'opposition' && (
        <div className="source-library__opposition-note">
          We read the opposition's arguments carefully. Understanding their
          concerns is essential to responding to them with data.
        </div>
      )}

      {/* Source cards */}
      <div
        className="source-library__cards"
        role="tabpanel"
        aria-label={TABS.find((t) => t.key === activeTab)?.label}
      >
        {currentSources.length > 0 ? (
          currentSources.map((src) => (
            <SourceCard key={src.id} source={src} />
          ))
        ) : (
          <p className="source-library__empty">No sources listed for this category yet.</p>
        )}
      </div>
    </section>
  )
}
