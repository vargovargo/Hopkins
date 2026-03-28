/**
 * DatasetSelector.jsx — tab bar for choosing the active dataset in the explorer
 *
 * Props:
 *   dataset     string       - current active dataset key
 *   onChange    function     - (newDataset: string) => void
 */

const DATASETS = [
  { key: 'vehicles',    label: 'Vehicles' },
  { key: 'pedestrians', label: 'Pedestrians' },
  { key: 'bicycles',    label: 'Cyclists' },
  { key: 'collisions',  label: 'Collisions' },
  { key: 'city_counts', label: 'City Counts' },
]

export default function DatasetSelector({ dataset, onChange }) {
  return (
    <div className="dataset-selector" role="tablist" aria-label="Dataset">
      {DATASETS.map(({ key, label }) => (
        <button
          key={key}
          role="tab"
          aria-selected={dataset === key}
          className={`dataset-selector__tab${dataset === key ? ' dataset-selector__tab--active' : ''}`}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
