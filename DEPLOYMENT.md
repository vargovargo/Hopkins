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
