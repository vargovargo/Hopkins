/**
 * DownloadButton.jsx — triggers CSV export from buildCSV().
 *
 * Props:
 *   rows      Array    - data rows to export
 *   dataset   string   - used for filename and metadata header
 *   filters   Object   - { dayType, dayPart, yearPreset } passed to buildCSV
 *   disabled  boolean  - true when no rows to export
 */

import { buildCSV } from '../utils/exploreData'

export default function DownloadButton({ rows, dataset, filters, disabled }) {
  const handleDownload = () => {
    if (!rows || rows.length === 0) return
    const csv  = buildCSV(rows, dataset, filters)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `hopkins_${dataset}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      className={`download-btn${disabled ? ' download-btn--disabled' : ''}`}
      onClick={handleDownload}
      disabled={disabled}
      aria-label="Download data as CSV"
    >
      ↓ Download CSV
    </button>
  )
}
