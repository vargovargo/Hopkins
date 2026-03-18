import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Allows importing from data/ outside the web/ root:
      //   import corridorData from '@data/geo/corridor.geojson'
      //   import collisions from '@data/processed/collisions_summary.json'
      '@data': path.resolve(__dirname, '../data'),
    },
  },
  server: {
    fs: {
      // Allow serving files from the repo root (one level up from web/)
      allow: [path.resolve(__dirname, '..')],
    },
  },
})
