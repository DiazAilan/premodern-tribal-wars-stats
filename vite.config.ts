import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  /**
   * GitHub Pages serves this app at `/<repo>/`.
   * The deploy workflow sets `VITE_BASE=/<repo>/` at build time.
   */
  const base = process.env.VITE_BASE ?? '/'

  return {
    base,
    plugins: [react()],
  }
})
