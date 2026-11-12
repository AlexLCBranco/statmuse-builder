import { describe, expect, it } from 'vitest'

import {
  applyFactory,
  currentSelections,
  DEFAULTS_VERSION,
  FACTORY_SELECTIONS,
  parseDefaults,
  startQuery,
  toStored,
} from './defaults'
import { LEAGUE } from './options'
import { buildQuestion, DEFAULT_QUERY, type QueryState, type Selections } from './query'

const q = (overrides: Partial<QueryState>): QueryState => ({ ...DEFAULT_QUERY, ...overrides })

const CHOSEN: Selections = {
  mode: 'player',
  view: 'averages',
  stat: 'points',
  quarter: 'in the 4th quarter',
  court: 'at home',
  result: 'in wins',
  period: 'last 10 games',
  lastN: '',
}

/** What a reload does: save, turn into JSON and back, parse. */
const roundTrip = (query: QueryState) =>
  parseDefaults(JSON.parse(JSON.stringify(toStored(currentSelections(query)))) as unknown)

describe('FACTORY_SELECTIONS', () => {
  it('is the button rows of the default query', () => {
    expect(FACTORY_SELECTIONS).toEqual({
      mode: 'player',
      view: 'averages',
      stat: 'stats',
      quarter: '',
      court: '',
      result: '',
      period: '',
      lastN: '',
    })
  })
})

describe('currentSelections', () => {
  it('takes the button rows and leaves out every box', () => {
    const query = q({ ...CHOSEN, player: 'LeBron James', team: 'Lakers', opponent: 'Heat', vsPlayer: 'Kevin Durant', without: 'Luka Doncic' })
    expect(currentSelections(query)).toEqual(CHOSEN)
  })

  it('saves a filled-in "last N" instead of the period chip under it', () => {
    expect(currentSelections(q({ period: 'career', lastN: '7' }))).toMatchObject({ period: '', lastN: '7' })
  })

  it('saves the stat that is pressed, not one this mode hides', () => {
    expect(currentSelections(q({ mode: 'leaders', stat: 'stats' })).stat).toBe('points')
  })

  it('saves no "last N" or "last 10 games" where the league does not offer them', () => {
    const league = q({ mode: 'leaders', team: LEAGUE, stat: 'points', period: 'last 10 games', lastN: '7' })
    expect(currentSelections(league)).toMatchObject({ period: '', lastN: '' })
  })
})

describe('toStored', () => {
  it('adds the version number', () => {
    expect(toStored(CHOSEN)).toEqual({ version: DEFAULTS_VERSION, ...CHOSEN })
  })
})

describe('parseDefaults', () => {
  it('returns null when nothing usable is saved', () => {
    // `undefined` is what storage gives for a missing key or corrupt JSON.
    for (const saved of [undefined, null, 'x', 7, [], {}]) expect(parseDefaults(saved)).toBeNull()
  })

  it('ignores another version', () => {
    expect(parseDefaults({ ...CHOSEN, version: DEFAULTS_VERSION + 1 })).toBeNull()
    expect(parseDefaults({ ...CHOSEN })).toBeNull()
  })

  it('reads back what was saved', () => {
    expect(roundTrip(q({ ...CHOSEN, player: 'LeBron James' }))).toEqual(CHOSEN)
    const leaders = { ...CHOSEN, mode: 'leaders' as const, view: 'gamelog' as const, period: 'in the playoffs' }
    expect(parseDefaults(toStored(leaders))).toEqual(leaders)
  })

  it('round-trips a custom "last N games"', () => {
    const saved = roundTrip(q({ player: 'LeBron James', period: 'career', lastN: '7' }))
    expect(saved).toMatchObject({ period: '', lastN: '7' })
    expect(buildQuestion({ ...startQuery(saved), player: 'LeBron James' })).toBe('LeBron James stats last 7 games')
  })

  it('uses the factory default for a value that is not an option of its row', () => {
    const saved = { ...toStored(CHOSEN), stat: 'points rebounds assists', court: 'on the moon', mode: 'coach' }
    expect(parseDefaults(saved)).toEqual({ ...CHOSEN, stat: 'stats', court: '', mode: 'player' })
  })

  it('uses the factory default for a missing or non-text value', () => {
    expect(parseDefaults({ version: DEFAULTS_VERSION, quarter: 4, result: null, view: ['gamelog'] })).toEqual(FACTORY_SELECTIONS)
    expect(parseDefaults({ version: DEFAULTS_VERSION, result: 'in wins' })).toEqual({ ...FACTORY_SELECTIONS, result: 'in wins' })
  })

  it('drops a "last N" the box would not accept', () => {
    for (const lastN of ['0', '83', '-3', '7.5', 'abc', '07', 7]) {
      expect(parseDefaults({ ...toStored(CHOSEN), lastN })?.lastN).toBe('')
    }
    expect(parseDefaults({ ...toStored(CHOSEN), lastN: '82' })?.lastN).toBe('82')
  })

  it('never saves or restores a box', () => {
    const saved = parseDefaults({ ...toStored(CHOSEN), player: 'LeBron James', opponent: 'Heat', vsPlayer: 'X', without: 'Y', team: 'Lakers' })
    expect(saved).toEqual(CHOSEN)
    expect(startQuery(saved)).toMatchObject({ player: '', team: '', opponent: '', vsPlayer: '', without: '' })
  })
})

describe('startQuery', () => {
  it('is the factory query when nothing is saved', () => {
    expect(startQuery(null)).toEqual(DEFAULT_QUERY)
  })

  it('lays the saved defaults over the factory ones', () => {
    expect(startQuery(CHOSEN)).toEqual({ ...DEFAULT_QUERY, ...CHOSEN })
  })
})

describe('applyFactory', () => {
  it('puts the button rows back and keeps the boxes', () => {
    const query = q({ ...CHOSEN, mode: 'leaders', lastN: '7', player: 'LeBron James', team: 'Lakers', opponent: 'Heat' })
    expect(applyFactory(query)).toEqual({ ...DEFAULT_QUERY, player: 'LeBron James', team: 'Lakers', opponent: 'Heat' })
  })
})
