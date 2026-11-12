import { describe, expect, it } from 'vitest'

import { offersFilter, offersLastN, periodOptions, statOptions, type FilterKey } from './availability'
import { STAT_OPTIONS } from './options'
import { DEFAULT_QUERY, type QueryState } from './query'

const labels = (options: readonly { label: string }[]) => options.map((o) => o.label)
const player: QueryState = { ...DEFAULT_QUERY }
const gameLog: QueryState = { ...DEFAULT_QUERY, view: 'gamelog' }
const leaders: QueryState = { ...DEFAULT_QUERY, mode: 'leaders', team: 'Lakers' }
const league: QueryState = { ...leaders, team: 'NBA' }

const ALL_FILTERS: FilterKey[] = ['stat', 'quarter', 'court', 'opponent', 'vsPlayer', 'without', 'result', 'period']
const offered = (query: QueryState) => ALL_FILTERS.filter((key) => offersFilter(query, key))

describe('STAT_OPTIONS', () => {
  it('offers the stats in chip order (and no PRA)', () => {
    expect(labels(STAT_OPTIONS)).toEqual([
      'All stats', 'Points', 'Rebounds', 'Assists', 'FGA', 'FGM', '3PA', '3PM', 'Steals', 'Blocks', 'Turnovers', 'Minutes',
    ])
  })

  it('spells each stat out the way StatMuse reads it', () => {
    const words = Object.fromEntries(STAT_OPTIONS.map((o) => [o.label, o.value]))
    expect(words['FGA']).toBe('field goals attempted')
    expect(words['FGM']).toBe('field goals made')
    expect(words['3PA']).toBe('three pointers attempted')
    expect(words['3PM']).toBe('three pointers made')
    expect(words['Steals']).toBe('steals')
    expect(words['Blocks']).toBe('blocks')
    expect(words['Turnovers']).toBe('turnovers')
    expect(words['Minutes']).toBe('minutes')
  })
})

describe('what each mode offers', () => {
  it('player averages: everything', () => {
    expect(offered(player)).toEqual(ALL_FILTERS)
    expect(statOptions(player)).toEqual(STAT_OPTIONS)
    expect(labels(periodOptions(player))).toEqual([
      'Any', 'Last 5', 'Last 10', 'Last 20', 'This season', 'Last season', 'Playoffs', 'Career',
    ])
    expect(offersLastN(player)).toBe(true)
  })

  it('leaders: no All stats, no Turnovers, no Vs player or Without', () => {
    expect(offered(leaders)).toEqual(['stat', 'quarter', 'court', 'opponent', 'result', 'period'])
    expect(labels(statOptions(leaders))).toEqual([
      'Points', 'Rebounds', 'Assists', 'FGA', 'FGM', '3PA', '3PM', 'Steals', 'Blocks', 'Minutes',
    ])
    expect(periodOptions(leaders)).toEqual(periodOptions(player))
    expect(offersLastN(leaders)).toBe(true)
  })

  it('league leaders: no "last N games"', () => {
    expect(labels(periodOptions(league))).toEqual(['Any', 'This season', 'Last season', 'Playoffs', 'Career'])
    expect(offersLastN(league)).toBe(false)
  })

  it('game by game: the same as player averages', () => {
    expect(offered(gameLog)).toEqual(offered(player))
    expect(statOptions(gameLog)).toEqual(statOptions(player))
    expect(periodOptions(gameLog)).toEqual(periodOptions(player))
    expect(offersLastN(gameLog)).toBe(true)
  })

  it('the view is ignored in leaders mode', () => {
    expect(offered({ ...leaders, view: 'gamelog' })).toEqual(offered(leaders))
  })
})
