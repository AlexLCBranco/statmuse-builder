import { isLeaders } from './availability'
import { TEAMS } from './options'
import { playerBoxTeam, subject, type QueryState } from './query'

/** rotationkit: a sister app that charts when each player is on the court. */
export const ROTATIONKIT = 'https://rotationkit.vercel.app/'

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

/** The Rotations button: its text, and its link (null = shown but disabled). */
export interface RotationsLink {
  label: string
  href: string | null
}

const DISABLED: RotationsLink = { label: 'Rotations', href: null }

/**
 * The rotationkit page for the question's player or team. Only the subject
 * goes across, no filters. The league (NBA), an empty box or a team without a
 * code gives a disabled button.
 */
export function rotationsLink(query: QueryState): RotationsLink {
  const who = subject(query)
  if (!who) return DISABLED
  // A team typed in the Player box links to the team page, like leaders mode.
  const team = isLeaders(query) ? who : playerBoxTeam(query)
  if (team !== null) {
    if (!TEAMS.includes(team)) return DISABLED
    const code = TEAM_TRICODES[team]
    return code ? { label: `${team} rotations`, href: `${ROTATIONKIT}#/team/${code}` } : DISABLED
  }
  return { label: `${who} rotations`, href: `${ROTATIONKIT}#/player?name=${encodeURIComponent(who)}` }
}
