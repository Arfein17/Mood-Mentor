import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // All /api/* requests from Vite dev server are proxied to Express backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // No rewrite — /api/checkin stays as-is on the Express side
      },
    },
  },
})
