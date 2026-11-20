import { describe, expect, it } from 'vitest'

import { crumbs, goEntries, goFind, goToPlace, pageTitle, PLACES } from './nav'
import { DEFAULT_QUERY, type QueryState } from './query'
import type { Saved } from './recent'

const q = (changes: Partial<QueryState>): QueryState => ({ ...DEFAULT_QUERY, ...changes })
const NONE: Saved = { recent: [], pinned: [] }
const search = (question: string, query: Partial<QueryState>) => ({ question, query: q(query) })
const SAVED: Saved = {
  recent: [search('Stephen Curry points career', { player: 'Stephen Curry', stat: 'points', period: 'career' })],
  pinned: [search('Lakers assists leaders', { mode: 'leaders', team: 'Lakers', stat: 'assists' }), search('Luka Doncic stats', { player: 'Luka Doncic' })],
}
const PLAYERS = ['LeBron James', 'Luka Doncic', 'Nikola Jokić', 'Shai Gilgeous-Alexander', 'Stephen Curry']

describe('places', () => {
  it('has at most five, each with a label and plain-word tip', () => {
    expect(PLACES.length).toBeLessThanOrEqual(5)
    for (const place of PLACES) expect(place.label && place.tip).toBeTruthy()
  })

  it('going to a place keeps the filters; "All stats" becomes points in leaders', () => {
    const from = q({ player: 'LeBron James', quarter: 'in the 4th quarter', team: 'Celtics' })
    expect(goToPlace(from, 'leaders')).toEqual({ ...from, mode: 'leaders', stat: 'points' })
    expect(goToPlace(from, 'player')).toBe(from)
  })
})

describe('crumbs', () => {
  it('Player › name › view, each part listing its neighbours', () => {
    const parts = crumbs(q({ player: 'LeBron James', view: 'gamelog' }), SAVED)
    expect(parts.map((p) => p.label)).toEqual(['Player', 'LeBron James', 'Game by game'])
    expect(parts[0]!.items.map((i) => [i.label, i.on])).toEqual([['Player', true], ['Team leaders', false]])
    // The player's neighbours: himself, then the recent players (Recent first, then Pinned).
    expect(parts[1]!.items.map((i) => [i.label, i.on])).toEqual([['LeBron James', true], ['Stephen Curry', false], ['Luka Doncic', false]])
    expect(parts[1]!.items[1]!.query).toEqual(q({ player: 'Stephen Curry', view: 'gamelog' }))
    expect(parts[2]!.items.map((i) => [i.label, i.on])).toEqual([['Averages', false], ['Game by game', true]])
    expect(parts[2]!.items[0]!.query.view).toBe('averages')
  })

  it('says "Pick a player" while empty; nothing to jump to without recent players', () => {
    expect(crumbs(DEFAULT_QUERY, NONE)[1]).toEqual({ label: 'Pick a player', what: 'Player', items: [] })
    expect(crumbs(q({ player: 'LeBron James' }), NONE)[1]!.items).toEqual([])
    expect(crumbs(DEFAULT_QUERY, SAVED)[1]!.items.map((i) => i.label)).toEqual(['Stephen Curry', 'Luka Doncic'])
  })

  it('Team leaders › team, listing the league and all 30 teams; no view part', () => {
    const parts = crumbs(q({ mode: 'leaders', team: 'Celtics' }), NONE)
    expect(parts.map((p) => p.label)).toEqual(['Team leaders', 'Celtics'])
    expect(parts[1]!.items).toHaveLength(31)
    expect(parts[1]!.items[0]!.label).toBe('League (NBA)')
    expect(parts[1]!.items.filter((i) => i.on).map((i) => i.label)).toEqual(['Celtics'])
    expect(crumbs(q({ mode: 'leaders' }), NONE)[1]!.label).toBe('Pick a team')
    expect(crumbs(q({ mode: 'leaders', team: 'NBA' }), NONE)[1]!.label).toBe('League (NBA)')
  })
})

describe('go anywhere', () => {
  const entries = goEntries(q({ quarter: 'in the 4th quarter' }), SAVED, PLAYERS)
  const find = (typed: string) => goFind(entries, typed).map((e) => `${e.label} [${e.kind}]`)

  it('lists places, views and saved searches before anything is typed', () => {
    expect(find('')).toEqual([
      'Player [Place]', 'Team leaders [Place]', 'League leaders (NBA) [Place]', 'Averages [How]', 'Game by game [How]',
      'Lakers assists leaders [Pinned]', 'Luka Doncic stats [Pinned]', 'Stephen Curry points career [Recent]',
    ])
  })

  it('finds a player (accents, case and hyphens ignored) and keeps the filters', () => {
    expect(find('jokic')[0]).toBe('Nikola Jokić [Player]')
    expect(find('SHAI alexander')[0]).toBe('Shai Gilgeous-Alexander [Player]')
    const hit = goFind(entries, 'lebron')[0]!
    expect(hit.query).toEqual(q({ player: 'LeBron James', quarter: 'in the 4th quarter' }))
  })

  it('finds a team by nickname or city: its own numbers, or its leaders', () => {
    // A saved search that starts with the word comes before the plain leaders page.
    expect(find('lakers').slice(0, 3)).toEqual(['Lakers [Team]', 'Lakers assists leaders [Pinned]', 'Lakers leaders [Team leaders]'])
    expect(find('boston')).toEqual(['Celtics [Team]', 'Celtics leaders [Team leaders]'])
    expect(find('celtics lead')).toEqual(['Celtics leaders [Team leaders]'])
    const hits = goFind(entries, 'celtics')
    expect(hits[0]!.query).toEqual(q({ player: 'Celtics', quarter: 'in the 4th quarter' }))
    expect(hits[1]!.query).toEqual(q({ mode: 'leaders', team: 'Celtics', stat: 'points', quarter: 'in the 4th quarter' }))
  })

  it('opens a saved search whole, not on top of the current filters', () => {
    const hit = goFind(entries, 'curry career')[0]!
    expect(hit.kind).toBe('Recent')
    expect(hit.query).toEqual(SAVED.recent[0]!.query)
  })

  it('finds the league leaders and the views', () => {
    expect(find('league')[0]).toBe('League leaders (NBA) [Place]')
    expect(goFind(entries, 'league')[0]!.query).toMatchObject({ mode: 'leaders', team: 'NBA' })
    expect(find('game by')[0]).toBe('Game by game [How]')
    expect(goFind(entries, 'game by')[0]!.query).toMatchObject({ mode: 'player', view: 'gamelog' })
  })

  it('gives nothing for no match, and never more than the limit', () => {
    expect(find('zzzz')).toEqual([])
    expect(goFind(entries, 'a', 5)).toHaveLength(5)
  })
})

describe('pageTitle', () => {
  it('is the question, or the place while there is no subject', () => {
    expect(pageTitle(q({ player: 'LeBron James' }), 'LeBron James stats')).toBe('LeBron James stats — StatMuse Builder')
    expect(pageTitle(DEFAULT_QUERY, 'stats')).toBe('Player — StatMuse Builder')
    expect(pageTitle(q({ mode: 'leaders' }), 'points leaders')).toBe('Team leaders — StatMuse Builder')
  })
})
