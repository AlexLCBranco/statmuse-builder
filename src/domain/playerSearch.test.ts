import { describe, expect, it } from 'vitest'

import { PLAYERS, PLAYERS_SEASON } from './data/players'
import { findPlayers, highlightRange, matchRank, normalizeName } from './playerSearch'

describe('normalizeName', () => {
  it('lowercases, drops accents and punctuation, splits hyphens', () => {
    expect(normalizeName('Luka Dončić')).toBe('luka doncic')
    expect(normalizeName("De'Aaron Fox")).toBe('deaaron fox')
    expect(normalizeName('P.J. Tucker')).toBe('pj tucker')
    expect(normalizeName('Shai Gilgeous-Alexander')).toBe('shai gilgeous alexander')
  })
})

describe('matchRank', () => {
  it('ranks full-name prefix < word prefix < inside a word', () => {
    expect(matchRank('LeBron James', 'leb')).toBe(0)
    expect(matchRank('LeBron James', 'jam')).toBe(1)
    expect(matchRank('LeBron James', 'bron')).toBe(2)
    expect(matchRank('LeBron James', 'zzz')).toBeNull()
  })
})

describe('findPlayers', () => {
  const list = ['Jaylen Brown', 'Bruce Brown', 'Brandon Ingram', 'Mikal Bridges', 'Dillon Brooks']
  // Fixed names, so these tests don't break when the synced roster changes.
  const names = [
    "De'Aaron Fox",
    'P.J. Tucker',
    'Luka Doncic',
    'Nickeil Alexander-Walker',
    'Shai Gilgeous-Alexander',
    'LeBron James',
    'Stephen Curry',
    'Anthony Davis',
    'Jamal Murray',
    'Paolo Banchero',
  ]

  it('returns nothing for an empty or blank search', () => {
    expect(findPlayers(list, '')).toEqual([])
    expect(findPlayers(list, '   ')).toEqual([])
  })

  it('puts full-name prefixes first, then word prefixes, then inside matches', () => {
    // "bro": Brown/Brooks start a word; nothing starts the full name.
    expect(findPlayers(['Ayo Brooks', 'Abro Smith', 'Bron Ayo'], 'bro')).toEqual([
      'Bron Ayo',
      'Ayo Brooks',
      'Abro Smith',
    ])
  })

  it('keeps list order for equal ranks', () => {
    expect(findPlayers(list, 'br')).toEqual([
      'Bruce Brown',
      'Brandon Ingram',
      'Jaylen Brown',
      'Mikal Bridges',
      'Dillon Brooks',
    ])
  })

  it('limits the number of suggestions', () => {
    expect(findPlayers(names, 'a')).toHaveLength(8)
    expect(findPlayers(names, 'a', 3)).toHaveLength(3)
  })

  it('ignores case, accents, apostrophes and periods in what was typed', () => {
    expect(findPlayers(names, 'DEAARON')).toEqual(["De'Aaron Fox"])
    expect(findPlayers(names, "de'aa")).toEqual(["De'Aaron Fox"])
    expect(findPlayers(names, 'pj tuc')).toEqual(['P.J. Tucker'])
    expect(findPlayers(names, 'P.J. Tu')).toEqual(['P.J. Tucker'])
    expect(findPlayers(names, 'dončić')).toEqual(['Luka Doncic'])
  })

  it('finds the second half of hyphenated names as a word', () => {
    expect(findPlayers(names, 'alexander')).toEqual(['Nickeil Alexander-Walker', 'Shai Gilgeous-Alexander'])
    expect(matchRank('Shai Gilgeous-Alexander', 'alexander')).toBe(1)
  })

  it('treats repeated spaces as one', () => {
    expect(findPlayers(names, 'lebron   james')).toEqual(['LeBron James'])
  })

  it('finds well-known players by first name', () => {
    expect(findPlayers(names, 'lebr')).toEqual(['LeBron James'])
    expect(findPlayers(names, 'steph')[0]).toBe('Stephen Curry')
  })
})

describe('highlightRange', () => {
  it('finds the typed text inside the name', () => {
    expect(highlightRange('LeBron James', 'jam')).toEqual([7, 10])
    expect(highlightRange('Shai Gilgeous-Alexander', 'alex')).toEqual([14, 18])
  })

  it('gives up when normalizing changed the name length', () => {
    expect(highlightRange("De'Aaron Fox", 'fox')).toBeNull()
  })

  it('returns null for no match or empty input', () => {
    expect(highlightRange('LeBron James', 'zzz')).toBeNull()
    expect(highlightRange('LeBron James', '')).toBeNull()
  })
})

describe('player data', () => {
  it('is a current, deduplicated roster list', () => {
    expect(PLAYERS_SEASON).toBe('2026-27')
    expect(PLAYERS.length).toBeGreaterThan(400)
    expect(new Set(PLAYERS).size).toBe(PLAYERS.length)
  })

  it('has well-known current players, with accents stripped', () => {
    for (const name of ['LeBron James', 'Victor Wembanyama', 'Cooper Flagg', 'Nikola Jokic']) {
      expect(PLAYERS).toContain(name)
    }
    expect(PLAYERS.every((n) => /^[ -~]+$/.test(n))).toBe(true)
  })
})
