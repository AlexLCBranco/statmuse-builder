import { describe, expect, it } from 'vitest'

import { LEAGUE, TEAMS } from './options'
import { DEFAULT_QUERY, type QueryState } from './query'
import { ROTATIONKIT, TEAM_TRICODES, rotationsLink } from './rotations'

const player = (name: string, extra: Partial<QueryState> = {}): QueryState => ({ ...DEFAULT_QUERY, player: name, ...extra })
const leaders = (team: string): QueryState => ({ ...DEFAULT_QUERY, mode: 'leaders', team })

describe('rotationsLink: player mode', () => {
  it('links a player by name', () => {
    expect(rotationsLink(player('LeBron James'))).toEqual({
      label: 'LeBron James rotations',
      href: `${ROTATIONKIT}#/player?name=LeBron%20James`,
    })
  })

  it('encodes accents, apostrophes and spaces', () => {
    expect(rotationsLink(player('Nikola Jokić')).href).toBe(`${ROTATIONKIT}#/player?name=Nikola%20Joki%C4%87`)
    expect(rotationsLink(player("De'Aaron Fox")).href).toBe(`${ROTATIONKIT}#/player?name=De'Aaron%20Fox`)
    // decodes back to the exact name
    const href = rotationsLink(player("Luka Dončić O'Neal")).href!
    expect(decodeURIComponent(href.split('name=')[1]!)).toBe("Luka Dončić O'Neal")
  })

  it('encodes characters that would break the hash route', () => {
    expect(rotationsLink(player('A&B #1?')).href).toBe(`${ROTATIONKIT}#/player?name=A%26B%20%231%3F`)
  })

  it('trims the typed name, like the question does', () => {
    expect(rotationsLink(player('  Anfernee Simons ')).label).toBe('Anfernee Simons rotations')
  })

  it('works the same in the game by game view, and carries no filters', () => {
    const q = player('Stephen Curry', { view: 'gamelog', stat: 'points', court: 'at home', opponent: 'Lakers', period: 'last 5 games' })
    expect(rotationsLink(q).href).toBe(`${ROTATIONKIT}#/player?name=Stephen%20Curry`)
  })

  it('is disabled with an empty or blank box', () => {
    expect(rotationsLink(player(''))).toEqual({ label: 'Rotations', href: null })
    expect(rotationsLink(player('   '))).toEqual({ label: 'Rotations', href: null })
  })

  it('ignores the team kept for leaders mode', () => {
    expect(rotationsLink(player('', { team: 'Lakers' })).href).toBeNull()
  })
})

describe('rotationsLink: team leaders mode', () => {
  it('links a team by its tricode', () => {
    expect(rotationsLink(leaders('Lakers'))).toEqual({ label: 'Lakers rotations', href: `${ROTATIONKIT}#/team/LAL` })
    expect(rotationsLink(leaders('Magic')).href).toBe(`${ROTATIONKIT}#/team/ORL`)
    expect(rotationsLink(leaders('Trail Blazers')).href).toBe(`${ROTATIONKIT}#/team/POR`)
  })

  it('is disabled for the league, no team, or an unknown team', () => {
    for (const team of [LEAGUE, '', 'Sonics']) expect(rotationsLink(leaders(team))).toEqual({ label: 'Rotations', href: null })
  })

  it('ignores the player kept for player mode', () => {
    expect(rotationsLink({ ...leaders(''), player: 'LeBron James' }).href).toBeNull()
  })
})

describe('TEAM_TRICODES', () => {
  it('has a unique three-letter code for each of the 30 teams', () => {
    expect(Object.keys(TEAM_TRICODES).sort()).toEqual([...TEAMS].sort())
    const codes = Object.values(TEAM_TRICODES)
    expect(codes).toHaveLength(30)
    expect(new Set(codes).size).toBe(30)
    for (const code of codes) expect(code).toMatch(/^[A-Z]{3}$/)
  })

  it('uses the NBA codes', () => {
    expect(TEAM_TRICODES).toEqual({
      '76ers': 'PHI', Bucks: 'MIL', Bulls: 'CHI', Cavaliers: 'CLE', Celtics: 'BOS',
      Clippers: 'LAC', Grizzlies: 'MEM', Hawks: 'ATL', Heat: 'MIA', Hornets: 'CHA',
      Jazz: 'UTA', Kings: 'SAC', Knicks: 'NYK', Lakers: 'LAL', Magic: 'ORL',
      Mavericks: 'DAL', Nets: 'BKN', Nuggets: 'DEN', Pacers: 'IND', Pelicans: 'NOP',
      Pistons: 'DET', Raptors: 'TOR', Rockets: 'HOU', Spurs: 'SAS', Suns: 'PHX',
      Thunder: 'OKC', Timberwolves: 'MIN', 'Trail Blazers': 'POR', Warriors: 'GSW',
      Wizards: 'WAS',
    })
  })

  it('every team gets an enabled link to its own code', () => {
    for (const team of TEAMS) {
      expect(rotationsLink(leaders(team)).href).toBe(`${ROTATIONKIT}#/team/${TEAM_TRICODES[team]}`)
    }
  })
})
