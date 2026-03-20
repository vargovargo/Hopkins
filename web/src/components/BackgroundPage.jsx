/**
 * BackgroundPage.jsx — "The Record" page (Prompt 10)
 *
 * Route: /the-record
 *
 * Structure:
 *   1. Section header: "The Record"
 *   2. Two-column intro: framing paragraph (left) + three at-a-glance stats (right)
 *   3. <ProjectTimeline /> — full width
 *   4. <SourceLibrary /> — full width
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import ProjectTimeline from './ProjectTimeline'
import SourceLibrary   from './SourceLibrary'
import './BackgroundPage.css'

const AT_A_GLANCE = [
  {
    number: '9',
    unit: 'years',
    label: 'From the 2017 fatalities to today — still unbuilt',
  },
  {
    number: '8–1',
    unit: '',
    label: 'Council vote approving the Hopkins Street design',
  },
  {
    number: '36',
    unit: 'collisions',
    label: '2015–2018 · source: Bike East Bay (2018), citing city staff',
  },
]

export default function BackgroundPage() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="background-page">
      {/* ── Section header ─────────────────────────────────────────── */}
      <header className="background-page__header">
        <h1 className="background-page__title">The Record</h1>
        <p className="background-page__subtitle">
          Seven years of process, two fatalities, and one unfinished street.
        </p>
      </header>

      {/* ── Intro block ────────────────────────────────────────────── */}
      <div className="background-page__intro">
        <div className="background-page__framing">
          <p>
            The Hopkins Street Safety Project is not a new idea. It emerged
            directly from two deaths in 2017 and has been approved by the Berkeley
            City Council twice — once in May 2022 and again, implicitly, when a
            reconsideration motion failed in October 2022.
          </p>
          <p>
            What follows is the documented record: the policy decisions, the
            journalism, the advocacy, and the opposition. We read all of it.
            The data story is stronger for having engaged with the full picture.
          </p>
        </div>

        <div className="background-page__stats">
          {AT_A_GLANCE.map(({ number, unit, label }) => (
            <div key={label} className="at-a-glance-stat">
              <div className="at-a-glance-stat__number">
                {number}
                {unit && <span className="at-a-glance-stat__unit">{unit}</span>}
              </div>
              <p className="at-a-glance-stat__label">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Timeline ───────────────────────────────────────────────── */}
      <section id="timeline" className="background-page__section">
        <h2 className="background-page__section-heading">Timeline</h2>
        <ProjectTimeline />
      </section>

      {/* ── Source library ─────────────────────────────────────────── */}
      <section id="sources" className="background-page__section">
        <h2 className="background-page__section-heading">Sources</h2>
        <SourceLibrary />
      </section>
    </div>
  )
}
