import { expect, test, type Page } from './test.js'

// "Default selections": the gear button, its popover, and what a reload and
// Clear all do with the saved defaults. Each test gets a fresh browser
// context, so localStorage starts empty and is thrown away afterwards.

const KEY = 'smb.defaults'

const question = (page: Page) => page.getByTestId('question')
const group = (page: Page, name: string) => page.getByRole('group', { name, exact: true })
/** A place tab in the header (Player, Team leaders). */
const place = (page: Page, name: string) => page.getByTestId('where-tabs').getByRole('button', { name, exact: true })
const chip = (page: Page, groupName: string, name: string) => group(page, groupName).getByRole('button', { name, exact: true })
const playerBox = (page: Page) => page.getByRole('combobox', { name: 'Player', exact: true })
const lastN = (page: Page) => page.getByRole('spinbutton', { name: 'Last N games' })
const gear = (page: Page) => page.getByRole('button', { name: 'Default selections' })
const menu = (page: Page) => page.getByTestId('defaults-menu')
const saveButton = (page: Page) => menu(page).getByRole('button').first()
const resetButton = (page: Page) => menu(page).getByRole('button').last()
const stored = (page: Page) => page.evaluate((key) => localStorage.getItem(key), KEY)

const pressed = (page: Page, groupName: string, name: string) =>
  expect(chip(page, groupName, name), `${groupName}: ${name}`).toHaveAttribute('aria-pressed', 'true')

/** The factory defaults: Player, Averages, All stats, every filter on "Any". */
async function expectFactory(page: Page) {
  await expect(place(page, 'Player')).toHaveAttribute('aria-current', 'page')
  await pressed(page, 'How', 'Averages')
  await pressed(page, 'Stat', 'All stats')
  await pressed(page, 'Quarter', 'Full game')
  for (const name of ['Court', 'Result', 'Period']) await pressed(page, name, 'Any')
  await expect(lastN(page)).toHaveValue('')
}

/** The four boxes that are never saved. */
async function expectBoxesEmpty(page: Page) {
  await expect(playerBox(page)).toHaveValue('')
  for (const name of ['Opponent', 'Vs player', 'Without']) {
    await expect(page.getByRole('combobox', { name })).toHaveValue('')
  }
}

/** Picks a chip on every row and fills every box. */
async function chooseEverything(page: Page) {
  await playerBox(page).fill('LeBron James')
  await chip(page, 'Stat', 'Points').click()
  await chip(page, 'Quarter', 'Q4').click()
  await chip(page, 'Court', 'Home').click()
  await chip(page, 'Result', 'Wins').click()
  await chip(page, 'Period', 'Last 10').click()
  await page.getByRole('combobox', { name: 'Opponent' }).fill('heat')
  await page.getByRole('combobox', { name: 'Opponent' }).press('Enter')
  await page.getByRole('combobox', { name: 'Vs player' }).fill('Kevin Durant')
  await page.getByRole('combobox', { name: 'Without' }).fill('Luka Doncic')
}

async function expectChosenChips(page: Page) {
  await pressed(page, 'Stat', 'Points')
  await pressed(page, 'Quarter', 'Q4')
  await pressed(page, 'Court', 'Home')
  await pressed(page, 'Result', 'Wins')
  await pressed(page, 'Period', 'Last 10')
}

async function saveAsDefault(page: Page) {
  await gear(page).click()
  await saveButton(page).click()
  await expect(saveButton(page)).toHaveText('Saved')
  await page.keyboard.press('Escape')
}

/** Collects anything the page throws or logs as an error. */
function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('no saved defaults: the factory defaults on load', async ({ page }) => {
  expect(await stored(page)).toBeNull()
  await expectFactory(page)
  await expectBoxesEmpty(page)
  await expect(question(page)).toHaveText('Pick a player stats')
})

test('save, reload: the saved chips are pressed and the boxes are empty', { tag: '@live' }, async ({ page }) => {
  await chooseEverything(page)
  await gear(page).click()
  await expect(saveButton(page)).toHaveText('Set current selection as default')
  await saveButton(page).click()
  // The button confirms for a moment, then goes back.
  await expect(saveButton(page)).toHaveText('Saved')
  await expect(saveButton(page)).toHaveText('Set current selection as default', { timeout: 4000 })

  // One key, with a version number, and only the button rows in it.
  expect(JSON.parse((await stored(page))!)).toEqual({
    version: 1,
    mode: 'player',
    view: 'averages',
    stat: 'points',
    quarter: 'in the 4th quarter',
    court: 'at home',
    rest: '',
    result: 'in wins',
    period: 'last 10 games',
    lastN: '',
  })

  await page.goto('/')
  await expect(place(page, 'Player')).toHaveAttribute('aria-current', 'page')
  await pressed(page, 'How', 'Averages')
  await expectChosenChips(page)
  await expectBoxesEmpty(page)
  await expect(question(page)).toHaveText('Pick a player points in the 4th quarter at home in wins last 10 games')
})

test('mode and view are saved too', async ({ page }) => {
  await chip(page, 'How', 'Game by game').click()
  await chip(page, 'Result', 'Losses').click()
  await saveAsDefault(page)
  await page.goto('/')
  await pressed(page, 'How', 'Game by game')
  await expect(question(page)).toHaveText('Pick a player game log in losses')

  await place(page, 'Team leaders').click()
  await chip(page, 'Stat', 'Assists').click()
  await page.getByRole('combobox', { name: 'Team', exact: true }).fill('lakers')
  await page.getByRole('combobox', { name: 'Team', exact: true }).press('Enter')
  await saveAsDefault(page)
  await page.goto('/')
  await expect(place(page, 'Team leaders')).toHaveAttribute('aria-current', 'page')
  await pressed(page, 'Stat', 'Assists')
  // The team is a box: never saved.
  await expect(page.getByRole('combobox', { name: 'Team', exact: true })).toHaveValue('')
  await expect(question(page)).toHaveText('Pick a team assists leaders in losses')
})

test('reset: the key is removed and the factory defaults show at once', async ({ page }) => {
  await chooseEverything(page)
  await chip(page, 'How', 'Game by game').click()
  await saveAsDefault(page)
  expect(await stored(page)).not.toBeNull()

  await gear(page).click()
  await expect(resetButton(page)).toHaveText('Reset to factory defaults')
  await resetButton(page).click()
  await expect(resetButton(page)).toHaveText('Reset done')
  expect(await stored(page)).toBeNull()
  // The button rows go back without a reload; the boxes are left alone.
  await expectFactory(page)
  await expect(playerBox(page)).toHaveValue('LeBron James')
  await expect(page.getByRole('combobox', { name: 'Opponent' })).toHaveValue('Heat')
  await expect(resetButton(page)).toHaveText('Reset to factory defaults', { timeout: 4000 })

  await page.goto('/')
  await expectFactory(page)
  await expectBoxesEmpty(page)
})

test('Clear all goes back to the saved defaults and empties the boxes', async ({ page }) => {
  await chooseEverything(page)
  await saveAsDefault(page)

  // Move every row somewhere else.
  await chip(page, 'Stat', 'Rebounds').click()
  await chip(page, 'Quarter', 'Q1').click()
  await chip(page, 'Court', 'Away').click()
  await chip(page, 'Result', 'Losses').click()
  await lastN(page).fill('3')
  await expect(question(page)).toHaveText(
    'LeBron James rebounds in the 1st quarter on the road vs Heat vs Kevin Durant without Luka Doncic in losses last 3 games',
  )

  await page.getByRole('button', { name: 'Clear all' }).click()
  await expectChosenChips(page)
  await expect(lastN(page)).toHaveValue('')
  await expectBoxesEmpty(page)
  await expect(playerBox(page)).toBeFocused()

  // Without saved defaults it falls back to the factory ones.
  await gear(page).click()
  await resetButton(page).click()
  await page.keyboard.press('Escape')
  await chip(page, 'Court', 'Away').click()
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expectFactory(page)
})

test('the per-row ✕ still goes to "Any", not to the saved default', async ({ page }) => {
  await chip(page, 'Result', 'Wins').click()
  await saveAsDefault(page)
  await page.goto('/')
  await pressed(page, 'Result', 'Wins')
  await page.getByRole('button', { name: 'Reset Result', exact: true }).click()
  await pressed(page, 'Result', 'Any')
})

test('corrupt JSON: factory defaults, no errors', async ({ page }) => {
  const errors = watchErrors(page)
  await page.evaluate((key) => localStorage.setItem(key, '{"version":1,"stat":"poi'), KEY)
  await page.goto('/')
  await expectFactory(page)
  await expectBoxesEmpty(page)
  // Still works: a new default can be saved over the bad one.
  await chip(page, 'Result', 'Wins').click()
  await saveAsDefault(page)
  await page.goto('/')
  await pressed(page, 'Result', 'Wins')
  expect(errors).toEqual([])
})

test('an invalid saved value falls back for that row only, no errors', async ({ page }) => {
  const errors = watchErrors(page)
  const saved = {
    version: 1,
    mode: 'coach',
    view: 'averages',
    stat: 'points rebounds assists',
    quarter: 'in the 4th quarter',
    court: 42,
    result: 'in wins',
    period: 'last 10 games',
    lastN: '999',
    player: 'LeBron James',
    opponent: 'Heat',
  }
  await page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [KEY, JSON.stringify(saved)])
  await page.goto('/')
  // Bad rows: factory. Good rows: as saved.
  await expect(place(page, 'Player')).toHaveAttribute('aria-current', 'page')
  await pressed(page, 'Stat', 'All stats')
  await pressed(page, 'Court', 'Any')
  await pressed(page, 'Quarter', 'Q4')
  await pressed(page, 'Result', 'Wins')
  await pressed(page, 'Period', 'Last 10')
  await expect(lastN(page)).toHaveValue('')
  // Boxes are never read from the saved defaults.
  await expectBoxesEmpty(page)
  expect(errors).toEqual([])
})

test('the back-to-back preset can be a default', async ({ page }) => {
  await chip(page, 'Back-to-back', '2nd night').click()
  await saveAsDefault(page)
  expect(JSON.parse((await stored(page))!).rest).toBe('on the second night of a back to back')
  await page.goto('/')
  await pressed(page, 'Back-to-back', '2nd night')
  await expect(question(page)).toHaveText('Pick a player stats on the second night of a back to back')
})

test('a custom "last N games" round-trips', async ({ page }) => {
  await chip(page, 'Period', 'Career').click()
  await lastN(page).fill('7')
  await saveAsDefault(page)
  expect(JSON.parse((await stored(page))!)).toMatchObject({ period: '', lastN: '7' })

  await page.goto('/')
  await expect(lastN(page)).toHaveValue('7')
  // "last N" wins, so no period chip is pressed.
  await expect(group(page, 'Period').locator('[aria-pressed="true"]')).toHaveCount(0)
  await playerBox(page).fill('LeBron James')
  await expect(question(page)).toHaveText('LeBron James stats last 7 games')

  // Clear all brings it back too.
  await chip(page, 'Period', 'Last 5').click()
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(lastN(page)).toHaveValue('7')
})

test('saved defaults leave Recent and Pinned alone', async ({ page }) => {
  const entry = (player: string) => ({
    question: `${player} stats`,
    query: { mode: 'player', view: 'averages', player, stat: 'stats' },
  })
  await page.evaluate(
    ([recentList, pinnedList]) => {
      localStorage.setItem('smb.recent', JSON.stringify(recentList))
      localStorage.setItem('smb.pinned', JSON.stringify(pinnedList))
    },
    [[entry('LeBron James')], [entry('Stephen Curry')]],
  )
  await page.goto('/')
  const before = await page.evaluate(() => [localStorage.getItem('smb.recent'), localStorage.getItem('smb.pinned')])

  await chip(page, 'Result', 'Wins').click()
  await saveAsDefault(page)
  await gear(page).click()
  await resetButton(page).click()
  expect(await page.evaluate(() => [localStorage.getItem('smb.recent'), localStorage.getItem('smb.pinned')])).toEqual(before)
  await expect(page.getByTestId('recent').getByRole('link')).toHaveText(['LeBron James stats'])
  await expect(page.getByTestId('pinned').getByRole('link')).toHaveText(['Stephen Curry stats'])

  // Edit still loads a saved search exactly, not the defaults.
  await page.keyboard.press('Escape')
  await chip(page, 'Result', 'Wins').click()
  await saveAsDefault(page)
  await page.getByTestId('recent').getByRole('button', { name: 'Edit' }).click()
  await expect(question(page)).toHaveText('LeBron James stats')
})

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 375, height: 812 },
]) {
  test.describe(`the gear and its popover at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport })

    test('top-right of the header, dark, and opening it adds no height', async ({ page }) => {
      await page.evaluate(() => document.fonts.ready)
      const sizes = () =>
        page.evaluate(() => {
          const doc = document.documentElement
          const main = document.querySelector('main')!
          const layout = main.parentElement!
          return {
            page: [doc.scrollHeight - window.innerHeight, doc.scrollWidth - window.innerWidth, window.scrollY],
            form: document.querySelector('form')!.getBoundingClientRect().height,
            main: [main.scrollHeight, main.scrollWidth - main.clientWidth],
            layout: [layout.scrollHeight, layout.scrollWidth - layout.clientWidth],
          }
        })
      const closed = await sizes()
      expect(closed.page).toEqual([0, 0, 0])

      // The gear is in the header, at its right edge.
      const gearBox = (await gear(page).boundingBox())!
      const gutter = viewport.width < 640 ? 16 : 24
      expect(Math.abs(viewport.width - gutter - (gearBox.x + gearBox.width))).toBeLessThanOrEqual(1)
      // Under the header's 6px top padding; centred beside the taller places on a phone.
      expect(gearBox.y).toBe(viewport.width <= 700 ? 10 : 6)
      expect(gearBox.width).toBeGreaterThanOrEqual(44)
      expect(gearBox.height).toBeGreaterThanOrEqual(44)

      await gear(page).click()
      await expect(menu(page)).toBeVisible()
      await expect(gear(page)).toHaveAttribute('aria-expanded', 'true')
      // Nothing grew, nothing scrolls, nothing moved.
      expect(await sizes()).toEqual(closed)
      expect((await gear(page).boundingBox())!).toEqual(gearBox)

      // Anchored under the gear, inside the window, on the dark surface.
      const menuBox = (await menu(page).boundingBox())!
      expect(menuBox.y).toBeGreaterThanOrEqual(gearBox.y + gearBox.height)
      expect(menuBox.y - (gearBox.y + gearBox.height)).toBeLessThanOrEqual(8)
      expect(Math.abs(menuBox.x + menuBox.width - (gearBox.x + gearBox.width))).toBeLessThanOrEqual(1)
      expect(menuBox.x).toBeGreaterThanOrEqual(0)
      expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewport.height)
      expect(await menu(page).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(26, 29, 37)')
      // Both actions are on top: nothing covers them.
      for (const button of [saveButton(page), resetButton(page)]) {
        const onTop = await button.evaluate((el) => {
          const r = el.getBoundingClientRect()
          return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === el
        })
        expect(onTop).toBe(true)
      }

      // The confirmation text does not resize the popover's row.
      await saveButton(page).click()
      await expect(saveButton(page)).toHaveText('Saved')
      expect(await sizes()).toEqual(closed)
    })
  })
}

test('the popover closes on a click outside and on Escape', async ({ page }) => {
  await gear(page).click()
  await expect(menu(page)).toBeVisible()
  // A click inside keeps it open.
  await menu(page).click({ position: { x: 2, y: 2 } })
  await expect(menu(page)).toBeVisible()

  await page.getByText('Your question').click()
  await expect(menu(page)).toHaveCount(0)
  await expect(gear(page)).toHaveAttribute('aria-expanded', 'false')

  await gear(page).click()
  await page.keyboard.press('Escape')
  await expect(menu(page)).toHaveCount(0)
  await expect(gear(page)).toBeFocused()

  // The gear itself toggles it, and no browser dialog ever opens.
  let dialogs = 0
  page.on('dialog', () => dialogs++)
  await gear(page).click()
  await saveButton(page).click()
  await resetButton(page).click()
  await gear(page).click()
  await expect(menu(page)).toHaveCount(0)
  expect(dialogs).toBe(0)
})
