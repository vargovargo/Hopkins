/**
 * FilterControls.jsx — day-type / day-part dropdowns for Streetlight datasets;
 * year-preset buttons for the collisions dataset.
 *
 * Props:
 *   dataset          string     - active dataset key
 *   dayType          string     - '0'|'1'|'2'
 *   dayPart          string     - '0'–'5'
 *   collisionPreset  string     - 'all'|'bike-east-bay'|'city-staff'|'post-project'
 *   onDayType        fn         - (value) => void
 *   onDayPart        fn         - (value) => void
 *   onCollisionPreset fn        - (value) => void
 */

import { DAY_TYPE_LABELS, DAY_PART_LABELS, COLLISION_YEAR_PRESETS, DATASET_META } from '../utils/exploreData'

const DAY_TYPES = Object.entries(DAY_TYPE_LABELS)
const DAY_PARTS = Object.entries(DAY_PART_LABELS)
const PRESETS   = Object.entries(COLLISION_YEAR_PRESETS)

function InfoTip({ text }) {
  return (
    <span className="filter-controls__tip" title={text} aria-label={text}>
      ⓘ
    </span>
  )
}

export default function FilterControls({
  dataset,
  dayType,
  dayPart,
  collisionPreset,
  onDayType,
  onDayPart,
  onCollisionPreset,
}) {
  const meta = DATASET_META[dataset]

  if (dataset === 'city_counts') {
    return (
      <div className="filter-controls filter-controls--empty">
        <span className="filter-controls__note">
          Single-location count, Oct 2019 — no time filtering available
        </span>
      </div>
    )
  }

  if (meta?.hasYearFilter) {
    return (
      <div className="filter-controls">
        <div className="filter-controls__group">
          <span className="filter-controls__label">
            Period
            <InfoTip text="These periods match those cited in official city records and advocacy reports." />
          </span>
          <div className="filter-controls__presets" role="group" aria-label="Collision period">
            {PRESETS.map(([key, { label }]) => (
              <button
                key={key}
                className={`filter-controls__preset${collisionPreset === key ? ' filter-controls__preset--active' : ''}`}
                onClick={() => onCollisionPreset(key)}
                aria-pressed={collisionPreset === key}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (meta?.hasTimeParts) {
    return (
      <div className="filter-controls">
        <div className="filter-controls__group">
          <label className="filter-controls__label" htmlFor="day-type-select">
            Day type
            <InfoTip text="Weekday = Mon–Thu average; Weekend = Sat–Sun average. Friday excluded from both." />
          </label>
          <select
            id="day-type-select"
            className="filter-controls__select"
            value={dayType}
            onChange={(e) => onDayType(e.target.value)}
          >
            {DAY_TYPES.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="filter-controls__group">
          <label className="filter-controls__label" htmlFor="day-part-select">
            Time of day
            <InfoTip text="Time bands show when activity peaks. 'All Day' is the 24-hour daily average." />
          </label>
          <select
            id="day-part-select"
            className="filter-controls__select"
            value={dayPart}
            onChange={(e) => onDayPart(e.target.value)}
          >
            {DAY_PARTS.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  return null
}
