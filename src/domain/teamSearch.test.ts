import { describe, expect, it } from 'vitest'

import { TEAMS } from './options'
import { exactTeam, findTeams, TEAM_CITIES } from './teamSearch'

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
