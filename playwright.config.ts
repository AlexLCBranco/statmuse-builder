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
  // The live site: at most 2 browsers at once, so a run stays under Vercel's
  // automatic DDoS mitigation (see e2e/test.ts).
  workers: local ? undefined : 2,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    // Desktop: every spec except the phone one.
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /phone.spec.ts/ },
    // Phone (SM-1): a Pixel 7 with touch, at 390x844. Runs with the desktop
    // project by default, locally and in `e2e:prod`.
    {
      name: 'phone',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
      testMatch: /phone.spec.ts/,
    },
  ],
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
