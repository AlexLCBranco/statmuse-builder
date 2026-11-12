import { describe, expect, it } from 'vitest'

import { LEAGUE_OPTION, TEAMS } from './options'
import { exactTeam, findTeams, isExactOption, optionMatches, TEAM_CITIES } from './teamSearch'

describe('findTeams', () => {
  it('returns every team for empty input', () => {
    expect(findTeams('')).toEqual(TEAMS)
    expect(findTeams('   ')).toEqual(TEAMS)
  })

  it('narrows by nickname as you type', () => {
    expect(findTeams('ja')).toEqual(['Jazz'])
    expect(findTeams('la')).toEqual(['Lakers', 'Trail Blazers', 'Clippers'])
    expect(findTeams('blazers')).toEqual(['Trail Blazers'])
  })

  it('finds teams by city, after nickname matches', () => {
    expect(findTeams('utah')).toEqual(['Jazz'])
    expect(findTeams('los angeles')).toEqual(['Clippers', 'Lakers'])
    expect(findTeams('okc')).toEqual(['Thunder'])
    expect(findTeams('new')).toEqual(['Knicks', 'Pelicans'])
  })

  it('ignores case and punctuation', () => {
    expect(findTeams('76')).toEqual(['76ers'])
    expect(findTeams('TRAIL-BL')).toEqual(['Trail Blazers'])
  })

  it('returns nothing for no match', () => {
    expect(findTeams('zzz')).toEqual([])
  })

  it('has a city for every team', () => {
    expect(TEAMS.filter((team) => !TEAM_CITIES[team])).toEqual([])
  })
})

describe('exactTeam', () => {
  it('matches a full nickname in any case', () => {
    expect(exactTeam('jazz')).toBe('Jazz')
    expect(exactTeam(' trail blazers ')).toBe('Trail Blazers')
  })

  it('returns null for partial or unknown names', () => {
    expect(exactTeam('jaz')).toBeNull()
    expect(exactTeam('Utah')).toBeNull()
    expect(exactTeam('')).toBeNull()
  })
})

describe('the League (NBA) entry', () => {
  it('matches the start of any word of its label', () => {
    expect(optionMatches(LEAGUE_OPTION, 'lea')).toBe(true)
    expect(optionMatches(LEAGUE_OPTION, 'NBA')).toBe(true)
    expect(optionMatches(LEAGUE_OPTION, 'ague')).toBe(false)
    expect(optionMatches(LEAGUE_OPTION, 'lakers')).toBe(false)
    expect(optionMatches(LEAGUE_OPTION, '')).toBe(false)
  })

  it('is exact by label or by value, any case', () => {
    expect(isExactOption(LEAGUE_OPTION, 'nba')).toBe(true)
    expect(isExactOption(LEAGUE_OPTION, 'League (NBA)')).toBe(true)
    expect(isExactOption(LEAGUE_OPTION, 'league')).toBe(false)
    expect(isExactOption(LEAGUE_OPTION, '')).toBe(false)
  })
})
