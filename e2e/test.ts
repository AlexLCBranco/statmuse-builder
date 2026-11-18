import { test as base, type BrowserContext } from '@playwright/test'

/**
 * The `test` every spec uses. Against the live site (`e2e:prod`), each
 * worker fetches a built file from `/assets/` once and serves it from memory
 * afterwards. The names are content hashes, so a cached copy is always the
 * right one. This cuts the run's requests to Vercel by about two thirds:
 * a full run used to trip Vercel's automatic DDoS mitigation (a "Security
 * Checkpoint" page with HTTP 403), which the Hobby plan cannot bypass.
 */

const cache = new Map<string, { status: number; headers: Record<string, string>; body: Buffer }>()

/** Serves the live site's hashed assets from the worker's cache. Local runs: nothing. */
export async function cacheAssets(context: BrowserContext): Promise<void> {
  const live = process.env.BASE_URL
  if (!live) return
  await context.route(`${new URL(live).origin}/assets/**`, async (route) => {
    const url = route.request().url()
    let hit = cache.get(url)
    if (!hit) {
      const response = await route.fetch()
      hit = { status: response.status(), headers: response.headers(), body: await response.body() }
      if (response.ok()) cache.set(url, hit)
    }
    await route.fulfill(hit)
  })
}

export const test = base.extend({
  // Playwright calls the second argument `use`; renamed so the React hooks lint leaves it alone.
  context: async ({ context }, provide) => {
    await cacheAssets(context)
    await provide(context)
  },
})

export { devices, expect, type Browser, type BrowserContext, type Locator, type Page, type TestInfo } from '@playwright/test'
