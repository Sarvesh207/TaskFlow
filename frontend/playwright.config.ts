import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests: the real frontend (Vite dev server) against the real API
 * running on the "-test" database. Each test seeds its own users and project
 * through the API (e2e/fixtures.ts), so tests are isolated and run in parallel.
 */

const API_PORT = 3100
const WEB_PORT = 5174

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /responsive\.spec/ },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true },
      testMatch: /responsive\.spec/,
    },
  ],
  webServer: [
    {
      command: 'bun run test:serve',
      cwd: '../backend',
      env: { PORT: String(API_PORT) },
      // 401 from /auth/me still means the server is up (Playwright accepts 2xx-403).
      url: `http://localhost:${API_PORT}/api/v1/auth/me`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `bunx vite --port ${WEB_PORT} --strictPort`,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})
