import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests in a real Chromium.
 * - `npm run e2e` builds the app and tests it on a local preview server.
 * - `npm run e2e:prod` runs the same tests against the live site
 *   (BASE_URL set), with no local server.
 */
const baseURL = process.env.BASE_URL ?? 'http://localhost:5191'
const local = !process.env.BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: local
    ? {
        // Test the production build, not the dev server: it's what Vercel serves.
        command: 'npm run build && npm run preview',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
})
