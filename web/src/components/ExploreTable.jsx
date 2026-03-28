/**
 * ExploreTable.jsx — tabular view of queried data for the explore sandbox.
 *
 * Handles four data shapes:
 *   - Streetlight (vehicles/pedestrians/bicycles): segment + zone + volume + zoneMatch
 *   - Collisions: year × severity breakdown
 *   - City counts: direction × speed percentiles
 */

function ZoneMatchBadge({ match, note }) {
  if (match === 'exact') return null
  return (
    <span
      className="zone-match-badge"
      title={note ?? 'Zone boundary does not exactly match design segment boundary'}
      aria-label="Partial zone match"
    >
      ~partial
    </span>
  )
}

// ── Streetlight table ─────────────────────────────────────────────────────────

function StreetlightTable({ rows, unitShort }) {
  return (
    <div className="explore-table-wrap">
      <table className="explore-table">
        <thead>
          <tr>
            <th>Segment</th>
            <th>Streetlight zone</th>
            <th className="explore-table__num">Daily {unitShort}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.segmentId}>
              <td>{row.segmentLabel}</td>
              <td>
                {row.zoneName}
                <ZoneMatchBadge match={row.zoneMatch} note={row.zoneNote} />
              </td>
              <td className="explore-table__num explore-table__value">
                {row.value !== null ? row.value.toLocaleString() : '—'}
                {row.ci && (
                  <span className="explore-table__ci">
                    ({row.ci.lower.toLocaleString()}–{row.ci.upper.toLocaleString()})
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Collision table ───────────────────────────────────────────────────────────

function CollisionTable({ rows, totals, presetLabel }) {
  return (
    <div className="explore-table-wrap">
      <p className="explore-table__period">Period: {presetLabel}</p>
      <table className="explore-table">
        <thead>
          <tr>
            <th>Year</th>
            <th className="explore-table__num">Fatal</th>
            <th className="explore-table__num">Severe injury</th>
            <th className="explore-table__num">Other injury</th>
            <th className="explore-table__num">Property damage</th>
            <th className="explore-table__num">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year} className={r.fatal > 0 ? 'explore-table__row--fatal' : ''}>
              <td>{r.year}</td>
              <td className="explore-table__num">{r.fatal || '—'}</td>
              <td className="explore-table__num">{r.severe_injury || '—'}</td>
              <td className="explore-table__num">{r.other_injury || '—'}</td>
              <td className="explore-table__num">{r.property_damage || '—'}</td>
              <td className="explore-table__num explore-table__value">{r.total}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="explore-table__total-row">
            <td>Total</td>
            <td className="explore-table__num">{totals.fatal}</td>
            <td className="explore-table__num">{totals.severe_injury}</td>
            <td className="explore-table__num">{totals.other_injury}</td>
            <td className="explore-table__num">{totals.property_damage}</td>
            <td className="explore-table__num explore-table__value">{totals.total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── City count table ──────────────────────────────────────────────────────────

function CityCountTable({ rows }) {
  return (
    <div className="explore-table-wrap">
      <p className="explore-table__period">
        Pneumatic tube count — Hopkins at Stannage–Cornell, September–October 2019
      </p>
      <table className="explore-table">
        <thead>
          <tr>
            <th>Direction</th>
            <th className="explore-table__num">Date</th>
            <th className="explore-table__num">Total vehicles</th>
            <th className="explore-table__num">15th pct (mph)</th>
            <th className="explore-table__num">50th pct (mph)</th>
            <th className="explore-table__num">85th pct (mph)</th>
            <th className="explore-table__num">95th pct (mph)</th>
            <th className="explore-table__num">% over 25 mph</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.direction} className={r.p85_mph > 25 ? 'explore-table__row--speed' : ''}>
              <td>{r.dirLabel}</td>
              <td className="explore-table__num">{r.date}</td>
              <td className="explore-table__num">{r.total_vehicles.toLocaleString()}</td>
              <td className="explore-table__num">{r.p15_mph}</td>
              <td className="explore-table__num">{r.p50_mph}</td>
              <td className="explore-table__num explore-table__value">{r.p85_mph}</td>
              <td className="explore-table__num">{r.p95_mph}</td>
              <td className="explore-table__num">{r.pct_over_25mph}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ExploreTable({ dataset, rows, collisionResult, cityCountRows }) {
  if (dataset === 'collisions') {
    if (!collisionResult) return null
    return (
      <CollisionTable
        rows={collisionResult.rows}
        totals={collisionResult.totals}
        presetLabel={collisionResult.presetLabel}
      />
    )
  }

  if (dataset === 'city_counts') {
    if (!cityCountRows || cityCountRows.length === 0) return null
    return <CityCountTable rows={cityCountRows} />
  }

  if (!rows || rows.length === 0) {
    return (
      <p className="explore-empty-msg">
        No data for this combination. Try a different day type or time band.
      </p>
    )
  }

  const unitShort = rows[0]?.unitShort ?? 'trips'
  return <StreetlightTable rows={rows} unitShort={unitShort} />
}
