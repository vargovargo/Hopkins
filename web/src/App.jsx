/**
 * App.jsx — router shell
 *
 * Routes:
 *   /             → <DataStory />   — the scrollytelling data story
 *   /the-record   → <BackgroundPage /> — project history + source library
 *   /methods      → <MethodsPage /> — data sources, methodology, known gaps
 *   /explore      → <ExplorePage /> — interactive data sandbox
 *
 * NavBar sits above all routes.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom'

import NavBar         from './components/NavBar'
import UrgencyBanner  from './components/UrgencyBanner'
import DataStory      from './DataStory'
import BackgroundPage from './components/BackgroundPage'
import MethodsPage    from './components/MethodsPage'
import ExplorePage    from './components/ExplorePage'

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <UrgencyBanner />
      <Routes>
        <Route path="/"           element={<DataStory />} />
        <Route path="/the-record" element={<BackgroundPage />} />
        <Route path="/methods"    element={<MethodsPage />} />
        <Route path="/explore"    element={<ExplorePage />} />
      </Routes>
    </BrowserRouter>
  )
}
