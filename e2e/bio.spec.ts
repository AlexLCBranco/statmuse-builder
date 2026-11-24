import { expect, test, type Page } from './test.js'

/**
 * SM-4: the player's draft spot, college and hometown after the action
 * buttons. The data is ESPN's, synced into the build (scripts/sync-bios.mjs),
 * so these tests read the real synced records; the last test checks one of
 * them against ESPN itself (live runs only).
 */

test.beforeEach(async ({ context, page }) => {
  await context.route('https://www.statmuse.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>stub</title>' }))
  await page.goto('/')
})

const playerBox = (page: Page) => page.getByRole('combobox', { name: 'Player', exact: true })
const bio = (page: Page) => page.getByTestId('bio')
const line = (page: Page) => page.getByTestId('bio-line')
const details = (page: Page) => page.getByTestId('bio-details')
const more = (page: Page) => page.getByRole('button', { name: /^More about where / })

test.describe('at 1280x800', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('pick a player: the line and both links appear right after the action buttons', { tag: '@live' }, async ({ page }) => {
    await playerBox(page).click()
    await playerBox(page).pressSequentially('jalen bru')
    await page.getByRole('listbox', { name: 'Players and teams', exact: true }).getByRole('option', { name: 'Jalen Brunson' }).click()
    await expect(line(page)).toHaveText('Draft 2018, round 2, pick 33 (DAL) ↗·Villanova 2015-18 ↗·New Brunswick, NJ')

    const draft = page.getByTestId('bio-draft')
    await expect(draft).toHaveAttribute('href', 'https://www.basketball-reference.com/draft/NBA_2018.html')
    await expect(draft).toHaveAttribute('target', '_blank')
    await expect(draft).toHaveAttribute('title', 'See every pick of the 2018 draft')
    const college = page.getByTestId('bio-college')
    await expect(college).toHaveAttribute('href', 'https://www.espn.com/mens-college-basketball/team/stats/_/id/222/season/2018')
    await expect(college).toHaveAttribute('target', '_blank')
    await expect(college).toHaveAttribute('title', 'See the Villanova team of 2017-18')

    // Right after the last action button: at 1280 the card has no room for it
    // on that line, so it starts the next line, under Ask, inside the card.
    const clear = (await page.getByRole('button', { name: 'Clear all' }).boundingBox())!
    const ask = (await page.getByRole('link', { name: 'Ask StatMuse' }).boundingBox())!
    const slot = (await bio(page).boundingBox())!
    const card = (await page.getByRole('region', { name: 'Your question' }).boundingBox())!
    expect(slot.y).toBeGreaterThanOrEqual(clear.y + clear.height)
    expect(Math.abs(slot.x - ask.x)).toBeLessThanOrEqual(1)
    expect(slot.x + slot.width).toBeLessThanOrEqual(card.x + card.width)
    // Everything is still on one screen: the page does not scroll.
    expect(await page.evaluate(() => [document.documentElement.scrollHeight - innerHeight, scrollY])).toEqual([0, 0])
  })

  test('drafted first, no US college, from abroad; undrafted with two colleges', async ({ page }) => {
    await playerBox(page).fill('Victor Wembanyama')
    await expect(line(page)).toHaveText('Draft 2023, pick 1 (SAS) ↗·No US college·France')
    await expect(page.getByTestId('bio-draft')).toHaveAttribute('href', 'https://www.basketball-reference.com/draft/NBA_2023.html')
    // No college: plain text, not a link.
    expect(await page.getByTestId('bio-college').evaluate((el) => el.tagName)).toBe('SPAN')

    await playerBox(page).fill('austin reaves')
    await expect(line(page)).toHaveText('Not drafted·Oklahoma 2019-21 ↗·Newark, AR')
    expect(await page.getByTestId('bio-draft').evaluate((el) => el.tagName)).toBe('SPAN')
    await expect(page.getByTestId('bio-college')).toHaveAttribute('href', 'https://www.espn.com/mens-college-basketball/team/stats/_/id/201/season/2021')
  })

  test('the full details open on hover, and stay open from the button', async ({ page }) => {
    await playerBox(page).fill('Stephen Curry')
    await playerBox(page).blur()
    await expect(line(page)).toBeVisible()
    await expect(details(page)).toHaveCount(0)

    // Hover: open while the mouse is on the line or in the box, closed after.
    await line(page).hover()
    await expect(details(page)).toBeVisible()
    await expect(details(page)).toContainText('Stephen Curry')
    await expect(details(page)).toContainText('2009: round 1, pick 7, by the Golden State Warriors.')
    await expect(details(page)).toContainText('Davidson, 2007-08: 25.9 points, 4.6 rebounds, 2.9 assists a game.')
    await expect(details(page)).toContainText('Akron, OH.')
    await expect(details(page).getByRole('link', { name: /Every pick of the 2009 draft/ })).toHaveAttribute('href', 'https://www.basketball-reference.com/draft/NBA_2009.html')
    // One link per college season: three Davidson teams.
    await expect(details(page).getByRole('link', { name: /His teammates that season/ })).toHaveCount(3)
    await details(page).getByRole('link', { name: /His teammates that season/ }).last().hover()
    await expect(details(page)).toBeVisible()
    // Inside the window, on top of the page, and the page did not grow.
    const box = (await details(page).boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(1280)
    expect(box.y + box.height).toBeLessThanOrEqual(800)
    expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBe(0)
    await page.getByText('Your question').hover()
    await expect(details(page)).toHaveCount(0)

    // The button: stays open without the mouse on it; Escape or a click outside closes.
    await more(page).click()
    await page.getByText('Your question').hover()
    await expect(details(page)).toBeVisible()
    await expect(more(page)).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    await expect(details(page)).toHaveCount(0)
    await more(page).click()
    await page.getByText('Your question').click()
    await expect(details(page)).toHaveCount(0)
  })

  test('only a roster player in Player mode gets the line', async ({ page }) => {
    await expect(bio(page)).toHaveCount(0)
    // Half-typed, unknown, a team: nothing.
    for (const typed of ['LeBron Jam', 'Michael Jordan', 'Lakers']) {
      await playerBox(page).fill(typed)
      await expect(bio(page), typed).toHaveCount(0)
    }
    await playerBox(page).fill('LeBron James')
    await expect(line(page)).toHaveText('Draft 2003, pick 1 (CLE) ↗·No US college·Akron, OH')
    // Game by game: the same player, the same line.
    await page.getByRole('group', { name: 'How', exact: true }).getByRole('button', { name: 'Game by game' }).click()
    await expect(line(page)).toHaveText('Draft 2003, pick 1 (CLE) ↗·No US college·Akron, OH')
    // Team leaders: no player, no line.
    await page.getByTestId('where-leaders').click()
    await expect(bio(page)).toHaveCount(0)
  })

  test('the data loads only after a player is picked, and nothing jumps when it lands', async ({ page }) => {
    const requested: string[] = []
    page.on('request', (request) => {
      if (/\/assets\/bios-/.test(request.url())) requested.push(request.url())
    })
    await page.goto('/')
    await playerBox(page).pressSequentially('LeBron Jam')
    await page.waitForTimeout(300)
    // Typing and searching never wait for it: it was not even asked for.
    expect(requested).toEqual([])
    await playerBox(page).pressSequentially('es')
    await expect(line(page)).toBeVisible()
    expect(requested).toHaveLength(1)

    // A link with a player: the slot is there from the first paint, so the line landing moves nothing.
    await page.addInitScript(() => {
      const w = window as { __cls?: number }
      w.__cls = 0
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!entry.hadRecentInput) w.__cls! += entry.value
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })
    for (const url of ['/?player=Jalen+Brunson', '/?player=Shai+Gilgeous-Alexander&vs=Giannis+Antetokounmpo']) {
      await page.goto(url)
      await expect(line(page)).toBeVisible()
      await page.waitForTimeout(300)
      expect(await page.evaluate(() => (window as { __cls?: number }).__cls ?? 0), url).toBeLessThan(0.02)
    }
  })
})

test('the synced record matches ESPN for Victor Wembanyama (live site only)', { tag: '@live' }, async ({ page, request }) => {
  test.skip(!process.env.BASE_URL, 'asks ESPN, the real source; runs with e2e:prod')
  const response = await request.get('https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/athletes/5104157?lang=en&region=us')
  expect(response.ok()).toBe(true)
  const athlete = (await response.json()) as {
    fullName: string
    birthPlace?: { city?: string; country?: string }
    draft?: { year: number; round: number; selection: number }
    college?: unknown
  }
  expect(athlete.fullName).toBe('Victor Wembanyama')
  expect(athlete.draft).toMatchObject({ year: 2023, round: 1, selection: 1 })
  expect(athlete.birthPlace).toMatchObject({ city: 'Paris', country: 'France' })
  expect(athlete.college).toBeUndefined()

  // The page says the same.
  await playerBox(page).fill('Victor Wembanyama')
  await expect(line(page)).toHaveText(`Draft ${athlete.draft!.year}, pick ${athlete.draft!.selection} (SAS) ↗·No US college·${athlete.birthPlace!.country}`)
})
