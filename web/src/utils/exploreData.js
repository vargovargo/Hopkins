/**
 * exploreData.js — data access utilities for the /explore sandbox page
 *
 * Abstracts:
 *   - Segment → Streetlight zone mapping (including partial-match disclosure)
 *   - Streetlight data lookups by mode / day-type / day-part
 *   - Collision data sliced by year preset
 *   - City count data
 *   - Choropleth value maps (zone → numeric, for map coloring)
 *   - CSV export builder
 *
 * All functions are pure and return plain objects/arrays — no React deps.
 */

import streetlightData from '@data/processed/streetlight_verified.json'
import collisionsData  from '@data/processed/collisions_summary.json'
import cityCountsData  from '@data/processed/city_counts.json'

// ─── Zone ID ↔ Zone Name ─────────────────────────────────────────────────────
// GeoJSON streetlight_zones[] uses underscore IDs; verified JSON uses display names.

export const ZONE_ID_TO_NAME = {
  alameda_sutter:    'Alameda to Sutter',
  mcgee_alameda:     'McGee to Alameda',
  sacramento_mcgee:  'Sacramento to McGee',
  gilman_sacramento: 'Gilman to Sacramento',
  peralta_gilman:    'Peralta to Gilman',
  sanpablo_peralta:  'San Pablo to Peralta',
  stannage_sanpablo: 'Stannage to San Pablo',
  cedar_sacramento:  'Cedar to Sacramento',
  rose_sacramento:   'Rose to Sacramento',
}

// ─── Segment → Zone metadata ──────────────────────────────────────────────────
// Drives disclosure badges and zone-data lookups for the 4 project segments.
// "partial" means the Streetlight zone boundary doesn't match the design segment.

export const SEGMENT_ZONE_META = {
  'sutter-alameda': {
    label:       'Sutter St to The Alameda',
    primaryZone: 'Alameda to Sutter',
    allZones:    ['Alameda to Sutter'],
    zoneMatch:   'exact',
    zoneNote:    null,
  },
  'alameda-mcgee': {
    label:       'The Alameda to McGee Ave',
    primaryZone: 'McGee to Alameda',
    allZones:    ['McGee to Alameda'],
    zoneMatch:   'exact',
    zoneNote:    null,
  },
  'mcgee-monterey': {
    label:       'McGee Ave to Monterey Ave',
    primaryZone: 'Sacramento to McGee',
    allZones:    ['Sacramento to McGee'],
    zoneMatch:   'partial',
    zoneNote:    'Streetlight zone (McGee–Sacramento) is wider than this segment (McGee–Monterey). Volume shown covers the full zone.',
  },
  'monterey-gilman': {
    label:       'Monterey Ave to Gilman St',
    primaryZone: 'Gilman to Sacramento',
    allZones:    ['Gilman to Sacramento', 'Sacramento to McGee'],
    zoneMatch:   'partial',
    zoneNote:    'Segment spans two Streetlight zones. Primary (Gilman–Sacramento) shown; a portion of Sacramento–McGee also falls within this segment.',
  },
}

// ─── Key format helpers ───────────────────────────────────────────────────────
// streetlight_verified.json keys: "0: All Days (M-Su) / 0: All Day (12am-12am)"

export const DAY_TYPE_KEYS = {
  '0': '0: All Days (M-Su)',
  '1': '1: Weekday (M-Th)',
  '2': '2: Weekend (Sa-Su)',
}

export const DAY_TYPE_LABELS = {
  '0': 'All Days',
  '1': 'Weekday (M–Th)',
  '2': 'Weekend (Sa–Su)',
}

export const DAY_PART_KEYS = {
  '0': '0: All Day (12am-12am)',
  '1': '1: Early AM (12am-6am)',
  '2': '2: Peak AM (6am-10am)',
  '3': '3: Mid-Day (10am-3pm)',
  '4': '4: Peak PM (3pm-7pm)',
  '5': '5: Late PM (7pm-12am)',
}

export const DAY_PART_LABELS = {
  '0': 'All Day',
  '1': 'Early AM',
  '2': 'Peak AM',
  '3': 'Mid-Day',
  '4': 'Peak PM',
  '5': 'Late PM',
}

// Day parts suitable for the time-of-day chart (exclude 'All Day' aggregate)
export const TIME_OF_DAY_PARTS = ['1', '2', '3', '4', '5']

function slKey(dayType, dayPart) {
  return `${DAY_TYPE_KEYS[dayType]} / ${DAY_PART_KEYS[dayPart]}`
}

// ─── Dataset metadata ─────────────────────────────────────────────────────────

export const DATASET_META = {
  vehicles: {
    label:       'Vehicles',
    source:      'Data from Streetlight',
    year:        2025,
    unit:        'Average Daily Segment Traffic (StL Volume)',
    unitShort:   'daily vehicles',
    hasTimeParts: true,
    hasYearFilter: false,
  },
  pedestrians: {
    label:       'Pedestrians',
    source:      'Data from Streetlight',
    year:        2022,
    unit:        'Average Daily Zone Traffic (StL Volume)',
    unitShort:   'daily pedestrians',
    hasTimeParts: true,
    hasYearFilter: false,
  },
  bicycles: {
    label:       'Bicycles',
    source:      'Data from Streetlight',
    year:        2022,
    unit:        'Average Daily Zone Traffic (StL Volume)',
    unitShort:   'daily cyclists',
    hasTimeParts: true,
    hasYearFilter: false,
  },
  collisions: {
    label:       'Collisions',
    source:      'TIMS / SWITRS',
    year:        '2014–2025',
    unit:        'Collision count (bounding box)',
    unitShort:   'collisions',
    hasTimeParts: false,
    hasYearFilter: true,
    boundingBoxNote: 'Includes some records from streets adjacent to Hopkins (Sacramento, California Ave). Not a strict Hopkins-only filter.',
  },
  city_counts: {
    label:       'City Counts',
    source:      'City of Berkeley',
    year:        2019,
    unit:        'Pneumatic tube count — single location (Stannage–Cornell)',
    unitShort:   'vehicles (2019)',
    hasTimeParts: false,
    hasYearFilter: false,
    scopeNote:   'Single-location count, west of project corridor. Pre-COVID (Oct 2019). Cannot directly validate Streetlight 2025 estimates.',
  },
}

// ─── Collision year presets ───────────────────────────────────────────────────

export const COLLISION_YEAR_PRESETS = {
  all:          { label: 'Full record (2014–2025)', years: null },
  'bike-east-bay': { label: 'Bike East Bay period (2015–2018)', years: [2015, 2016, 2017, 2018] },
  'city-staff': { label: 'City staff period (2016–2019)', years: [2016, 2017, 2018, 2019] },
  'post-project': { label: 'Post-approval (2023–2025)', years: [2023, 2024, 2025] },
}

// ─── Core lookup: Streetlight rows ───────────────────────────────────────────
/**
 * Returns rows for the selected segment IDs, mode, day type, and day part.
 * Each row: { segmentId, segmentLabel, zoneName, zoneMatch, zoneNote, value, unit, year }
 *
 * @param {string[]} segmentIds  - e.g. ['sutter-alameda', 'alameda-mcgee']
 * @param {'vehicles'|'pedestrians'|'bicycles'} mode
 * @param {string} dayType       - '0' | '1' | '2'
 * @param {string} dayPart       - '0' | '1' | '2' | '3' | '4' | '5'
 * @returns {Array}
 */
export function getStreetlightRows(segmentIds, mode, dayType, dayPart) {
  const key = slKey(dayType, dayPart)
  const meta = DATASET_META[mode]

  return segmentIds.map((segId) => {
    const segMeta = SEGMENT_ZONE_META[segId]
    if (!segMeta) return null

    const zoneName = segMeta.primaryZone
    let value = null

    if (mode === 'vehicles') {
      const zoneData = streetlightData.network_performance?.[zoneName]
      value = zoneData?.[key]?.segment_traffic ?? null
    } else {
      const zoneData = streetlightData.zone_activity?.[mode]?.[zoneName]
      value = zoneData?.[key] ?? null
    }

    // Confidence intervals are only available for vehicles, All Day part only
    let ci = null
    if (mode === 'vehicles' && dayPart === '0') {
      const ciData = streetlightData.prediction_intervals?.[zoneName]
      const ciKey = Object.keys(ciData ?? {})[0] // single period key
      if (ciKey && ciData[ciKey]) {
        ci = { lower: ciData[ciKey].lower_95, upper: ciData[ciKey].upper_95 }
      }
    }

    return {
      segmentId:    segId,
      segmentLabel: segMeta.label,
      zoneName,
      zoneMatch:    segMeta.zoneMatch,
      zoneNote:     segMeta.zoneNote,
      value,
      ci,
      unit:         meta.unit,
      unitShort:    meta.unitShort,
      year:         meta.year,
      source:       meta.source,
    }
  }).filter(Boolean)
}

/**
 * Returns all day-part values for a given segment + mode + day type.
 * Used for the time-of-day chart (x-axis = day part, y-axis = volume).
 *
 * @param {string} segmentId
 * @param {'vehicles'|'pedestrians'|'bicycles'} mode
 * @param {string} dayType  - '0' | '1' | '2'
 * @returns {Array} [{dayPart, label, value}, ...]
 */
export function getTimeOfDayRows(segmentId, mode, dayType) {
  const segMeta = SEGMENT_ZONE_META[segmentId]
  if (!segMeta) return []
  const zoneName = segMeta.primaryZone

  return TIME_OF_DAY_PARTS.map((dp) => {
    const key = slKey(dayType, dp)
    let value = null

    if (mode === 'vehicles') {
      value = streetlightData.network_performance?.[zoneName]?.[key]?.segment_traffic ?? null
    } else {
      value = streetlightData.zone_activity?.[mode]?.[zoneName]?.[key] ?? null
    }

    return {
      dayPart:  dp,
      label:    DAY_PART_LABELS[dp],
      value,
    }
  })
}

// ─── Collision rows ───────────────────────────────────────────────────────────
/**
 * Returns collision data filtered by year preset.
 * Collision data is corridor-wide (bounding box) — not segment-specific.
 *
 * @param {string} yearPreset  - 'all' | 'bike-east-bay' | 'city-staff' | 'post-project'
 * @returns {{ rows: Array, totals: Object, note: string }}
 */
export function getCollisionRows(yearPreset = 'all') {
  const preset = COLLISION_YEAR_PRESETS[yearPreset]
  const byYear = collisionsData.by_year

  const rows = Object.entries(byYear)
    .map(([year, counts]) => ({
      year:               parseInt(year, 10),
      fatal:              counts.fatal ?? 0,
      severe_injury:      counts.severe_injury ?? 0,
      other_injury:       counts.other_injury ?? 0,
      property_damage:    counts.property_damage_only ?? 0,
      total:              (counts.fatal ?? 0) + (counts.severe_injury ?? 0) +
                          (counts.other_injury ?? 0) + (counts.property_damage_only ?? 0),
    }))
    .filter((r) => !preset.years || preset.years.includes(r.year))
    .sort((a, b) => a.year - b.year)

  const totals = rows.reduce(
    (acc, r) => {
      acc.fatal           += r.fatal
      acc.severe_injury   += r.severe_injury
      acc.other_injury    += r.other_injury
      acc.property_damage += r.property_damage
      acc.total           += r.total
      return acc
    },
    { fatal: 0, severe_injury: 0, other_injury: 0, property_damage: 0, total: 0 },
  )

  return { rows, totals, presetLabel: preset.label }
}

// ─── City count rows ──────────────────────────────────────────────────────────
/**
 * Returns city count speed summary for both directions.
 * Not filterable by segment — single location.
 */
export function getCityCountRows() {
  const speed = cityCountsData.speed
  return ['WB', 'EB'].map((dir) => {
    const s = speed[dir]?.primary_day ?? speed[dir]?.week_stats?.[0] ?? null
    if (!s) return null
    return {
      direction:      dir,
      dirLabel:       dir === 'WB' ? 'Westbound' : 'Eastbound',
      date:           s.date,
      total_vehicles: s.total_vehicles,
      p15_mph:        s.p15_mph,
      p50_mph:        s.p50_mph,
      p85_mph:        s.p85_mph,
      p95_mph:        s.p95_mph,
      pct_over_25mph: s.pct_over_25mph,
    }
  }).filter(Boolean)
}

// ─── Choropleth value map ─────────────────────────────────────────────────────
/**
 * Returns a { zoneName → number } map for all 9 Streetlight zones,
 * suitable for coloring the map choropleth.
 *
 * @param {'volume'|'speed'} metric
 * @param {'vehicles'|'pedestrians'|'bicycles'} mode
 * @param {string} dayType
 * @param {string} dayPart
 * @returns {{ values: Object, min: number, max: number }}
 */
export function choroplethValues(metric, mode, dayType, dayPart) {
  const key = slKey(dayType, dayPart)
  const values = {}

  const allZones = Object.values(ZONE_ID_TO_NAME)
  for (const zoneName of allZones) {
    let v = null
    if (metric === 'speed') {
      v = streetlightData.network_performance?.[zoneName]?.[key]?.speed_p85 ?? null
    } else if (mode === 'vehicles') {
      v = streetlightData.network_performance?.[zoneName]?.[key]?.segment_traffic ?? null
    } else {
      v = streetlightData.zone_activity?.[mode]?.[zoneName]?.[key] ?? null
    }
    if (v !== null) values[zoneName] = v
  }

  const nums = Object.values(values)
  const min = nums.length ? Math.min(...nums) : 0
  const max = nums.length ? Math.max(...nums) : 1

  return { values, min, max }
}

// ─── Story section callout ────────────────────────────────────────────────────
/**
 * Returns a story section callout if the current dataset/segment selection
 * corresponds to a section in the main data story.
 *
 * @param {'vehicles'|'pedestrians'|'bicycles'|'collisions'|'city_counts'} dataset
 * @param {string[]} selectedSegments
 * @returns {{ anchor: string, label: string } | null}
 */
export function getStoryCallout(dataset, selectedSegments) {
  const commercialIds = new Set(['mcgee-monterey', 'monterey-gilman'])
  const hasCommercial = selectedSegments.some((id) => commercialIds.has(id))

  if (dataset === 'collisions') {
    return { anchor: '#cost', label: '"The cost of doing nothing"' }
  }
  if (dataset === 'city_counts') {
    // Speed data (85th percentile) is featured in the cost section alongside CollisionChart
    return { anchor: '#cost', label: '"The cost of doing nothing"' }
  }
  if (dataset === 'pedestrians' || dataset === 'bicycles') {
    if (hasCommercial) {
      return { anchor: '#street-design', label: '"The street doesn\'t match how people use it"' }
    }
    // Default to the general mode overview when no specific or non-commercial segment selected
    return { anchor: '#who', label: '"Who\'s on Hopkins?"' }
  }
  if (dataset === 'vehicles' && hasCommercial) {
    return { anchor: '#parking', label: '"What\'s actually at stake with parking"' }
  }
  if (dataset === 'vehicles') {
    return { anchor: '#who', label: '"Who\'s on Hopkins?"' }
  }
  return null
}

// ─── CSV export ───────────────────────────────────────────────────────────────
/**
 * Builds a CSV string for the currently displayed rows.
 * Always includes metadata header rows for traceability.
 *
 * @param {Array}  rows       - array of row objects
 * @param {string} dataset    - 'vehicles' | 'pedestrians' | 'bicycles' | 'collisions' | 'city_counts'
 * @param {Object} filters    - { dayType, dayPart, yearPreset } for the metadata header
 * @returns {string}
 */
export function buildCSV(rows, dataset, filters = {}) {
  const meta = DATASET_META[dataset]
  const now  = new Date().toISOString().slice(0, 10)

  const metaLines = [
    `# Hopkins Street Safety — Data Export`,
    `# Dataset: ${meta.label}`,
    `# Source: ${meta.source}`,
    `# Data year: ${meta.year}`,
    `# Unit: ${meta.unit}`,
    `# Export date: ${now}`,
    `# Attribution: ${meta.source}`,
  ]

  if (filters.dayType !== undefined && meta.hasTimeParts) {
    metaLines.push(`# Day type: ${DAY_TYPE_LABELS[filters.dayType]}`)
    metaLines.push(`# Day part: ${DAY_PART_LABELS[filters.dayPart]}`)
  }
  if (filters.yearPreset && meta.hasYearFilter) {
    metaLines.push(`# Period: ${COLLISION_YEAR_PRESETS[filters.yearPreset]?.label}`)
  }
  if (meta.boundingBoxNote) {
    metaLines.push(`# Note: ${meta.boundingBoxNote}`)
  }
  if (meta.scopeNote) {
    metaLines.push(`# Scope note: ${meta.scopeNote}`)
  }
  metaLines.push('#')

  if (!rows || rows.length === 0) {
    return [...metaLines, '# No data rows selected.'].join('\n')
  }

  // Build column headers from first row's keys (excluding internal flags)
  const SKIP_COLS = new Set(['ci'])
  const cols = Object.keys(rows[0]).filter((k) => !SKIP_COLS.has(k))

  const header = cols.join(',')
  const dataLines = rows.map((row) =>
    cols.map((col) => {
      const v = row[col]
      if (v === null || v === undefined) return ''
      if (typeof v === 'string' && v.includes(',')) return `"${v}"`
      return String(v)
    }).join(','),
  )

  return [...metaLines, header, ...dataLines].join('\n')
}
