import { expect, test, type Page } from './test.js'

/**
 * SM-5: the "Other sites" buttons under the question. Which page each one
 * opens is unit-tested (src/domain/sites.test.ts) and every kind of link is
 * opened on the real sites by scripts/check-sites.mjs; here: the buttons on
 * the page, for each kind of selection, and (live runs only) one real page
 * of each kind.
 */

test.beforeEach(async ({ context, page }) => {
  await context.route('https://www.statmuse.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>stub</title>' }))
  await page.goto('/')
})

const playerBox = (page: Page) => page.getByRole('combobox', { name: 'Player', exact: true })
const sites = (page: Page) => page.getByRole('group', { name: 'Other sites', exact: true })
const site = (page: Page, name: 'espn' | 'bbref' | 'crafted') => page.getByTestId(`site-${name}`)

test.describe('at 1280x800', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('a player: ESPN splits, Basketball-Reference and CraftedNBA; Game by game opens the game log', { tag: '@live' }, async ({ page }) => {
    // Nothing to link yet.
    await expect(sites(page)).toHaveCount(0)

    await playerBox(page).fill('Victor Wembanyama')
    await expect(sites(page).getByRole('link')).toHaveText(['ESPNHome, away, wins↗', 'Basketball-ReferenceWhole career↗', 'CraftedNBAShot chart↗'])
    await expect(site(page, 'espn')).toHaveAttribute('href', 'https://www.espn.com/nba/player/splits/_/id/5104157')
    await expect(site(page, 'bbref')).toHaveAttribute('href', 'https://www.basketball-reference.com/search/search.fcgi?search=Victor+Wembanyama')
    await expect(site(page, 'crafted')).toHaveAttribute('href', 'https://craftednba.com/players/victor-wembanyama')
    for (const name of ['espn', 'bbref', 'crafted'] as const) {
      await expect(site(page, name)).toHaveAttribute('target', '_blank')
      await expect(site(page, name)).toHaveAttribute('rel', 'noopener noreferrer')
      // The hover says what opens and why, starting with the site's name.
      expect(await site(page, name).getAttribute('title')).toMatch(/^(ESPN|Basketball-Reference|CraftedNBA): .{30,}/)
    }

    await page.getByRole('group', { name: 'How', exact: true }).getByRole('button', { name: 'Game by game' }).click()
    await expect(site(page, 'espn')).toHaveText('ESPNEvery game↗')
    await expect(site(page, 'espn')).toHaveAttribute('href', 'https://www.espn.com/nba/player/gamelog/_/id/5104157')

    // Under the action buttons, inside the card, and the page still does not scroll.
    const row = (await sites(page).boundingBox())!
    const rotations = (await page.getByTestId('rotations').boundingBox())!
    const card = (await page.getByRole('region', { name: 'Your question' }).boundingBox())!
    expect(row.y).toBeGreaterThanOrEqual(rotations.y + rotations.height)
    expect(row.y + row.height).toBeLessThanOrEqual(card.y + card.height)
    expect(await page.evaluate(() => [document.documentElement.scrollHeight - innerHeight, scrollY])).toEqual([0, 0])
  })

  test('a name that is not on a roster: both searches, no CraftedNBA', async ({ page }) => {
    await playerBox(page).fill('Michael Jordan')
    await expect(sites(page).getByRole('link')).toHaveText(['ESPNSearch↗', 'Basketball-ReferenceWhole career↗'])
    await expect(site(page, 'espn')).toHaveAttribute('href', 'https://www.espn.com/search/_/q/Michael%20Jordan')
    await expect(site(page, 'bbref')).toHaveAttribute('href', 'https://www.basketball-reference.com/search/search.fcgi?search=Michael+Jordan')
  })

  test('a roster player CraftedNBA has no page for: the button is shown but goes nowhere', async ({ page }) => {
    await playerBox(page).fill('Nate Bittle')
    await expect(site(page, 'espn')).toHaveAttribute('href', /\/nba\/player\/splits\/_\/id\/\d+$/)
    await expect(site(page, 'crafted')).toHaveAttribute('aria-disabled', 'true')
    await expect(site(page, 'crafted')).not.toHaveAttribute('href')
    await expect(site(page, 'crafted')).toHaveAttribute('title', 'CraftedNBA has no page for Nate Bittle yet.')
  })

  test('a team and the league: the team pages, and the league table sorted by the chosen stat', async ({ page }) => {
    // A team in the Player box.
    await playerBox(page).fill('warriors')
    await expect(sites(page).getByRole('link')).toHaveText(['ESPNWhole team↗', 'Basketball-ReferenceTeam season↗'])
    await expect(site(page, 'espn')).toHaveAttribute('href', 'https://www.espn.com/nba/team/stats/_/name/gs')
    await expect(site(page, 'bbref')).toHaveAttribute('href', 'https://www.basketball-reference.com/teams/GSW/2027.html')

    // Team leaders: nothing until a team is picked, then that team.
    await page.getByTestId('where-leaders').click()
    await expect(sites(page)).toHaveCount(0)
    const teamBox = page.getByRole('combobox', { name: 'Team', exact: true })
    await teamBox.fill('nets')
    await teamBox.press('Enter')
    await expect(site(page, 'espn')).toHaveAttribute('href', 'https://www.espn.com/nba/team/stats/_/name/bkn')
    await expect(site(page, 'bbref')).toHaveAttribute('href', 'https://www.basketball-reference.com/teams/BRK/2027.html')

    // The league: sorted by the stat chip.
    await page.goto('/?mode=leaders&team=NBA&stat=blocks')
    await expect(sites(page).getByRole('link')).toHaveText(['ESPNWhole league↗', 'Basketball-ReferenceLeague leaders↗'])
    await expect(site(page, 'espn')).toHaveAttribute('href', 'https://www.espn.com/nba/stats/player/_/table/defensive/sort/avgBlocks/dir/desc')
    await page.getByRole('group', { name: 'Stat', exact: true }).getByRole('button', { name: 'Assists', exact: true }).click()
    await expect(site(page, 'espn')).toHaveAttribute('href', 'https://www.espn.com/nba/stats/player/_/table/offensive/sort/avgAssists/dir/desc')
    await expect(site(page, 'bbref')).toHaveAttribute('href', 'https://www.basketball-reference.com/leagues/NBA_2027_leaders.html')
  })

  test('a link with a player: the buttons are there from the first paint and nothing jumps', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as { __cls?: number }
      w.__cls = 0
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!entry.hadRecentInput) w.__cls! += entry.value
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })
    for (const url of ['/?player=Victor+Wembanyama', '/?player=Nate+Bittle', '/?mode=leaders&team=Celtics']) {
      await page.goto(url)
      await expect(site(page, 'espn')).toHaveAttribute('href', /espn\.com\/nba\/(player\/splits|team\/stats)/)
      await page.waitForTimeout(300)
      expect(await page.evaluate(() => (window as { __cls?: number }).__cls ?? 0), url).toBeLessThan(0.02)
    }
  })
})

test('each kind of link opens the right page on the real site (live site only)', { tag: '@live' }, async ({ page, context }) => {
  test.skip(!process.env.BASE_URL, 'opens ESPN, Basketball-Reference and CraftedNBA; runs with e2e:prod')
  test.setTimeout(180_000)

  /** Follows the button like a click (new tab) and returns that page's title and address. */
  async function follow(name: 'espn' | 'bbref' | 'crafted') {
    const href = (await site(page, name).getAttribute('href'))!
    const tab = await context.newPage()
    try {
      // ESPN sometimes answers with a "Loading…" page first; the real one comes on the next try.
      for (let tries = 1; ; tries++) {
        const response = await tab.goto(href, { waitUntil: 'domcontentloaded', timeout: 45_000 })
        if (response?.status() !== 202 || tries >= 4) return { status: response?.status(), title: await tab.title(), url: tab.url() }
        await tab.waitForTimeout(1500)
      }
    } finally {
      await tab.close()
    }
  }

  // A player, Averages.
  await playerBox(page).fill('Victor Wembanyama')
  await expect(site(page, 'crafted')).toHaveAttribute('href', /craftednba/)
  let espn = await follow('espn')
  expect(espn.status).toBe(200)
  expect(espn.title).toMatch(/Wembanyama.*Splits/)
  const crafted = await follow('crafted')
  expect(crafted.status).toBe(200)
  expect(crafted.title).toMatch(/Wembanyama.*Shot Chart/)
  const career = await follow('bbref')
  expect(career.status).toBe(200)
  expect(career.url).toMatch(/\/players\/w\/wemba/)
  expect(career.title).toContain('Wembanyama')

  // Game by game.
  await page.getByRole('group', { name: 'How', exact: true }).getByRole('button', { name: 'Game by game' }).click()
  espn = await follow('espn')
  expect(espn.status).toBe(200)
  expect(espn.url).toContain('/gamelog/')
  expect(espn.title).toMatch(/Wembanyama.*Stats per Game/)

  // A team. (Basketball-Reference allows few pages a minute: wait between its pages.)
  await page.goto('/?mode=leaders&team=Celtics')
  espn = await follow('espn')
  expect(espn.status).toBe(200)
  expect(espn.title).toMatch(/Celtics.*Stats/)
  await page.waitForTimeout(4000)
  const team = await follow('bbref')
  expect(team.status).toBe(200)
  expect(team.title).toMatch(/2026-27 Boston Celtics/)

  // The league.
  await page.goto('/?mode=leaders&team=NBA&stat=assists')
  espn = await follow('espn')
  expect(espn.status).toBe(200)
  expect(espn.title).toMatch(/Stat Leaders/)
  await page.waitForTimeout(4000)
  const league = await follow('bbref')
  expect(league.status).toBe(200)
  expect(league.title).toMatch(/2026-27 NBA Leaders/)
})
