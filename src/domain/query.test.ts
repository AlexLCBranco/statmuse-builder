import { describe, expect, it } from 'vitest'

import { FACTORY_SELECTIONS } from './defaults'
import {
  activeFilterCount,
  buildQuestion,
  clearAll,
  DEFAULT_QUERY,
  effectivePeriod,
  isReady,
  isRowDefault,
  parseLastN,
  questionParts,
  resetRow,
  setMode,
  tooManyFilters,
  type QueryState,
} from './query'

/** A player-mode query. */
const q = (overrides: Partial<QueryState>): QueryState => ({ ...DEFAULT_QUERY, player: 'Jayson Tatum', ...overrides })
/** A leaders-mode query. */
const leaders = (overrides: Partial<QueryState>): QueryState => ({
  ...DEFAULT_QUERY,
  mode: 'leaders',
  team: 'Celtics',
  stat: 'points',
  ...overrides,
})
/** A game-by-game query. */
const log = (overrides: Partial<QueryState>): QueryState => q({ player: 'LeBron James', view: 'gamelog', ...overrides })

describe('DEFAULT_QUERY', () => {
  it('starts empty: no player, all stats, every filter on Any', () => {
    expect(DEFAULT_QUERY).toEqual({
      mode: 'player',
      view: 'averages',
      player: '',
      team: '',
      stat: 'stats',
      quarter: '',
      court: '',
      opponent: '',
      vsPlayer: '',
      without: '',
      period: '',
      lastN: '',
      result: '',
    })
    expect(buildQuestion(DEFAULT_QUERY)).toBe('stats')
    expect(isReady(DEFAULT_QUERY)).toBe(false)
  })
})

describe('buildQuestion (player mode)', () => {
  it('uses just player and stat when no filters are set', () => {
    expect(buildQuestion(q({}))).toBe('Jayson Tatum stats')
  })

  it.each([
    [{ stat: 'points' }, 'Jayson Tatum points'],
    [{ stat: 'steals' }, 'Jayson Tatum steals'],
    [{ stat: 'blocks' }, 'Jayson Tatum blocks'],
    [{ stat: 'turnovers' }, 'Jayson Tatum turnovers'],
    [{ stat: 'minutes' }, 'Jayson Tatum minutes'],
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
    expect(buildQuestion(all)).toBe('Jayson Tatum assists in the 4th quarter on the road vs Lakers in wins this season')
  })

  it('puts the opponent player right after the opponent team', () => {
    expect(buildQuestion(q({ stat: 'points', opponent: 'Hornets', vsPlayer: 'Kon Knueppel', result: 'in wins' }))).toBe(
      'Jayson Tatum points vs Hornets vs Kon Knueppel in wins',
    )
  })

  it('puts "without" after the vs parts and before the result', () => {
    expect(
      buildQuestion(q({ stat: 'points', opponent: 'Lakers', vsPlayer: 'LeBron James', without: 'Jaylen Brown', result: 'in wins' })),
    ).toBe('Jayson Tatum points vs Lakers vs LeBron James without Jaylen Brown in wins')
  })

  it('trims spaces around typed names', () => {
    expect(buildQuestion(q({ player: '  Any Name Typed  ' }))).toBe('Any Name Typed stats')
    expect(buildQuestion(q({ vsPlayer: '  Kon Knueppel ' }))).toBe('Jayson Tatum stats vs Kon Knueppel')
    expect(buildQuestion(q({ vsPlayer: '   ' }))).toBe('Jayson Tatum stats')
    expect(buildQuestion(q({ without: ' Jaylen Brown  ' }))).toBe('Jayson Tatum stats without Jaylen Brown')
    expect(buildQuestion(q({ without: '  ' }))).toBe('Jayson Tatum stats')
  })

  it('accepts names that are not in the suggestion list', () => {
    expect(buildQuestion(q({ player: 'Michael Jordan', period: 'career' }))).toBe('Michael Jordan stats career')
  })

  it('leaves the player out when it is empty', () => {
    expect(buildQuestion(q({ player: '', period: 'career' }))).toBe('stats career')
  })
})

describe('buildQuestion (leaders mode)', () => {
  it('asks for "<team> <stat> leaders"', () => {
    expect(buildQuestion(leaders({}))).toBe('Celtics points leaders')
    expect(buildQuestion(leaders({ team: 'Lakers', stat: 'assists', period: 'this season' }))).toBe(
      'Lakers assists leaders this season',
    )
  })

  it.each([
    [{ stat: 'steals' }, 'Celtics steals leaders'],
    [{ stat: 'three pointers made' }, 'Celtics three pointers made leaders'],
    [{ quarter: 'in the 4th quarter' }, 'Celtics points leaders in the 4th quarter'],
    [{ court: 'at home' }, 'Celtics points leaders at home'],
    [{ opponent: 'Warriors' }, 'Celtics points leaders vs Warriors'],
    [{ result: 'in wins' }, 'Celtics points leaders in wins'],
    [{ period: 'last season' }, 'Celtics points leaders last season'],
    [{ period: 'in the playoffs' }, 'Celtics points leaders in the playoffs'],
    [{ lastN: '7' }, 'Celtics points leaders last 7 games'],
  ])('adds a single filter %o', (overrides, expected) => {
    expect(buildQuestion(leaders(overrides))).toBe(expected)
  })

  it('orders the filters: quarter, court, opponent, result, period', () => {
    expect(
      buildQuestion(leaders({ quarter: 'in the 4th quarter', result: 'in wins', period: 'last 10 games' })),
    ).toBe('Celtics points leaders in the 4th quarter in wins last 10 games')
    expect(
      buildQuestion(leaders({ team: 'Lakers', stat: 'rebounds', court: 'at home', opponent: 'Warriors', period: 'last season' })),
    ).toBe('Lakers rebounds leaders at home vs Warriors last season')
  })

  it('leaves Vs player and Without out, but keeps them in the state', () => {
    const query = leaders({ vsPlayer: 'LeBron James', without: 'Jaylen Brown', result: 'in wins' })
    expect(buildQuestion(query)).toBe('Celtics points leaders in wins')
    expect(buildQuestion(setMode(query, 'player'))).toBe('points vs LeBron James without Jaylen Brown in wins')
  })

  it('never asks for "stats leaders" or "turnovers leaders"', () => {
    expect(buildQuestion(leaders({ stat: 'stats' }))).toBe('Celtics points leaders')
    expect(buildQuestion(leaders({ stat: 'turnovers' }))).toBe('Celtics points leaders')
  })

  it('league-wide: "NBA <stat> leaders", without "last N games"', () => {
    const nba = leaders({ team: 'NBA', stat: 'assists' })
    expect(buildQuestion({ ...nba, period: 'this season' })).toBe('NBA assists leaders this season')
    expect(buildQuestion({ ...nba, period: 'last 10 games' })).toBe('NBA assists leaders')
    expect(buildQuestion({ ...nba, lastN: '7', period: 'career' })).toBe('NBA assists leaders career')
  })

  it('is ready with a team, not with a player', () => {
    expect(isReady(leaders({ team: '', player: 'LeBron James' }))).toBe(false)
    expect(isReady(leaders({ team: 'Celtics' }))).toBe(true)
  })
})

describe('buildQuestion (game by game)', () => {
  it('"All stats" is just "game log"', () => {
    expect(buildQuestion(log({ result: 'in wins', period: 'last 5 games' }))).toBe(
      'LeBron James game log in wins last 5 games',
    )
  })

  it('a chosen stat goes before "game log"', () => {
    expect(buildQuestion(log({ stat: 'points', period: 'last 5 games' }))).toBe(
      'LeBron James points game log last 5 games',
    )
    expect(buildQuestion(log({ stat: 'three pointers made' }))).toBe('LeBron James three pointers made game log')
  })

  it.each([
    [{ quarter: 'in the 4th quarter', period: 'last 5 games' }, 'LeBron James game log in the 4th quarter last 5 games'],
    [{ opponent: 'Warriors', period: 'last season' }, 'LeBron James game log vs Warriors last season'],
    [{ lastN: '3' }, 'LeBron James game log last 3 games'],
    [{ court: 'at home', period: 'last 5 games' }, 'LeBron James game log at home last 5 games'],
    [{ vsPlayer: 'Stephen Curry' }, 'LeBron James game log vs Stephen Curry'],
    [{ without: 'Joel Embiid' }, 'LeBron James game log without Joel Embiid'],
    [{ period: 'this season' }, 'LeBron James game log this season'],
    [{ period: 'in the playoffs' }, 'LeBron James game log in the playoffs'],
    [{ period: 'career' }, 'LeBron James game log career'],
  ])('takes every filter the averages view takes %o', (overrides, expected) => {
    expect(buildQuestion(log(overrides))).toBe(expected)
  })

  it('stacks the filters in the same order as averages', () => {
    const all = {
      stat: 'three pointers made',
      court: 'at home',
      opponent: 'Warriors',
      vsPlayer: 'Stephen Curry',
      result: 'in wins',
      period: 'career',
    }
    expect(buildQuestion(log(all))).toBe(
      'LeBron James three pointers made game log at home vs Warriors vs Stephen Curry in wins career',
    )
  })

  it('only applies in player mode', () => {
    expect(buildQuestion(leaders({ view: 'gamelog' }))).toBe('Celtics points leaders')
  })
})

describe('setMode', () => {
  it('turns "All stats" into points when switching to leaders', () => {
    expect(setMode(q({ stat: 'stats' }), 'leaders').stat).toBe('points')
    expect(setMode(q({ stat: 'turnovers' }), 'leaders').stat).toBe('points')
  })

  it('keeps a stat both modes offer', () => {
    expect(setMode(q({ stat: 'rebounds' }), 'leaders').stat).toBe('rebounds')
    expect(setMode(leaders({ stat: 'blocks' }), 'player').stat).toBe('blocks')
  })

  it('keeps every other filter, and each mode keeps its own player/team', () => {
    const query = q({ quarter: 'in the 4th quarter', court: 'at home', opponent: 'Heat', result: 'in wins', lastN: '7', team: 'Lakers' })
    const switched = setMode(query, 'leaders')
    expect(switched).toEqual({ ...query, mode: 'leaders', stat: 'points' })
    expect(buildQuestion(switched)).toBe('Lakers points leaders in the 4th quarter at home vs Heat in wins last 7 games')
    expect(setMode(switched, 'player').player).toBe('Jayson Tatum')
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

describe('row reset', () => {
  const full = q({
    stat: 'points',
    quarter: 'in the 4th quarter',
    court: 'at home',
    opponent: 'Heat',
    vsPlayer: 'Bam Adebayo',
    without: 'Jaylen Brown',
    result: 'in wins',
    period: 'career',
    lastN: '7',
  })

  it('knows when a row is at its default', () => {
    for (const key of ['stat', 'quarter', 'court', 'opponent', 'vsPlayer', 'without', 'result', 'period'] as const) {
      expect(isRowDefault(q({}), key)).toBe(true)
      expect(isRowDefault(full, key)).toBe(false)
    }
    expect(isRowDefault(q({ lastN: '7' }), 'period')).toBe(false)
  })

  it('the default stat is "All stats" for a player and points for leaders', () => {
    expect(isRowDefault(leaders({ stat: 'points' }), 'stat')).toBe(true)
    expect(isRowDefault(leaders({ stat: 'assists' }), 'stat')).toBe(false)
    expect(isRowDefault(q({ stat: 'points' }), 'stat')).toBe(false)
  })

  it.each(['quarter', 'court', 'opponent', 'vsPlayer', 'without', 'result'] as const)('resets only the %s row', (key) => {
    expect(resetRow(full, key)).toEqual({ ...full, [key]: '' })
  })

  it('resets the stat to the default of the mode', () => {
    expect(resetRow(full, 'stat')).toEqual({ ...full, stat: 'stats' })
    expect(resetRow(leaders({ stat: 'assists' }), 'stat').stat).toBe('points')
  })

  it('resetting Period also clears "last N"', () => {
    expect(resetRow(full, 'period')).toEqual({ ...full, period: '', lastN: '' })
  })
})

describe('clearAll', () => {
  it('resets everything except mode and view', () => {
    const query = log({ quarter: 'in the 4th quarter', opponent: 'Heat', lastN: '7', team: 'Lakers' })
    expect(clearAll(query)).toEqual({ ...DEFAULT_QUERY, view: 'gamelog' })
  })

  it('puts the button rows back to the saved defaults, and still empties the boxes', () => {
    const defaults = { ...FACTORY_SELECTIONS, stat: 'assists', quarter: 'in the 4th quarter', result: 'in wins', lastN: '7' }
    const query = q({ stat: 'points', court: 'at home', opponent: 'Heat', vsPlayer: 'LeBron James', without: 'Al Horford', period: 'career' })
    expect(clearAll(query, defaults)).toEqual({ ...DEFAULT_QUERY, ...defaults })
  })

  it('keeps the current mode and view, whatever the saved defaults say', () => {
    const defaults = { ...FACTORY_SELECTIONS, mode: 'leaders' as const, stat: 'rebounds' }
    expect(clearAll(log({ result: 'in wins' }), defaults)).toEqual({ ...DEFAULT_QUERY, view: 'gamelog', stat: 'rebounds' })
  })

  it('a saved stat this mode does not offer becomes the mode default', () => {
    const defaults = { ...FACTORY_SELECTIONS, stat: 'turnovers' }
    expect(clearAll(leaders({}), defaults).stat).toBe('points')
  })

  it('keeps leaders mode, with points as the stat', () => {
    expect(clearAll(leaders({ stat: 'assists', result: 'in wins' }))).toEqual({
      ...DEFAULT_QUERY,
      mode: 'leaders',
      stat: 'points',
    })
  })
})

describe('tooManyFilters', () => {
  const both = { vsPlayer: 'LeBron James', without: 'Stephen Curry' }

  it('warns on the known failing case: team + vs player + without + wins', () => {
    const query = q({ ...both, opponent: 'Lakers', result: 'in wins' })
    expect(activeFilterCount(query)).toBe(4)
    expect(tooManyFilters(query)).toBe(true)
  })

  it('does not warn with fewer than 4 filters', () => {
    expect(tooManyFilters(q({ ...both, opponent: 'Lakers' }))).toBe(false)
    expect(tooManyFilters(q(both))).toBe(false)
  })

  it('does not warn unless Vs player and Without are both set', () => {
    const four = { quarter: 'in the 4th quarter', court: 'at home', opponent: 'Lakers', result: 'in wins' }
    expect(tooManyFilters(q(four))).toBe(false)
    expect(tooManyFilters(q({ ...four, vsPlayer: 'LeBron James' }))).toBe(false)
    expect(tooManyFilters(q({ ...four, ...both }))).toBe(true)
  })

  it('counts "last N" as the period filter, and not the stat', () => {
    expect(tooManyFilters(q({ ...both, stat: 'points', result: 'in wins' }))).toBe(false)
    expect(tooManyFilters(q({ ...both, result: 'in wins', lastN: '5' }))).toBe(true)
  })

  it('ignores filters the mode hides', () => {
    expect(tooManyFilters(leaders({ ...both, opponent: 'Lakers', result: 'in wins' }))).toBe(false)
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
  it('marks the subject part and keeps it first even when empty', () => {
    expect(questionParts(q({ player: '' }))).toEqual([
      { text: '', isSubject: true },
      { text: 'stats', isSubject: false },
    ])
    expect(questionParts(leaders({}))[0]).toEqual({ text: 'Celtics', isSubject: true })
  })
})

describe('isReady', () => {
  it('treats whitespace as no player', () => {
    expect(isReady(q({ player: '   ' }))).toBe(false)
    expect(isReady(q({ player: 'X' }))).toBe(true)
  })
})
