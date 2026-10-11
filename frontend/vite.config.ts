/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // Same-origin in dev, so the httpOnly `accessToken` cookie just works.
    // API_PROXY_TARGET picks the backend: .env.dev (local) or .env.prod (Render)
    // via --mode; E2E sets it in the environment, which wins over the files.
    proxy: {
      '/api': {
        target: loadEnv(mode, process.cwd(), '').API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    // Same origin as VITE_API_URL below, like the app behind the Vite proxy.
    // jsdom's XMLHttpRequest (axios) enforces CORS, so a cross-origin page fails.
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Node's fetch cannot resolve relative URLs; MSW intercepts this origin.
    env: { VITE_API_URL: 'http://localhost/api/v1' },
    restoreMocks: true,
    // First render of each lazy route pays for its import; allow for a cold start.
    testTimeout: 15_000,
  },
}))
