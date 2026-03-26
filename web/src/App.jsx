/**
 * App.jsx — router shell (Prompt 10)
 *
 * Routes:
 *   /             → <DataStory />   — the scrollytelling data story
 *   /the-record   → <BackgroundPage /> — project history + source library
 *   /methods      → <MethodsPage /> — data sources, methodology, known gaps
 *
 * NavBar sits above all routes.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom'

import NavBar         from './components/NavBar'
import DataStory      from './DataStory'
import BackgroundPage from './components/BackgroundPage'
import MethodsPage    from './components/MethodsPage'

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/"           element={<DataStory />} />
        <Route path="/the-record" element={<BackgroundPage />} />
        <Route path="/methods"    element={<MethodsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
