/**
 * ExploreBarChart.jsx — horizontal bar chart for the explore sandbox.
 *
 * Handles:
 *   - Streetlight mode rows: segment → bar sized by daily volume
 *   - Collision rows: year → stacked severity bars
 *   - City count rows: direction → speed percentile markers
 */

const SEVERITY_COLORS = {
  fatal:          '#8b2c2c',
  severe_injury:  '#c4713b',
  other_injury:   '#c4a03b',
  property_damage:'#4a7c59',
}

const SEVERITY_LABELS = {
  fatal:          'Fatal',
  severe_injury:  'Severe injury',
  other_injury:   'Other injury',
  property_damage:'Property damage only',
}

function ZoneMatchIndicator({ match, note }) {
  if (match === 'exact') return null
  return (
    <span
      className="zone-match-badge zone-match-badge--inline"
      title={note ?? 'Zone boundary does not exactly match design segment boundary'}
    >
      ~
    </span>
  )
}

// ── Streetlight bar chart ─────────────────────────────────────────────────────

function StreetlightBars({ rows }) {
  if (!rows || rows.length === 0) return null
  const validRows = rows.filter((r) => r.value !== null)
  if (validRows.length === 0) {
    return <p className="explore-empty-msg">No data for this combination.</p>
  }
  const maxVal = Math.max(...validRows.map((r) => r.ci?.upper ?? r.value))

  return (
    <div className="explore-bars">
      {validRows.map((row) => {
        const pct = maxVal > 0 ? (row.value / maxVal) * 100 : 0
        const upperPct = row.ci && maxVal > 0 ? (row.ci.upper / maxVal) * 100 : null
        const lowerPct = row.ci && maxVal > 0 ? (row.ci.lower / maxVal) * 100 : null
        return (
          <div key={row.segmentId} className="explore-bars__row">
            <div className="explore-bars__label">
              {row.segmentLabel}
              <ZoneMatchIndicator match={row.zoneMatch} note={row.zoneNote} />
            </div>
            <div className="explore-bars__track">
              <div
                className="explore-bars__bar"
                style={{ width: `${pct}%` }}
                role="img"
                aria-label={`${row.segmentLabel}: ${row.value.toLocaleString()} ${row.unitShort}`}
              />
              {upperPct !== null && lowerPct !== null && (
                <div
                  className="explore-bars__ci"
                  style={{
                    left:  `${lowerPct}%`,
                    width: `${upperPct - lowerPct}%`,
                  }}
                  title={`95% CI: ${row.ci.lower.toLocaleString()}–${row.ci.upper.toLocaleString()}`}
                />
              )}
            </div>
            <div className="explore-bars__value">
              {row.value.toLocaleString()}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Collision stacked bar chart ───────────────────────────────────────────────

function CollisionBars({ rows }) {
  if (!rows || rows.length === 0) return null
  const maxTotal = Math.max(...rows.map((r) => r.total), 1)
  const keys = ['fatal', 'severe_injury', 'other_injury', 'property_damage']

  return (
    <div className="explore-bars">
      {/* Legend */}
      <div className="explore-bars__legend">
        {keys.map((k) => (
          <span key={k} className="explore-bars__legend-item">
            <span className="explore-bars__legend-swatch" style={{ background: SEVERITY_COLORS[k] }} />
            {SEVERITY_LABELS[k]}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.year} className="explore-bars__row">
          <div className="explore-bars__label">{row.year}</div>
          <div className="explore-bars__track explore-bars__track--stacked">
            {keys.map((k) => {
              const count = row[k] ?? 0
              if (count === 0) return null
              const pct = (count / maxTotal) * 100
              return (
                <div
                  key={k}
                  className="explore-bars__segment"
                  style={{ width: `${pct}%`, background: SEVERITY_COLORS[k] }}
                  title={`${SEVERITY_LABELS[k]}: ${count}`}
                  aria-label={`${row.year} ${SEVERITY_LABELS[k]}: ${count}`}
                />
              )
            })}
          </div>
          <div className="explore-bars__value">{row.total}</div>
        </div>
      ))}
    </div>
  )
}

// ── City count bar chart ──────────────────────────────────────────────────────

function CityCountBars({ rows }) {
  if (!rows || rows.length === 0) return null

  return (
    <div className="explore-bars explore-bars--city-count">
      {rows.map((row) => (
        <div key={row.direction} className="explore-bars__speed-row">
          <div className="explore-bars__label">{row.dirLabel}</div>
          <div className="explore-bars__speed-track">
            {/* Speed percentile markers at 15, 50, 85, 95 */}
            {[
              { pct: row.p15_mph, label: 'p15', cls: '' },
              { pct: row.p50_mph, label: 'p50', cls: '' },
              { pct: row.p85_mph, label: '85th', cls: 'explore-bars__speed-marker--85' },
              { pct: row.p95_mph, label: 'p95', cls: '' },
            ].map(({ pct, label, cls }) => (
              <div
                key={label}
                className={`explore-bars__speed-marker ${cls}`}
                style={{ left: `${Math.min((pct / 50) * 100, 100)}%` }}
                title={`${label}: ${pct} mph`}
              >
                <span className="explore-bars__speed-tick" />
                <span className="explore-bars__speed-label">{pct} mph</span>
              </div>
            ))}
            {/* 25 mph Vision Zero target line */}
            <div
              className="explore-bars__speed-target"
              style={{ left: `${(25 / 50) * 100}%` }}
              title="25 mph — Vision Zero target"
            />
          </div>
          <div className="explore-bars__value">{row.pct_over_25mph}% over 25 mph</div>
        </div>
      ))}
      <p className="explore-bars__speed-note">
        Scale: 0–50 mph. Orange line = 25 mph Vision Zero target.
        Location: Hopkins at Stannage–Cornell (west of project corridor).
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ExploreBarChart({ dataset, rows, collisionResult, cityCountRows }) {
  if (dataset === 'collisions') {
    return <CollisionBars rows={collisionResult?.rows} />
  }
  if (dataset === 'city_counts') {
    return <CityCountBars rows={cityCountRows} />
  }
  return <StreetlightBars rows={rows} />
}
