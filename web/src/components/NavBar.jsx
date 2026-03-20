/**
 * NavBar.jsx
 *
 * Left:  site title
 * Right: "The Data" + dropdown TOC | "The Record" + dropdown TOC
 *
 * Each nav item is a NavLink + a chevron button that toggles a dropdown.
 * Dropdown closes on outside click, Escape, or item selection.
 * Same-page items smooth-scroll; cross-page items navigate via React Router.
 */

import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import './NavBar.css'

const DATA_ITEMS = [
  { label: "Who's on Hopkins?",         id: 'who' },
  { label: 'How people use the street', id: 'street-design' },
  { label: 'Parking',                   id: 'parking' },
  { label: 'Community opinion',         id: 'opinion' },
  { label: 'The cost of inaction',      id: 'cost' },
  { label: 'Berkeley already decided',  id: 'decided' },
]

const RECORD_ITEMS = [
  { label: 'Timeline', id: 'timeline' },
  { label: 'Sources',  id: 'sources' },
]

function NavItem({ to, label, items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const handleItemClick = (e, id) => {
    e.preventDefault()
    setOpen(false)
    if (location.pathname === to) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      navigate(`${to}#${id}`)
    }
  }

  return (
    <li className="navbar__item" ref={ref}>
      <NavLink
        to={to}
        end={to === '/'}
        className={({ isActive }) =>
          `navbar__link${isActive ? ' navbar__link--active' : ''}`
        }
        onClick={() => setOpen(false)}
      >
        {label}
      </NavLink>
      <button
        className={`navbar__chevron${open ? ' navbar__chevron--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={`${label} sections`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        ▾
      </button>
      {open && (
        <ul className="navbar__dropdown" role="menu">
          {items.map(({ label: itemLabel, id }) => (
            <li key={id} role="none">
              <a
                href={`${to}#${id}`}
                className="navbar__dropdown-item"
                role="menuitem"
                onClick={(e) => handleItemClick(e, id)}
              >
                {itemLabel}
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export default function NavBar() {
  return (
    <nav className="navbar" aria-label="Site navigation">
      <span className="navbar__title">Hopkins Street</span>
      <ul className="navbar__links">
        <NavItem to="/"           label="The Data"   items={DATA_ITEMS} />
        <NavItem to="/the-record" label="The Record" items={RECORD_ITEMS} />
      </ul>
    </nav>
  )
}
