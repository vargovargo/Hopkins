/**
 * CorridorMap.jsx — Prompt 5
 *
 * Mapbox GL JS map anchoring the Hopkins Street data story.
 *
 * Props:
 *   highlightSegment  'sutter-alameda' | 'alameda-mcgee' | 'mcgee-gilman' | null
 *                     Drives which project section is visually emphasized.
 *                     Controlled by scroll position in App.jsx via Scrollama.
 *
 * Data sources:
 *   data/geo/corridor.geojson         — corridor geometry + intersections
 *   data/geo/fatality_locations.geojson — two 2017 fatalities as Points
 *
 * Mapbox token: VITE_MAPBOX_TOKEN environment variable
 */

import { useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import corridorData from '@data/geo/corridor.geojson'
import fatalityData from '@data/geo/fatality_locations.geojson'

import './CorridorMap.css'

// Hopkins/McGee — center of the contested commercial strip
const MAP_CENTER = [-122.281, 37.882]
const MAP_ZOOM   = 14.5

// Maps the highlightSegment prop value to the `section` property in corridor.geojson
const HIGHLIGHT_TO_SECTION = {
  'sutter-alameda': 1,
  'alameda-mcgee':  2,
  'mcgee-gilman':   3,
}

// Filter that selects a specific project section by its `section` property
function sectionFilter(num) {
  if (!num) return ['literal', false]
  return ['all',
    ['==', ['get', 'type'], 'project_section'],
    ['==', ['get', 'section'], num],
  ]
}

export default function CorridorMap({ highlightSegment = null }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const loadedRef    = useRef(false)   // true after map 'load' event fires
  const markersRef   = useRef([])

  // ── Map initialization (runs once) ──────────────────────────────────────
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    if (!token) return  // handled in render

    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      // Disable default controls — we'll rely on attribution only
      attributionControl: false,
    })

    mapRef.current = map

    // Attribution: bottom-right, compact (smallest legal size)
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      'bottom-right',
    )

    map.on('load', () => {
      // ── Corridor source ────────────────────────────────────────────────
      map.addSource('corridor', {
        type: 'geojson',
        data: corridorData,
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

      // Main project corridor — solid green, 4 px
      map.addLayer({
        id: 'layer-corridor-line',
        type: 'line',
        source: 'corridor',
        filter: ['==', ['get', 'type'], 'corridor'],
        paint: {
          'line-color': '#4a7c59',
          'line-width': 4,
          'line-opacity': 0.85,
        },
      })

      // Section highlight overlay — starts hidden, updated by highlightSegment prop
      map.addLayer({
        id: 'layer-section-highlight',
        type: 'line',
        source: 'corridor',
        filter: ['literal', false],
        paint: {
          'line-color': '#72b98a',
          'line-width': 8,
          'line-opacity': 0.95,
          'line-blur': 1,
        },
      })

      // Intersection dot markers — small, muted sage
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

      // Intersection labels — DM Sans via Mapbox font stack
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

      // ── Fatality markers (HTML elements for CSS pulse animation) ────────
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

      loadedRef.current = true

      // Apply any highlightSegment that arrived before the map loaded
      // (handled below via the separate effect — but we trigger it manually here
      //  by directly reading the ref so we don't need to re-run the effect)
      const section = HIGHLIGHT_TO_SECTION[highlightSegment] || null
      map.setFilter('layer-section-highlight', sectionFilter(section))
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

  // ── Respond to highlightSegment prop changes ───────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const section = HIGHLIGHT_TO_SECTION[highlightSegment] || null
    const filter  = sectionFilter(section)

    if (loadedRef.current) {
      map.setFilter('layer-section-highlight', filter)
    } else {
      // Map not loaded yet — apply once it is
      map.once('load', () => {
        map.setFilter('layer-section-highlight', filter)
      })
    }
  }, [highlightSegment])

  // ── No-token fallback ──────────────────────────────────────────────────
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

  return <div ref={containerRef} className="corridor-map" />
}
