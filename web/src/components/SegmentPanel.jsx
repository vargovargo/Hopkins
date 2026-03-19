/**
 * SegmentPanel.jsx — Prompt 11
 *
 * Slides in when a corridor segment is clicked on the map.
 * Mobile: bottom sheet. Desktop: right panel.
 *
 * Props:
 *   segment    object | null — entry from SEGMENTS (segments.js), or null to close
 *   onClose    function — called when user closes the panel
 */

import { useEffect, useRef } from 'react'
import { SOURCE_DOC } from '../data/segments'
import './SegmentPanel.css'

const IMAGE_CAVEAT =
  'These drawings show the 2022 conceptual design approved by City Council. ' +
  'Detailed engineering design is ongoing — final designs may differ. ' +
  'Source: City of Berkeley, May 2022.'

export default function SegmentPanel({ segment, onClose }) {
  const panelRef = useRef(null)

  // Trap focus inside panel when open
  useEffect(() => {
    if (segment && panelRef.current) {
      const firstFocusable = panelRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      firstFocusable?.focus()
    }
  }, [segment])

  // Close on Escape
  useEffect(() => {
    if (!segment) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [segment, onClose])

  const isOpen = Boolean(segment)

  return (
    <>
      {/* Backdrop — mobile only, closes panel on tap */}
      <div
        className={`segment-panel-backdrop${isOpen ? ' segment-panel-backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        className={`segment-panel${isOpen ? ' segment-panel--open' : ''}`}
        aria-label={segment ? `Design details: ${segment.label}` : 'Segment details'}
        aria-hidden={!isOpen}
      >
        {segment && <PanelContent segment={segment} onClose={onClose} />}
      </aside>
    </>
  )
}

function PanelContent({ segment, onClose }) {
  const hasParkingRemoved =
    segment.parking_spaces_lost > 0 ||
    segment.parking_spaces_retained === 0

  const parkingColor = hasParkingRemoved ? 'amber' : 'green'

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="segment-panel__header">
        <h2 className="segment-panel__label">{segment.label}</h2>
        <button
          className="segment-panel__close"
          onClick={onClose}
          aria-label="Close segment details"
        >
          ×
        </button>
      </div>

      <p className="segment-panel__character">{segment.character}</p>

      {/* ── Proposed design ────────────────────────────────────────── */}
      <section className="segment-panel__section">
        <h3 className="segment-panel__section-heading">Proposed design</h3>
        <dl className="segment-panel__design-list">
          {Object.entries(segment.proposed_design).map(([key, val]) => (
            <div className="segment-panel__design-row" key={key}>
              <dt className="segment-panel__design-label">
                {labelFor(key)}
              </dt>
              <dd className="segment-panel__design-value">{val}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Parking impact ─────────────────────────────────────────── */}
      <div className={`segment-panel__parking segment-panel__parking--${parkingColor}`}>
        <span className="segment-panel__parking-icon" aria-hidden="true">
          {hasParkingRemoved ? '▲' : '●'}
        </span>
        <span>
          {segment.parking_spaces_lost === null && segment.parking_spaces_retained !== 0
            ? 'Exact count pending — design maps required'
            : segment.parking_impact}
        </span>
      </div>

      {/* ── Vehicle volume ─────────────────────────────────────────── */}
      {segment.streetlight?.vehicle_volume_daily != null && (
        <div className="segment-panel__stat">
          <span className="segment-panel__stat-number">
            {segment.streetlight.vehicle_volume_daily.toLocaleString()}
          </span>
          <span className="segment-panel__stat-label">
            est. daily vehicle trips ({segment.streetlight.vehicle_volume_year})
          </span>
          {segment.streetlight.zone_match !== 'exact' && (
            <p className="segment-panel__stat-caveat">
              Volume shown is for Streetlight zone "{segment.streetlight.vehicle_zone}" —
              zone boundary does not align exactly with this segment. Data from Streetlight.
            </p>
          )}
          {segment.streetlight.zone_match === 'exact' && (
            <p className="segment-panel__stat-caveat">
              Streetlight zone "{segment.streetlight.vehicle_zone}". Data from Streetlight.
            </p>
          )}
        </div>
      )}

      {/* ── Fatality note ──────────────────────────────────────────── */}
      {segment.fatality_note && (
        <div className="segment-panel__fatality">
          <span className="segment-panel__fatality-icon" aria-hidden="true">⚠</span>
          {segment.fatality_note}
        </div>
      )}

      {/* ── Design images ──────────────────────────────────────────── */}
      {segment.design_images?.length > 0 && (
        <section className="segment-panel__section">
          <h3 className="segment-panel__section-heading">Conceptual design</h3>
          {segment.design_images.length === 1 ? (
            <img
              className="segment-panel__image segment-panel__image--full"
              src={segment.design_images[0]}
              alt={`Proposed design for ${segment.label}`}
              loading="lazy"
            />
          ) : (
            <div className="segment-panel__image-strip" role="list">
              {segment.design_images.map((url, i) => (
                <img
                  key={url}
                  className="segment-panel__image"
                  src={url}
                  alt={`Proposed design for ${segment.label}, view ${i + 1} of ${segment.design_images.length}`}
                  loading="lazy"
                  role="listitem"
                />
              ))}
            </div>
          )}
          {segment.intersection_image && (
            <img
              className="segment-panel__image segment-panel__image--intersection"
              src={segment.intersection_image}
              alt={`Intersection treatment at western end of ${segment.label}`}
              loading="lazy"
            />
          )}
          <p className="segment-panel__image-caveat">{IMAGE_CAVEAT}</p>
          {segment.design_images_caption && (
            <p className="segment-panel__image-caption">{segment.design_images_caption}</p>
          )}
        </section>
      )}

      {/* ── Source ─────────────────────────────────────────────────── */}
      <div className="segment-panel__source">
        <span className="segment-panel__source-label">Source</span>
        <span className="segment-panel__source-doc">
          {segment.source_doc}
          {segment.source_page && ` (p. ${segment.source_page})`}
        </span>
        <a
          className="segment-panel__source-link"
          href={SOURCE_DOC.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          View PDF →
        </a>
      </div>
    </>
  )
}

function labelFor(key) {
  const labels = {
    southside: 'South side',
    northside: 'North side',
    parking: 'Parking',
    lane_width: 'Lane width',
    loading: 'Loading',
    intersection_treatment: 'Intersection',
    protection: 'Protection',
  }
  return labels[key] ?? key.replace(/_/g, ' ')
}
