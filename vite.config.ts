import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import adminPlugin from './vite-plugin-admin'

export default defineConfig(({ mode }) => {
  // Surface .env.local's GOOGLE_PLACES_API_KEY to the dev plugin.
  // We DON'T expose it to import.meta.env (no VITE_ prefix), so it stays
  // server-side only.
  const env = loadEnv(mode, process.cwd(), '')
  if (env.GOOGLE_PLACES_API_KEY) {
    process.env.GOOGLE_PLACES_API_KEY = env.GOOGLE_PLACES_API_KEY
  }

  return {
    plugins: [react(), tailwindcss(), adminPlugin()],
    server: {
      port: process.env.PORT ? Number(process.env.PORT) : 5173,
      strictPort: true,
    },
  }
})
