import { describe, expect, it } from 'vitest'

import { PLAYERS } from './data/players-2023-24'
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
    expect(findPlayers(PLAYERS, 'a')).toHaveLength(8)
    expect(findPlayers(PLAYERS, 'a', 3)).toHaveLength(3)
  })

  it('ignores case, accents, apostrophes and periods in what was typed', () => {
    expect(findPlayers(PLAYERS, 'DEAARON')).toEqual(["De'Aaron Fox"])
    expect(findPlayers(PLAYERS, "de'aa")).toEqual(["De'Aaron Fox"])
    expect(findPlayers(PLAYERS, 'pj tuc')).toEqual(['P.J. Tucker'])
    expect(findPlayers(PLAYERS, 'P.J. Tu')).toEqual(['P.J. Tucker'])
    expect(findPlayers(PLAYERS, 'dončić')).toEqual(['Luka Doncic'])
  })

  it('finds the second half of hyphenated names as a word', () => {
    expect(findPlayers(PLAYERS, 'alexander')).toEqual(['Nickeil Alexander-Walker', 'Shai Gilgeous-Alexander'])
    expect(matchRank('Shai Gilgeous-Alexander', 'alexander')).toBe(1)
  })

  it('treats repeated spaces as one', () => {
    expect(findPlayers(PLAYERS, 'lebron   james')).toEqual(['LeBron James'])
  })

  it('finds well-known players from the full list by first name', () => {
    expect(findPlayers(PLAYERS, 'lebr')).toEqual(['LeBron James'])
    expect(findPlayers(PLAYERS, 'steph')[0]).toBe('Stephen Curry')
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
  it('has the 536 unique 2023-24 names', () => {
    expect(PLAYERS).toHaveLength(536)
    expect(new Set(PLAYERS).size).toBe(536)
  })
})
