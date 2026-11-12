import { readFileSync } from 'node:fs'

import { expect, test, type Locator, type Page } from '@playwright/test'

const ASK = 'https://www.statmuse.com/nba/ask/'

// Each test gets a fresh browser context, so localStorage (Recent, Pinned)
// starts empty and is thrown away afterwards. StatMuse itself is stubbed out:
// the tests check which URL the new tab opens, not StatMuse's answer.
test.beforeEach(async ({ context, page }) => {
  await context.route('https://www.statmuse.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>stub</title>' }),
  )
  await page.goto('/')
})

const question = (page: Page) => page.getByTestId('question')
const askLink = (page: Page) => page.getByRole('link', { name: /Ask StatMuse/ })
const recent = (page: Page) => page.getByTestId('recent')
const pinned = (page: Page) => page.getByTestId('pinned')
const group = (page: Page, name: string) => page.getByRole('group', { name, exact: true })
const chip = (page: Page, groupName: string, name: string) => group(page, groupName).getByRole('button', { name, exact: true })
const playerBox = (page: Page) => page.getByRole('combobox', { name: 'Player', exact: true })
const teamBox = (page: Page) => page.getByRole('combobox', { name: 'Team', exact: true })
const playerList = (page: Page) => page.getByRole('listbox', { name: 'Players', exact: true })
const teamList = (page: Page) => page.getByRole('listbox', { name: 'Leader teams' })
const resetButton = (page: Page, row: string) => page.getByRole('button', { name: `Reset ${row}`, exact: true })

/** Presses Ask and closes the (stubbed) StatMuse tab; returns the URL it opened. */
async function ask(page: Page): Promise<string> {
  const popupPromise = page.waitForEvent('popup')
  await askLink(page).click()
  const popup = await popupPromise
  const url = popup.url()
  await popup.close()
  return url
}

interface SeedEntry {
  question: string
  query: Record<string, string>
}

/** Puts searches straight into Recent, the way the app saves them, then reloads. */
async function seedRecent(page: Page, entries: SeedEntry[]) {
  await page.evaluate((list) => localStorage.setItem('smb.recent', JSON.stringify(list)), entries)
  await page.reload()
}

const SEEDED: SeedEntry[] = [
  {
    question: 'Stephen Curry three pointers made at home in wins last 5 games',
    query: { mode: 'player', view: 'averages', player: 'Stephen Curry', stat: 'three pointers made', court: 'at home', result: 'in wins', period: 'last 5 games' },
  },
  {
    question: 'Lakers assists leaders this season',
    query: { mode: 'leaders', view: 'averages', team: 'Lakers', stat: 'assists', period: 'this season' },
  },
  {
    question: 'Stephen Curry points career',
    query: { mode: 'player', view: 'averages', player: 'Stephen Curry', stat: 'points', period: 'career' },
  },
  {
    question: 'Nikola Jokic game log last 5 games',
    query: { mode: 'player', view: 'gamelog', player: 'Nikola Jokic', period: 'last 5 games' },
  },
]

test('starts empty: no player, All stats, every filter on Any', async ({ page }) => {
  await expect(playerBox(page)).toHaveValue('')
  await expect(question(page)).toHaveText('Pick a player stats')
  await expect(askLink(page)).toHaveAttribute('aria-disabled', 'true')
  await expect(chip(page, 'Mode', 'Player')).toHaveAttribute('aria-pressed', 'true')
  await expect(chip(page, 'View', 'Averages')).toHaveAttribute('aria-pressed', 'true')
  await expect(chip(page, 'Stat', 'All stats')).toHaveAttribute('aria-pressed', 'true')
  await expect(chip(page, 'Quarter', 'Full game')).toHaveAttribute('aria-pressed', 'true')
  for (const name of ['Court', 'Result', 'Period']) {
    await expect(chip(page, name, 'Any')).toHaveAttribute('aria-pressed', 'true')
  }
  // Nothing to reset yet.
  await expect(page.getByRole('button', { name: /^Reset / })).toHaveCount(0)
})

test('builds a question from a picked player and chips, then saves it to Recent on Ask', async ({ page }) => {
  // Autocomplete: type part of the name, arrow down, Enter.
  const player = playerBox(page)
  await player.fill('deaa')
  await expect(playerList(page).getByRole('option')).toHaveText(["De'Aaron Fox"])
  await player.press('ArrowDown')
  await expect(playerList(page).getByRole('option', { name: "De'Aaron Fox" })).toHaveAttribute('aria-selected', 'true')
  await player.press('Enter')
  await expect(player).toHaveValue("De'Aaron Fox")
  await expect(page.getByRole('listbox', { name: 'Players', exact: true, includeHidden: true })).toBeHidden()

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
  expect(await ask(page)).toBe(careerUrl)

  const careerQuestion = full.replace('last 5 games', 'career')
  await expect(recent(page).getByRole('link')).toHaveText([careerQuestion])
  await expect(recent(page).getByRole('link')).toHaveAttribute('href', careerUrl)

  // Recent survives a reload (localStorage)...
  await page.reload()
  await expect(recent(page).getByRole('link')).toHaveText([careerQuestion])
  await expect(question(page)).toHaveText('Pick a player stats')
  // ...Edit loads it back into the builder...
  await recent(page).getByRole('button', { name: 'Edit' }).click()
  await expect(question(page)).toHaveText(careerQuestion)
  await expect(chip(page, 'Court', 'Away')).toHaveAttribute('aria-pressed', 'true')
  // ...and ✕ removes it.
  await recent(page).getByRole('button', { name: /Remove/ }).click()
  await expect(recent(page)).toContainText('Questions you send to StatMuse show up here.')
})

test('the new stat chips: steals, blocks, turnovers, minutes', async ({ page }) => {
  await playerBox(page).fill('LeBron James')
  for (const [label, words] of [['Steals', 'steals'], ['Blocks', 'blocks'], ['Turnovers', 'turnovers'], ['Minutes', 'minutes']] as const) {
    await chip(page, 'Stat', label).click()
    await expect(question(page)).toHaveText(`LeBron James ${words}`)
    await expect(askLink(page)).toHaveAttribute('href', `${ASK}lebron-james-${words}`)
  }
  await expect(chip(page, 'Stat', 'PRA')).toHaveCount(0)
})

test('accepts a name that is not in the list, and Enter sends it', async ({ page }) => {
  const player = playerBox(page)
  await player.fill('Michael Jordan')
  await expect(page.getByRole('listbox', { name: 'Players', exact: true, includeHidden: true })).toBeHidden()
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
  await playerBox(page).fill('LeBron James')
  const box = page.getByRole('combobox', { name: 'Opponent' })
  const list = page.getByRole('listbox', { name: 'Teams', exact: true })
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
  await expect(question(page)).toHaveText('LeBron James stats vs Jazz')

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
  await expect(question(page)).toHaveText('LeBron James stats')
})

test('vs player box: picks an opponent player for a matchup question', async ({ page }) => {
  await playerBox(page).fill('Cooper Flagg')
  await chip(page, 'Stat', 'Points').click()
  await chip(page, 'Period', 'Career').click()

  const vs = page.getByRole('combobox', { name: 'Vs player' })
  await vs.fill('knue')
  await expect(page.getByRole('listbox', { name: 'Opponent players' }).getByRole('option')).toHaveText(['Kon Knueppel'])
  await vs.press('Enter')
  await expect(vs).toHaveValue('Kon Knueppel')
  await expect(question(page)).toHaveText('Cooper Flagg points vs Kon Knueppel career')
  await expect(askLink(page)).toHaveAttribute('href', `${ASK}cooper-flagg-points-vs-kon-knueppel-career`)

  // With a team too, both "vs" parts are kept, team first.
  await page.getByRole('combobox', { name: 'Opponent' }).fill('hornets')
  await page.getByRole('combobox', { name: 'Opponent' }).press('Enter')
  await expect(question(page)).toHaveText('Cooper Flagg points vs Hornets vs Kon Knueppel career')

  // Saved and restored through Recent like every other filter.
  await ask(page)
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(vs).toHaveValue('')
  await recent(page).getByRole('button', { name: 'Edit' }).click()
  await expect(vs).toHaveValue('Kon Knueppel')
})

test('without box: a teammate who sat out', async ({ page }) => {
  await playerBox(page).fill('Draymond Green')
  await chip(page, 'Period', 'Career').click()

  const without = page.getByRole('combobox', { name: 'Without' })
  await without.fill('stephen cu')
  await expect(page.getByRole('listbox', { name: 'Teammates' }).getByRole('option')).toHaveText(['Stephen Curry'])
  await without.press('Enter')
  await expect(without).toHaveValue('Stephen Curry')
  await expect(question(page)).toHaveText('Draymond Green stats without Stephen Curry career')
  await expect(askLink(page)).toHaveAttribute('href', `${ASK}draymond-green-stats-without-stephen-curry-career`)
})

test('team leaders mode: builds a leaders question and sends it', async ({ page }) => {
  // Filters set in player mode are kept when switching.
  await playerBox(page).fill('Jayson Tatum')
  await chip(page, 'Quarter', 'Q4').click()
  await chip(page, 'Result', 'Wins').click()
  await chip(page, 'Period', 'Last 10').click()
  await page.getByRole('combobox', { name: 'Vs player' }).fill('LeBron James')
  await expect(question(page)).toHaveText('Jayson Tatum stats in the 4th quarter vs LeBron James in wins last 10 games')

  await chip(page, 'Mode', 'Team leaders').click()
  // "All stats" became points; no team yet, so nothing can be sent.
  await expect(question(page)).toHaveText('Pick a team points leaders in the 4th quarter in wins last 10 games')
  await expect(askLink(page)).toHaveAttribute('aria-disabled', 'true')
  await expect(chip(page, 'Stat', 'Points')).toHaveAttribute('aria-pressed', 'true')

  // What leaders mode does not offer is hidden.
  await expect(chip(page, 'Stat', 'All stats')).toHaveCount(0)
  await expect(chip(page, 'Stat', 'Turnovers')).toHaveCount(0)
  await expect(chip(page, 'Stat', 'Minutes')).toBeVisible()
  await expect(group(page, 'View')).toHaveCount(0)
  await expect(playerBox(page)).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Vs player' })).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Without' })).toHaveCount(0)

  // The team box lists the league first, then the 30 teams.
  const team = teamBox(page)
  await team.click()
  await expect(teamList(page).getByRole('option')).toHaveCount(31)
  await expect(teamList(page).getByRole('option').first()).toHaveText('League (NBA)')
  await team.fill('bost')
  await expect(teamList(page).getByRole('option')).toHaveText(['Celtics'])
  await team.press('Enter')
  await expect(team).toHaveValue('Celtics')

  const full = 'Celtics points leaders in the 4th quarter in wins last 10 games'
  const fullUrl = `${ASK}celtics-points-leaders-in-the-4th-quarter-in-wins-last-10-games`
  await expect(question(page)).toHaveText(full)
  await expect(page.getByTestId('question-url')).toHaveText(fullUrl)
  await expect(askLink(page)).toHaveAttribute('href', fullUrl)

  // Court and Opponent work here too.
  await chip(page, 'Stat', 'Rebounds').click()
  await chip(page, 'Court', 'Home').click()
  await page.getByRole('combobox', { name: 'Opponent' }).fill('warriors')
  await page.getByRole('combobox', { name: 'Opponent' }).press('Enter')
  await resetButton(page, 'Quarter').click()
  await resetButton(page, 'Result').click()
  await chip(page, 'Period', 'Last season').click()
  const leadersQuestion = 'Celtics rebounds leaders at home vs Warriors last season'
  const leadersUrl = `${ASK}celtics-rebounds-leaders-at-home-vs-warriors-last-season`
  await expect(question(page)).toHaveText(leadersQuestion)

  // Ask and Recent work the same; Enter in the team box sends too.
  expect(await ask(page)).toBe(leadersUrl)
  await expect(recent(page).getByRole('link')).toHaveText([leadersQuestion])
  await expect(recent(page).getByRole('link')).toHaveAttribute('href', leadersUrl)

  // Each mode remembers its own player/team, and the hidden filter comes back.
  await chip(page, 'Mode', 'Player').click()
  await expect(playerBox(page)).toHaveValue('Jayson Tatum')
  await expect(page.getByRole('combobox', { name: 'Vs player' })).toHaveValue('LeBron James')
  await expect(question(page)).toHaveText('Jayson Tatum rebounds at home vs Warriors vs LeBron James last season')
  await chip(page, 'Mode', 'Team leaders').click()
  await expect(teamBox(page)).toHaveValue('Celtics')

  // Edit from Recent restores a leaders question, mode included.
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(question(page)).toHaveText('Pick a team points leaders')
  await chip(page, 'Mode', 'Player').click()
  await recent(page).getByRole('button', { name: 'Edit' }).click()
  await expect(chip(page, 'Mode', 'Team leaders')).toHaveAttribute('aria-pressed', 'true')
  await expect(question(page)).toHaveText(leadersQuestion)
})

test('league leaders: "NBA ... leaders", without "last N games"', async ({ page }) => {
  await chip(page, 'Mode', 'Team leaders').click()
  await chip(page, 'Period', 'Last 10').click()
  const team = teamBox(page)
  await team.fill('nba')
  await expect(teamList(page).getByRole('option')).toHaveText(['League (NBA)'])
  await team.press('Enter')
  await expect(team).toHaveValue('League (NBA)')

  // StatMuse misreads "last N games" league-wide, so it is not offered.
  await expect(chip(page, 'Period', 'Last 10')).toHaveCount(0)
  await expect(page.getByRole('spinbutton', { name: 'Last N games' })).toHaveCount(0)
  await expect(question(page)).toHaveText('NBA points leaders')

  await chip(page, 'Stat', 'Assists').click()
  await chip(page, 'Period', 'This season').click()
  await expect(question(page)).toHaveText('NBA assists leaders this season')
  await expect(askLink(page)).toHaveAttribute('href', `${ASK}nba-assists-leaders-this-season`)
})

test('game by game view: the stat becomes "game log"', async ({ page }) => {
  await playerBox(page).fill('LeBron James')
  await chip(page, 'Stat', 'Points').click()
  await chip(page, 'Court', 'Home').click()
  await chip(page, 'Result', 'Wins').click()
  await chip(page, 'Period', 'Last 5').click()

  await chip(page, 'View', 'Game by game').click()
  // No Stat row, and only the filters checked on StatMuse for game logs.
  await expect(group(page, 'Stat')).toHaveCount(0)
  await expect(group(page, 'Court')).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Vs player' })).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Without' })).toHaveCount(0)
  await expect(group(page, 'Period').getByRole('button')).toHaveText(['Any', 'Last 5', 'Last 10', 'Last 20', 'Last season'])

  await expect(question(page)).toHaveText('LeBron James game log in wins last 5 games')
  await expect(askLink(page)).toHaveAttribute('href', `${ASK}lebron-james-game-log-in-wins-last-5-games`)

  await resetButton(page, 'Result').click()
  await chip(page, 'Quarter', 'Q4').click()
  await expect(question(page)).toHaveText('LeBron James game log in the 4th quarter last 5 games')

  expect(await ask(page)).toBe(`${ASK}lebron-james-game-log-in-the-4th-quarter-last-5-games`)
  await expect(recent(page).getByRole('link')).toHaveText(['LeBron James game log in the 4th quarter last 5 games'])

  // Back to averages: the stat and the hidden court filter return.
  await chip(page, 'View', 'Averages').click()
  await expect(question(page)).toHaveText('LeBron James points in the 4th quarter at home last 5 games')

  // The view switch is hidden in leaders mode.
  await chip(page, 'Mode', 'Team leaders').click()
  await expect(group(page, 'View')).toHaveCount(0)
})

test('empty player box: recent players and recent searches', async ({ page }) => {
  await seedRecent(page, SEEDED)
  const player = playerBox(page)
  const players = playerList(page).getByRole('group', { name: 'Recent players' }).getByRole('option')
  const searches = playerList(page).getByRole('group', { name: 'Recent searches' }).getByRole('option')

  // Focused and empty: two groups, built from player-mode searches only.
  await player.click()
  await expect(players).toHaveText(['Stephen Curry', 'Nikola Jokic'])
  await expect(searches).toHaveText([
    'Stephen Curry three pointers made at home in wins last 5 games',
    'Stephen Curry points career',
    'Nikola Jokic game log last 5 games',
  ])

  // Picking a recent player fills only the player; the filters stay.
  await player.press('Escape')
  await chip(page, 'Stat', 'Rebounds').click()
  await chip(page, 'Quarter', 'Q1').click()
  await player.click()
  await players.nth(1).click()
  await expect(player).toHaveValue('Nikola Jokic')
  await expect(question(page)).toHaveText('Nikola Jokic rebounds in the 1st quarter')

  // One letter typed: the normal suggestion list, no groups.
  await player.fill('s')
  await expect(playerList(page).getByTestId('suggestion-group')).toHaveCount(0)
  await expect(playerList(page).getByRole('option')).toHaveCount(8)
  await player.fill('stephen c')
  await expect(playerList(page).getByRole('option').first()).toHaveText('Stephen Curry')

  // Emptying the box brings the groups back; picking a search loads all of it.
  await player.fill('')
  await expect(players).toHaveCount(2)
  await searches.first().click()
  await expect(player).toHaveValue('Stephen Curry')
  await expect(question(page)).toHaveText('Stephen Curry three pointers made at home in wins last 5 games')
  await expect(chip(page, 'Quarter', 'Full game')).toHaveAttribute('aria-pressed', 'true')
  await expect(chip(page, 'Court', 'Home')).toHaveAttribute('aria-pressed', 'true')

  // Arrow keys + Enter work in the recent state too: 2 players, then searches.
  await player.fill('')
  await player.press('ArrowDown')
  await expect(players.first()).toHaveAttribute('aria-selected', 'true')
  await player.press('ArrowDown')
  await player.press('ArrowDown')
  await player.press('ArrowDown')
  await expect(searches.nth(1)).toHaveAttribute('aria-selected', 'true')
  await player.press('Enter')
  await expect(question(page)).toHaveText('Stephen Curry points career')

  // A recent game log search switches the view as well.
  await player.fill('')
  await searches.nth(2).click()
  await expect(chip(page, 'View', 'Game by game')).toHaveAttribute('aria-pressed', 'true')
  await expect(question(page)).toHaveText('Nikola Jokic game log last 5 games')
})

test('empty team box: recent teams and recent leaders searches', async ({ page }) => {
  await seedRecent(page, SEEDED)
  await chip(page, 'Mode', 'Team leaders').click()
  await chip(page, 'Stat', 'Blocks').click()
  const team = teamBox(page)
  const teams = teamList(page).getByRole('group', { name: 'Recent teams' }).getByRole('option')
  const searches = teamList(page).getByRole('group', { name: 'Recent searches' }).getByRole('option')

  await team.click()
  await expect(teams).toHaveText(['Lakers'])
  await expect(searches).toHaveText(['Lakers assists leaders this season'])
  // The full list is still there, under the recents.
  await expect(teamList(page).getByRole('group', { name: 'All teams' }).getByRole('option')).toHaveCount(31)

  // A recent team fills only the team.
  await teams.first().click()
  await expect(team).toHaveValue('Lakers')
  await expect(question(page)).toHaveText('Lakers blocks leaders')

  // Typing narrows the teams as usual; an empty box shows the recents again.
  await team.fill('cel')
  await expect(teamList(page).getByRole('option')).toHaveText(['Celtics'])
  await team.fill('')
  await team.blur()
  await expect(question(page)).toHaveText('Pick a team blocks leaders')
  await team.click()
  // Keyboard: first arrow lands on the recent team, the next on the search.
  await team.press('ArrowDown')
  await expect(teams.first()).toHaveAttribute('aria-selected', 'true')
  await team.press('ArrowDown')
  await team.press('Enter')
  await expect(question(page)).toHaveText('Lakers assists leaders this season')
})

test('Clear all and the per-row ✕', async ({ page }) => {
  await playerBox(page).fill('LeBron James')
  await chip(page, 'View', 'Averages').click()
  await chip(page, 'Stat', 'Points').click()
  await chip(page, 'Quarter', 'Q4').click()
  await chip(page, 'Court', 'Home').click()
  await chip(page, 'Result', 'Losses').click()
  await page.getByRole('combobox', { name: 'Opponent' }).fill('heat')
  await page.getByRole('combobox', { name: 'Opponent' }).press('Enter')
  await chip(page, 'Period', 'Career').click()
  await page.getByRole('spinbutton', { name: 'Last N games' }).fill('7')
  await expect(question(page)).toHaveText('LeBron James points in the 4th quarter at home vs Heat in losses last 7 games')

  // A ✕ only on rows that are off their default.
  for (const row of ['Stat', 'Quarter', 'Court', 'Result', 'Opponent', 'Period']) await expect(resetButton(page, row)).toBeVisible()
  await expect(resetButton(page, 'Vs player')).toHaveCount(0)
  await expect(resetButton(page, 'Without')).toHaveCount(0)

  // Each ✕ resets just its row.
  await resetButton(page, 'Court').click()
  await expect(question(page)).toHaveText('LeBron James points in the 4th quarter vs Heat in losses last 7 games')
  await expect(resetButton(page, 'Court')).toHaveCount(0)
  await resetButton(page, 'Opponent').click()
  await expect(page.getByRole('combobox', { name: 'Opponent' })).toHaveValue('')
  // The Period ✕ also clears "last N".
  await resetButton(page, 'Period').click()
  await expect(page.getByRole('spinbutton', { name: 'Last N games' })).toHaveValue('')
  await expect(chip(page, 'Period', 'Any')).toHaveAttribute('aria-pressed', 'true')
  await resetButton(page, 'Stat').click()
  await expect(question(page)).toHaveText('LeBron James stats in the 4th quarter in losses')

  // Clear all keeps mode and view, resets the rest, and focuses the first box.
  await chip(page, 'View', 'Game by game').click()
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(question(page)).toHaveText('Pick a player game log')
  await expect(chip(page, 'View', 'Game by game')).toHaveAttribute('aria-pressed', 'true')
  await expect(playerBox(page)).toBeFocused()
  await expect(page.getByRole('button', { name: /^Reset / })).toHaveCount(0)

  await chip(page, 'Mode', 'Team leaders').click()
  await teamBox(page).fill('lakers')
  await teamBox(page).press('Enter')
  await chip(page, 'Result', 'Wins').click()
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(chip(page, 'Mode', 'Team leaders')).toHaveAttribute('aria-pressed', 'true')
  await expect(question(page)).toHaveText('Pick a team points leaders')
  await expect(teamBox(page)).toBeFocused()
})

test('pinned favorites: pin survives a reload, unpin returns it to Recent', async ({ page }) => {
  await seedRecent(page, SEEDED)
  const first = SEEDED[0]!.question
  await expect(pinned(page)).toHaveCount(0)

  await recent(page).getByRole('button', { name: `Pin “${first}”` }).click()
  await expect(pinned(page).getByRole('link')).toHaveText([first])
  await expect(recent(page).getByRole('link')).toHaveCount(3)
  await expect(recent(page).getByRole('link', { name: first })).toHaveCount(0)

  // Saved in localStorage.
  await page.reload()
  await expect(pinned(page).getByRole('link')).toHaveText([first])
  await expect(pinned(page).getByRole('link')).toHaveAttribute('href', `${ASK}stephen-curry-three-pointers-made-at-home-in-wins-last-5-games`)

  // Pinned rows do not count toward the 12 recents, and do not expire.
  for (let i = 0; i < 13; i++) {
    await page.getByRole('button', { name: 'Clear all' }).click()
    await playerBox(page).fill(`Player ${i}`)
    await ask(page)
  }
  await expect(recent(page).getByRole('link')).toHaveCount(12)
  await expect(pinned(page).getByRole('link')).toHaveText([first])

  // Edit works from Pinned too.
  await pinned(page).getByRole('button', { name: 'Edit' }).click()
  await expect(question(page)).toHaveText(first)

  // Unstar: back to the top of Recent, and the Pinned group goes away.
  await pinned(page).getByRole('button', { name: `Unpin “${first}”` }).click()
  await expect(pinned(page)).toHaveCount(0)
  await expect(recent(page).getByRole('link').first()).toHaveText(first)
  await page.reload()
  await expect(pinned(page)).toHaveCount(0)
})

test('Ctrl+Enter anywhere presses Ask and saves to Recent', async ({ page }) => {
  // Without a player it does what clicking Ask does: nothing is sent.
  await page.keyboard.press('Control+Enter')
  await expect(playerBox(page)).toBeFocused()
  await expect(recent(page).getByRole('link')).toHaveCount(0)

  await playerBox(page).fill('Victor Wembanyama')
  await chip(page, 'Stat', 'Blocks').click()
  // Focus is on a chip, not in a text box.
  let popupPromise = page.waitForEvent('popup')
  await page.keyboard.press('Control+Enter')
  let popup = await popupPromise
  expect(popup.url()).toBe(`${ASK}victor-wembanyama-blocks`)
  await popup.close()
  await expect(recent(page).getByRole('link')).toHaveText(['Victor Wembanyama blocks'])

  // From inside a text box (Cmd+Enter, as on a Mac): sent once, not twice.
  const popups: Page[] = []
  page.on('popup', (p) => popups.push(p))
  await page.getByRole('combobox', { name: 'Vs player' }).fill('Chet Holmgren')
  popupPromise = page.waitForEvent('popup')
  await page.keyboard.press('Meta+Enter')
  popup = await popupPromise
  expect(popup.url()).toBe(`${ASK}victor-wembanyama-blocks-vs-chet-holmgren`)
  await expect(recent(page).getByRole('link')).toHaveText(['Victor Wembanyama blocks vs Chet Holmgren', 'Victor Wembanyama blocks'])
  expect(popups).toHaveLength(1)
})

test('warns when Vs player and Without are stacked with 4+ filters', async ({ page }) => {
  const warning = page.getByTestId('filter-warning')
  await playerBox(page).fill('Draymond Green')
  await page.getByRole('combobox', { name: 'Vs player' }).fill('LeBron James')
  await page.getByRole('combobox', { name: 'Without' }).fill('Stephen Curry')
  await page.getByRole('combobox', { name: 'Opponent' }).fill('lakers')
  await page.getByRole('combobox', { name: 'Opponent' }).press('Enter')
  // Three filters: no note yet.
  await expect(warning).toHaveCount(0)

  // The known failing case: team + vs player + without + wins.
  await chip(page, 'Result', 'Wins').click()
  await expect(warning).toHaveText('StatMuse may not understand this many filters.')
  // It does not block sending.
  await expect(askLink(page)).toHaveAttribute('aria-disabled', 'false')

  await resetButton(page, 'Without').click()
  await expect(warning).toHaveCount(0)
})

test('copy link puts the exact URL on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await playerBox(page).fill('LeBron James')
  await chip(page, 'Period', 'Last 10').click()
  await page.getByRole('button', { name: 'Copy link' }).click()
  await expect(page.getByRole('status')).toHaveText('Link copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${ASK}lebron-james-stats-last-10-games`)
})

test('Recent entries saved by v0.6 (no mode, team or view) still load', async ({ page }) => {
  await seedRecent(page, [
    {
      question: 'LeBron James stats last 10 games',
      query: { player: 'LeBron James', stat: 'stats', quarter: '', court: '', opponent: '', vsPlayer: '', without: '', period: 'last 10 games', lastN: '', result: '' },
    },
  ])
  await expect(recent(page).getByRole('link')).toHaveText(['LeBron James stats last 10 games'])
  await recent(page).getByRole('button', { name: 'Edit' }).click()
  await expect(question(page)).toHaveText('LeBron James stats last 10 games')
  await expect(chip(page, 'Mode', 'Player')).toHaveAttribute('aria-pressed', 'true')
  await expect(chip(page, 'View', 'Averages')).toHaveAttribute('aria-pressed', 'true')
  await playerBox(page).fill('')
  await expect(playerList(page).getByRole('group', { name: 'Recent players' }).getByRole('option')).toHaveText(['LeBron James'])
})

/** Fills in the busiest state: a long question, the warning, every ✕ showing. */
async function fillEverything(page: Page) {
  await playerBox(page).fill('Shai Gilgeous-Alexander')
  await chip(page, 'Stat', '3PA').click()
  await chip(page, 'Quarter', 'Q4').click()
  await chip(page, 'Court', 'Away').click()
  await chip(page, 'Result', 'Losses').click()
  await page.getByRole('combobox', { name: 'Opponent' }).fill('trail')
  await page.getByRole('combobox', { name: 'Opponent' }).press('Enter')
  await page.getByRole('combobox', { name: 'Vs player' }).fill('Victor Wembanyama')
  await page.getByRole('combobox', { name: 'Without' }).fill('Jalen Williams')
  await chip(page, 'Period', 'Last 20').click()
  await page.getByRole('combobox', { name: 'Without' }).blur()
  await expect(page.getByTestId('filter-warning')).toBeVisible()
}

/**
 * Nothing overlaps, no horizontal scrollbar, and no button text is clipped.
 * "Overlap" is checked between every pair of visible buttons, links and text
 * boxes (the ▾ inside a team box is meant to sit on it, so it is skipped).
 */
async function expectCleanLayout(page: Page) {
  const problems = await page.evaluate(() => {
    const found: string[] = []
    const doc = document.documentElement
    for (const box of [doc, ...document.querySelectorAll('main, aside, aside ul, #root > div > div')]) {
      if (box.scrollWidth > box.clientWidth) found.push(`horizontal scroll in ${box.tagName}: ${box.scrollWidth} > ${box.clientWidth}`)
    }
    const name = (el: Element) => el.getAttribute('aria-label') || el.textContent?.trim() || el.id || el.tagName
    const controls = [...document.querySelectorAll('button, a, input')].filter((el) => {
      const box = el.getBoundingClientRect()
      return box.width > 0 && box.height > 0 && !/^Show /.test(el.getAttribute('aria-label') ?? '')
    })
    for (const el of controls) {
      if (el.tagName !== 'INPUT' && (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight)) {
        found.push(`clipped text: ${name(el)}`)
      }
      const box = el.getBoundingClientRect()
      if (box.left < 0 || box.right > doc.clientWidth) found.push(`outside the window: ${name(el)}`)
    }
    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        const a = controls[i]!.getBoundingClientRect()
        const b = controls[j]!.getBoundingClientRect()
        // More than a pixel in common in both directions.
        const acrossBy = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const downBy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        if (acrossBy > 1 && downBy > 1) found.push(`overlap: ${name(controls[i]!)} / ${name(controls[j]!)}`)
      }
    }
    return found
  })
  expect(problems).toEqual([])
}

/** How many lines the buttons of a chip group take. */
const chipLines = (page: Page, name: string) =>
  group(page, name).evaluate(
    (el) => new Set([...el.querySelectorAll('button')].map((b) => Math.round(b.getBoundingClientRect().top))).size,
  )

/** An element's box and its text size in px. */
async function measure(locator: Locator) {
  const box = (await locator.boundingBox())!
  const fontSize = await locator.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  return { ...box, fontSize }
}

test.describe('layout at 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('uses the full width: builder from the left edge, Recent as a 380px column', async ({ page }) => {
    const builder = (await page.getByRole('region', { name: 'Your question' }).boundingBox())!
    const side = (await page.getByRole('complementary').boundingBox())!
    expect(builder.x).toBe(24)
    expect(side.width).toBe(380)
    expect(side.x + side.width).toBe(1920 - 24)
    // The builder takes all the space up to the Recent column.
    expect(side.x - (builder.x + builder.width)).toBeLessThanOrEqual(32)
  })

  test('every chip group fits on one line, and everything fits the screen', async ({ page }) => {
    await page.evaluate(() => document.fonts.ready)
    await seedRecent(page, SEEDED)
    await fillEverything(page)
    for (const name of ['Mode', 'View', 'Stat', 'Quarter', 'Court', 'Result', 'Period']) {
      expect(await chipLines(page, name), name).toBe(1)
    }
    await expectCleanLayout(page)
    // All filter rows are on screen without scrolling.
    const last = (await page.getByTestId('filter-row').last().boundingBox())!
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    expect(last.y + last.height).toBeLessThanOrEqual(1080)

    await chip(page, 'Mode', 'Team leaders').click()
    for (const name of ['Stat', 'Quarter', 'Court', 'Result', 'Period']) expect(await chipLines(page, name), name).toBe(1)
    await expectCleanLayout(page)
  })

  test('click targets are big', async ({ page }) => {
    await seedRecent(page, SEEDED)
    await recent(page).getByRole('button', { name: /^Pin / }).first().click()

    // Chips and segmented toggles: 48px tall, 17px text.
    for (const name of ['Stat', 'Quarter', 'Court', 'Result', 'Period', 'Mode', 'View']) {
      for (const button of await group(page, name).getByRole('button').all()) {
        const { height, fontSize } = await measure(button)
        expect(height, name).toBeGreaterThanOrEqual(48)
        expect(fontSize, name).toBe(17)
      }
    }
    // Chips: 20px padding each side, 10px apart.
    const first = await measure(chip(page, 'Stat', 'All stats'))
    const second = await measure(chip(page, 'Stat', 'Points'))
    expect(second.x - (first.x + first.width)).toBeCloseTo(10, 0)
    expect(await chip(page, 'Stat', 'Points').evaluate((el) => getComputedStyle(el).paddingLeft)).toBe('20px')

    // Action buttons: 52px tall, 17px text; Ask is the widest.
    const actions = [askLink(page), ...['Copy question', 'Copy link', 'Clear all'].map((name) => page.getByRole('button', { name }))]
    const sizes = await Promise.all(actions.map(measure))
    for (const { height, fontSize } of sizes) {
      expect(height).toBeGreaterThanOrEqual(52)
      expect(fontSize).toBe(17)
    }
    expect(sizes[0]!.width).toBeGreaterThan(Math.max(...sizes.slice(1).map((s) => s.width)))

    // Text boxes: 52px tall, 18px text.
    const boxes = [
      playerBox(page),
      page.getByRole('combobox', { name: 'Opponent' }),
      page.getByRole('combobox', { name: 'Vs player' }),
      page.getByRole('combobox', { name: 'Without' }),
      page.getByRole('spinbutton', { name: 'Last N games' }),
    ]
    for (const input of boxes) {
      const { height, fontSize } = await measure(input)
      expect(height).toBeGreaterThanOrEqual(52)
      expect(fontSize).toBe(18)
    }

    // Row labels: 14px, centered on the first line of their row.
    const rows: [string, Locator][] = [
      ['Stat', chip(page, 'Stat', 'All stats')],
      ['Quarter', chip(page, 'Quarter', 'Full game')],
      ['Result', chip(page, 'Result', 'Any')],
      ['Period', chip(page, 'Period', 'Any')],
      ['Player', playerBox(page)],
      ['Opponent', page.getByRole('combobox', { name: 'Opponent' })],
      ['Without', page.getByRole('combobox', { name: 'Without' })],
    ]
    for (const [label, control] of rows) {
      const text = await measure(page.locator('form').locator('label, div').filter({ hasText: new RegExp(`^${label}$`) }).last())
      const target = (await control.boundingBox())!
      expect(text.fontSize, label).toBe(14)
      expect(Math.abs(text.y + text.height / 2 - (target.y + target.height / 2)), label).toBeLessThanOrEqual(1)
    }

    // Recent and Pinned rows: 17px text, 52px rows, 44x44 controls with a gap.
    for (const list of [recent(page), pinned(page)]) {
      const row = list.getByRole('listitem').first()
      expect((await measure(row)).height).toBeGreaterThanOrEqual(52)
      expect((await measure(row.getByRole('link'))).fontSize).toBe(17)
      const buttons = await Promise.all((await row.getByRole('button').all()).map(measure))
      expect(buttons.length).toBeGreaterThanOrEqual(2)
      for (const { width, height } of buttons) {
        expect(width).toBeGreaterThanOrEqual(44)
        expect(height).toBeGreaterThanOrEqual(44)
      }
      for (let i = 1; i < buttons.length; i++) {
        const gap = buttons[i]!.x - (buttons[i - 1]!.x + buttons[i - 1]!.width)
        expect(gap).toBeGreaterThanOrEqual(8)
      }
    }
  })
})

test.describe('layout at 1366x768', () => {
  test.use({ viewport: { width: 1366, height: 768 } })

  test('two columns, nothing overlapping, clipped or scrolling sideways', async ({ page }) => {
    await page.evaluate(() => document.fonts.ready)
    await seedRecent(page, SEEDED)
    await expectCleanLayout(page)

    const builder = (await page.getByRole('region', { name: 'Your question' }).boundingBox())!
    const side = (await page.getByRole('complementary').boundingBox())!
    expect(builder.x).toBe(24)
    expect(side.width).toBe(380)
    expect(side.x).toBeGreaterThan(builder.x + builder.width)

    await fillEverything(page)
    await expectCleanLayout(page)
    await chip(page, 'Mode', 'Team leaders').click()
    await expectCleanLayout(page)
    await chip(page, 'Mode', 'Player').click()
    await chip(page, 'View', 'Game by game').click()
    await expectCleanLayout(page)
  })
})

/** Twelve recents and six pins with long questions: more than a column can show. */
async function seedLongLists(page: Page) {
  const entry = (i: number, kind: string): SeedEntry => ({
    question: `Shai Gilgeous-Alexander points in the 4th quarter on the road in wins last ${i + 1} games ${kind}`,
    query: { mode: 'player', view: 'averages', player: `Player ${kind} ${i}`, stat: 'points' },
  })
  await page.evaluate(
    ([recentList, pinnedList]) => {
      localStorage.setItem('smb.recent', JSON.stringify(recentList))
      localStorage.setItem('smb.pinned', JSON.stringify(pinnedList))
    },
    [Array.from({ length: 12 }, (_, i) => entry(i, 'recent')), Array.from({ length: 6 }, (_, i) => entry(i, 'pinned'))],
  )
  await page.reload()
}

/** The page has no scrollbar in either direction, and has not moved. */
async function expectPageDoesNotScroll(page: Page) {
  const state = await page.evaluate(() => {
    const doc = document.documentElement
    return {
      htmlOverflow: getComputedStyle(doc).overflow,
      bodyOverflow: getComputedStyle(document.body).overflow,
      tallerBy: doc.scrollHeight - window.innerHeight,
      widerBy: doc.scrollWidth - window.innerWidth,
      // A page scrollbar would make the layout narrower than the window.
      scrollbar: window.innerWidth - doc.clientWidth,
      scrolled: [window.scrollX, window.scrollY, doc.scrollTop, document.body.scrollTop],
      appHeight: document.querySelector('#root > div')!.getBoundingClientRect().height - window.innerHeight,
    }
  })
  expect(state).toEqual({
    htmlOverflow: 'hidden',
    bodyOverflow: 'hidden',
    tallerBy: 0,
    widerBy: 0,
    scrollbar: 0,
    scrolled: [0, 0, 0, 0],
    appHeight: 0,
  })
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
]) {
  test.describe(`no page scroll at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport })

    test('the page never scrolls; the Recent list scrolls under its pinned heading', async ({ page }) => {
      await seedLongLists(page)
      await page.evaluate(() => document.fonts.ready)
      await expectPageDoesNotScroll(page)

      const list = recent(page)
      const heading = page.getByRole('heading', { name: 'Recent' })
      const side = (await page.getByRole('complementary').boundingBox())!
      // The column fills the height under the header, down to the bottom padding.
      expect(side.y + side.height).toBeGreaterThan(viewport.height - 40)
      expect(side.y + side.height).toBeLessThanOrEqual(viewport.height)

      // More rows than fit: the list (and only the list) has a vertical scrollbar.
      const overflow = await list.evaluate((el) => ({
        hidden: el.scrollHeight - el.clientHeight,
        overflowY: getComputedStyle(el).overflowY,
        scrollbarWidth: getComputedStyle(el).scrollbarWidth,
        scrollbarColor: getComputedStyle(el).scrollbarColor,
      }))
      expect(overflow.hidden).toBeGreaterThan(100)
      expect(overflow.overflowY).toBe('auto')
      // Slim, and in the theme's line colour on a clear track.
      expect(overflow.scrollbarWidth).toBe('thin')
      expect(overflow.scrollbarColor).toBe('rgb(45, 49, 59) rgba(0, 0, 0, 0)')

      // The mouse wheel over the list scrolls it; the heading stays put.
      const headingBefore = (await heading.boundingBox())!
      const firstRowBefore = (await list.getByRole('listitem').first().boundingBox())!
      const box = (await list.boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.wheel(0, 300)
      await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(100)
      expect((await heading.boundingBox())!.y).toBe(headingBefore.y)
      expect((await list.getByRole('listitem').first().boundingBox())!.y).toBeLessThan(firstRowBefore.y - 100)
      // The last row can be reached, and its buttons work.
      await page.mouse.wheel(0, 5000)
      const lastRow = list.getByRole('listitem').last()
      await expect(lastRow).toBeInViewport()
      await lastRow.getByRole('button', { name: 'Edit' }).click()
      await expect(playerBox(page)).toHaveValue('Player recent 11')
      await expectPageDoesNotScroll(page)

      // Pinned keeps its own heading in place and scrolls its own list too.
      const pins = pinned(page)
      expect(await pins.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0)
      const pinnedHeading = (await page.getByRole('heading', { name: 'Pinned' }).boundingBox())!
      const pinsBox = (await pins.boundingBox())!
      await page.mouse.move(pinsBox.x + pinsBox.width / 2, pinsBox.y + pinsBox.height / 2)
      await page.mouse.wheel(0, 200)
      await expect.poll(() => pins.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
      expect((await page.getByRole('heading', { name: 'Pinned' }).boundingBox())!.y).toBe(pinnedHeading.y)
      await expectPageDoesNotScroll(page)
    })

    test('a builder that does not fit scrolls inside its own column', async ({ page }) => {
      await seedLongLists(page)
      await fillEverything(page)
      await expectPageDoesNotScroll(page)

      const builder = page.getByRole('main')
      const hidden = await builder.evaluate((el) => el.scrollHeight - el.clientHeight)
      const lastRow = page.getByTestId('filter-row').last()
      if (hidden > 0) {
        // Short screen: the wheel over the builder scrolls it, not the page or Recent.
        const box = (await builder.boundingBox())!
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.wheel(0, 2000)
        await expect.poll(() => builder.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
        expect(await recent(page).evaluate((el) => el.scrollTop)).toBe(0)
      }
      await expect(lastRow).toBeInViewport({ ratio: 1 })
      await expectPageDoesNotScroll(page)

      // Edit from Recent brings the question back into view.
      await recent(page).getByRole('button', { name: 'Edit' }).first().click()
      await expect(question(page)).toBeInViewport({ ratio: 1 })
      await expectPageDoesNotScroll(page)
    })
  })
}

test('phone: the page does not scroll, the single column does', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seedLongLists(page)
  await expectPageDoesNotScroll(page)
  // Everything, down to the last recent row, can be reached.
  const lastRow = recent(page).getByRole('listitem').last()
  await lastRow.scrollIntoViewIfNeeded()
  await expect(lastRow).toBeInViewport()
  await expectPageDoesNotScroll(page)
})

test('fits a 375px phone screen without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const overflow = () =>
    page.evaluate(() =>
      Math.max(
        document.documentElement.scrollWidth - window.innerWidth,
        ...[...document.querySelectorAll('main, aside, #root > div > div')].map((box) => box.scrollWidth - box.clientWidth),
      ),
    )
  await playerBox(page).fill('Shai Gilgeous-Alexander')
  await page.getByRole('combobox', { name: 'Opponent' }).click()
  await page.getByRole('listbox', { name: 'Teams', exact: true }).getByRole('option', { name: 'Trail Blazers' }).click()
  await chip(page, 'Quarter', '2nd half').click()
  await chip(page, 'Court', 'Away').click()
  await chip(page, 'Result', 'Losses').click()
  await page.getByRole('combobox', { name: 'Vs player' }).fill('Victor Wembanyama')
  await page.getByRole('combobox', { name: 'Without' }).fill('Jalen Williams')
  await chip(page, 'Period', 'Last season').click()
  expect(await overflow()).toBeLessThanOrEqual(0)
  await ask(page)
  expect(await overflow()).toBeLessThanOrEqual(0)
  await chip(page, 'Mode', 'Team leaders').click()
  expect(await overflow()).toBeLessThanOrEqual(0)
})

test('is dark, even when the system prefers light', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(18, 20, 26)')
  // The light theme is gone: asking for it changes nothing.
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(18, 20, 26)')
})

test('suggests 2026-27 rookies from the synced roster list', async ({ page }) => {
  await expect(page.getByText('Suggestions cover the 2026-27 rosters')).toBeVisible()
  await playerBox(page).fill('cooper fl')
  await expect(playerList(page).getByRole('option')).toHaveText(['Cooper Flagg'])
})

test('shows its version in the bottom-right corner and serves /version.json', async ({ page, request }) => {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }
  const badge = page.getByTestId('site-version')
  await expect(badge).toHaveText(`v${version}`)
  // Commit and build time are in the tooltip.
  const title = (await badge.getAttribute('title')) ?? ''
  expect(title.startsWith(`Version ${version} · commit `)).toBe(true)
  expect(title).toMatch(/ · commit [0-9a-f]{7}\+?, built /)

  // In the corner of the window, in the page's bottom padding: on top of nothing.
  const box = (await badge.boundingBox())!
  const viewport = page.viewportSize()!
  expect(viewport.width - (box.x + box.width)).toBeLessThan(24)
  expect(viewport.height - (box.y + box.height)).toBeLessThan(24)
  const covered = await badge.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return document
      .elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      .filter((other) => other !== el && !other.contains(el)).length
  })
  expect(covered).toBe(0)

  const response = await request.get('/version.json')
  expect(response.ok()).toBe(true)
  const build = (await response.json()) as { version: string; commit: string; builtAt: string }
  expect(build.version).toBe(version)
  expect(build.commit).toMatch(/^[0-9a-f]{7}\+?$/)
  expect(Number.isNaN(Date.parse(build.builtAt))).toBe(false)
  // The live site must not cache it (vercel.json); the local preview server sets no such header.
  if (process.env.BASE_URL) expect(response.headers()['cache-control']).toContain('no-cache')
})
