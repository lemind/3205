/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    // Without an explicit origin, jsdom defaults to `about:blank`, which can't
    // resolve the app's relative API URLs (e.g. `/api/jobs/:id`) — RTK Query's
    // fetchBaseQuery needs a real base to construct a valid URL against.
    environmentOptions: {
      jsdom: { url: 'http://localhost:5173/' },
    },
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
