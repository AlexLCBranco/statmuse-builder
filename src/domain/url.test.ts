import { describe, expect, it } from 'vitest'

import { DEFAULT_QUERY, type QueryState } from './query'
import { queryToSearch, searchToQuery } from './url'

const q = (changes: Partial<QueryState>): QueryState => ({ ...DEFAULT_QUERY, ...changes })

describe('queryToSearch', () => {
  it('is the plain address for the factory screen', () => {
    expect(queryToSearch(DEFAULT_QUERY)).toBe('')
  })

  it('writes only what differs from the factory defaults', () => {
    expect(queryToSearch(q({ player: 'LeBron James', stat: 'points', period: 'last 10 games' }))).toBe(
      '?player=LeBron+James&stat=points&period=last+10+games',
    )
  })

  it('writes every field under its own name', () => {
    const full = q({
      mode: 'leaders', view: 'gamelog', player: 'A B', team: 'Celtics', stat: 'assists', quarter: 'in the 4th quarter',
      court: 'at home', opponent: 'Lakers', vsPlayer: 'C D', without: 'E F', rest: 'on the second night of a back to back',
      result: 'in wins', period: 'career', lastN: '7',
    })
    expect([...new URLSearchParams(queryToSearch(full)).keys()]).toEqual([
      'mode', 'view', 'player', 'team', 'stat', 'quarter', 'court', 'opponent', 'vs', 'without', 'rest', 'result', 'period', 'lastN',
    ])
  })

  it('names the mode when the factory screen is not the start screen', () => {
    const start = q({ period: 'this season' })
    expect(queryToSearch(DEFAULT_QUERY, start)).toBe('?mode=player')
    expect(queryToSearch(start, start)).toBe('?period=this+season')
  })
})

describe('searchToQuery', () => {
  it('gives the start screen for the plain address and for unknown names', () => {
    const start = q({ period: 'this season' })
    expect(searchToQuery('', start)).toBe(start)
    expect(searchToQuery('?utm_source=x', start)).toBe(start)
  })

  it('builds on the factory defaults, not the start screen, when the address says something', () => {
    const start = q({ period: 'this season', stat: 'points' })
    expect(searchToQuery('?mode=player', start)).toEqual(DEFAULT_QUERY)
    expect(searchToQuery('?player=Luka+Doncic', start)).toEqual(q({ player: 'Luka Doncic' }))
  })

  it('ignores values that are not real choices', () => {
    const got = searchToQuery('?mode=coach&view=x&stat=dunks&quarter=q9&court=moon&opponent=Sonics&team=Sonics&rest=x&result=x&period=x&lastN=900&player=Ja+Morant')
    expect(got).toEqual(q({ player: 'Ja Morant' }))
  })

  it('accepts the league as a team, and a "last N" the box would accept', () => {
    expect(searchToQuery('?mode=leaders&team=NBA&lastN=7')).toEqual(q({ mode: 'leaders', team: 'NBA', lastN: '7' }))
    expect(searchToQuery('?lastN=07').lastN).toBe('')
  })

  it('cuts a typed name that is far too long', () => {
    expect(searchToQuery(`?player=${'x'.repeat(500)}`).player).toHaveLength(80)
  })

  it('round-trips every screen, names with accents and symbols included', () => {
    const screens = [
      q({ player: "De'Aaron Fox", vsPlayer: 'Nikola Jokić', without: 'Shai Gilgeous-Alexander', opponent: 'Trail Blazers' }),
      q({ mode: 'leaders', team: '76ers', stat: 'three pointers made', quarter: 'in the 2nd half', result: 'in losses' }),
      q({ view: 'gamelog', player: 'A&B=C?D #1', lastN: '82', rest: 'on the second night of a back to back', court: 'on the road' }),
      DEFAULT_QUERY,
    ]
    for (const screen of screens) expect(searchToQuery(queryToSearch(screen))).toEqual(screen)
    const start = q({ view: 'gamelog' })
    for (const screen of screens) expect(searchToQuery(queryToSearch(screen, start), start)).toEqual(screen)
  })
})
