import { describe, expect, it } from 'vitest'

import type { Bio } from './bio'
import { BIOS } from './data/bios'
import { STAT_OPTIONS, TEAMS } from './options'
import { DEFAULT_QUERY, type QueryState } from './query'
import { TEAM_TRICODES } from './rotations'
import { bbrefTeamCode, espnLeagueUrl, espnTeamCode, seasonEndYear, siteLinks, type SitePlayer } from './sites'

const q = (changes: Partial<QueryState>): QueryState => ({ ...DEFAULT_QUERY, ...changes })
const SEASON = '2026-27'
const NOBODY: SitePlayer = { name: null, bio: null }
const LEBRON: Bio = { espn: '1966', crafted: 'lebron-james' }
const hrefs = (query: QueryState, player: SitePlayer = NOBODY) =>
  siteLinks(query, player, SEASON).map((link) => `${link.name} · ${link.what} -> ${link.href}`)

describe('siteLinks', () => {
  it('has nothing to link while there is no subject', () => {
    expect(siteLinks(DEFAULT_QUERY, NOBODY, SEASON)).toEqual([])
    expect(siteLinks(q({ mode: 'leaders' }), NOBODY, SEASON)).toEqual([])
  })

  it('a roster player, Averages: his splits, his career, his shot chart', () => {
    expect(hrefs(q({ player: 'lebron james', result: 'in wins' }), { name: 'LeBron James', bio: LEBRON })).toEqual([
      'ESPN · Home, away, wins -> https://www.espn.com/nba/player/splits/_/id/1966',
      'Basketball-Reference · Whole career -> https://www.basketball-reference.com/search/search.fcgi?search=LeBron+James',
      'CraftedNBA · Shot chart -> https://craftednba.com/players/lebron-james',
    ])
  })

  it('Game by game: ESPN opens his game log instead', () => {
    expect(hrefs(q({ player: 'LeBron James', view: 'gamelog' }), { name: 'LeBron James', bio: LEBRON })[0]).toBe(
      'ESPN · Every game -> https://www.espn.com/nba/player/gamelog/_/id/1966',
    )
  })

  it('while his record loads: the same three buttons, ESPN as a search, CraftedNBA not yet a link', () => {
    const links = siteLinks(q({ player: 'LeBron James' }), { name: 'LeBron James', bio: null }, SEASON)
    expect(links.map((l) => l.site)).toEqual(['espn', 'bbref', 'crafted'])
    expect(links[0]!.href).toBe('https://www.espn.com/search/_/q/LeBron%20James')
    expect(links[2]!.href).toBeNull()
  })

  it('a roster player CraftedNBA has no page for: the button says so and goes nowhere', () => {
    const crafted = siteLinks(q({ player: 'Nate Bittle' }), { name: 'Nate Bittle', bio: { espn: '1' } }, SEASON)[2]!
    expect(crafted.href).toBeNull()
    expect(crafted.tip).toBe('CraftedNBA has no page for Nate Bittle yet.')
  })

  it('a typed name that is not on a roster: searches, and no CraftedNBA', () => {
    expect(hrefs(q({ player: ' Michael Jordan ' }))).toEqual([
      'ESPN · Search -> https://www.espn.com/search/_/q/Michael%20Jordan',
      'Basketball-Reference · Whole career -> https://www.basketball-reference.com/search/search.fcgi?search=Michael+Jordan',
    ])
    expect(hrefs(q({ player: "De'Aaron Fox" }))[1]).toContain("search=De'Aaron+Fox")
  })

  it('a team, in Team leaders or in the Player box: the team pages, each site spelling it its own way', () => {
    const celtics = [
      'ESPN · Whole team -> https://www.espn.com/nba/team/stats/_/name/bos',
      'Basketball-Reference · Team season -> https://www.basketball-reference.com/teams/BOS/2027.html',
    ]
    expect(hrefs(q({ mode: 'leaders', team: 'Celtics' }))).toEqual(celtics)
    expect(hrefs(q({ player: 'celtics' }))).toEqual(celtics)
    expect(hrefs(q({ mode: 'leaders', team: 'Warriors' }))[0]).toContain('/name/gs')
    expect(hrefs(q({ mode: 'leaders', team: 'Nets' }))[1]).toContain('/teams/BRK/2027.html')
  })

  it('the league: the table sorted by the chosen stat, and the leaders page', () => {
    expect(hrefs(q({ mode: 'leaders', team: 'NBA', stat: 'assists' }))).toEqual([
      'ESPN · Whole league -> https://www.espn.com/nba/stats/player/_/table/offensive/sort/avgAssists/dir/desc',
      'Basketball-Reference · League leaders -> https://www.basketball-reference.com/leagues/NBA_2027_leaders.html',
    ])
    // "All stats" is not a leaders stat: leaders mode falls back to points.
    expect(hrefs(q({ mode: 'leaders', team: 'NBA', stat: 'stats' }))[0]).toContain('/sort/avgPoints/')
  })

  it('every link has a name, a few words on what opens, and a hover that says more', () => {
    const all = [
      ...siteLinks(q({ player: 'LeBron James' }), { name: 'LeBron James', bio: LEBRON }, SEASON),
      ...siteLinks(q({ player: 'LeBron James', view: 'gamelog' }), { name: 'LeBron James', bio: LEBRON }, SEASON),
      ...siteLinks(q({ mode: 'leaders', team: 'Celtics' }), NOBODY, SEASON),
      ...siteLinks(q({ mode: 'leaders', team: 'NBA' }), NOBODY, SEASON),
    ]
    for (const link of all) {
      expect(link.name && link.what && link.tip.startsWith(link.name)).toBeTruthy()
      expect(link.href).toMatch(/^https:\/\/(www\.espn\.com|www\.basketball-reference\.com|craftednba\.com)\//)
    }
  })
})

describe('addresses', () => {
  it('knows the six teams ESPN and the three Basketball-Reference spell differently', () => {
    expect(['GSW', 'NOP', 'NYK', 'SAS', 'UTA', 'WAS', 'BOS'].map(espnTeamCode)).toEqual(['gs', 'no', 'ny', 'sa', 'utah', 'wsh', 'bos'])
    expect(['BKN', 'CHA', 'PHX', 'BOS'].map(bbrefTeamCode)).toEqual(['BRK', 'CHO', 'PHO', 'BOS'])
    // Every team gets both.
    for (const team of TEAMS) expect(siteLinks(q({ mode: 'leaders', team }), NOBODY, SEASON), team).toHaveLength(2)
    expect(Object.keys(TEAM_TRICODES)).toHaveLength(30)
  })

  it('sorts the league table by every stat chip, most first', () => {
    const seen = new Set<string>()
    for (const option of STAT_OPTIONS) {
      if (option.value === 'stats') continue
      const url = espnLeagueUrl(option.value)
      expect(url, option.label).toMatch(/\/table\/(offensive|defensive|general)\/sort\/avg[A-Za-z]+\/dir\/desc$/)
      seen.add(url)
    }
    // Each stat has its own column.
    expect(seen.size).toBe(STAT_OPTIONS.length - 1)
    expect(espnLeagueUrl('made up')).toBe(espnLeagueUrl('points'))
  })

  it('names a season by the year it ends', () => {
    expect(seasonEndYear('2026-27')).toBe(2027)
    expect(seasonEndYear('1999-00')).toBe(2000)
  })
})

describe('the synced data', () => {
  it('has an ESPN id for every roster player, and a CraftedNBA page for nearly all', () => {
    const bios = Object.values(BIOS)
    expect(bios.every((bio) => /^\d+$/.test(bio.espn ?? ''))).toBe(true)
    expect(bios.filter((bio) => bio.crafted).length / bios.length).toBeGreaterThan(0.9)
    for (const bio of bios) if (bio.crafted) expect(bio.crafted).toMatch(/^[a-z0-9.'-]+$/)
  })
})
