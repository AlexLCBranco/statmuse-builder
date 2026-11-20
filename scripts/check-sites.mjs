// Opens every kind of "Other sites" link (SM-5) on the live sites, in a real
// browser, and checks each lands on the page it promises. Run before
// shipping a change to src/domain/sites.ts:  node scripts/check-sites.mjs
//
// Checked: ESPN and Basketball-Reference team pages for all 30 teams, ESPN's
// league table sorted by each stat (the column really is in order, most
// first), a few players' ESPN splits and game logs and Basketball-Reference
// pages, both searches, and CraftedNBA. (Every roster player's CraftedNBA
// page is checked one by one in scripts/sync-bios.mjs.)
//
// Basketball-Reference allows about 20 pages a minute, so its checks wait
// between pages; the whole run takes about three minutes.
import { chromium } from '@playwright/test'

const TEAMS = {
  '76ers': 'PHI', Bucks: 'MIL', Bulls: 'CHI', Cavaliers: 'CLE', Celtics: 'BOS', Clippers: 'LAC', Grizzlies: 'MEM', Hawks: 'ATL',
  Heat: 'MIA', Hornets: 'CHA', Jazz: 'UTA', Kings: 'SAC', Knicks: 'NYK', Lakers: 'LAL', Magic: 'ORL', Mavericks: 'DAL', Nets: 'BKN',
  Nuggets: 'DEN', Pacers: 'IND', Pelicans: 'NOP', Pistons: 'DET', Raptors: 'TOR', Rockets: 'HOU', Spurs: 'SAS', Suns: 'PHX',
  Thunder: 'OKC', Timberwolves: 'MIN', 'Trail Blazers': 'POR', Warriors: 'GSW', Wizards: 'WAS',
}
// The same maps as src/domain/sites.ts (kept apart: this script runs without a build).
const ESPN_CODES = { GSW: 'gs', NOP: 'no', NYK: 'ny', SAS: 'sa', UTA: 'utah', WAS: 'wsh' }
const BBREF_CODES = { BKN: 'BRK', CHA: 'CHO', PHX: 'PHO' }
const ESPN_SORT = {
  PTS: ['offensive', 'avgPoints'], REB: ['general', 'avgRebounds'], AST: ['offensive', 'avgAssists'],
  FGA: ['offensive', 'avgFieldGoalsAttempted'], FGM: ['offensive', 'avgFieldGoalsMade'],
  '3PA': ['offensive', 'avgThreePointFieldGoalsAttempted'], '3PM': ['offensive', 'avgThreePointFieldGoalsMade'],
  STL: ['defensive', 'avgSteals'], BLK: ['defensive', 'avgBlocks'], TO: ['offensive', 'avgTurnovers'], MIN: ['general', 'avgMinutes'],
}
const PLAYERS = [['LeBron James', '1966', 'lebron-james'], ['Victor Wembanyama', '5104157', 'victor-wembanyama'], ['Jaren Jackson Jr.', '4277961', 'jaren-jackson-jr.']]
const YEAR = 2027
const SEASON = '2026-27'

const failures = []
let passed = 0
const check = (ok, what, detail = '') => {
  if (ok) passed++
  else failures.push(`${what}${detail ? `: ${detail}` : ''}`)
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok || !detail ? '' : ` (${detail})`}`)
}

const browser = await chromium.launch()
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  viewport: { width: 1600, height: 1000 },
})
const page = await context.newPage()
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const open = async (url) => {
  for (let tries = 1; ; tries++) {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    const status = response?.status() ?? 0
    // ESPN sometimes answers 202 with a "Loading…" page first; the real page comes on the next try.
    if (status !== 202 || tries >= 4) return { status, title: await page.title(), url: page.url() }
    await wait(1500)
  }
}

// ---- ESPN ----
for (const [team, tricode] of Object.entries(TEAMS)) {
  const { status, title } = await open(`https://www.espn.com/nba/team/stats/_/name/${ESPN_CODES[tricode] ?? tricode.toLowerCase()}`)
  check(status === 200 && title.includes(team) && /Stats/.test(title), `ESPN team: ${team}`, `${status} "${title}"`)
}
for (const [column, [table, key]] of Object.entries(ESPN_SORT)) {
  const url = `https://www.espn.com/nba/stats/player/_/table/${table}/sort/${key}/dir/desc`
  const { status } = await open(url)
  await page.waitForSelector('table tbody tr', { timeout: 20_000 }).catch(() => undefined)
  // The column named `column`, top ten rows: most first.
  const values = await page.evaluate((column) => {
    for (const table of document.querySelectorAll('table')) {
      const heads = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim())
      const at = heads.indexOf(column)
      if (at < 0) continue
      return [...table.querySelectorAll('tbody tr')].slice(0, 10).map((row) => Number(row.children[at]?.textContent))
    }
    return []
  }, column)
  const inOrder = values.length >= 5 && values.every((v, i) => Number.isFinite(v) && (i === 0 || v <= values[i - 1]))
  check(status === 200 && inOrder, `ESPN league table by ${column}`, `${status} top values ${values.join(', ')}`)
}
for (const [name, id] of PLAYERS) {
  const last = name.split(' ')[1]
  const splits = await open(`https://www.espn.com/nba/player/splits/_/id/${id}`)
  check(splits.status === 200 && splits.title.includes(last) && /Splits/.test(splits.title), `ESPN splits: ${name}`, `${splits.status} "${splits.title}"`)
  const log = await open(`https://www.espn.com/nba/player/gamelog/_/id/${id}`)
  // ESPN titles its game log "<name> <season> Stats per Game".
  check(log.status === 200 && log.url.includes('/gamelog/') && log.title.includes(last) && /Stats per Game/.test(log.title), `ESPN game log: ${name}`, `${log.status} "${log.title}"`)
}
{
  const { status, title } = await open(`https://www.espn.com/search/_/q/${encodeURIComponent('Michael Jordan')}`)
  await page.waitForSelector('text=/Michael Jordan/i', { timeout: 20_000 }).catch(() => undefined)
  const found = await page.evaluate(() => /Michael Jordan/i.test(document.body.innerText))
  check(status === 200 && found, 'ESPN search: Michael Jordan', `${status} "${title}"`)
}

// ---- CraftedNBA ----
for (const [name, , slug] of PLAYERS) {
  const { status, title } = await open(`https://craftednba.com/players/${slug}`)
  check(status === 200 && title.includes(name.split(' ')[1]) && /Shot Chart/.test(title), `CraftedNBA: ${name}`, `${status} "${title}"`)
}

// ---- Basketball-Reference (slowly: it allows about 20 pages a minute) ----
const PAUSE = 3500
for (const [team, tricode] of Object.entries(TEAMS)) {
  await wait(PAUSE)
  const { status, title } = await open(`https://www.basketball-reference.com/teams/${BBREF_CODES[tricode] ?? tricode}/${YEAR}.html`)
  check(status === 200 && title.includes(SEASON) && title.includes(team), `Basketball-Reference team: ${team}`, `${status} "${title}"`)
}
{
  await wait(PAUSE)
  const { status, title } = await open(`https://www.basketball-reference.com/leagues/NBA_${YEAR}_leaders.html`)
  check(status === 200 && title.includes(SEASON) && /Leaders/.test(title), 'Basketball-Reference league leaders', `${status} "${title}"`)
}
for (const [name] of [...PLAYERS, ['Michael Jordan']]) {
  await wait(PAUSE)
  const { status, title, url } = await open(`https://www.basketball-reference.com/search/search.fcgi?search=${encodeURIComponent(name).replace(/%20/g, '+')}`)
  // A name only one player has lands on his page; otherwise on the list of matches.
  const landed = /\/players\/[a-z]\//.test(url) ? title.includes(name.split(' ')[1]) : /Search Results/.test(title)
  check(status === 200 && landed, `Basketball-Reference search: ${name}`, `${status} "${title}" ${url}`)
}

await browser.close()
console.log(`\n${passed} links ok, ${failures.length} failed`)
if (failures.length) {
  console.error(failures.map((f) => `- ${f}`).join('\n'))
  process.exit(1)
}
