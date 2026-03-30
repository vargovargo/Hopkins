/**
 * DataBadge.jsx — always-visible source/year/unit attribution strip
 * + optional StoryCallout linking back to the relevant story section.
 *
 * Props:
 *   dataset          string   - active dataset key
 *   storyCallout     object|null - { anchor: string, label: string }
 */

import { DATASET_META } from '../utils/exploreData'
import { Link } from 'react-router-dom'

export default function DataBadge({ dataset, storyCallout }) {
  const meta = DATASET_META[dataset]
  if (!meta) return null

  return (
    <div className="data-badge">
      <div className="data-badge__row">
        <span className="data-badge__source">{meta.source}</span>
        <span className="data-badge__sep">·</span>
        <span className="data-badge__year">{meta.year}</span>
        <span className="data-badge__sep">·</span>
        <span className="data-badge__unit">{meta.unit}</span>
      </div>

      {meta.boundingBoxNote && (
        <div className="data-badge__note">
          <span className="data-badge__note-icon">ⓘ</span>
          {meta.boundingBoxNote}
        </div>
      )}
      {meta.scopeNote && (
        <div className="data-badge__note">
          <span className="data-badge__note-icon">ⓘ</span>
          {meta.scopeNote}
        </div>
      )}

      {storyCallout && (
        <div className="data-badge__callout">
          <span className="data-badge__callout-arrow">→</span>
          <span>This data is featured in <strong>{storyCallout.label}</strong></span>
          <Link to={{ pathname: '/', hash: storyCallout.anchor }} className="data-badge__callout-link">
            Read the story ↗
          </Link>
        </div>
      )}
    </div>
  )
}
