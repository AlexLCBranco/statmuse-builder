import { mkdirSync } from 'node:fs'

import { expect, test, type Page } from './test.js'

/**
 * The header and the address bar. The pinned one-line header on every main
 * page (the places and the gear; no breadcrumb, no "Go anywhere" search and
 * no back / forward arrows: removed in v0.22.0 and v0.23.0); every place and How option
 * navigating, with the address round-tripping; speed; no layout shift;
 * no <select>; named icon buttons; and a screenshot of each main page for
 * the build report. The 390px checks are in phone.spec.ts.
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

const HEADER_H = 51

const question = (page: Page) => page.getByTestId('question')
const header = (page: Page) => page.getByTestId('top-bar')
const place = (page: Page, mode: 'player' | 'leaders') => page.getByTestId(`where-${mode}`)
const how = (page: Page, name: string) => page.getByRole('group', { name: 'How', exact: true }).getByRole('button', { name, exact: true })

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
      // One line: no breadcrumb, no "Go anywhere" search (Ctrl+K opens nothing).
      await expect(page.getByTestId('breadcrumb'), name).toHaveCount(0)
      await expect(page.getByTestId('go-anywhere'), name).toHaveCount(0)
      await page.keyboard.press('Control+k')
      await expect(page.getByRole('dialog'), name).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Default selections' }), name).toBeVisible()
      // No back / forward arrows: the browser's own do that.
      await expect(page.getByTestId('page-history'), name).toHaveCount(0)
      await expect(header(page).getByRole('button'), name).toHaveCount(3)
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

test('every place and How option navigates; reload, back and forward work', { tag: '@live' }, async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/?player=LeBron+James&stat=points')
  await expect(page).toHaveTitle('LeBron James points — StatMuse Builder')

  // The places.
  await place(page, 'leaders').click()
  await expect(place(page, 'leaders')).toHaveAttribute('aria-current', 'page')
  await expect(place(page, 'player')).not.toHaveAttribute('aria-current', 'page')
  await expect(page).toHaveURL(/mode=leaders/)
  await expect(page).toHaveTitle('Team leaders — StatMuse Builder')
  await expectReloadSame(page)

  // Picking a team stays on the same page.
  await page.getByRole('button', { name: 'Show the team list' }).click()
  await page.getByRole('listbox', { name: 'Leader teams' }).getByRole('option', { name: 'Lakers', exact: true }).click()
  await expect(page).toHaveURL(/mode=leaders.*team=Lakers/)
  await expect(question(page)).toHaveText('Lakers points leaders')
  await expectReloadSame(page)

  // Back to the other place: the player is still there.
  await place(page, 'player').click()
  await expect(place(page, 'player')).toHaveAttribute('aria-current', 'page')
  await expect(question(page)).toHaveText('LeBron James points')

  // How: the switch, both ways.
  await how(page, 'Game by game').click()
  await expect(how(page, 'Game by game')).toHaveAttribute('aria-pressed', 'true')
  await expect(page).toHaveURL(/view=gamelog/)
  await expect(question(page)).toHaveText('LeBron James points game log')
  await expectReloadSame(page)
  await how(page, 'Averages').click()
  await expect(how(page, 'Averages')).toHaveAttribute('aria-pressed', 'true')
  await expect(page).not.toHaveURL(/view=/)

  // The browser's back and forward, page by page.
  // Pages so far: averages > leaders > Lakers > player > game by game > averages.
  await page.goBack()
  await expect(question(page)).toHaveText('LeBron James points game log')
  await page.goBack()
  await expect(question(page)).toHaveText('LeBron James points')
  await expect(how(page, 'Averages')).toHaveAttribute('aria-pressed', 'true')
  await page.goBack()
  await expect(question(page)).toHaveText('Lakers points leaders')
  // Still right after a reload in the middle of the history.
  await page.reload()
  await expect(question(page)).toHaveText('Lakers points leaders')
  await page.goForward()
  await expect(question(page)).toHaveText('LeBron James points')
  await page.goForward()
  await expect(question(page)).toHaveText('LeBron James points game log')
  await page.goForward()
  await expect(how(page, 'Averages')).toHaveAttribute('aria-pressed', 'true')

  // A filter changes the page it is on: Back does not step through chips.
  await page.getByRole('group', { name: 'Result', exact: true }).getByRole('button', { name: 'Wins', exact: true }).click()
  await page.getByRole('group', { name: 'Court', exact: true }).getByRole('button', { name: 'Home', exact: true }).click()
  await expect(question(page)).toHaveText('LeBron James points at home in wins')
  await page.goBack()
  await expect(question(page)).toHaveText('LeBron James points game log')
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
  console.log(
    `SM-6 timings (ms): to Team leaders ${toLeaders.toFixed(0)}, to Player ${toPlayer.toFixed(0)}, How ${gameLog.toFixed(0)}, chip ${chip.toFixed(0)}`,
  )
  for (const ms of [toLeaders, toPlayer, gameLog, chip]) expect(ms).toBeLessThan(100)
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
