/**
 * CorridorMap.jsx — updated Prompt 11
 *
 * Mapbox GL JS map anchoring the Hopkins Street data story.
 *
 * Props:
 *   highlightSegment  string | null — segment id driven by scroll position (App.jsx / Scrollama).
 *                     Visual treatment: brighter green, same line width.
 *   selectedSegment   string | null — segment id set by map click.
 *                     Visual treatment: brighter green + wider line (6px).
 *   onSegmentClick    function(id: string) — called when user clicks a segment.
 *
 * Both highlightSegment and selectedSegment can be active simultaneously.
 * They use independent layers so their visual treatments do not interfere.
 *
 * Data sources:
 *   data/geo/corridor.geojson           — corridor geometry + intersections
 *   data/geo/fatality_locations.geojson — two 2017 fatalities as Points
 *
 * Mapbox token: VITE_MAPBOX_TOKEN environment variable
 */

import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import corridorData from '@data/geo/corridor.geojson'
import fatalityData from '@data/geo/fatality_locations.geojson'

import './CorridorMap.css'

const MAP_CENTER = [-122.281, 37.882]
const MAP_ZOOM   = 14.5

// Filter selecting a project segment by its segment_id property
function segmentFilter(id) {
  if (!id) return ['literal', false]
  return ['==', ['get', 'segment_id'], id]
}

export default function CorridorMap({
  highlightSegment = null,
  selectedSegment  = null,
  onSegmentClick   = () => {},
}) {
  const containerRef  = useRef(null)
  const mapRef        = useRef(null)
  const loadedRef     = useRef(false)
  const markersRef    = useRef([])
  const [showHint, setShowHint]   = useState(true)
  const [hintFading, setHintFading] = useState(false)

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

      // Main project corridor — base line, all segments
      map.addLayer({
        id: 'layer-corridor-line',
        type: 'line',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'project_segment'],
        paint: {
          'line-color': '#4a7c59',
          'line-width': 4,
          'line-opacity': 0.85,
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

      // Click-selected segment — color shift + wider
      map.addLayer({
        id: 'layer-segment-selected',
        type: 'line',
        source: 'corridor',
        filter: ['literal', false],
        paint: {
          'line-color': '#72b98a',
          'line-width': 6,
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

      // ── Fatality markers ─────────────────────────────────────────────
      fatalityData.features.forEach((feature) => {
        const [lng, lat] = feature.geometry.coordinates
        const p = feature.properties

        const el = document.createElement('div')
        el.className = 'fatality-marker'
        el.setAttribute('role', 'img')
        el.setAttribute(
          'aria-label',
          `${p.mode === 'pedestrian' ? 'Pedestrian' : 'Cyclist'} fatality, 2017`,
        )

        const popup = new mapboxgl.Popup({
          offset: 16,
          closeButton: false,
          className: 'fatality-popup-container',
        }).setHTML(
          `<div class="fatality-popup">
            <span class="fatality-popup__mode">${
              p.mode === 'pedestrian' ? 'Pedestrian' : 'Cyclist'
            } fatality</span>
            <span class="fatality-popup__year">${p.year}</span>
            <span class="fatality-popup__location">${p.intersection}</span>
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
      map.on('click', 'layer-corridor-hit', (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        const id = feature.properties?.segment_id
        if (id) {
          onSegmentClick(id)
          e.stopPropagation?.()
        }
      })

      // Click outside project segments — deselect
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['layer-corridor-hit'],
        })
        if (!features.length) {
          onSegmentClick(null)
        }
      })

      // Pointer cursor on hover
      map.on('mouseenter', 'layer-corridor-hit', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'layer-corridor-hit', () => {
        map.getCanvas().style.cursor = ''
      })

      loadedRef.current = true

      // Apply initial filter state (props may have arrived before load)
      map.setFilter('layer-segment-highlight', segmentFilter(highlightSegment))
      map.setFilter('layer-segment-selected', segmentFilter(selectedSegment))
    })

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
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

  // ── Respond to selectedSegment prop changes ───────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => map.setFilter('layer-segment-selected', segmentFilter(selectedSegment))
    loadedRef.current ? apply() : map.once('load', apply)
  }, [selectedSegment])

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
