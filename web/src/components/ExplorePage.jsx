/**
 * ExplorePage.jsx — /explore route
 *
 * Data sandbox for power users: advocates, journalists, council staff.
 * Gives direct access to all underlying datasets with GIS-style multi-segment
 * selection and filterable, downloadable visualizations.
 *
 * Layout: sticky map (left 40%) | controls + viz (right 60%)
 *
 * State:
 *   selectedSegments  string[]    — multi-select segment ids from map
 *   dataset           string      — active dataset key
 *   dayType           string      — '0'|'1'|'2'
 *   dayPart           string      — '0'–'5'
 *   collisionPreset   string      — year range preset for collision data
 *   vizType           string      — 'bar'|'time'|'table'
 *   showCollisions    boolean     — collision points map layer toggle
 */

import { useState, useMemo, useCallback } from 'react'

import CorridorMap      from './CorridorMap'
import DatasetSelector  from './DatasetSelector'
import FilterControls   from './FilterControls'
import VizTypeToggle    from './VizTypeToggle'
import DataBadge        from './DataBadge'
import DownloadButton   from './DownloadButton'
import ExploreTable     from './ExploreTable'
import ExploreBarChart  from './ExploreBarChart'
import ExploreTimeChart from './ExploreTimeChart'

import {
  getStreetlightRows,
  getCollisionRows,
  getCityCountRows,
  choroplethValues,
  getStoryCallout,
  SEGMENT_ZONE_META,
  DATASET_META,
} from '../utils/exploreData'

import './ExplorePage.css'

// ─── Color interpolation for choropleth ──────────────────────────────────────
// Low → green (#4a7c59), high → amber (#c4713b)

function lerpColor(t) {
  // t in [0, 1]
  const from = { r: 0x4a, g: 0x7c, b: 0x59 }
  const to   = { r: 0xc4, g: 0x71, b: 0x3b }
  const r    = Math.round(from.r + (to.r - from.r) * t)
  const g    = Math.round(from.g + (to.g - from.g) * t)
  const b    = Math.round(from.b + (to.b - from.b) * t)
  return `rgb(${r},${g},${b})`
}

const PROJECT_SEGMENT_IDS = Object.keys(SEGMENT_ZONE_META)

// ─── Empty-state guidance ────────────────────────────────────────────────────

function EmptyStateGuide() {
  return (
    <div className="explore-empty-state">
      <div className="explore-empty-state__steps">
        <div className="explore-empty-state__step">
          <span className="explore-empty-state__num">①</span>
          <span>Click any corridor segment on the map to explore its data.</span>
        </div>
        <div className="explore-empty-state__step">
          <span className="explore-empty-state__num">②</span>
          <span>
            <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + click to compare multiple segments side by side.
          </span>
        </div>
        <div className="explore-empty-state__step">
          <span className="explore-empty-state__num">③</span>
          <span>
            Choose a dataset above to switch between vehicles, pedestrians, cyclists, and collisions.
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Selected segment chips ───────────────────────────────────────────────────

function SegmentChips({ selectedSegments, onRemove }) {
  if (selectedSegments.length === 0) return null
  return (
    <div className="explore-chips">
      {selectedSegments.map((id) => {
        const meta = SEGMENT_ZONE_META[id]
        return (
          <span key={id} className="explore-chip">
            {meta?.label ?? id}
            <button
              className="explore-chip__remove"
              onClick={() => onRemove(id)}
              aria-label={`Remove ${meta?.label ?? id}`}
            >
              ×
            </button>
          </span>
        )
      })}
      {selectedSegments.length > 1 && (
        <button className="explore-chip explore-chip--clear" onClick={() => onRemove(null)}>
          Clear all
        </button>
      )}
    </div>
  )
}

// ─── Choropleth legend ────────────────────────────────────────────────────────

function ChoroplethLegend({ min, max, label }) {
  if (min === null || max === null) return null
  return (
    <div className="choropleth-legend">
      <span className="choropleth-legend__label">{min.toLocaleString()}</span>
      <div className="choropleth-legend__gradient" />
      <span className="choropleth-legend__label">{max.toLocaleString()}</span>
      <span className="choropleth-legend__unit">{label}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [selectedSegments, setSelectedSegments] = useState([])
  const [dataset,          setDataset]          = useState('vehicles')
  const [dayType,          setDayType]          = useState('0')
  const [dayPart,          setDayPart]          = useState('0')
  const [collisionPreset,  setCollisionPreset]  = useState('all')
  const [vizType,          setVizType]          = useState('bar')
  const [showCollisions,   setShowCollisions]   = useState(false)

  // ── Segment selection (multi-select) ──────────────────────────────────
  const handleMultiClick = useCallback((id, isAdditive) => {
    if (id === null) {
      setSelectedSegments([])
      return
    }
    if (!PROJECT_SEGMENT_IDS.includes(id)) return  // ignore context segments
    setSelectedSegments((prev) => {
      if (!isAdditive) return [id]
      if (prev.includes(id)) return prev.filter((s) => s !== id)
      return [...prev, id]
    })
  }, [])

  const handleRemoveChip = useCallback((id) => {
    if (id === null) {
      setSelectedSegments([])
    } else {
      setSelectedSegments((prev) => prev.filter((s) => s !== id))
    }
  }, [])

  // Reset viz type to 'bar' when switching to a dataset without time parts
  const handleDatasetChange = useCallback((next) => {
    setDataset(next)
    if (vizType === 'time' && !DATASET_META[next]?.hasTimeParts) {
      setVizType('bar')
    }
    // Auto-show collision points on map when collisions dataset selected
    if (next === 'collisions') setShowCollisions(true)
    else setShowCollisions(false)
  }, [vizType])

  // ── Data queries ──────────────────────────────────────────────────────
  const streetsegments = selectedSegments.length > 0
    ? selectedSegments
    : PROJECT_SEGMENT_IDS  // show all when nothing selected? — no: show empty state

  const streetlightRows = useMemo(() => {
    if (selectedSegments.length === 0) return []
    if (!['vehicles', 'pedestrians', 'bicycles'].includes(dataset)) return []
    return getStreetlightRows(selectedSegments, dataset, dayType, dayPart)
  }, [selectedSegments, dataset, dayType, dayPart])

  const collisionResult = useMemo(() => {
    if (dataset !== 'collisions') return null
    return getCollisionRows(collisionPreset)
  }, [dataset, collisionPreset])

  const cityCountRows = useMemo(() => {
    if (dataset !== 'city_counts') return null
    return getCityCountRows()
  }, [dataset])

  // ── Choropleth ────────────────────────────────────────────────────────
  const choroplethData = useMemo(() => {
    if (!['vehicles', 'pedestrians', 'bicycles'].includes(dataset)) return null
    return choroplethValues('volume', dataset, dayType, dayPart)
  }, [dataset, dayType, dayPart])

  const choroplethSegmentColors = useMemo(() => {
    if (!choroplethData) return null
    const { values, min, max } = choroplethData
    const range = max - min || 1
    // Map primary zone → segment id
    const zoneToSeg = {
      'Alameda to Sutter':  'sutter-alameda',
      'McGee to Alameda':   'alameda-mcgee',
      'Sacramento to McGee':'mcgee-monterey',
      'Gilman to Sacramento':'monterey-gilman',
    }
    const result = {}
    for (const [zoneName, segId] of Object.entries(zoneToSeg)) {
      const v = values[zoneName]
      if (v !== undefined) {
        result[segId] = lerpColor((v - min) / range)
      }
    }
    return result
  }, [choroplethData])

  // ── Story callout ─────────────────────────────────────────────────────
  const storyCallout = useMemo(
    () => getStoryCallout(dataset, selectedSegments),
    [dataset, selectedSegments],
  )

  // ── Download rows (flatten for CSV) ──────────────────────────────────
  const csvRows = useMemo(() => {
    if (dataset === 'collisions') return collisionResult?.rows ?? []
    if (dataset === 'city_counts') return cityCountRows ?? []
    return streetlightRows
  }, [dataset, streetlightRows, collisionResult, cityCountRows])

  const csvFilters = { dayType, dayPart, yearPreset: collisionPreset }

  // ── Viz availability ──────────────────────────────────────────────────
  const hasData = selectedSegments.length > 0
    || dataset === 'collisions'
    || dataset === 'city_counts'

  return (
    <div className="explore-page">
      {/* Page header */}
      <div className="explore-header">
        <h1 className="explore-header__title">Data Explorer</h1>
        <p className="explore-header__blurb">
          Query the underlying datasets directly. Select corridor segments on the map,
          filter by time of day or collision period, and download what you find.
        </p>
      </div>

      <div className="explore-layout">
        {/* ── Left: sticky map ── */}
        <div className="explore-map-col">
          <div className="explore-map-sticky">
            <CorridorMap
              selectedSegments={selectedSegments}
              onSegmentMultiClick={handleMultiClick}
              choroplethSegmentColors={choroplethSegmentColors}
              collisionPointsVisible={showCollisions}
            />

            {/* Map hint for multi-select */}
            {selectedSegments.length === 0 && (
              <p className="explore-map-hint">
                Click a segment · <kbd>Ctrl/⌘</kbd>+click to compare
              </p>
            )}

            {/* Choropleth legend */}
            {choroplethData && (
              <ChoroplethLegend
                min={choroplethData.min}
                max={choroplethData.max}
                label={DATASET_META[dataset]?.unitShort}
              />
            )}

            {/* Collision points toggle */}
            {dataset === 'collisions' && (
              <label className="explore-collision-toggle">
                <input
                  type="checkbox"
                  checked={showCollisions}
                  onChange={(e) => setShowCollisions(e.target.checked)}
                />
                Show collision points on map
              </label>
            )}
          </div>
        </div>

        {/* ── Right: controls + viz ── */}
        <div className="explore-panel">
          {/* Dataset selector */}
          <DatasetSelector dataset={dataset} onChange={handleDatasetChange} />

          {/* Filter controls */}
          <FilterControls
            dataset={dataset}
            dayType={dayType}
            dayPart={dayPart}
            collisionPreset={collisionPreset}
            onDayType={setDayType}
            onDayPart={setDayPart}
            onCollisionPreset={setCollisionPreset}
          />

          {/* Viz type + data badge row */}
          <div className="explore-viz-header">
            <VizTypeToggle vizType={vizType} dataset={dataset} onChange={setVizType} />
          </div>

          {/* Data badge + story callout */}
          <DataBadge dataset={dataset} storyCallout={storyCallout} />

          {/* Selected segment chips */}
          <SegmentChips
            selectedSegments={selectedSegments}
            onRemove={handleRemoveChip}
          />

          {/* Viz area */}
          <div className="explore-viz-area">
            {!hasData && vizType !== 'time' ? (
              <EmptyStateGuide />
            ) : vizType === 'table' ? (
              <ExploreTable
                dataset={dataset}
                rows={streetlightRows}
                collisionResult={collisionResult}
                cityCountRows={cityCountRows}
              />
            ) : vizType === 'time' ? (
              <ExploreTimeChart
                segmentIds={selectedSegments}
                mode={dataset}
                dayType={dayType}
              />
            ) : (
              <ExploreBarChart
                dataset={dataset}
                rows={streetlightRows}
                collisionResult={collisionResult}
                cityCountRows={cityCountRows}
              />
            )}
          </div>

          {/* Download */}
          <div className="explore-download-row">
            <DownloadButton
              rows={csvRows}
              dataset={dataset}
              filters={csvFilters}
              disabled={csvRows.length === 0}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
