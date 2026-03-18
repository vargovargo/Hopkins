/**
 * NavBar.jsx — top navigation bar (Prompt 10)
 *
 * Left:  site title in DM Serif Display
 * Right: "The Data" (/) | "The Record" (/the-record)
 *
 * Active link: green underline accent, not a background fill.
 */

import { NavLink } from 'react-router-dom'
import './NavBar.css'

export default function NavBar() {
  return (
    <nav className="navbar" aria-label="Site navigation">
      <span className="navbar__title">Hopkins Street</span>
      <ul className="navbar__links">
        <li>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `navbar__link${isActive ? ' navbar__link--active' : ''}`
            }
          >
            The Data
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/the-record"
            className={({ isActive }) =>
              `navbar__link${isActive ? ' navbar__link--active' : ''}`
            }
          >
            The Record
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}
