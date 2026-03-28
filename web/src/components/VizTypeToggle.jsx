/**
 * VizTypeToggle.jsx — bar / time-of-day / table switcher for the explore panel
 *
 * The "time" option is only available for Streetlight datasets that have
 * day-part breakdowns.
 *
 * Props:
 *   vizType    string   - 'bar' | 'time' | 'table'
 *   dataset    string   - current dataset (controls which options are enabled)
 *   onChange   fn       - (vizType: string) => void
 */

import { DATASET_META } from '../utils/exploreData'

const VIZ_OPTIONS = [
  { key: 'bar',   label: 'Bar chart' },
  { key: 'time',  label: 'Time of day' },
  { key: 'table', label: 'Table' },
]

export default function VizTypeToggle({ vizType, dataset, onChange }) {
  const meta = DATASET_META[dataset]

  return (
    <div className="viz-toggle" role="group" aria-label="Visualization type">
      {VIZ_OPTIONS.map(({ key, label }) => {
        const disabled = key === 'time' && !meta?.hasTimeParts
        return (
          <button
            key={key}
            className={`viz-toggle__btn${vizType === key ? ' viz-toggle__btn--active' : ''}${disabled ? ' viz-toggle__btn--disabled' : ''}`}
            onClick={() => !disabled && onChange(key)}
            aria-pressed={vizType === key}
            disabled={disabled}
            title={disabled ? 'Not available for this dataset' : undefined}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
