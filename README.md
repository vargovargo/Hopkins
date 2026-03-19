# Hopkins Street Safety — Data Story

A public-facing data story making the case for protected bike lanes and pedestrian improvements on the Hopkins Street corridor in Berkeley, CA. Using mode-specific volume data (Streetlight), collision records (TIMS/SWITRS), and official city planning documents, the project makes visible what the street already is: a route used by far more people on foot and bike than the parking-focused opposition acknowledges. Deployed at [hopkins-sage-omega.vercel.app](https://hopkins-sage-omega.vercel.app/).

## Setup 

```bash
# 1. Install web dependencies
cd web && npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env and add your Mapbox token (mapbox.com — free tier)

# 3. Start the dev server
npm run dev
```

## Project structure

```
data/processed/   — analysis-ready data files (committed)
data/raw/         — original downloads, gitignored
data/geo/         — GeoJSON corridor boundaries
analysis/         — Python/R data processing scripts
web/              — React + Vite frontend
docs/             — reference documents, PDFs, research notes
```

## Data integrity

Every number in the UI must come from a source file in `data/processed/` or `data/raw/`. See `CLAUDE.md` for the full data integrity rules — they are non-negotiable for a project in an active public policy debate.

## Deployment

Hosted on Vercel. See `DEPLOYMENT.md` for setup instructions. Every push to `main` auto-deploys.
