import { mkdirSync } from 'node:fs'

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
/** A place tab in the header (Player, Team leaders). */
const place = (page: Page, name: string) => page.getByTestId('where-tabs').getByRole('button', { name, exact: true })
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
  await page.getByText('Your question').tap()
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

test('a question built by tapping gives the same StatMuse link as on desktop', { tag: '@live' }, async ({ page, browser }) => {
  const phone = await buildQuestion(page, 'tap')
  expect(phone).toBe('https://www.statmuse.com/nba/ask/jayson-tatum-points-in-the-4th-quarter-at-home-vs-lakers-in-wins-last-10-games')
  expect(await desktopUrl(browser, new URL('/', page.url()).href)).toBe(phone)

  // Ask works from a tap: opens StatMuse in a new tab and saves to Recent.
  const popup = page.waitForEvent('popup')
  await askLink(page).tap()
  expect((await popup).url()).toBe(phone)
  await expect(recent(page).getByRole('link')).toHaveText(['Jayson Tatum points in the 4th quarter at home vs Lakers in wins last 10 games'])
})

// ---- The header on a phone: one line ----

const PHONE_PAGES: [name: string, url: string][] = [
  ['Player, empty', '/'],
  ['Player, game by game', '/?view=gamelog&player=Shai+Gilgeous-Alexander&stat=points'],
  ['Team leaders', '/?mode=leaders&team=Trail+Blazers&stat=assists'],
  ['League leaders', '/?mode=leaders&team=NBA'],
]

test('the header fits at 390px on every main page: all places visible, nothing in a hidden menu', { tag: '@live' }, async ({ page }, testInfo) => {
  for (const [name, url] of PHONE_PAGES) {
    await page.goto(url)
    await page.evaluate(() => document.fonts.ready)
    const header = page.getByTestId('top-bar')
    const box = (await header.boundingBox())!
    // Same place, same size, on every page.
    expect([box.x, box.y, box.width, box.height], name).toEqual([0, 0, 390, 59])
    expect(await header.evaluate((el) => el.scrollWidth), name).toBeLessThanOrEqual(390)
    for (const tab of ['Player', 'Team leaders']) {
      await expect(place(page, tab), name).toBeInViewport({ ratio: 1 })
      // Icon with its label under it.
      await expect(place(page, tab).locator('svg'), name).toBeVisible()
      await expect(place(page, tab), name).toHaveText(tab)
    }
    // No breadcrumb and no search button.
    await expect(page.getByTestId('breadcrumb'), name).toHaveCount(0)
    await expect(page.getByTestId('go-anywhere'), name).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Default selections' }), name).toBeInViewport({ ratio: 1 })
    await expect(page.getByTestId('page-history').getByRole('button'), name).toHaveCount(2)
    // No hamburger: nothing in the header opens a hidden menu of places.
    await expect(header.getByRole('button', { name: /menu/i }), name).toHaveCount(0)
    await expectFits(page, testInfo, `header-${name}`)

    // Still on top after the page under it scrolls.
    await page.locator('main').evaluate((el) => el.parentElement!.scrollTo(0, 600))
    expect((await header.boundingBox())!, name).toEqual(box)
    await expect(header, name).toBeInViewport({ ratio: 1 })
  }
})

test('the header works by tap: places, back', async ({ page }) => {
  await playerBox(page).fill('LeBron James')
  await playerBox(page).blur()
  await place(page, 'Team leaders').tap()
  await expect(place(page, 'Team leaders')).toHaveAttribute('aria-current', 'page')
  await expect(page).toHaveURL(/mode=leaders/)
  await page.getByRole('button', { name: 'Show the team list' }).tap()
  await page.getByRole('listbox', { name: 'Leader teams' }).getByRole('option', { name: 'Celtics', exact: true }).tap()
  await expect(page.getByTestId('question')).toHaveText('Celtics points leaders')
  await place(page, 'Player').tap()
  await expect(page.getByTestId('question')).toHaveText('LeBron James points')

  // Every header button is finger-sized.
  for (const button of await page.getByTestId('top-bar').getByRole('button').all()) {
    const box = (await button.boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.width).toBeGreaterThanOrEqual(44)
  }

  // Back, twice: the leaders page, then where it started.
  const back = page.getByTestId('page-history').getByRole('button', { name: 'Back' })
  await back.tap()
  await expect(page.getByTestId('question')).toHaveText('Celtics points leaders')
  await back.tap()
  await expect(page.getByTestId('question')).toHaveText('LeBron James stats')
})

test('build report: a screenshot of each main page (390px)', async ({ page }) => {
  test.skip(!!process.env.BASE_URL, 'screenshots are for the local build report')
  const dir = 'test-output/sm6'
  mkdirSync(dir, { recursive: true })
  for (const [name, url] of PHONE_PAGES) {
    await page.goto(url)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: `${dir}/phone-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png` })
  }
})

// ---- SM-4: the draft, college and hometown line on a phone ----

test('the background line fits and works by tap', async ({ page }, testInfo) => {
  await playerBox(page).fill('Jalen Brunson')
  await playerBox(page).blur()
  const line = page.getByTestId('bio-line')
  // One part per line here (the dots between them are hidden).
  await expect(line).toHaveText('Draft 2018, round 2, pick 33 (DAL) ↗·Villanova 2015-18 ↗·New Brunswick, NJ')
  const tops = await line.locator('a, [data-testid="bio-home"]').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
  expect(new Set(tops).size).toBe(3)
  await line.scrollIntoViewIfNeeded()
  await expectFits(page, testInfo, 'background-line')
  // Both links are finger-sized.
  for (const part of ['bio-draft', 'bio-college']) {
    const box = (await page.getByTestId(part).boundingBox())!
    expect(box.height, part).toBeGreaterThanOrEqual(44)
    expect(box.width, part).toBeGreaterThanOrEqual(44)
  }

  // No hover on a phone: a tap on the button shows the details, inside the screen.
  const more = page.getByRole('button', { name: 'More about where Jalen Brunson comes from' })
  await expect(page.getByTestId('bio-details')).toHaveCount(0)
  await more.tap()
  const details = page.getByTestId('bio-details')
  await expect(details).toContainText('2018: round 2, pick 33, by the Dallas Mavericks.')
  await expect(details).toContainText('Villanova, 2017-18: 18.9 points, 3.1 rebounds, 4.6 assists a game.')
  await expect(details).toContainText('New Brunswick, NJ.')
  const box = (await details.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  await expectFits(page, testInfo, 'background-details')
  for (const link of await details.getByRole('link').all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  // A tap outside closes it; a second tap on the button does too.
  await page.getByText('Your question').tap()
  await expect(details).toHaveCount(0)
  await more.tap()
  await expect(details).toBeVisible()
  await more.tap()
  await expect(details).toHaveCount(0)
})

// ---- SM-5: the "Other sites" buttons on a phone ----

test('the other-sites buttons fit, are finger-sized, and open in a new tab', async ({ page, context }, testInfo) => {
  await context.route(/espn\.com|basketball-reference\.com|craftednba\.com/, (route) => route.fulfill({ contentType: 'text/html', body: '<title>stub</title>' }))
  await playerBox(page).fill('Shai Gilgeous-Alexander')
  await playerBox(page).blur()
  const sites = page.getByRole('group', { name: 'Other sites', exact: true })
  await expect(sites.getByRole('link')).toHaveCount(3)
  await sites.scrollIntoViewIfNeeded()
  await expectFits(page, testInfo, 'other-sites')
  for (const link of await sites.getByRole('link').all()) {
    const box = (await link.boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.width).toBeGreaterThanOrEqual(44)
  }
  // A tap opens the site in a new tab; this page stays.
  const popup = page.waitForEvent('popup')
  await page.getByTestId('site-espn').tap()
  expect((await popup).url()).toMatch(/^https:\/\/www\.espn\.com\/nba\/player\/splits\/_\/id\/\d+$/)
  await expect(page.getByTestId('question')).toHaveText('Shai Gilgeous-Alexander stats')

  // A team: two buttons.
  await place(page, 'Team leaders').tap()
  await page.getByRole('button', { name: 'Show the team list' }).tap()
  await page.getByRole('listbox', { name: 'Leader teams' }).getByRole('option', { name: 'Trail Blazers' }).tap()
  await expect(sites.getByRole('link')).toHaveText(['ESPNWhole team↗', 'Basketball-ReferenceTeam season↗'])
  await expectFits(page, testInfo, 'other-sites-team')
})
