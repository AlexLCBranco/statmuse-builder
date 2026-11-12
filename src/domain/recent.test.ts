import { describe, expect, it } from 'vitest'

import { DEFAULT_QUERY, type QueryState } from './query'
import {
  addRecent,
  canPin,
  MAX_PINNED,
  MAX_RECENT,
  parseRecent,
  pin,
  recentPlayers,
  recentSearches,
  recentTeams,
  recordAsk,
  removeRecent,
  unpin,
  type RecentSearch,
  type Saved,
} from './recent'

const entry = (question: string, query: Partial<QueryState> = {}): RecentSearch => ({
  question,
  query: { ...DEFAULT_QUERY, ...query },
})
const questions = (list: readonly RecentSearch[]) => list.map((r) => r.question)

describe('addRecent', () => {
  it('puts the newest first', () => {
    expect(questions(addRecent([entry('a')], entry('b')))).toEqual(['b', 'a'])
  })

  it('moves a repeated question to the top instead of duplicating it', () => {
    const list = [entry('a'), entry('b'), entry('c')]
    expect(questions(addRecent(list, entry('c')))).toEqual(['c', 'a', 'b'])
  })

  it(`keeps at most ${MAX_RECENT}`, () => {
    let list: RecentSearch[] = []
    for (let i = 0; i < 20; i++) list = addRecent(list, entry(`q${i}`))
    expect(list).toHaveLength(MAX_RECENT)
    expect(list[0]?.question).toBe('q19')
    expect(list.at(-1)?.question).toBe('q8')
  })
})

describe('removeRecent', () => {
  it('removes only the given row', () => {
    const list = [entry('a'), entry('b'), entry('c')]
    expect(questions(removeRecent(list, 1))).toEqual(['a', 'c'])
  })
})

describe('pin / unpin', () => {
  const saved: Saved = { recent: [entry('a'), entry('b'), entry('c')], pinned: [entry('p')] }

  it('pin moves a Recent row to the end of Pinned', () => {
    const next = pin(saved, 'b')
    expect(questions(next.recent)).toEqual(['a', 'c'])
    expect(questions(next.pinned)).toEqual(['p', 'b'])
  })

  it('unpin returns the row to the top of Recent', () => {
    const next = unpin(pin(saved, 'b'), 'b')
    expect(questions(next.recent)).toEqual(['b', 'a', 'c'])
    expect(questions(next.pinned)).toEqual(['p'])
  })

  it('ignores a question that is not there', () => {
    expect(pin(saved, 'zzz')).toBe(saved)
    expect(unpin(saved, 'a')).toBe(saved)
  })

  it(`pins do not count toward the ${MAX_RECENT} recents and never expire`, () => {
    let next: Saved = { recent: [], pinned: [entry('keep')] }
    for (let i = 0; i < 30; i++) next = recordAsk(next, entry(`q${i}`))
    expect(next.recent).toHaveLength(MAX_RECENT)
    expect(questions(next.pinned)).toEqual(['keep'])
  })

  it('asking a pinned question again does not copy it into Recent', () => {
    expect(recordAsk(saved, entry('p'))).toBe(saved)
    expect(questions(recordAsk(saved, entry('new')).recent)).toEqual(['new', 'a', 'b', 'c'])
  })

  it(`stops at ${MAX_PINNED} pins`, () => {
    const full: Saved = {
      recent: [entry('one more')],
      pinned: Array.from({ length: MAX_PINNED }, (_, i) => entry(`p${i}`)),
    }
    expect(canPin(full)).toBe(false)
    expect(pin(full, 'one more')).toBe(full)
    expect(canPin(saved)).toBe(true)
  })
})

describe('recent players, teams and searches', () => {
  const list = [
    entry('LeBron James stats', { player: 'LeBron James' }),
    entry('Lakers points leaders', { mode: 'leaders', team: 'Lakers', player: 'Ignored Name' }),
    entry('LeBron James points', { player: ' LeBron James ' }),
    entry('Stephen Curry game log', { player: 'Stephen Curry', view: 'gamelog' }),
    entry('NBA assists leaders', { mode: 'leaders', team: 'NBA' }),
    entry('Lakers assists leaders', { mode: 'leaders', team: 'Lakers' }),
  ]

  it('recentPlayers: unique names from player-mode searches, newest first', () => {
    expect(recentPlayers(list)).toEqual(['LeBron James', 'Stephen Curry'])
  })

  it('recentTeams: unique teams from leaders searches', () => {
    expect(recentTeams(list)).toEqual(['Lakers', 'NBA'])
  })

  it('recentSearches: full questions of one mode', () => {
    expect(questions(recentSearches(list, 'player'))).toEqual([
      'LeBron James stats',
      'LeBron James points',
      'Stephen Curry game log',
    ])
    expect(questions(recentSearches(list, 'leaders'))).toEqual([
      'Lakers points leaders',
      'NBA assists leaders',
      'Lakers assists leaders',
    ])
  })

  it('each stops at 5', () => {
    const many = Array.from({ length: 9 }, (_, i) => entry(`q${i}`, { player: `Player ${i}` }))
    expect(recentPlayers(many)).toEqual(['Player 0', 'Player 1', 'Player 2', 'Player 3', 'Player 4'])
    expect(recentSearches(many, 'player')).toHaveLength(5)
  })

  it('skips entries with no name', () => {
    expect(recentPlayers([entry('stats', { player: '  ' })])).toEqual([])
  })
})

describe('parseRecent', () => {
  it('returns [] for anything that is not an array', () => {
    expect(parseRecent(null)).toEqual([])
    expect(parseRecent('oops')).toEqual([])
    expect(parseRecent({ question: 'x' })).toEqual([])
  })

  it('skips malformed rows and fills missing fields with defaults', () => {
    const saved = [null, { question: 42, query: {} }, { question: 'ok', query: { player: 'Bam Adebayo', stat: 7 } }]
    expect(parseRecent(saved)).toEqual([{ question: 'ok', query: { ...DEFAULT_QUERY, player: 'Bam Adebayo' } }])
  })

  it('defaults mode, team and view for entries saved before v0.7', () => {
    // Exactly what v0.6.1 wrote to localStorage.
    const old = [
      {
        question: 'LeBron James stats last 10 games',
        query: {
          player: 'LeBron James',
          stat: 'stats',
          quarter: '',
          court: '',
          opponent: '',
          vsPlayer: '',
          without: '',
          period: 'last 10 games',
          lastN: '',
          result: '',
        },
      },
    ]
    expect(parseRecent(old)).toEqual([
      {
        question: 'LeBron James stats last 10 games',
        query: { ...DEFAULT_QUERY, player: 'LeBron James', period: 'last 10 games' },
      },
    ])
    expect(parseRecent(old)[0]?.query).toMatchObject({ mode: 'player', view: 'averages', team: '' })
  })

  it('falls back to the defaults for an unknown mode or view', () => {
    const saved = [{ question: 'x', query: { mode: 'coach', view: 'chart', team: 'Lakers' } }]
    expect(parseRecent(saved)[0]?.query).toMatchObject({ mode: 'player', view: 'averages', team: 'Lakers' })
  })

  it('round-trips a saved list, including leaders and game log entries', () => {
    const list = [entry('a'), entry('b', { mode: 'leaders', team: 'Lakers', stat: 'points' }), entry('c', { view: 'gamelog' })]
    expect(parseRecent(JSON.parse(JSON.stringify(list)))).toEqual(list)
  })

  it('caps the list at the given size', () => {
    const many = Array.from({ length: 20 }, (_, i) => entry(`q${i}`))
    expect(parseRecent(many)).toHaveLength(MAX_RECENT)
    expect(parseRecent(many, 3)).toHaveLength(3)
  })
})
