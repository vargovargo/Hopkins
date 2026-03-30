/**
 * CorridorMap.jsx
 *
 * Mapbox GL JS map used by both the scrollytelling story and the /explore sandbox.
 *
 * Story props (legacy — still supported):
 *   highlightSegment  string | null — scroll-driven highlight
 *   selectedSegment   string | null — single segment click selection
 *   onSegmentClick    fn(id: string) — called on segment click
 *
 * Explorer props (additive — defaults preserve story behavior):
 *   selectedSegments  string[]       — multi-select; overrides selectedSegment rendering
 *                                      when set and non-empty
 *   onSegmentMultiClick fn(id, isAdditive) — additive = Ctrl/Cmd held
 *   choroplethSegmentColors  object | null  — { segmentId: '#rrggbb' } for choropleth
 *   collisionPointsVisible   boolean        — show collision_geo.geojson dots
 *
 * Data sources:
 *   data/geo/corridor.geojson           — corridor geometry + intersections
 *   data/geo/fatality_locations.geojson — fatality points
 *   data/geo/collisions_geo.geojson     — individual collision points (explorer only)
 *
 * Mapbox token: VITE_MAPBOX_TOKEN environment variable
 */

import { useRef, useEffect, useState, Component } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import corridorData   from '@data/geo/corridor.geojson'
import fatalityData   from '@data/geo/fatality_locations.geojson'
import collisionsData from '@data/geo/collisions.geojson'
import collisionData  from '@data/processed/collisions_geo.geojson'

import './CorridorMap.css'

const MAP_CENTER = [-122.281, 37.882]
const MAP_ZOOM   = 14.5

// Filter selecting a single segment by its segment_id property
function segmentFilter(id) {
  if (!id) return ['literal', false]
  return ['==', ['get', 'segment_id'], id]
}

// Filter selecting multiple segments (for multi-select mode)
function multiSegmentFilter(ids) {
  if (!ids || ids.length === 0) return ['literal', false]
  return ['in', ['get', 'segment_id'], ['literal', ids]]
}

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="corridor-map corridor-map--no-token">
          <p>Map unavailable in this environment.</p>
        </div>
      )
    }
    return this.props.children
  }
}

function CorridorMapInner({
  // Story props (legacy)
  highlightSegment = null,
  selectedSegment  = null,
  onSegmentClick   = () => {},
  // Explorer props (additive)
  selectedSegments           = [],
  onSegmentMultiClick        = null,
  choroplethSegmentColors    = null,
  collisionPointsVisible     = false,
}) {
  const containerRef      = useRef(null)
  const mapRef            = useRef(null)
  const loadedRef         = useRef(false)
  const markersRef        = useRef([])
  const collisionPopupRef = useRef(null)
  const [showHint, setShowHint]     = useState(true)
  const [hintFading, setHintFading] = useState(false)
  const [hoveredSegment, setHoveredSegment] = useState(null)

  // Fade out hint after 3 seconds
  useEffect(() => {
    const fadeTimer = setTimeout(() => setHintFading(true), 3000)
    const hideTimer = setTimeout(() => setShowHint(false), 3350)
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [])

  // ── Map initialization (runs once) ────────────────────────────────────
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    if (!token) return

    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      attributionControl: false,
    })

    mapRef.current = map

    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      'bottom-right',
    )

    map.on('load', () => {
      // ── Corridor source ──────────────────────────────────────────────
      map.addSource('corridor', {
        type: 'geojson',
        data: corridorData,
        promoteId: 'segment_id', // use segment_id as feature state key
      })

      // Context corridor (west of project boundary) — dashed, dimmer
      map.addLayer({
        id: 'layer-context-line',
        type: 'line',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'corridor_context'],
        paint: {
          'line-color': '#4a7c59',
          'line-width': 2,
          'line-opacity': 0.4,
          'line-dasharray': [2, 3],
        },
      })

      // Cedar and Rose parallel routes — blue dashed lines (below corridor)
      map.addLayer({
        id: 'layer-parallel-routes',
        type: 'line',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'parallel_route_reference'],
        paint: {
          'line-color': '#6a9bcc',
          'line-width': 2,
          'line-opacity': 0.65,
          'line-dasharray': [3, 4],
        },
      })

      // Main project corridor — base line, per-segment color + weight
      // Eastern residential segments: green. Western commercial: amber (contested + fatality location)
      map.addLayer({
        id: 'layer-corridor-line',
        type: 'line',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'project_segment'],
        paint: {
          'line-color': ['match', ['get', 'segment_id'],
            'sutter-alameda',  '#4a7c59',
            'alameda-mcgee',   '#4a7c59',
            'mcgee-monterey',  '#a85a2a',
            'monterey-gilman', '#c4713b',
            '#4a7c59',
          ],
          'line-width': ['match', ['get', 'segment_id'],
            'sutter-alameda',  3,
            'alameda-mcgee',   3.5,
            'mcgee-monterey',  5,
            'monterey-gilman', 5.5,
            4,
          ],
          'line-opacity': 0.8,
        },
      })

      // Transparent hit area — wider than visible line for easier tapping
      map.addLayer({
        id: 'layer-corridor-hit',
        type: 'line',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'project_segment'],
        paint: {
          'line-width': 20,
          'line-opacity': 0,
        },
      })

      // Scroll-driven highlight — color shift only, no width change
      map.addLayer({
        id: 'layer-segment-highlight',
        type: 'line',
        source: 'corridor',
        filter: ['literal', false],
        paint: {
          'line-color': '#72b98a',
          'line-width': 4,
          'line-opacity': 0.95,
          'line-blur': 1,
        },
      })

      // Click-selected: glow halo + bright crisp line
      map.addLayer({
        id: 'layer-segment-selected-glow',
        type: 'line',
        source: 'corridor',
        filter: ['literal', false],
        paint: {
          'line-color': '#72b98a',
          'line-width': 22,
          'line-opacity': 0.25,
          'line-blur': 8,
        },
      })

      map.addLayer({
        id: 'layer-segment-selected',
        type: 'line',
        source: 'corridor',
        filter: ['literal', false],
        paint: {
          'line-color': '#d4f0df',
          'line-width': 10,
          'line-opacity': 1,
        },
      })

      // Hover: glow halo + bright crisp line (renders above selected)
      map.addLayer({
        id: 'layer-segment-hover-glow',
        type: 'line',
        source: 'corridor',
        filter: ['literal', false],
        paint: {
          'line-color': '#72b98a',
          'line-width': 22,
          'line-opacity': 0.2,
          'line-blur': 8,
        },
      })

      map.addLayer({
        id: 'layer-segment-hover',
        type: 'line',
        source: 'corridor',
        filter: ['literal', false],
        paint: {
          'line-color': '#d4f0df',
          'line-width': 9,
          'line-opacity': 1,
        },
      })

      // Intersection dots
      map.addLayer({
        id: 'layer-intersections',
        type: 'circle',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'intersection'],
        paint: {
          'circle-color': '#1a1a18',
          'circle-radius': 4,
          'circle-stroke-color': '#8a9a78',
          'circle-stroke-width': 1.5,
        },
      })

      // Intersection labels
      map.addLayer({
        id: 'layer-intersection-labels',
        type: 'symbol',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'intersection'],
        layout: {
          'text-field': ['get', 'cross_street'],
          'text-font': ['DIN Offc Pro Regular', 'Arial Unicode MS Regular'],
          'text-size': 10,
          'text-anchor': 'top',
          'text-offset': [0, 0.7],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#8a9a78',
          'text-halo-color': '#1a1a18',
          'text-halo-width': 1.5,
        },
      })

      // Cedar / Rose street name labels
      map.addLayer({
        id: 'layer-parallel-labels',
        type: 'symbol',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'parallel_route_reference'],
        layout: {
          'text-field': ['get', 'route'],
          'text-font': ['DIN Offc Pro Regular', 'Arial Unicode MS Regular'],
          'text-size': 10,
          'symbol-placement': 'line',
          'text-offset': [0, 1.2],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#6a9bcc',
          'text-halo-color': '#1a1a18',
          'text-halo-width': 1.5,
        },
      })

      // ── Choropleth layer (explorer only) ────────────────────────────
      map.addLayer({
        id: 'layer-choropleth',
        type: 'line',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'project_segment'],
        paint: {
          'line-color': '#4a7c59',
          'line-width': 6,
          'line-opacity': 0,  // starts hidden; shown when choroplethSegmentColors is set
        },
      })

      // ── Story collision source (39 mappable TIMS records, richer schema) ──
      map.addSource('collisions', {
        type: 'geojson',
        data: collisionsData,
      })

      // Non-fatal collision circles — colored by severity
      map.addLayer({
        id: 'layer-collision-circles',
        type: 'circle',
        source: 'collisions',
        filter: ['!=', ['get', 'severity'], 'fatal'],
        paint: {
          'circle-color': ['match', ['get', 'severity'],
            'severe', '#c4713b',
            'injury', '#d4956a',
            'pdo',    '#6a7a5e',
            '#6a7a5e',
          ],
          'circle-radius': ['match', ['get', 'severity'],
            'severe', 6,
            'injury', 4.5,
            'pdo',    3,
            4,
          ],
          'circle-opacity': ['match', ['get', 'severity'],
            'severe', 0.9,
            'injury', 0.8,
            'pdo',    0.45,
            0.7,
          ],
          'circle-stroke-color': '#1a1a18',
          'circle-stroke-width': 1,
        },
      })

      // Fatal collision circles — larger amber-red, below DOM pulse markers
      map.addLayer({
        id: 'layer-collision-fatal',
        type: 'circle',
        source: 'collisions',
        filter: ['==', ['get', 'severity'], 'fatal'],
        paint: {
          'circle-color': '#e85d2a',
          'circle-radius': 9,
          'circle-opacity': 0.95,
          'circle-stroke-color': 'rgba(255,255,255,0.6)',
          'circle-stroke-width': 1.5,
        },
      })

      // Transparent hit area for all collisions (above circles, below DOM markers)
      map.addLayer({
        id: 'layer-collision-hit',
        type: 'circle',
        source: 'collisions',
        paint: {
          'circle-radius': 16,
          'circle-opacity': 0,
          'circle-stroke-width': 0,
        },
      })

      // ── Explorer collision source (53 records, hidden by default) ────
      map.addSource('collisions-explorer', {
        type: 'geojson',
        data: collisionData,
      })

      map.addLayer({
        id: 'layer-collision-points',
        type: 'circle',
        source: 'collisions-explorer',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['match', ['get', 'severity'],
            'fatal', 9,
            'severe_injury', 7,
            5,
          ],
          'circle-color': ['match', ['get', 'severity'],
            'fatal',        '#8b2c2c',
            'severe_injury','#c4713b',
            'other_injury', '#c4a03b',
            '#4a7c59',
          ],
          'circle-opacity': 0.75,
          'circle-stroke-color': '#1a1a18',
          'circle-stroke-width': 1,
        },
      })

      // ── Fatality markers ─────────────────────────────────────────────
      fatalityData.features.forEach((feature) => {
        const [lng, lat] = feature.geometry.coordinates
        const p = feature.properties

        const isRecent = p.year >= 2025
        const el = document.createElement('div')
        el.className = `fatality-marker${isRecent ? ' fatality-marker--recent' : ''}`
        el.setAttribute('role', 'img')
        el.setAttribute(
          'aria-label',
          `${p.mode === 'pedestrian' ? 'Pedestrian' : 'Cyclist'} fatality, ${p.year}`,
        )

        const modeLabel = p.mode === 'pedestrian' ? 'Pedestrian' : p.mode === 'cyclist' ? 'Cyclist' : 'Fatal collision'
        const popup = new mapboxgl.Popup({
          offset: 16,
          closeButton: false,
          className: 'fatality-popup-container',
        }).setHTML(
          `<div class="fatality-popup${isRecent ? ' fatality-popup--recent' : ''}">
            <span class="fatality-popup__mode">${modeLabel} fatality</span>
            <span class="fatality-popup__year">${p.year}</span>
            <span class="fatality-popup__location">${p.intersection}</span>
            ${p.context ? `<span class="fatality-popup__context">${p.context}</span>` : ''}
            <cite class="fatality-popup__source">${p.source}</cite>
          </div>`,
        )

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map)

        markersRef.current.push(marker)
      })

      // ── Click handlers ───────────────────────────────────────────────

      // Collision click — show popup with details
      map.on('click', 'layer-collision-hit', (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        e.preventDefault()

        const p = feature.properties
        const severityLabel = {
          fatal:  'Fatal collision',
          severe: 'Severe injury',
          injury: 'Injury',
          pdo:    'Property damage only',
        }[p.severity] ?? p.severity

        const severityColor = {
          fatal:  '#e85d2a',
          severe: '#c4713b',
          injury: '#d4956a',
          pdo:    '#8a9a78',
        }[p.severity] ?? '#8a9a78'

        const modeIcon = p.ped_involved ? '🚶' : p.bike_involved ? '🚲' : '🚗'

        // Close any existing collision popup
        if (collisionPopupRef.current) {
          collisionPopupRef.current.remove()
        }

        const popup = new mapboxgl.Popup({
          offset: 12,
          closeButton: true,
          className: 'collision-popup-container',
          maxWidth: '240px',
        })
          .setLngLat(feature.geometry.coordinates)
          .setHTML(
            `<div class="collision-popup">
              <span class="collision-popup__severity" style="color:${severityColor}">${severityLabel}</span>
              <span class="collision-popup__date">${p.date_display}</span>
              <span class="collision-popup__location">${p.primary_rd} @ ${p.secondary_rd}</span>
              <span class="collision-popup__mode">${modeIcon} ${p.mode_label}</span>
              <cite class="collision-popup__source">Source: TIMS/SWITRS</cite>
            </div>`,
          )
          .addTo(map)

        collisionPopupRef.current = popup
      })

      map.on('click', 'layer-corridor-hit', (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        const id = feature.properties?.segment_id
        if (id) {
          // Close any open collision popup when selecting a segment
          if (collisionPopupRef.current) {
            collisionPopupRef.current.remove()
            collisionPopupRef.current = null
          }
          if (onSegmentMultiClick) {
            const isAdditive = e.originalEvent?.metaKey || e.originalEvent?.ctrlKey
            onSegmentMultiClick(id, isAdditive)
          } else {
            onSegmentClick(id)
          }
          e.stopPropagation?.()
        }
      })

      // Click outside project segments and collisions — deselect
      map.on('click', (e) => {
        const corridorHits = map.queryRenderedFeatures(e.point, {
          layers: ['layer-corridor-hit'],
        })
        const collisionHits = map.queryRenderedFeatures(e.point, {
          layers: ['layer-collision-hit'],
        })
        if (!corridorHits.length && !collisionHits.length) {
          if (onSegmentMultiClick) {
            onSegmentMultiClick(null, false)
          } else {
            onSegmentClick(null)
          }
        }
      })

      // Pointer cursor + per-segment hover highlight
      map.on('mousemove', 'layer-corridor-hit', (e) => {
        map.getCanvas().style.cursor = 'pointer'
        const id = e.features?.[0]?.properties?.segment_id ?? null
        setHoveredSegment(id)
      })
      map.on('mouseleave', 'layer-corridor-hit', () => {
        map.getCanvas().style.cursor = ''
        setHoveredSegment(null)
      })

      // Pointer cursor on collision dots
      map.on('mouseenter', 'layer-collision-hit', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'layer-collision-hit', () => {
        map.getCanvas().style.cursor = ''
      })

      loadedRef.current = true

      // Force Mapbox to re-read container dimensions after layout is stable.
      // Without this, the map sometimes only renders in the top portion of the
      // container on first load when the sticky panel hasn't finished painting.
      map.resize()

      // Apply initial filter state (props may have arrived before load)
      map.setFilter('layer-segment-highlight', segmentFilter(highlightSegment))
      map.setFilter('layer-segment-selected-glow', segmentFilter(selectedSegment))
      map.setFilter('layer-segment-selected', segmentFilter(selectedSegment))
    })

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      if (collisionPopupRef.current) {
        collisionPopupRef.current.remove()
        collisionPopupRef.current = null
      }
      map.remove()
      mapRef.current  = null
      loadedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — one-time init

  // ── Respond to highlightSegment prop changes ──────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => map.setFilter('layer-segment-highlight', segmentFilter(highlightSegment))
    loadedRef.current ? apply() : map.once('load', apply)
  }, [highlightSegment])

  // ── Respond to selectedSegment prop changes (single-select / story mode) ──
  // Only applies when the explorer multi-select (selectedSegments) is not in use.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    // If the explorer is driving selection, the multi-select effect handles layers.
    if (selectedSegments && selectedSegments.length > 0) return
    const apply = () => {
      map.setFilter('layer-segment-selected-glow', segmentFilter(selectedSegment))
      map.setFilter('layer-segment-selected', segmentFilter(selectedSegment))
    }
    loadedRef.current ? apply() : map.once('load', apply)
  }, [selectedSegment, selectedSegments])

  // ── Respond to hoveredSegment state changes ───────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      map.setFilter('layer-segment-hover-glow', segmentFilter(hoveredSegment))
      map.setFilter('layer-segment-hover', segmentFilter(hoveredSegment))
    }
    loadedRef.current ? apply() : map.once('load', apply)
  }, [hoveredSegment])

  // ── Multi-select highlight (explorer) ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      if (selectedSegments && selectedSegments.length > 0) {
        map.setFilter('layer-segment-selected-glow', multiSegmentFilter(selectedSegments))
        map.setFilter('layer-segment-selected', multiSegmentFilter(selectedSegments))
      } else if (selectedSegments && selectedSegments.length === 0 && onSegmentMultiClick) {
        // Explorer mode with no selection — clear the layers
        map.setFilter('layer-segment-selected-glow', ['literal', false])
        map.setFilter('layer-segment-selected', ['literal', false])
      }
      // If selectedSegments is empty and no multi-click handler, fall through
      // to the selectedSegment effect (legacy story behavior).
    }
    loadedRef.current ? apply() : map.once('load', apply)
  }, [selectedSegments, onSegmentMultiClick])

  // ── Choropleth layer update (explorer) ───────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      if (!choroplethSegmentColors) {
        map.setPaintProperty('layer-choropleth', 'line-opacity', 0)
        return
      }
      // Build match expression: segmentId → color
      const entries = Object.entries(choroplethSegmentColors)
      if (entries.length === 0) {
        map.setPaintProperty('layer-choropleth', 'line-opacity', 0)
        return
      }
      const matchExpr = ['match', ['get', 'segment_id'],
        ...entries.flatMap(([id, color]) => [id, color]),
        '#4a7c59', // default fallback
      ]
      map.setPaintProperty('layer-choropleth', 'line-color', matchExpr)
      map.setPaintProperty('layer-choropleth', 'line-opacity', 0.9)
    }
    loadedRef.current ? apply() : map.once('load', apply)
  }, [choroplethSegmentColors])

  // ── Collision points visibility (explorer) ────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      map.setLayoutProperty(
        'layer-collision-points',
        'visibility',
        collisionPointsVisible ? 'visible' : 'none',
      )
    }
    loadedRef.current ? apply() : map.once('load', apply)
  }, [collisionPointsVisible])

  // ── No-token fallback ─────────────────────────────────────────────────
  if (!import.meta.env.VITE_MAPBOX_TOKEN) {
    return (
      <div className="corridor-map corridor-map--no-token">
        <p>
          Map requires <code>VITE_MAPBOX_TOKEN</code>
          <br />
          Add it to <code>.env</code> and restart the dev server.
        </p>
      </div>
    )
  }

  return (
    <div className="corridor-map-wrapper">
      <div ref={containerRef} className="corridor-map" />
      {showHint && (
        <div className={`corridor-map-hint${hintFading ? ' corridor-map-hint--fading' : ''}`}>
          Tap a segment to explore the design
        </div>
      )}
    </div>
  )
}

export default function CorridorMap(props) {
  return (
    <MapErrorBoundary>
      <CorridorMapInner {...props} />
    </MapErrorBoundary>
  )
}
