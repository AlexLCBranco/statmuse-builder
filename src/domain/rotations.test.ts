import { describe, expect, it } from 'vitest'

import { LEAGUE, TEAMS } from './options'
import { DEFAULT_QUERY, type QueryState } from './query'
import { ROTATIONKIT, ROTATIONS_SITE_NAME, TEAM_TRICODES, possessive, rotationsSiteLink, rotationsTarget } from './rotations'

// The href, or null when there is no button.
const href = (q: QueryState) => rotationsTarget(q)?.href ?? null

const player = (name: string, extra: Partial<QueryState> = {}): QueryState => ({ ...DEFAULT_QUERY, player: name, ...extra })
const leaders = (team: string): QueryState => ({ ...DEFAULT_QUERY, mode: 'leaders', team })

describe('rotationsTarget: player mode', () => {
  it('links a player by name', () => {
    expect(rotationsTarget(player('LeBron James'))).toEqual({
      kind: 'player',
      name: 'LeBron James',
      href: `${ROTATIONKIT}#/player?name=LeBron%20James`,
    })
  })

  it('encodes accents, apostrophes and spaces', () => {
    expect(href(player('Nikola Jokić'))).toBe(`${ROTATIONKIT}#/player?name=Nikola%20Joki%C4%87`)
    expect(href(player("De'Aaron Fox"))).toBe(`${ROTATIONKIT}#/player?name=De'Aaron%20Fox`)
    // decodes back to the exact name
    const link = href(player("Luka Dončić O'Neal"))!
    expect(decodeURIComponent(link.split('name=')[1]!)).toBe("Luka Dončić O'Neal")
  })

  it('encodes characters that would break the hash route', () => {
    expect(href(player('A&B #1?'))).toBe(`${ROTATIONKIT}#/player?name=A%26B%20%231%3F`)
  })

  it('trims the typed name, like the question does', () => {
    expect(rotationsTarget(player('  Anfernee Simons '))?.name).toBe('Anfernee Simons')
  })

  it('works the same in the game by game view, and carries no filters', () => {
    const q = player('Stephen Curry', { view: 'gamelog', stat: 'points', court: 'at home', opponent: 'Lakers', period: 'last 5 games' })
    expect(href(q)).toBe(`${ROTATIONKIT}#/player?name=Stephen%20Curry`)
  })

  it('has no button with an empty or blank box', () => {
    expect(rotationsTarget(player(''))).toBeNull()
    expect(rotationsTarget(player('   '))).toBeNull()
  })

  it('ignores the team kept for leaders mode', () => {
    expect(href(player('', { team: 'Lakers' }))).toBeNull()
  })
})

describe('rotationsTarget: a team in the Player box', () => {
  it('links the team page, in any case and in both views', () => {
    expect(rotationsTarget(player('Timberwolves'))).toEqual({ kind: 'team', name: 'Timberwolves', href: `${ROTATIONKIT}#/team/MIN` })
    expect(rotationsTarget(player('trail blazers'))).toEqual({ kind: 'team', name: 'Trail Blazers', href: `${ROTATIONKIT}#/team/POR` })
    expect(href(player('Lakers', { view: 'gamelog' }))).toBe(`${ROTATIONKIT}#/team/LAL`)
  })

  it('a player name that is not a team still links the player page', () => {
    expect(href(player('Anthony Edwards'))).toBe(`${ROTATIONKIT}#/player?name=Anthony%20Edwards`)
  })
})

describe('rotationsTarget: team leaders mode', () => {
  it('links a team by its tricode', () => {
    expect(rotationsTarget(leaders('Lakers'))).toEqual({ kind: 'team', name: 'Lakers', href: `${ROTATIONKIT}#/team/LAL` })
    expect(href(leaders('Magic'))).toBe(`${ROTATIONKIT}#/team/ORL`)
    expect(href(leaders('Trail Blazers'))).toBe(`${ROTATIONKIT}#/team/POR`)
  })

  it('has no button for the league, no team, or an unknown team', () => {
    for (const team of [LEAGUE, '', 'Sonics']) expect(rotationsTarget(leaders(team))).toBeNull()
  })

  it('ignores the player kept for player mode', () => {
    expect(href({ ...leaders(''), player: 'LeBron James' })).toBeNull()
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
      expect(href(leaders(team))).toBe(`${ROTATIONKIT}#/team/${TEAM_TRICODES[team]}`)
    }
  })
})

describe('rotationsSiteLink: the first "Other sites" button (SM-7)', () => {
  it('a player: the site name, "When he plays", and a hover that says what opens', () => {
    expect(rotationsSiteLink(player('Anfernee Simons', { court: 'at home' }))).toEqual({
      site: 'rotations',
      name: 'Hoop Rotations',
      what: 'When he plays',
      href: `${ROTATIONKIT}#/player?name=Anfernee%20Simons`,
      tip: "Opens Anfernee Simons' rotations on Hoop Rotations: who was on the court, minute by minute.",
    })
  })

  it('a team, in the Player box or in Team leaders: "When they play"', () => {
    for (const q of [player('lakers'), leaders('Lakers')]) {
      expect(rotationsSiteLink(q)).toEqual({
        site: 'rotations',
        name: ROTATIONS_SITE_NAME,
        what: 'When they play',
        href: `${ROTATIONKIT}#/team/LAL`,
        tip: "Opens Lakers' rotations on Hoop Rotations: who was on the court, minute by minute.",
      })
    }
    expect(rotationsSiteLink(leaders('Heat'))!.tip).toBe("Opens Heat's rotations on Hoop Rotations: who was on the court, minute by minute.")
  })

  it('the league or an empty box: no button', () => {
    expect(rotationsSiteLink(player(''))).toBeNull()
    expect(rotationsSiteLink(leaders(LEAGUE))).toBeNull()
    expect(rotationsSiteLink(leaders(''))).toBeNull()
  })

  it('possessive: "s" at the end takes only an apostrophe', () => {
    expect(['LeBron James', 'Lakers', '76ers', 'Jazz'].map(possessive)).toEqual(["LeBron James'", "Lakers'", "76ers'", "Jazz's"])
  })
})
