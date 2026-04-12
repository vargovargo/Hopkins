/**
 * DataStory.jsx — main scrollytelling story (Prompt 7)
 * Routed at / from App.jsx
 */

import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import scrollama from 'scrollama'

import CorridorMap             from './components/CorridorMap'
import SegmentPanel            from './components/SegmentPanel'
import CollisionChart          from './components/CollisionChart'
import SegmentVolumeChart      from './components/SegmentVolumeChart'
import SpeedChart              from './components/SpeedChart'
import CedarDiversionChart     from './components/CedarDiversionChart'
import ParkingChart            from './components/ParkingChart'
import CommunityFeedbackChart  from './components/CommunityFeedbackChart'
import { SEGMENTS_BY_ID }      from './data/segments'

import './App.css'

// Section order: cost (0) → who (1) → street-design (2) → parking (3) → decided (4)
const SECTION_HIGHLIGHT = {
  0: null,
  1: null,
  2: 'alameda-mcgee',
  3: 'monterey-gilman',  // contested commercial strip
  4: null,
}

const POLICY_DOCS = [
  { name: 'Vision Zero Action Plan',     year: 2020, role: 'Designated Hopkins a High-Injury Street' },
  { name: 'Bicycle Plan Update',         year: 2017, role: 'Identified Hopkins as a priority corridor' },
  { name: 'Climate Action Plan',         year: 2020, role: 'Mode shift targets require street redesign' },
  { name: 'Pedestrian Master Plan',      year: 2010, role: 'High-injury streets require capital investment' },
  { name: 'Active Transportation Plan',  year: 2017, role: 'Connects West Berkeley to transit and retail' },
  { name: 'General Plan (Transportation Element)', year: 2002, role: 'Prioritizes multi-modal corridor design' },
]

export default function DataStory() {
  const [activeSection, setActiveSection]     = useState(0)
  const [selectedSegmentId, setSelectedSegmentId] = useState(null)
  const scrollerRef = useRef(null)
  const location = useLocation()

  // Scroll to hash anchor on mount (supports cross-page deep links from navbar)
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const highlightSegment = SECTION_HIGHLIGHT[activeSection] ?? null
  const selectedSegment  = selectedSegmentId ? SEGMENTS_BY_ID[selectedSegmentId] : null

  useEffect(() => {
    const scroller = scrollama()

    scroller
      .setup({ step: '.narrative-step', offset: 0.5 })
      .onStepEnter(({ index }) => setActiveSection(index))

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
      <div className="map-panel" aria-label="Hopkins Street corridor map">
        <CorridorMap
          highlightSegment={highlightSegment}
          selectedSegment={selectedSegmentId}
          onSegmentClick={setSelectedSegmentId}
        />
        <SegmentPanel
          segment={selectedSegment}
          onClose={() => setSelectedSegmentId(null)}
        />
      </div>

      <div className="narrative-panel">

        {/* ── Hero ── */}
        <div className="narrative-card" style={{ marginBottom: '0' }}>
          <h1 className="section-heading">
            Hopkins Street has waited nine years for safety improvements. It may wait longer.
          </h1>
          <p className="section-body">
            Two people were killed on Hopkins in 2017. Berkeley's City Council responded by
            approving a redesign that would add protected bike lanes, pedestrian improvements,
            and transit upgrades. That was 2022. The street still looks exactly the same.
          </p>
          <p className="section-body">
            Now, with Hopkins finally due for repaving, a new proposal would pave it as-is —
            skipping the safety improvements Council already voted for. On April 15, an
            infrastructure committee will make a recommendation that shapes whether this street
            changes or stays the same for another decade. This site exists because the data
            should be part of that conversation.
          </p>
          <p className="section-body">
            The collision record on Hopkins is clear. The speed data is clear. The pedestrian
            and bicycle volumes — and the people making choices every day about whether this
            street feels safe enough to use — are clear. What's less clear is why a
            well-considered plan, approved twice, remains unbuilt while the pavement
            deteriorates beneath it.
          </p>
        </div>

        {/* ── Section 0: The cost of doing nothing ── */}
        <section
          id="cost"
          className={`narrative-step${activeSection === 0 ? ' narrative-step--active' : ''}`}
          data-index="0"
        >
          <div className="narrative-card">
            <h2 className="section-heading section-heading--amber">
              The cost of doing nothing
            </h2>
            <p className="section-body">
              The corridor's current design has a documented history of failure.
              Three people have died on or near this corridor since 2017: a
              pedestrian at Hopkins and Monterey, a cyclist on Sacramento near
              Hopkins — and then, in January 2025, a third person was killed
              at California Street and Ada, one block south, while the approved
              improvements sat on a shelf. The question is not whether to act.
              It is how long to wait.
            </p>
            <CollisionChart yearRange={[2015, 2018]} />
            <SpeedChart />
          </div>
        </section>

        {/* ── Section 1: Who's on Hopkins? ── */}
        <section
          id="who"
          className={`narrative-step${activeSection === 1 ? ' narrative-step--active' : ''}`}
          data-index="1"
        >
          <div className="narrative-card">
            <h2 className="section-heading">Who's on Hopkins?</h2>
            <p className="section-body">
              Even without protected infrastructure, a meaningful share of
              people arriving on Hopkins Street are not in cars. Pedestrians and
              cyclists use this corridor today — despite the risks.
            </p>
            <SegmentVolumeChart />
            <div className="multimode-stats">
              <div className="multimode-stats__tile">
                <span className="multimode-stats__number">7,526</span>
                <span className="multimode-stats__label">vehicles / day</span>
                <span className="multimode-stats__year">2025 · StL</span>
              </div>
              <div className="multimode-stats__divider" aria-hidden="true" />
              <div className="multimode-stats__tile">
                <span className="multimode-stats__number">769</span>
                <span className="multimode-stats__label">pedestrians / day</span>
                <span className="multimode-stats__year">2022 · StL</span>
              </div>
              <div className="multimode-stats__divider" aria-hidden="true" />
              <div className="multimode-stats__tile">
                <span className="multimode-stats__number">560</span>
                <span className="multimode-stats__label">cyclists / day</span>
                <span className="multimode-stats__year">2022 · StL</span>
              </div>
            </div>
            <p className="multimode-stats__note">
              Gilman–Sacramento zone — the high-volume connector to West Berkeley.
              All modes, different survey years. Data from Streetlight.
            </p>
          </div>
        </section>

        {/* ── Section 2: The street doesn't match how people use it ── */}
        <section
          id="street-design"
          className={`narrative-step${activeSection === 2 ? ' narrative-step--active' : ''}`}
          data-index="2"
        >
          <div className="narrative-card">
            <h2 className="section-heading">
              The street doesn't match how people use it
            </h2>
            <p className="section-body">
              Cyclists route to Cedar and Rose where those streets run parallel —
              a workaround that applies to the residential blocks. But the
              connector between Sacramento and Gilman has no parallel substitute.
              It carries more cyclists than any other segment on the corridor —
              560 per day despite no protection, more than twice Cedar's 266 —
              because it is the direct path to and from the commercial core and
              West Berkeley. The chart below shows the diversion only tells half
              the story.
            </p>
            <CedarDiversionChart />
          </div>
        </section>

        {/* ── Section 3: What's actually at stake with parking ── */}
        <section
          id="parking"
          className={`narrative-step${activeSection === 3 ? ' narrative-step--active' : ''}`}
          data-index="3"
        >
          <div className="narrative-card">
            <h2 className="section-heading">
              What's actually at stake with parking
            </h2>
            <p className="section-body">
              The commercial core is Sacramento to McGee — the Monterey Avenue
              block where the businesses are and pedestrian activity peaks at
              1,026 per day. The connector from Sacramento to Gilman carries
              even more vehicle traffic (7,526 daily) and the most cyclists on
              the corridor. All those modes — on a street built only for cars —
              is why the collisions cluster here. The parking debate is real,
              but it takes place against this backdrop.
            </p>
            <ParkingChart />
            <span id="opinion" aria-hidden="true" />
            <CommunityFeedbackChart />
          </div>
        </section>

        {/* ── Section 4: Berkeley already decided ── */}
        <section
          id="decided"
          className={`narrative-step${activeSection === 4 ? ' narrative-step--active' : ''}`}
          data-index="4"
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
              <p className="policy-list__punchline">
                Nine years. Two votes. Ten plans. The street hasn't changed.
              </p>
            </div>
          </div>
        </section>

        <div className="narrative-spacer" aria-hidden="true" />
      </div>
    </div>
  )
}
