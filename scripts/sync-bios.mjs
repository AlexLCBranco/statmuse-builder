// Regenerates src/domain/data/bios.ts (SM-4, SM-5): each roster player's draft
// spot, US college seasons and birthplace, from ESPN's public API (free, no
// key), plus where his page is on ESPN (his id) and on CraftedNBA (checked by
// opening it). Run: npm run sync:bios  (after npm run sync:players).
//
// Per player: the NBA athlete record (birthplace, draft), the drafting team's
// name, and, when ESPN links a college record, the seasons he played with the
// team and per-game numbers of each. Nothing is guessed: a field ESPN does
// not have is left out.
import { writeFileSync } from 'node:fs'

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba'
const CORE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues'
const Q = '?lang=en&region=us'
const WORKERS = 8

async function getJson(url, tries = 3) {
  const https = url.replace(/^http:/, 'https:')
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(https)
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`${res.status} ${https}`)
      return await res.json()
    } catch (error) {
      if (i >= tries) throw error
      await new Promise((r) => setTimeout(r, 500 * i))
    }
  }
}

const cache = new Map()
const cached = (url) => {
  if (!cache.has(url)) cache.set(url, getJson(url))
  return cache.get(url)
}

// Accents stripped so names match src/domain/data/players.ts.
const ascii = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/** ESPN's short team names, as the NBA writes them. */
const TRICODE = { SA: 'SAS', GS: 'GSW', NY: 'NYK', NO: 'NOP', UTAH: 'UTA', WSH: 'WAS', NJ: 'NJN', PHX: 'PHX' }

const stat = (stats, name) => {
  for (const category of stats?.splits?.categories ?? []) {
    const hit = category.stats.find((s) => s.name === name)
    if (hit) return Number(hit.value)
  }
  return undefined
}
const round1 = (n) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 10) / 10 : undefined)

const BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const fold = (s) => ascii(s).toLowerCase().replace(/&#x27;|&#39;|['’.]/g, '')
const slugOf = (s) => s.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * The player's page on CraftedNBA (SM-5), found by opening it: the name as a
 * slug, with and without a "Jr." / "III" ending, initials joined or apart.
 * Null when no try opens a page that names him (the site has no page for him).
 */
async function craftedSlug(name) {
  const lower = ascii(name).toLowerCase().replace(/['’]/g, '')
  const joined = slugOf(lower.replace(/\./g, ''))
  const apart = slugOf(lower)
  const noEnding = (slug) => slug.replace(/-(jr|sr|ii|iii|iv|v)$/, '')
  const last = fold(name).replace(/ (jr|sr|ii|iii|iv|v)$/, '').split(' ').at(-1)
  // The site keeps the dots of initials: "p.j.-washington".
  const dotted = lower.trim().replace(/\s+/g, '-')
  for (const slug of new Set([joined, noEnding(joined), apart, noEnding(apart), dotted])) {
    for (let i = 1; i <= 3; i++) {
      try {
        const res = await fetch(`https://craftednba.com/players/${slug}`, { headers: { 'user-agent': BROWSER } })
        if (res.status === 404) break
        if (!res.ok) throw new Error(String(res.status))
        const title = (await res.text()).match(/<title>([^<]*)<\/title>/)?.[1] ?? ''
        if (fold(title).includes(last)) return new URL(res.url).pathname.split('/').pop()
        break
      } catch {
        await new Promise((r) => setTimeout(r, 1000 * i))
      }
    }
  }
  return null
}

async function bioOf(id, name) {
  const athlete = await getJson(`${CORE}/nba/athletes/${id}${Q}`)
  if (!athlete) return null
  const bio = { espn: String(id) }
  const crafted = await craftedSlug(name)
  if (crafted) bio.crafted = crafted

  const place = athlete.birthPlace
  if (place?.country || place?.city) {
    bio.from = { ...(place.city && { city: place.city }), ...(place.state && { state: place.state }), ...(place.country && { country: place.country }) }
  }

  const draft = athlete.draft
  if (draft?.year && draft.round && draft.selection) {
    const team = draft.team?.$ref ? await cached(draft.team.$ref) : null
    bio.draft = {
      year: draft.year,
      round: draft.round,
      pick: draft.selection,
      ...(team?.abbreviation && { team: TRICODE[team.abbreviation] ?? team.abbreviation }),
      ...(team?.displayName && { teamName: team.displayName }),
    }
  }

  // College: the seasons from ESPN's college record, grouped by school in order.
  const schools = []
  if (athlete.collegeAthlete?.$ref) {
    const collegeId = athlete.collegeAthlete.$ref.match(/athletes\/(\d+)/)?.[1]
    const log = collegeId ? await getJson(`${CORE}/mens-college-basketball/athletes/${collegeId}/statisticslog${Q}`) : null
    const seasons = []
    for (const entry of log?.entries ?? []) {
      const year = Number(entry.season?.$ref?.match(/seasons\/(\d+)/)?.[1])
      const teamEntry = entry.statistics?.find((s) => s.type === 'team')
      const teamId = teamEntry?.team?.$ref?.match(/teams\/(\d+)/)?.[1]
      if (!year || !teamId) continue
      const stats = teamEntry.statistics?.$ref ? await getJson(teamEntry.statistics.$ref) : null
      const games = stat(stats, 'gamesPlayed')
      seasons.push({
        year,
        teamId,
        ...(games > 0 && { games, points: round1(stat(stats, 'avgPoints')), rebounds: round1(stat(stats, 'avgRebounds')), assists: round1(stat(stats, 'avgAssists')) }),
      })
    }
    seasons.sort((a, b) => a.year - b.year)
    for (const season of seasons) {
      // A season with no game played (a redshirt year) is not a season "played".
      if (!season.games) continue
      let school = schools.at(-1)
      if (!school || school.id !== season.teamId) {
        const college = await cached(`https://sports.core.api.espn.com/v2/colleges/${season.teamId}${Q}`)
        if (!college?.name) continue
        school = { id: season.teamId, name: college.name, seasons: [] }
        schools.push(school)
      }
      const { teamId: _teamId, ...rest } = season
      school.seasons.push(rest)
    }
  }
  // No college record with seasons, but ESPN names a college: the name only.
  if (!schools.length && athlete.college?.$ref) {
    const college = await cached(athlete.college.$ref)
    if (college?.name) schools.push({ id: String(college.id), name: college.name, seasons: [] })
  }
  if (schools.length) bio.colleges = schools
  return bio
}

const teams = (await getJson(`${SITE}/teams`)).sports[0].leagues[0].teams.map((t) => t.team)
if (teams.length !== 30) throw new Error(`expected 30 teams, got ${teams.length}`)
const ids = new Map()
let season = ''
for (const team of teams) {
  const roster = await getJson(`${SITE}/teams/${team.id}/roster`)
  season ||= roster.season.displayName
  for (const a of roster.athletes) ids.set(ascii(a.fullName), a.id)
}

const names = [...ids.keys()].sort()
const bios = {}
let next = 0
await Promise.all(
  Array.from({ length: WORKERS }, async () => {
    while (next < names.length) {
      const name = names[next++]
      const bio = await bioOf(ids.get(name), name)
      if (bio) bios[name] = bio
      if (next % 50 === 0) console.log(`${next}/${names.length}`)
    }
  }),
)

const count = (test) => Object.values(bios).filter(test).length
const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  new URL('../src/domain/data/bios.ts', import.meta.url),
  `import type { Bio } from '../bio'

/**
 * Each roster player's draft spot, US college seasons and birthplace (SM-4),
 * and where his page is on ESPN ("espn", his id there) and on CraftedNBA
 * ("crafted", checked by opening it; missing: no page) (SM-5).
 *
 * Source: ESPN's public NBA API, ${season} rosters (${names.length} players),
 * synced ${today}. Generated by scripts/sync-bios.mjs
 * (\`npm run sync:bios\`); don't edit by hand. Loaded only after a player is
 * picked (a separate chunk), so it never slows the first paint or typing.
 * A field ESPN does not have is left out; no draft means undrafted.
 */
export const BIOS_SYNCED = '${today}'

export const BIOS: Readonly<Record<string, Bio>> = ${JSON.stringify(bios)}
`,
)
console.log(
  `${season}: ${names.length} players; drafted ${count((b) => b.draft)}, undrafted ${count((b) => !b.draft)}, ` +
    `US college ${count((b) => b.colleges)} (with seasons ${count((b) => b.colleges?.some((c) => c.seasons.length))}), birthplace ${count((b) => b.from)}, ` +
    `CraftedNBA page ${count((b) => b.crafted)}`,
)
