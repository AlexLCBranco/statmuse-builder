import { describe, expect, it } from 'vitest'

import {
  buildQuestion,
  CLEARED_QUERY,
  DEFAULT_QUERY,
  effectivePeriod,
  hasPlayer,
  parseLastN,
  questionParts,
  type QueryState,
} from './query'

const q = (overrides: Partial<QueryState>): QueryState => ({ ...CLEARED_QUERY, player: 'Jayson Tatum', ...overrides })

describe('buildQuestion', () => {
  it('builds the default example question', () => {
    expect(buildQuestion(DEFAULT_QUERY)).toBe('LeBron James stats last 10 games')
  })

  it('uses just player and stat when no filters are set', () => {
    expect(buildQuestion(q({}))).toBe('Jayson Tatum stats')
  })

  it.each([
    [{ stat: 'points' }, 'Jayson Tatum points'],
    [{ stat: 'points rebounds assists' }, 'Jayson Tatum points rebounds assists'],
    [{ quarter: 'in the 4th quarter' }, 'Jayson Tatum stats in the 4th quarter'],
    [{ quarter: 'in the 1st half' }, 'Jayson Tatum stats in the 1st half'],
    [{ court: 'at home' }, 'Jayson Tatum stats at home'],
    [{ court: 'on the road' }, 'Jayson Tatum stats on the road'],
    [{ opponent: 'Lakers' }, 'Jayson Tatum stats vs Lakers'],
    [{ opponent: 'Trail Blazers' }, 'Jayson Tatum stats vs Trail Blazers'],
    [{ vsPlayer: 'Kon Knueppel' }, 'Jayson Tatum stats vs Kon Knueppel'],
    [{ without: 'Jaylen Brown' }, 'Jayson Tatum stats without Jaylen Brown'],
    [{ result: 'in wins' }, 'Jayson Tatum stats in wins'],
    [{ result: 'in losses' }, 'Jayson Tatum stats in losses'],
    [{ period: 'career' }, 'Jayson Tatum stats career'],
    [{ period: 'in the playoffs' }, 'Jayson Tatum stats in the playoffs'],
  ])('adds a single filter %o', (overrides, expected) => {
    expect(buildQuestion(q(overrides))).toBe(expected)
  })

  it('orders every filter: stat, quarter, court, opponent, result, period', () => {
    const all = q({
      stat: 'assists',
      quarter: 'in the 4th quarter',
      court: 'on the road',
      opponent: 'Lakers',
      result: 'in wins',
      period: 'this season',
    })
    expect(buildQuestion(all)).toBe(
      'Jayson Tatum assists in the 4th quarter on the road vs Lakers in wins this season',
    )
  })

  it('puts the opponent player right after the opponent team', () => {
    expect(buildQuestion(q({ stat: 'points', opponent: 'Hornets', vsPlayer: 'Kon Knueppel', result: 'in wins' }))).toBe(
      'Jayson Tatum points vs Hornets vs Kon Knueppel in wins',
    )
  })

  it('trims spaces around a typed opponent player', () => {
    expect(buildQuestion(q({ vsPlayer: '  Kon Knueppel ' }))).toBe('Jayson Tatum stats vs Kon Knueppel')
    expect(buildQuestion(q({ vsPlayer: '   ' }))).toBe('Jayson Tatum stats')
  })

  it('puts "without" after the vs parts and before the result', () => {
    expect(
      buildQuestion(q({ stat: 'points', opponent: 'Lakers', vsPlayer: 'LeBron James', without: 'Jaylen Brown', result: 'in wins' })),
    ).toBe('Jayson Tatum points vs Lakers vs LeBron James without Jaylen Brown in wins')
  })

  it('trims spaces around a typed "without" player', () => {
    expect(buildQuestion(q({ without: ' Jaylen Brown  ' }))).toBe('Jayson Tatum stats without Jaylen Brown')
    expect(buildQuestion(q({ without: '  ' }))).toBe('Jayson Tatum stats')
  })

  it('combines some filters and skips the empty ones', () => {
    expect(buildQuestion(q({ stat: 'blocks', court: 'at home', period: 'last 5 games' }))).toBe(
      'Jayson Tatum blocks at home last 5 games',
    )
    expect(buildQuestion(q({ quarter: 'in the 2nd half', result: 'in losses' }))).toBe(
      'Jayson Tatum stats in the 2nd half in losses',
    )
  })

  it('trims spaces around a typed player name', () => {
    expect(buildQuestion(q({ player: '  Any Name Typed  ' }))).toBe('Any Name Typed stats')
  })

  it('accepts names that are not in the suggestion list', () => {
    expect(buildQuestion(q({ player: 'Michael Jordan', period: 'career' }))).toBe('Michael Jordan stats career')
  })

  it('leaves the player out when it is empty', () => {
    expect(buildQuestion(q({ player: '', period: 'career' }))).toBe('stats career')
  })
})

describe('last N games', () => {
  it('overrides the period chip', () => {
    const query = q({ period: 'career', lastN: '7' })
    expect(effectivePeriod(query)).toBe('last 7 games')
    expect(buildQuestion(query)).toBe('Jayson Tatum stats last 7 games')
  })

  it('stays in the period slot after the other filters', () => {
    expect(buildQuestion(q({ lastN: '15', opponent: 'Heat', result: 'in wins' }))).toBe(
      'Jayson Tatum stats vs Heat in wins last 15 games',
    )
  })

  it('falls back to the period chip when empty', () => {
    expect(effectivePeriod(q({ period: 'last season', lastN: '' }))).toBe('last season')
  })
})

describe('parseLastN', () => {
  it.each([
    ['7', '7'],
    ['15', '15'],
    ['82', '82'],
    ['200', '82'],
    ['007', '7'],
    ['1a2', '12'],
    ['0', ''],
    ['', ''],
    ['abc', ''],
    ['-3', '3'],
  ])('%j -> %j', (raw, expected) => {
    expect(parseLastN(raw)).toBe(expected)
  })
})

describe('questionParts', () => {
  it('marks the player part and keeps it first even when empty', () => {
    expect(questionParts(q({ player: '' }))).toEqual([
      { text: '', isPlayer: true },
      { text: 'stats', isPlayer: false },
    ])
  })
})

describe('hasPlayer', () => {
  it('treats whitespace as no player', () => {
    expect(hasPlayer(q({ player: '   ' }))).toBe(false)
    expect(hasPlayer(q({ player: 'X' }))).toBe(true)
  })
})
