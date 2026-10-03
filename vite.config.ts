import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

// Resolve package.json relative to this config file, not the process cwd, so
// launching Vite from a parent dir (e.g. `vite path/to/project`) reads the
// correct version instead of a stray parent package.json (or ENOENT).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
