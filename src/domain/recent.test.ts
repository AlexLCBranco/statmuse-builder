import { describe, expect, it } from 'vitest'

import { DEFAULT_QUERY } from './query'
import { addRecent, MAX_RECENT, parseRecent, removeRecent, type RecentSearch } from './recent'

const entry = (question: string): RecentSearch => ({ question, query: { ...DEFAULT_QUERY } })

describe('addRecent', () => {
  it('puts the newest first', () => {
    expect(addRecent([entry('a')], entry('b')).map((r) => r.question)).toEqual(['b', 'a'])
  })

  it('moves a repeated question to the top instead of duplicating it', () => {
    const list = [entry('a'), entry('b'), entry('c')]
    expect(addRecent(list, entry('c')).map((r) => r.question)).toEqual(['c', 'a', 'b'])
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
    expect(removeRecent(list, 1).map((r) => r.question)).toEqual(['a', 'c'])
  })
})

describe('parseRecent', () => {
  it('returns [] for anything that is not an array', () => {
    expect(parseRecent(null)).toEqual([])
    expect(parseRecent('oops')).toEqual([])
    expect(parseRecent({ question: 'x' })).toEqual([])
  })

  it('skips malformed rows and fills missing fields with defaults', () => {
    const saved = [
      null,
      { question: 42, query: {} },
      { question: 'ok', query: { player: 'Bam Adebayo', stat: 7 } },
    ]
    expect(parseRecent(saved)).toEqual([{ question: 'ok', query: { ...DEFAULT_QUERY, player: 'Bam Adebayo' } }])
  })

  it('round-trips a saved list', () => {
    const list = [entry('a'), entry('b')]
    expect(parseRecent(JSON.parse(JSON.stringify(list)))).toEqual(list)
  })
})
