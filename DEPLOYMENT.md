# Deployment — Hopkins Street Safety

## Quick start

The site is built from the `/web` directory (React + Vite). Every push to `main`
triggers a build check via GitHub Actions. Vercel handles deployment automatically
via its GitHub integration.

---

## Vercel setup (one-time)

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → **Import from GitHub**
2. Select this repository
3. Set **Root Directory** to `web`
4. Vercel auto-detects Vite; confirm:
   - Build command: `npm run build`
   - Output directory: `dist`
5. Add environment variable (see below)
6. Click **Deploy**

After the first deploy, every push to `main` deploys automatically. Every branch
gets a preview URL.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_MAPBOX_TOKEN` | Yes | Mapbox GL JS access token. Get one free at [mapbox.com](https://account.mapbox.com/access-tokens/). The free tier is sufficient for this project. |

**In Vercel:** Settings → Environment Variables → add `VITE_MAPBOX_TOKEN`

**Locally:** create `web/.env` (already gitignored):
```
VITE_MAPBOX_TOKEN=pk.eyJ1...your_token_here
```

Without the token, the map panel shows a styled fallback message. The rest of the
site renders normally.

---

## GitHub Actions build check

`.github/workflows/deploy.yml` runs `npm ci && npm run build` on every push to
`main` and every pull request against `main`. This catches build failures before
Vercel attempts deployment.

To enable the Mapbox token in CI builds (so the map compiles without warnings):

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Add secret: `VITE_MAPBOX_TOKEN` → your token value

The build succeeds without it (Vite bundles the token as `undefined`; the component
shows the no-token fallback at runtime). Adding it just removes the console warning.

---

## Raw data and git

`data/raw/` is gitignored and must **never** be committed. It contains Streetlight
exports (under a data contract), TIMS collision CSVs, and city PDF documents.

Before running the analysis scripts locally, populate `data/raw/` from your own
copies of these files. The web app can build and deploy without them — sections that
depend on unprocessed data show clearly-labeled placeholder cards.

**Files that ARE committed and power the live site:**
- `data/geo/corridor.geojson` — corridor geometry (verified coordinates)
- `data/geo/fatality_locations.geojson` — two 2017 fatality locations
- `data/processed/collisions_summary.json` — collision data (placeholder until TIMS pull)
- `data/processed/project_history.json` — timeline and source library for The Record page

---

## Domain

TBD — either a subdomain of `vargo.city` or a standalone domain for this project.
Configure in Vercel: Settings → Domains.

---

## Changelog

### 2026-03-26 — Story review and polish (PRs #9, #10, #11)

Based on a transportation engineer review of the story for a national news outlet
audience. Three PRs landed on main:

#### PR #9 — Story flow and framing edits

*`DataStory.jsx`, `CedarDiversionChart.jsx`, `CollisionChart.jsx`, `CommunityFeedbackChart.jsx`, `ParkingChart.jsx`*

- **Section order changed.** Narrative now leads with safety costs (collisions first),
  then mode split, then street design, then parking, then policy alignment. Prior order
  buried the strongest hook.
- **Closing punchline added** to policy alignment section: "Nine years. Two votes. Ten
  plans. The street hasn't changed." Styled as amber serif fragment.
- **Cedar diversion chart** — added one sentence making the revealed-preference logic
  explicit: "When more cyclists use a parallel route than the direct route, the data
  is telling us something about the direct route — not the parallel one."
- **Collision chart subhead** — changed "Hopkins Street · Sutter to Gilman" to
  "Hopkins Street corridor · Sutter–Gilman bounding box" to surface the geographic
  scope at glance level. The 53-collision figure and footnote are unchanged.
- **Community feedback chart** — added `~` prefix to all bar values (e.g. "~31")
  to visually signal that figures are approximate even when skimming past the text
  disclosure. The "estimated from city chart" note above the callout is unchanged.
- **Parking chart** — softened four strings: section heading, timing label, estimate
  note, and source note. Removed implication of intent; kept the factual record
  complete. (The October 2022 reconsideration is now the cited context rather than
  "not disclosed before the vote.")

#### PR #10 — Methods page and design pass

*`MethodsPage.jsx`, `MethodsPage.css`, `App.jsx`, `NavBar.jsx`, `index.css`,
`App.css`, `ProjectTimeline.jsx`, `ProjectTimeline.css`, `NavBar.css`*

- **New `/methods` page** — Three per-source sections (Streetlight Data, TIMS/SWITRS,
  City traffic count) with dataset spec cards and caveats. "What the data supports"
  can/cannot table. "Known gaps" section. Jump nav anchors. Route added to `App.jsx`;
  Methods tab added to `NavBar.jsx`.
- **Design pass** — Border token changed from `#3a3a38` to `rgba(255,255,255,0.06)`
  (propagates site-wide). Added `--color-border-mid` for nav/dropdown context.
  Established five-level font scale (`--text-display` through `--text-meta`) as CSS
  custom properties in `index.css`. Policy list de-boxed (green left-border removed;
  now typographic rows with bottom rules). Timeline event-type legend added above
  the vertical list.

#### PR #11 — Remaining review items (open)

*`ProjectTimeline.jsx`, `ProjectTimeline.css`, `SpeedChart.jsx`, `SourceLibrary.jsx`*

- **Horizontal timeline bar** — SVG track above the vertical event list showing the
  full 2017–2026 project span. Event dots are colored by type and positioned
  proportionally. "2026 — unbuilt" in amber at the right edge. Makes the 9-year gap
  spatially legible without reading the full list.
- **Speed chart annotation** — Inline count "X of N segments exceed Berkeley's 25 mph
  Vision Zero target" computed live from the data. Day-type toggle updates the count
  automatically.
- **Speed chart city count callout** — 2019 city-commissioned pneumatic tube count
  (Stannage Ave, 29 mph 85th percentile westbound, 49% over 25 mph) shown as
  corroborating evidence. Explicitly framed as different methodology/location, not
  direct Streetlight validation (per `do_not_present_as_direct_validation: true`
  in `city_counts_speed_summary.json`).
- **Opposition tab framing note** — Revised from "responding to them with data" to
  "engage those arguments with data — not dismiss them." Acknowledges the opposition's
  concerns are substantive.
