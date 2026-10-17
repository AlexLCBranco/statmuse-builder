import { expect, test, type Page } from '@playwright/test'

const ASK = 'https://www.statmuse.com/nba/ask/'

// Each test gets a fresh browser context, so localStorage (Recent) starts
// empty and is thrown away afterwards. StatMuse itself is stubbed out: the
// tests check which URL the new tab opens, not StatMuse's answer.
test.beforeEach(async ({ context, page }) => {
  await context.route('https://www.statmuse.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>stub</title>' }),
  )
  await page.goto('/')
})

const question = (page: Page) => page.getByTestId('question')
const askLink = (page: Page) => page.getByRole('link', { name: /Ask StatMuse/ })
const recent = (page: Page) => page.getByTestId('recent')
const chip = (page: Page, group: string, name: string) =>
  page.getByRole('group', { name: group }).getByRole('button', { name, exact: true })

test('builds a question from a picked player and chips, then saves it to Recent on Ask', async ({ page }) => {
  await expect(question(page)).toHaveText('LeBron James stats last 10 games')

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(question(page)).toHaveText('Pick a player stats')
  await expect(askLink(page)).toHaveAttribute('aria-disabled', 'true')

  // Autocomplete: type part of the name, arrow down, Enter.
  const player = page.getByRole('combobox', { name: 'Player' })
  await player.fill('deaa')
  await expect(page.getByRole('listbox', { name: 'Players' }).getByRole('option')).toHaveText(["De'Aaron Fox"])
  await player.press('ArrowDown')
  await expect(page.getByRole('listbox', { name: 'Players' }).getByRole('option', { name: "De'Aaron Fox" })).toHaveAttribute('aria-selected', 'true')
  await player.press('Enter')
  await expect(player).toHaveValue("De'Aaron Fox")
  await expect(page.getByRole('listbox', { name: 'Players', includeHidden: true })).toBeHidden()

  await chip(page, 'Stat', 'Points').click()
  await chip(page, 'Quarter', 'Q4').click()
  await chip(page, 'Court', 'Away').click()
  // Type part of a team and press Enter: takes the best match.
  await page.getByRole('combobox', { name: 'Opponent' }).fill('lak')
  await page.getByRole('combobox', { name: 'Opponent' }).press('Enter')
  await chip(page, 'Result', 'Wins').click()
  await chip(page, 'Period', 'Last 5').click()

  const full = "De'Aaron Fox points in the 4th quarter on the road vs Lakers in wins last 5 games"
  const fullUrl = `${ASK}deaaron-fox-points-in-the-4th-quarter-on-the-road-vs-lakers-in-wins-last-5-games`
  await expect(question(page)).toHaveText(full)
  await expect(page.getByTestId('question-url')).toHaveText(fullUrl)
  await expect(askLink(page)).toHaveAttribute('href', fullUrl)

  // "Last N games" overrides the period chip, and un-presses it.
  await page.getByRole('spinbutton', { name: 'Last N games' }).fill('7')
  await expect(question(page)).toHaveText(full.replace('last 5 games', 'last 7 games'))
  await expect(chip(page, 'Period', 'Last 5')).toHaveAttribute('aria-pressed', 'false')
  // Picking a chip again clears the box.
  await chip(page, 'Period', 'Career').click()
  await expect(page.getByRole('spinbutton', { name: 'Last N games' })).toHaveValue('')
  const careerUrl = fullUrl.replace('last-5-games', 'career')
  await expect(askLink(page)).toHaveAttribute('href', careerUrl)

  // Ask opens StatMuse in a new tab and saves the question to Recent.
  await expect(recent(page)).toContainText('Questions you send to StatMuse show up here.')
  const popupPromise = page.waitForEvent('popup')
  await askLink(page).click()
  const popup = await popupPromise
  expect(popup.url()).toBe(careerUrl)
  await popup.close()

  const careerQuestion = full.replace('last 5 games', 'career')
  await expect(recent(page).getByRole('link')).toHaveText([careerQuestion])
  await expect(recent(page).getByRole('link')).toHaveAttribute('href', careerUrl)

  // Recent survives a reload (localStorage)...
  await page.reload()
  await expect(recent(page).getByRole('link')).toHaveText([careerQuestion])
  // ...Edit loads it back into the builder...
  await recent(page).getByRole('button', { name: 'Edit' }).click()
  await expect(question(page)).toHaveText(careerQuestion)
  await expect(chip(page, 'Court', 'Away')).toHaveAttribute('aria-pressed', 'true')
  // ...and ✕ removes it.
  await recent(page).getByRole('button', { name: /Remove/ }).click()
  await expect(recent(page)).toContainText('Questions you send to StatMuse show up here.')
})

test('accepts a name that is not in the list, and Enter sends it', async ({ page }) => {
  const player = page.getByRole('combobox', { name: 'Player' })
  await player.fill('Michael Jordan')
  await expect(page.getByRole('listbox', { name: 'Players', includeHidden: true })).toBeHidden()
  await chip(page, 'Period', 'Career').click()
  await expect(question(page)).toHaveText('Michael Jordan stats career')

  await player.focus()
  const popupPromise = page.waitForEvent('popup')
  await player.press('Enter')
  const popup = await popupPromise
  expect(popup.url()).toBe(`${ASK}michael-jordan-stats-career`)
  await expect(recent(page).getByRole('link')).toHaveText(['Michael Jordan stats career'])
})

test('opponent box: a dropdown you can type into to narrow the teams', async ({ page }) => {
  const box = page.getByRole('combobox', { name: 'Opponent' })
  const list = page.getByRole('listbox', { name: 'Teams' })
  const options = list.getByRole('option')

  // Opening it lists every team, with "Any team" first.
  await page.getByRole('button', { name: 'Show all teams' }).click()
  await expect(options).toHaveCount(31)
  await expect(options.first()).toHaveText('Any team')

  // Typing narrows the list, by nickname or city.
  await box.fill('la')
  await expect(options).toHaveText(['Lakers', 'Trail Blazers', 'Clippers'])
  await box.fill('utah')
  await expect(options).toHaveText(['Jazz'])
  await options.first().click()
  await expect(box).toHaveValue('Jazz')
  await expect(question(page)).toHaveText('LeBron James stats vs Jazz last 10 games')

  // The first arrow opens the full list on the current team; the next moves.
  await box.press('ArrowDown')
  await expect(list.getByRole('option', { name: 'Jazz' })).toHaveAttribute('aria-selected', 'true')
  await box.press('ArrowDown')
  await box.press('Enter')
  await expect(box).toHaveValue('Kings')

  // A half-typed or unknown name is dropped on leaving the box.
  await box.fill('zzz')
  await expect(list.getByText('No team matches')).toBeVisible()
  await box.blur()
  await expect(box).toHaveValue('Kings')

  // An exact name typed in counts; an empty box means any team.
  await box.fill('heat')
  await box.blur()
  await expect(box).toHaveValue('Heat')
  await box.fill('')
  await box.blur()
  await expect(box).toHaveValue('')
  await expect(question(page)).toHaveText('LeBron James stats last 10 games')
})

test('copy link puts the exact URL on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy link' }).click()
  await expect(page.getByRole('status')).toHaveText('Link copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${ASK}lebron-james-stats-last-10-games`)
})

test('fits a 375px phone screen without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole('combobox', { name: 'Player' }).fill('Shai Gilgeous-Alexander')
  await page.getByRole('combobox', { name: 'Opponent' }).click()
  await page.getByRole('listbox', { name: 'Teams' }).getByRole('option', { name: 'Trail Blazers' }).click()
  await chip(page, 'Quarter', '2nd half').click()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test.describe('theme', () => {
  const background = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const DARK_BG = 'rgb(18, 20, 26)'
  const LIGHT_BG = 'rgb(243, 241, 236)'

  test('is dark by default, even when the system prefers light', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    expect(await background(page)).toBe(DARK_BG)
  })

  test('switches to light only with data-theme="light"', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))
    expect(await background(page)).toBe(LIGHT_BG)
  })
})

test('suggests 2026-27 rookies from the synced roster list', async ({ page }) => {
  await expect(page.getByText('Suggestions cover the 2026-27 rosters')).toBeVisible()
  await page.getByRole('combobox', { name: 'Player' }).fill('cooper fl')
  await expect(page.getByRole('listbox', { name: 'Players' }).getByRole('option')).toHaveText(['Cooper Flagg'])
})
