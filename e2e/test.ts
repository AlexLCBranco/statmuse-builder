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

/**
 * Watches for a built file (`/assets/...`: the page's script, its stylesheet,
 * the player backgrounds) that the site did not serve. Without its
 * stylesheet the page still "works", so a test would go on and fail much
 * later on a position, with a message that says nothing about the cause
 * (seen once on the live site, 2026-11-20, seconds after a deploy).
 * Returns the list of what went wrong, filled in as the test runs.
 */
export function watchAssets(context: BrowserContext): string[] {
  const missing: string[] = []
  const isAsset = (url: string) => new URL(url).pathname.startsWith('/assets/')
  context.on('response', (response) => {
    if (isAsset(response.url()) && response.status() >= 400) missing.push(`${response.url()} (HTTP ${response.status()})`)
  })
  context.on('requestfailed', (request) => {
    const why = request.failure()?.errorText ?? 'failed'
    // ERR_ABORTED: the page moved on (a reload, a new address) before the file arrived. Not a fault.
    if (isAsset(request.url()) && why !== 'net::ERR_ABORTED') missing.push(`${request.url()} (${why})`)
  })
  return missing
}

export const test = base.extend({
  // Playwright calls the second argument `use`; renamed so the React hooks lint leaves it alone.
  context: async ({ context }, provide) => {
    await cacheAssets(context)
    const missing = watchAssets(context)
    await provide(context)
    if (missing.length > 0) {
      throw new Error(`The site did not serve a file the page needs, so this test's result means nothing: ${missing.join(', ')}. If it is HTTP 403, wait until the site answers 200 and run again.`)
    }
  },
})

export { devices, expect, type Browser, type BrowserContext, type Locator, type Page, type TestInfo } from '@playwright/test'
