import { describe, expect, it } from 'vitest'

import { PLAYERS } from './data/players'
import { TEAMS } from './options'
import { findSubjects } from './subjectSearch'

const names = (typed: string, limit?: number) => findSubjects(PLAYERS, typed, limit).map((hit) => hit.name)

describe('findSubjects: players and teams in one list', () => {
  it('finds a team by its StatMuse nickname, marked as a team', () => {
    expect(findSubjects(PLAYERS, 'timb')[0]).toEqual({ name: 'Timberwolves', kind: 'team' })
    expect(findSubjects(PLAYERS, 'Trail Blazers')[0]).toEqual({ name: 'Trail Blazers', kind: 'team' })
    expect(findSubjects(PLAYERS, '76')[0]).toEqual({ name: '76ers', kind: 'team' })
  })

  it('every one of the 30 nicknames finds its team first', () => {
    for (const team of TEAMS) expect(findSubjects(PLAYERS, team)[0], team).toEqual({ name: team, kind: 'team' })
  })

  it('still finds players, marked as players', () => {
    expect(findSubjects(PLAYERS, 'lebron')[0]).toEqual({ name: 'LeBron James', kind: 'player' })
    expect(names('cooper fl')).toEqual(['Cooper Flagg'])
  })

  it('mixes both kinds by how well they match; a team wins a tie', () => {
    expect(findSubjects(['Hector Heat', 'Heath Smith'], 'heat')).toEqual([
      { name: 'Heat', kind: 'team' },
      { name: 'Heath Smith', kind: 'player' },
      { name: 'Hector Heat', kind: 'player' },
    ])
    // A player whose full name starts with it beats a team that only contains it.
    expect(findSubjects(['Ers Smith'], 'ers').map((h) => h.name).slice(0, 2)).toEqual(['Ers Smith', '76ers'])
  })

  it('ranks a city match after name matches', () => {
    expect(findSubjects(['Minnie Sotax'], 'minn')).toEqual([
      { name: 'Minnie Sotax', kind: 'player' },
      { name: 'Timberwolves', kind: 'team' },
    ])
  })

  it('keeps the limit across both kinds, and returns nothing for an empty box', () => {
    expect(names('a')).toHaveLength(8)
    expect(names('a', 3)).toHaveLength(3)
    expect(findSubjects(PLAYERS, '   ')).toEqual([])
  })
})
