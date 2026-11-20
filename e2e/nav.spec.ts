import { mkdirSync } from 'node:fs'

import { expect, test, type Page } from './test.js'

/**
 * SM-6: the shared layout (backlogkit's NAV_PATTERN.md, section 6). The
 * pinned header on every main page; every place, How option and breadcrumb
 * part navigating, with the address round-tripping; speed; no layout shift;
 * no <select>; named icon buttons; "Go anywhere"; and a screenshot of each
 * main page for the build report. The 390px checks are in phone.spec.ts.
 */

const BUSIEST =
  '/?player=Shai+Gilgeous-Alexander&stat=three+pointers+attempted&quarter=in+the+2nd+half&court=on+the+road&opponent=Trail+Blazers' +
  '&vs=Victor+Wembanyama&without=Jalen+Williams&rest=on+the+second+night+of+a+back+to+back&result=in+losses&period=last+season'

/** One page of each place and each How, plus the busiest screen. */
const MAIN: [name: string, url: string][] = [
  ['Player, empty', '/'],
  ['Player, averages', '/?player=LeBron+James&stat=points&period=last+10+games'],
  ['Player, game by game', '/?view=gamelog&player=LeBron+James'],
  ['Team leaders', '/?mode=leaders&team=Celtics&stat=assists'],
  ['League leaders', '/?mode=leaders&team=NBA&stat=points'],
  ['Player, every filter', BUSIEST],
]

const HEADER_H = 100

const question = (page: Page) => page.getByTestId('question')
const header = (page: Page) => page.getByTestId('top-bar')
const place = (page: Page, mode: 'player' | 'leaders') => page.getByTestId(`where-${mode}`)
const how = (page: Page, name: string) => page.getByRole('group', { name: 'How', exact: true }).getByRole('button', { name, exact: true })
const crumbs = (page: Page) => page.getByTestId('crumb-btn')
const crumbMenu = (page: Page) => page.getByTestId('crumb-menu')
const history = (page: Page, name: 'Back' | 'Forward') => page.getByTestId('page-history').getByRole('button', { name })

/** Console errors and crashes while the test runs. */
function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(String(error)))
  return errors
}

/** Reloading gives the same address and the same screen. */
async function expectReloadSame(page: Page) {
  const url = page.url()
  const text = await question(page).textContent()
  const title = await page.title()
  await page.reload()
  expect(page.url()).toBe(url)
  await expect(question(page)).toHaveText(text ?? '')
  await expect(page).toHaveTitle(title)
}

test.beforeEach(async ({ context }) => {
  await context.route('https://www.statmuse.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>stub</title>' }))
})

test.describe('at 1366x768', () => {
  test.use({ viewport: { width: 1366, height: 768 } })

  test('every main page: the same pinned header, still on top after scrolling; no <select>; every control named', async ({ page }) => {
    const errors = watchErrors(page)
    for (const [name, url] of MAIN) {
      await page.goto(url)
      await expect(header(page), name).toBeVisible()
      await expect(page.getByTestId('where-tabs').getByRole('button'), name).toHaveCount(2)
      await expect(page.getByTestId('go-anywhere'), name).toBeVisible()
      await expect(page.getByTestId('breadcrumb'), name).toBeVisible()
      await expect(history(page, 'Back'), name).toBeVisible()
      const box = (await header(page).boundingBox())!
      expect([box.x, box.y, box.width, box.height], name).toEqual([0, 0, 1366, HEADER_H])

      // The builder column is what scrolls here; the header stays where it is.
      await page.locator('main').hover()
      await page.mouse.wheel(0, 2000)
      await expect.poll(() => page.locator('main').evaluate((el) => el.scrollTop), { message: name }).toBeGreaterThan(0)
      expect((await header(page).boundingBox())!, name).toEqual(box)
      await expect(header(page), name).toBeInViewport({ ratio: 1 })
      expect(await page.evaluate(() => window.scrollY), name).toBe(0)

      expect(await page.locator('select').count(), name).toBe(0)
      // Every header control has a name a screen reader (and a hover) can give.
      const unnamed = await header(page)
        .locator('button, a, input')
        .evaluateAll((els) => els.filter((el) => !(el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent?.trim())).length)
      expect(unnamed, name).toBe(0)
      // Icon-only ones (no text of their own) also explain themselves on hover.
      const noTip = await header(page)
        .locator('button')
        .evaluateAll((els) => els.filter((el) => !el.textContent?.trim() && !el.getAttribute('title')).length)
      expect(noTip, name).toBe(0)
    }
    expect(errors).toEqual([])
  })
})

test('a link opens the exact screen, and the address follows every choice', async ({ page }) => {
  await page.goto(BUSIEST)
  await expect(question(page)).toHaveText(
    'Shai Gilgeous-Alexander three pointers attempted in the 2nd half on the road vs Trail Blazers vs Victor Wembanyama without Jalen Williams on the second night of a back to back in losses last season',
  )
  await expectReloadSame(page)

  // Old links are the plain address: still the start screen.
  await page.goto('/')
  await expect(question(page)).toHaveText('Pick a player stats')
  expect(new URL(page.url()).search).toBe('')

  // Each choice lands in the address, and a reload shows the same screen.
  await page.getByRole('combobox', { name: 'Player', exact: true }).fill('Jayson Tatum')
  await page.getByRole('group', { name: 'Stat', exact: true }).getByRole('button', { name: 'Points', exact: true }).click()
  await page.getByRole('group', { name: 'Quarter', exact: true }).getByRole('button', { name: 'Q4', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Last N games' }).fill('7')
  await expect(page).toHaveURL(/\?player=Jayson\+Tatum&stat=points&quarter=in\+the\+4th\+quarter&lastN=7$/)
  await expectReloadSame(page)
  await expect(question(page)).toHaveText('Jayson Tatum points in the 4th quarter last 7 games')

  // A value that is not a real choice is ignored, not shown.
  await page.goto('/?player=Ja+Morant&stat=dunks&mode=coach')
  await expect(question(page)).toHaveText('Ja Morant stats')
  await expect(place(page, 'player')).toHaveAttribute('aria-current', 'page')
})

test('saved default selections: the plain address starts from them, and a link still wins', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('group', { name: 'Period', exact: true }).getByRole('button', { name: 'This season', exact: true }).click()
  await page.getByRole('button', { name: 'Default selections' }).click()
  await page.getByRole('button', { name: 'Set current selection as default' }).click()

  await page.goto('/')
  await expect(question(page)).toHaveText('Pick a player stats this season')
  // The address now says what is on screen, so sharing it shows the same thing.
  await expect(page).toHaveURL(/\?period=this\+season$/)
  // A link to the factory screen is not mistaken for the start screen.
  await page.goto('/?mode=player')
  await expect(question(page)).toHaveText('Pick a player stats')
  await page.getByRole('group', { name: 'Period', exact: true }).getByRole('button', { name: 'Career', exact: true }).click()
  await page.getByRole('button', { name: 'Reset Period' }).click()
  await expect(page).toHaveURL(/\?mode=player$/)
  await expectReloadSame(page)
})

test('every place, How option and breadcrumb part navigates; reload, back and forward work', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/?player=LeBron+James&stat=points')
  await expect(history(page, 'Back')).toBeDisabled()
  await expect(history(page, 'Forward')).toBeDisabled()
  await expect(crumbs(page)).toHaveText(['Player', 'LeBron James', 'Averages'])
  await expect(page).toHaveTitle('LeBron James points — StatMuse Builder')

  // The places.
  await place(page, 'leaders').click()
  await expect(place(page, 'leaders')).toHaveAttribute('aria-current', 'page')
  await expect(place(page, 'player')).not.toHaveAttribute('aria-current', 'page')
  await expect(page).toHaveURL(/mode=leaders/)
  await expect(crumbs(page)).toHaveText(['Team leaders', 'Pick a team'])
  await expect(page).toHaveTitle('Team leaders — StatMuse Builder')
  await expectReloadSame(page)

  // The team part: the league and all 30 teams; picking one fills the team box.
  await crumbs(page).nth(1).click()
  await expect(crumbMenu(page).getByRole('menuitem')).toHaveCount(31)
  await crumbMenu(page).getByRole('menuitem', { name: 'Lakers', exact: true }).click()
  await expect(crumbMenu(page)).toHaveCount(0)
  await expect(page).toHaveURL(/mode=leaders.*team=Lakers/)
  await expect(question(page)).toHaveText('Lakers points leaders')
  await expect(page.getByRole('combobox', { name: 'Team', exact: true })).toHaveValue('Lakers')
  await expectReloadSame(page)

  // The place part: the other place. Escape closes a list.
  await crumbs(page).nth(0).click()
  await page.keyboard.press('Escape')
  await expect(crumbMenu(page)).toHaveCount(0)
  await crumbs(page).nth(0).click()
  await expect(crumbMenu(page).getByRole('menuitem')).toHaveText(['Player', 'Team leaders'])
  await crumbMenu(page).getByRole('menuitem', { name: 'Player', exact: true }).click()
  await expect(place(page, 'player')).toHaveAttribute('aria-current', 'page')
  await expect(question(page)).toHaveText('LeBron James points')

  // How: the switch, then the breadcrumb's last part.
  await how(page, 'Game by game').click()
  await expect(how(page, 'Game by game')).toHaveAttribute('aria-pressed', 'true')
  await expect(page).toHaveURL(/view=gamelog/)
  await expect(crumbs(page)).toHaveText(['Player', 'LeBron James', 'Game by game'])
  await expect(question(page)).toHaveText('LeBron James points game log')
  await expectReloadSame(page)
  await crumbs(page).nth(2).click()
  await crumbMenu(page).getByRole('menuitem', { name: 'Averages', exact: true }).click()
  await expect(how(page, 'Averages')).toHaveAttribute('aria-pressed', 'true')
  await expect(page).not.toHaveURL(/view=/)

  // Back and forward: the browser's and the header's, page by page.
  // Pages so far: averages > leaders > Lakers > player > game by game > averages.
  await page.goBack()
  await expect(question(page)).toHaveText('LeBron James points game log')
  await history(page, 'Back').click()
  await expect(question(page)).toHaveText('LeBron James points')
  await expect(how(page, 'Averages')).toHaveAttribute('aria-pressed', 'true')
  await history(page, 'Back').click()
  await expect(question(page)).toHaveText('Lakers points leaders')
  await expect(history(page, 'Forward')).toBeEnabled()
  // Still right after a reload in the middle of the history.
  await page.reload()
  await expect(history(page, 'Back')).toBeEnabled()
  await expect(history(page, 'Forward')).toBeEnabled()
  await history(page, 'Forward').click()
  await expect(question(page)).toHaveText('LeBron James points')
  await page.goForward()
  await expect(question(page)).toHaveText('LeBron James points game log')
  await history(page, 'Forward').click()
  await expect(how(page, 'Averages')).toHaveAttribute('aria-pressed', 'true')
  await expect(history(page, 'Forward')).toBeDisabled()

  // A filter changes the page it is on: Back does not step through chips.
  await page.getByRole('group', { name: 'Result', exact: true }).getByRole('button', { name: 'Wins', exact: true }).click()
  await page.getByRole('group', { name: 'Court', exact: true }).getByRole('button', { name: 'Home', exact: true }).click()
  await expect(question(page)).toHaveText('LeBron James points at home in wins')
  await history(page, 'Back').click()
  await expect(question(page)).toHaveText('LeBron James points game log')
  expect(errors).toEqual([])
})

test('the player part lists recent players; an empty one puts the cursor in the box', async ({ page }) => {
  await page.goto('/')
  await crumbs(page).nth(1).click()
  await expect(crumbMenu(page)).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Player', exact: true })).toBeFocused()

  await page.evaluate(() =>
    localStorage.setItem(
      'smb.recent',
      JSON.stringify([
        { question: 'Stephen Curry points', query: { mode: 'player', view: 'averages', player: 'Stephen Curry', stat: 'points' } },
        { question: 'Nikola Jokic stats', query: { mode: 'player', view: 'averages', player: 'Nikola Jokic' } },
      ]),
    ),
  )
  await page.goto('/?player=LeBron+James&result=in+wins')
  await crumbs(page).nth(1).click()
  await expect(crumbMenu(page).getByRole('menuitem')).toHaveText(['LeBron James', 'Stephen Curry', 'Nikola Jokic'])
  await crumbMenu(page).getByRole('menuitem', { name: 'Nikola Jokic' }).click()
  // Only the player changes; the filter stays.
  await expect(question(page)).toHaveText('Nikola Jokic stats in wins')
  await expect(page).toHaveURL(/player=Nikola\+Jokic&result=in\+wins/)
})

test('Go anywhere (Ctrl+K): a player, a team, its leaders, a saved search; Escape closes', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/?quarter=in+the+4th+quarter')
  await page.evaluate(() =>
    localStorage.setItem(
      'smb.pinned',
      JSON.stringify([{ question: 'Stephen Curry points career', query: { mode: 'player', view: 'averages', player: 'Stephen Curry', stat: 'points', period: 'career' } }]),
    ),
  )
  await page.reload()
  const input = page.getByTestId('go-input')
  const items = page.getByTestId('go-item')

  // Ctrl+K: the box opens with the cursor in it, listing places and saved searches.
  await page.keyboard.press('Control+k')
  await expect(input).toBeFocused()
  await expect(items).toContainText(['Player', 'Team leaders', 'League leaders (NBA)', 'Averages', 'Game by game', 'Stephen Curry points career'])
  // A player (case ignored), Enter: the filters stay.
  await input.fill('LEBRON')
  await expect(items.first()).toContainText('LeBron James')
  await input.press('Enter')
  await expect(page.getByTestId('go-dialog')).toHaveCount(0)
  await expect(question(page)).toHaveText('LeBron James stats in the 4th quarter')
  await expect(page).toHaveURL(/player=LeBron\+James&quarter=/)

  // The button; a team's leaders by city; arrows and Enter.
  await page.getByTestId('go-anywhere').click()
  await input.fill('boston')
  await expect(items).toContainText(['Celtics', 'Celtics leaders'])
  await input.press('ArrowDown')
  await expect(items.nth(1)).toHaveAttribute('aria-selected', 'true')
  await input.press('Enter')
  await expect(question(page)).toHaveText('Celtics points leaders in the 4th quarter')
  await expect(place(page, 'leaders')).toHaveAttribute('aria-current', 'page')

  // A click on a hit; a team in the Player place.
  await page.keyboard.press('Control+k')
  await input.fill('lakers')
  await items.first().click()
  // Coming from leaders, the stat stays on points.
  await expect(question(page)).toHaveText('Lakers points in the 4th quarter')

  // A saved search opens whole.
  await page.keyboard.press('Control+k')
  await input.fill('curry career')
  await input.press('Enter')
  await expect(question(page)).toHaveText('Stephen Curry points career')

  // A place.
  await page.keyboard.press('Control+k')
  await input.fill('league')
  await input.press('Enter')
  await expect(question(page)).toHaveText('NBA points leaders career')

  // Nothing found says so; Escape and a click outside close it.
  await page.keyboard.press('Control+k')
  await input.fill('zzzz')
  await expect(page.getByTestId('go-list')).toHaveText('Nothing matches "zzzz"')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('go-dialog')).toHaveCount(0)
  await page.getByTestId('go-anywhere').click()
  await page.mouse.click(5, 400)
  await expect(page.getByTestId('go-dialog')).toHaveCount(0)

  // Each jump was a page: Back goes through them.
  await history(page, 'Back').click()
  await expect(question(page)).toHaveText('Stephen Curry points career')
  expect(errors).toEqual([])
})

test('a click updates the screen in under 100 ms on the busiest page', async ({ page }) => {
  await page.goto(BUSIEST)
  await page.evaluate(() => document.fonts.ready)
  /** ms from a click to the frame after the screen shows `done`. */
  const timed = (click: string, done: string) =>
    page.evaluate(
      async ({ click, done }) => {
        const t0 = performance.now()
        document.querySelector<HTMLElement>(click)!.click()
        while (!document.querySelector(done)) await new Promise((r) => requestAnimationFrame(r))
        await new Promise((r) => requestAnimationFrame(r))
        return performance.now() - t0
      },
      { click, done },
    )
  const toLeaders = await timed('[data-testid="where-leaders"]', '[data-testid="where-leaders"][aria-current="page"]')
  const toPlayer = await timed('[data-testid="where-player"]', '[data-testid="where-player"][aria-current="page"]')
  const gameLog = await timed('[aria-label="How"] button:nth-child(2)', '[aria-label="How"] button:nth-child(2)[aria-pressed="true"]')
  const chip = await timed('[aria-label="Period"] button:nth-child(2)', '[aria-label="Period"] button:nth-child(2)[aria-pressed="true"]')
  const crumb = await timed('[data-testid="crumb"]:last-child [data-testid="crumb-btn"]', '[data-testid="crumb-menu"]')
  const jump = await timed('[data-testid="crumb-menu"] [role="menuitem"]:first-child', '[aria-label="How"] button:first-child[aria-pressed="true"]')
  console.log(
    `SM-6 timings (ms): to Team leaders ${toLeaders.toFixed(0)}, to Player ${toPlayer.toFixed(0)}, How ${gameLog.toFixed(0)}, chip ${chip.toFixed(0)}, breadcrumb list ${crumb.toFixed(0)}, jump ${jump.toFixed(0)}`,
  )
  for (const ms of [toLeaders, toPlayer, gameLog, chip, crumb, jump]) expect(ms).toBeLessThan(100)
})

test('no layout shift on load or after navigating', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as { __cls?: number }
    w.__cls = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) w.__cls! += entry.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
  const cls = () => page.evaluate(() => (window as { __cls?: number }).__cls ?? 0)
  const out: string[] = []
  for (const [name, url] of MAIN) {
    await page.goto(url)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(400)
    out.push(`${name} ${(await cls()).toFixed(3)}`)
    expect(await cls(), `load: ${name}`).toBeLessThan(0.02)
  }
  console.log(`SM-6 layout shift on load: ${out.join(' · ')}`)

  // After clicks: the header, and where the page starts under it, never move.
  await page.goto('/?player=LeBron+James')
  const top = async (box: Promise<{ x: number; y: number } | null>) => { const b = (await box)!; return [b.x, b.y] }
  const boxes = async () => [await header(page).boundingBox(), await top(page.getByRole('region', { name: 'Your question' }).boundingBox()), await place(page, 'leaders').boundingBox()]
  const before = await boxes()
  await place(page, 'leaders').click()
  await page.waitForTimeout(200)
  const leaders = await boxes()
  expect(leaders[0]).toEqual(before[0])
  expect(leaders[1]).toEqual(before[1])
  // The bold current tab is no wider than the plain one: its neighbour stays put.
  expect(leaders[2]).toEqual(before[2])
  await place(page, 'player').click()
  await how(page, 'Game by game').click()
  await page.waitForTimeout(200)
  expect(await boxes()).toEqual(before)
})

test('build report: a screenshot of each main page (desktop)', async ({ page }) => {
  test.skip(!!process.env.BASE_URL, 'screenshots are for the local build report')
  const dir = 'test-output/sm6'
  mkdirSync(dir, { recursive: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  for (const [name, url] of MAIN) {
    await page.goto(url)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: `${dir}/desktop-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png` })
  }
})
