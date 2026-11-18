import { cacheAssets, devices, expect, test, type Browser, type Page, type TestInfo } from './test.js'

/**
 * SM-1: the site on a phone. Runs only in the `phone` project
 * (playwright.config.ts: Pixel 7 at 390x844 with touch), so every action
 * here is a tap. The desktop suite (builder.spec.ts, defaults.spec.ts) runs
 * unchanged in the `chromium` project.
 */

test.beforeEach(async ({ context, page }) => {
  await context.route('https://www.statmuse.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>stub</title>' }),
  )
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
})

const group = (page: Page, name: string) => page.getByRole('group', { name, exact: true })
const chip = (page: Page, groupName: string, name: string) => group(page, groupName).getByRole('button', { name, exact: true })
const playerBox = (page: Page) => page.getByRole('combobox', { name: 'Player', exact: true })
const playerList = (page: Page) => page.getByRole('listbox', { name: 'Players and teams', exact: true })
const teamsList = (page: Page) => page.getByRole('listbox', { name: 'Teams', exact: true })
const askLink = (page: Page) => page.getByRole('link', { name: /Ask StatMuse/ })
const recent = (page: Page) => page.getByTestId('recent')

const entry = (i: number) => ({
  question: `Player ${i} points last 10 games`,
  query: { mode: 'player', view: 'averages', player: `Player ${i}`, stat: 'points', period: 'last 10 games' },
})

/**
 * No sideways scroll on the page or in any column, and nothing sticks out
 * past the right edge. Also saves a screenshot of the state as an artifact.
 */
async function expectFits(page: Page, testInfo: TestInfo, state: string) {
  const problems = await page.evaluate(() => {
    const found: string[] = []
    const doc = document.documentElement
    if (doc.scrollWidth > doc.clientWidth) found.push(`page scrolls sideways: ${doc.scrollWidth} > ${doc.clientWidth}`)
    for (const el of document.querySelectorAll('main, aside, aside ul, #root > div > div, [role="listbox"]:not([hidden])')) {
      if (el.scrollWidth > el.clientWidth) found.push(`${el.tagName}.${el.className} scrolls sideways`)
    }
    for (const el of document.querySelectorAll('button, a, input, [role="option"], [role="listbox"]:not([hidden]), [role="tooltip"]')) {
      const box = el.getBoundingClientRect()
      if (box.width === 0) continue
      if (box.left < -0.5 || box.right > doc.clientWidth + 0.5) found.push(`outside the screen: ${el.getAttribute('aria-label') || el.textContent?.trim()}`)
    }
    return found
  })
  await testInfo.attach(`phone-${state}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  expect(problems, state).toEqual([])
}

test('every state fits a 390px screen with no sideways scroll', async ({ page }, testInfo) => {
  expect(page.viewportSize()).toEqual({ width: 390, height: 844 })
  await expectFits(page, testInfo, 'empty-builder')

  // Filters chosen: the busiest question, the warning, every ✕ showing.
  await playerBox(page).fill('Shai Gilgeous-Alexander')
  for (const [row, name] of [['Stat', '3PA'], ['Quarter', '2nd half'], ['Court', 'Away'], ['Result', 'Losses'], ['Period', 'Last season']]) {
    await chip(page, row!, name!).tap()
  }
  await page.getByRole('combobox', { name: 'Vs player' }).fill('Victor Wembanyama')
  await page.getByRole('combobox', { name: 'Without' }).fill('Jalen Williams')
  await page.getByRole('combobox', { name: 'Opponent' }).fill('trail')
  await page.getByRole('combobox', { name: 'Opponent' }).press('Enter')
  await page.getByRole('combobox', { name: 'Opponent' }).blur()
  await expect(page.getByTestId('filter-warning')).toBeVisible()
  await expectFits(page, testInfo, 'filters-chosen')

  // Autocomplete open, in the Player box and in the Opponent box.
  await playerBox(page).fill('')
  await playerBox(page).fill('ja')
  await expect(playerList(page)).toBeVisible()
  await expectFits(page, testInfo, 'player-autocomplete')
  await playerBox(page).blur()
  await page.getByRole('button', { name: 'Show all teams' }).tap()
  await expect(teamsList(page)).toBeVisible()
  await expectFits(page, testInfo, 'opponent-dropdown')

  // The defaults popover.
  await page.getByRole('button', { name: 'Default selections' }).tap()
  await expect(page.getByRole('button', { name: 'Set current selection as default' })).toBeVisible()
  await expectFits(page, testInfo, 'defaults-popover')
})

test('the Recent list fits, with full Pinned', async ({ page }, testInfo) => {
  await page.evaluate(
    ([recentList, pinnedList]) => {
      localStorage.setItem('smb.recent', JSON.stringify(recentList))
      localStorage.setItem('smb.pinned', JSON.stringify(pinnedList))
    },
    [Array.from({ length: 12 }, (_, i) => entry(i)), Array.from({ length: 12 }, (_, i) => entry(100 + i))],
  )
  await page.reload()
  const last = recent(page).getByRole('listitem').last()
  await last.scrollIntoViewIfNeeded()
  await expect(last).toBeInViewport({ ratio: 0.99 })
  await expectFits(page, testInfo, 'recent-list')
})

test('dropdowns stay on screen and above the bottom edge', async ({ page }) => {
  // The Opponent box is low on the screen once scrolled to: its list must
  // still be wholly visible, above or below the box.
  const box = page.getByRole('combobox', { name: 'Opponent' })
  await box.scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Show all teams' }).tap()
  const list = (await teamsList(page).boundingBox())!
  const input = (await box.boundingBox())!
  const view = await page.evaluate(() => ({ h: window.visualViewport?.height ?? innerHeight, w: innerWidth }))
  expect(list.y).toBeGreaterThanOrEqual(0)
  expect(list.y + list.height).toBeLessThanOrEqual(view.h)
  expect(list.x + list.width).toBeLessThanOrEqual(view.w)
  expect(list.y >= input.y + input.height || list.y + list.height <= input.y).toBe(true)
  // A tap on an option lands.
  await teamsList(page).getByRole('option', { name: 'Celtics' }).tap()
  await expect(box).toHaveValue('Celtics')
})

test('tap targets are finger-sized', async ({ page }) => {
  await playerBox(page).fill('LeBron James')
  await playerBox(page).blur()
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('button, a, input')]
      // The version badge is small and muted by design (it covers nothing).
      .filter((el) => el.getAttribute('data-testid') !== 'site-version')
      .map((el) => ({ name: el.getAttribute('aria-label') || el.textContent?.trim() || el.id, box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && (box.height < 44 || box.width < 44))
      .map(({ name, box }) => `${name}: ${Math.round(box.width)}x${Math.round(box.height)}`),
  )
  expect(small).toEqual([])
  // Suggestion rows too.
  await playerBox(page).fill('ja')
  const rows = await playerList(page).getByRole('option').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))
  for (const height of rows) expect(height).toBeGreaterThanOrEqual(44)
})

test('the back-to-back preset works with a tap', async ({ page }) => {
  await playerBox(page).fill('LeBron James')
  await chip(page, 'Back-to-back', '2nd night').tap()
  await expect(page.getByTestId('question')).toHaveText('LeBron James stats on the second night of a back to back')
})

test('Ask StatMuse is on the first screen', async ({ page }) => {
  await expect(askLink(page)).toBeInViewport({ ratio: 1 })
})

test('tooltips with information open on tap and close on a tap outside', async ({ page }) => {
  // The version badge: commit and build time.
  const badge = page.getByTestId('site-version')
  await badge.tap()
  const tip = page.getByRole('tooltip')
  await expect(tip).toHaveText(/^Version \d+\.\d+\.\d+ · commit [0-9a-f]{7}/)
  await expect(tip).toBeInViewport({ ratio: 1 })
  await page.getByRole('heading', { name: /Muse Builder/ }).tap()
  await expect(tip).toHaveCount(0)

  // A full Pinned list: tapping ☆ says why nothing happens.
  await page.evaluate(
    ([recentList, pinnedList]) => {
      localStorage.setItem('smb.recent', JSON.stringify(recentList))
      localStorage.setItem('smb.pinned', JSON.stringify(pinnedList))
    },
    [[entry(1)], Array.from({ length: 12 }, (_, i) => entry(100 + i))],
  )
  await page.reload()
  const star = recent(page).getByRole('button', { name: /^Pin / })
  await star.scrollIntoViewIfNeeded()
  await star.tap({ force: true }) // aria-disabled: Playwright waits for "enabled", a finger does not
  await expect(page.getByRole('tooltip')).toHaveText('Pinned is full (12)')
  await expect(page.getByRole('tooltip')).toBeInViewport({ ratio: 1 })
  await expect(recent(page).getByRole('listitem')).toHaveCount(1)
  await star.tap({ force: true }) // aria-disabled: Playwright waits for "enabled", a finger does not
  await expect(page.getByRole('tooltip')).toHaveCount(0)
})

/** The same choices by tap (phone) or click (desktop); returns the Ask link. */
async function buildQuestion(page: Page, press: 'tap' | 'click'): Promise<string> {
  await playerBox(page)[press]()
  await playerBox(page).pressSequentially('jayson t')
  await playerList(page).getByRole('option', { name: 'Jayson Tatum' })[press]()
  await chip(page, 'Stat', 'Points')[press]()
  await chip(page, 'Quarter', 'Q4')[press]()
  await chip(page, 'Court', 'Home')[press]()
  await chip(page, 'Result', 'Wins')[press]()
  await page.getByRole('button', { name: 'Show all teams' })[press]()
  await teamsList(page).getByRole('option', { name: 'Lakers' })[press]()
  await chip(page, 'Period', 'Last 10')[press]()
  await expect(page.getByTestId('question')).toHaveText('Jayson Tatum points in the 4th quarter at home vs Lakers in wins last 10 games')
  return (await askLink(page).getAttribute('href')) ?? ''
}

async function desktopUrl(browser: Browser, origin: string): Promise<string> {
  const context = await browser.newContext({ ...devices['Desktop Chrome'] })
  await cacheAssets(context)
  try {
    const page = await context.newPage()
    await page.goto(origin)
    return await buildQuestion(page, 'click')
  } finally {
    await context.close()
  }
}

test('a question built by tapping gives the same StatMuse link as on desktop', async ({ page, browser }) => {
  const phone = await buildQuestion(page, 'tap')
  expect(phone).toBe('https://www.statmuse.com/nba/ask/jayson-tatum-points-in-the-4th-quarter-at-home-vs-lakers-in-wins-last-10-games')
  expect(await desktopUrl(browser, new URL('/', page.url()).href)).toBe(phone)

  // Ask works from a tap: opens StatMuse in a new tab and saves to Recent.
  const popup = page.waitForEvent('popup')
  await askLink(page).tap()
  expect((await popup).url()).toBe(phone)
  await expect(recent(page).getByRole('link')).toHaveText(['Jayson Tatum points in the 4th quarter at home vs Lakers in wins last 10 games'])
})
