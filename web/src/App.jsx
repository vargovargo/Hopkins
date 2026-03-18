/**
 * App.jsx — Prompt 7
 *
 * Main scrollytelling page shell.
 *
 * Layout:
 *   Desktop: sticky map panel (55% left) + scrolling narrative (45% right)
 *   Mobile:  map at top (not sticky, 320px), narrative below
 *
 * Scrollama drives `activeSection` (0–4), which is mapped to the
 * `highlightSegment` prop passed to <CorridorMap />.
 *
 * Sections:
 *   0 — "Who's on Hopkins?"
 *   1 — "The street doesn't match how people use it"
 *   2 — "What's actually at stake with parking"
 *   3 — "The cost of doing nothing"   ← renders <CollisionChart />
 *   4 — "Berkeley already decided"    ← static policy list
 */

import { useState, useEffect, useRef } from 'react'
import scrollama from 'scrollama'

import CorridorMap    from './components/CorridorMap'
import CollisionChart from './components/CollisionChart'

import './App.css'

// Map section index → highlightSegment prop for CorridorMap
const SECTION_HIGHLIGHT = {
  0: null,             // Who's on Hopkins — show full corridor
  1: 'alameda-mcgee',  // Street doesn't match — eastern residential section
  2: 'mcgee-gilman',   // Parking stakes — contested commercial strip
  3: null,             // Cost of doing nothing — collision markers, no highlight
  4: null,             // Berkeley decided — no map highlight
}

// Policy documents for Section 4
const POLICY_DOCS = [
  { name: 'Vision Zero Action Plan',     year: 2020, role: 'Designated Hopkins a High-Injury Street' },
  { name: 'Bicycle Plan Update',         year: 2017, role: 'Identified Hopkins as a priority corridor' },
  { name: 'Climate Action Plan',         year: 2020, role: 'Mode shift targets require street redesign' },
  { name: 'Pedestrian Master Plan',      year: 2010, role: 'High-injury streets require capital investment' },
  { name: 'Active Transportation Plan',  year: 2017, role: 'Connects West Berkeley to transit and retail' },
  { name: 'General Plan (Transportation Element)', year: 2002, role: 'Prioritizes multi-modal corridor design' },
]

export default function App() {
  const [activeSection, setActiveSection] = useState(0)
  const scrollerRef = useRef(null)

  const highlightSegment = SECTION_HIGHLIGHT[activeSection] ?? null

  // ── Scrollama setup ──────────────────────────────────────────────────
  useEffect(() => {
    const scroller = scrollama()

    scroller
      .setup({
        step: '.narrative-step',
        offset: 0.5,
        debug: false,
      })
      .onStepEnter(({ index }) => {
        setActiveSection(index)
      })

    scrollerRef.current = scroller

    const handleResize = () => scroller.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      scroller.destroy()
    }
  }, [])

  return (
    <div className="app">
      {/* ── Sticky map panel ─────────────────────────────────────────── */}
      <div className="map-panel" aria-label="Hopkins Street corridor map">
        <CorridorMap highlightSegment={highlightSegment} />
      </div>

      {/* ── Scrolling narrative panel ─────────────────────────────────── */}
      <div className="narrative-panel">

        {/* ── SECTION 0 — Who's on Hopkins? ─────────────────────────── */}
        <section
          className={`narrative-step${activeSection === 0 ? ' narrative-step--active' : ''}`}
          data-index="0"
          aria-label="Who's on Hopkins?"
        >
          <div className="narrative-card">
            <h2 className="section-heading">Who's on Hopkins?</h2>
            <p className="section-body">
              Even without protected infrastructure, a meaningful share of
              people arriving on Hopkins Street are not in cars. Pedestrians and
              cyclists use this corridor today — despite the risks.
            </p>
            <div className="placeholder-viz" role="status">
              <span className="placeholder-viz__label">
                Mode split visualization — awaiting Streetlight data verification
              </span>
              <p className="placeholder-viz__note">
                Data source: Streetlight 2022 (ped/bike) · 2025 (vehicles) ·
                pending output unit verification. See{' '}
                <code>analysis/streetlight.py</code>.
              </p>
            </div>
          </div>
        </section>

        {/* ── SECTION 1 — Street doesn't match ─────────────────────── */}
        <section
          className={`narrative-step${activeSection === 1 ? ' narrative-step--active' : ''}`}
          data-index="1"
          aria-label="The street doesn't match how people use it"
        >
          <div className="narrative-card">
            <h2 className="section-heading">
              The street doesn't match how people use it
            </h2>
            <p className="section-body">
              Cyclists are routing to Cedar and Rose Streets because Hopkins
              offers no protection. The people most exposed to the current
              design are concentrated exactly where the infrastructure is worst.
            </p>
            <div className="placeholder-viz" role="status">
              <span className="placeholder-viz__label">
                Infrastructure gap map layer + cyclist diversion chart —
                awaiting Streetlight data verification
              </span>
              <p className="placeholder-viz__note">
                Data source: Streetlight 2022 (bike) · Cedar/Rose parallel
                routes at Sacramento Ave · pending unit verification.
              </p>
            </div>
          </div>
        </section>

        {/* ── SECTION 2 — Parking stakes ───────────────────────────── */}
        <section
          className={`narrative-step${activeSection === 2 ? ' narrative-step--active' : ''}`}
          data-index="2"
          aria-label="What's actually at stake with parking"
        >
          <div className="narrative-card">
            <h2 className="section-heading">
              What's actually at stake with parking
            </h2>
            <p className="section-body">
              The commercial strip between McGee and Gilman is the center of
              the parking debate. How many spaces would be removed — and how
              does that compare to the number of people who arrive by modes
              other than driving?
            </p>
            <div className="placeholder-viz" role="status">
              <span className="placeholder-viz__label">
                Parking count visualization — awaiting city staff report data
                integration
              </span>
              <p className="placeholder-viz__note">
                Data source: Berkeley City Council staff report, May 2022 ·
                parking space count pending structured data entry.
              </p>
            </div>
          </div>
        </section>

        {/* ── SECTION 3 — Cost of doing nothing ───────────────────── */}
        <section
          className={`narrative-step${activeSection === 3 ? ' narrative-step--active' : ''}`}
          data-index="3"
          aria-label="The cost of doing nothing"
        >
          <div className="narrative-card">
            <h2 className="section-heading section-heading--amber">
              The cost of doing nothing
            </h2>
            <p className="section-body">
              The corridor's current design has a documented history of failure.
              Two people died in 2017. The question is not whether to act —
              it is how long to wait.
            </p>
            <CollisionChart yearRange={[2015, 2018]} />
          </div>
        </section>

        {/* ── SECTION 4 — Berkeley already decided ────────────────── */}
        <section
          className={`narrative-step${activeSection === 4 ? ' narrative-step--active' : ''}`}
          data-index="4"
          aria-label="Berkeley already decided"
        >
          <div className="narrative-card">
            <h2 className="section-heading">Berkeley already decided</h2>
            <p className="section-body">
              The Hopkins improvements are not a new idea being imposed from
              outside. They are the logical conclusion of more than a decade
              of Berkeley's own planning commitments — and a Council vote that
              already happened, twice.
            </p>
            <div className="policy-list">
              <p className="policy-list__heading">Policy alignment</p>
              <ul className="policy-list__items">
                {POLICY_DOCS.map(({ name, year, role }) => (
                  <li key={name} className="policy-list__item">
                    <span className="policy-list__item-name">{name}</span>
                    <span className="policy-list__item-year">{year}</span>
                    <span className="policy-list__item-role">{role}</span>
                  </li>
                ))}
              </ul>
              <p className="policy-list__council-note">
                Berkeley City Council voted 8–1 to approve the Hopkins Street
                design in May 2022, and reaffirmed that decision in October 2022
                when a reconsideration motion failed.
              </p>
            </div>
          </div>
        </section>

        {/* Spacer so last section can scroll to center offset */}
        <div className="narrative-spacer" aria-hidden="true" />
      </div>
    </div>
  )
}
