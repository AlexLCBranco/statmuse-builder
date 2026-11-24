import { isLeaders } from './availability'
import { TEAMS } from './options'
import { playerBoxTeam, subject, type QueryState } from './query'
import type { SiteLink } from './sites'

/** rotationkit: a sister app that charts when each player is on the court. */
export const ROTATIONKIT = 'https://rotationkit.vercel.app/'

/**
 * rotationkit's public name, as the "Other sites" button shows it. A
 * placeholder until the name is final: change it here and only here.
 */
export const ROTATIONS_SITE_NAME = 'Hoop Rotations'

/** Each team's NBA three-letter code, as rotationkit's team pages use it. */
export const TEAM_TRICODES: Readonly<Record<string, string>> = {
  '76ers': 'PHI', Bucks: 'MIL', Bulls: 'CHI', Cavaliers: 'CLE', Celtics: 'BOS',
  Clippers: 'LAC', Grizzlies: 'MEM', Hawks: 'ATL', Heat: 'MIA', Hornets: 'CHA',
  Jazz: 'UTA', Kings: 'SAC', Knicks: 'NYK', Lakers: 'LAL', Magic: 'ORL',
  Mavericks: 'DAL', Nets: 'BKN', Nuggets: 'DEN', Pacers: 'IND', Pelicans: 'NOP',
  Pistons: 'DET', Raptors: 'TOR', Rockets: 'HOU', Spurs: 'SAS', Suns: 'PHX',
  Thunder: 'OKC', Timberwolves: 'MIN', 'Trail Blazers': 'POR', Warriors: 'GSW',
  Wizards: 'WAS',
}

/** Who the rotationkit page is for, and its address. */
export interface RotationsTarget {
  kind: 'player' | 'team'
  /** The trimmed typed name, or the team's name. */
  name: string
  href: string
}

/**
 * The rotationkit page for the question's player or team. Only the subject
 * goes across, no filters. The league (NBA), an empty box or a team without a
 * code: null (no button).
 */
export function rotationsTarget(query: QueryState): RotationsTarget | null {
  const who = subject(query)
  if (!who) return null
  // A team typed in the Player box links to the team page, like leaders mode.
  const team = isLeaders(query) ? who : playerBoxTeam(query)
  if (team !== null) {
    if (!TEAMS.includes(team)) return null
    const code = TEAM_TRICODES[team]
    return code ? { kind: 'team', name: team, href: `${ROTATIONKIT}#/team/${code}` } : null
  }
  return { kind: 'player', name: who, href: `${ROTATIONKIT}#/player?name=${encodeURIComponent(who)}` }
}

/** "Luka Doncic" -> "Luka Doncic's"; a name ending in "s" -> "Lakers'", "LeBron James'". */
export function possessive(name: string): string {
  return name.endsWith('s') ? `${name}'` : `${name}'s`
}

/**
 * The first "Other sites" button (SM-7): the same player or team on
 * rotationkit. Null when there is nothing to link: no button at all.
 */
export function rotationsSiteLink(query: QueryState): SiteLink | null {
  const target = rotationsTarget(query)
  if (!target) return null
  return {
    site: 'rotations',
    name: ROTATIONS_SITE_NAME,
    what: target.kind === 'player' ? 'When he plays' : 'When they play',
    href: target.href,
    tip: `Opens ${possessive(target.name)} rotations on ${ROTATIONS_SITE_NAME}: who was on the court, minute by minute.`,
  }
}
