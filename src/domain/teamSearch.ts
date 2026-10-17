import { TEAMS } from './options'
import { matchRank, normalizeName } from './playerSearch'

/** Each team's city, so typing "utah" or "boston" finds the team too. */
export const TEAM_CITIES: Readonly<Record<string, string>> = {
  '76ers': 'Philadelphia', Bucks: 'Milwaukee', Bulls: 'Chicago', Cavaliers: 'Cleveland',
  Celtics: 'Boston', Clippers: 'Los Angeles LA', Grizzlies: 'Memphis', Hawks: 'Atlanta',
  Heat: 'Miami', Hornets: 'Charlotte', Jazz: 'Utah', Kings: 'Sacramento',
  Knicks: 'New York', Lakers: 'Los Angeles LA', Magic: 'Orlando', Mavericks: 'Dallas',
  Nets: 'Brooklyn', Nuggets: 'Denver', Pacers: 'Indiana', Pelicans: 'New Orleans',
  Pistons: 'Detroit', Raptors: 'Toronto', Rockets: 'Houston', Spurs: 'San Antonio',
  Suns: 'Phoenix', Thunder: 'Oklahoma City OKC', Timberwolves: 'Minnesota',
  'Trail Blazers': 'Portland', Warriors: 'Golden State', Wizards: 'Washington',
}

/**
 * The teams matching what was typed, best first. Nickname matches ("jaz")
 * come before city matches ("utah"); ties keep A-to-Z order. Empty input
 * returns every team.
 */
export function findTeams(typed: string, teams: readonly string[] = TEAMS): string[] {
  const search = normalizeName(typed).trim().replace(/\s+/g, ' ')
  if (!search) return [...teams]
  const ranked: { team: string; rank: number }[] = []
  for (const team of teams) {
    const byName = matchRank(team, search)
    const byCity = matchRank(`${TEAM_CITIES[team] ?? ''} ${team}`, search)
    // City matches must start a word ("la" shouldn't find Atlanta) and rank
    // after every nickname match (ranks 0-2).
    const rank = byName ?? (byCity === null || byCity === 2 ? null : byCity + 3)
    if (rank !== null) ranked.push({ team, rank })
  }
  ranked.sort((a, b) => a.rank - b.rank)
  return ranked.map((r) => r.team)
}

/** The team whose nickname is exactly what was typed (any case), or null. */
export function exactTeam(typed: string, teams: readonly string[] = TEAMS): string | null {
  const search = normalizeName(typed).trim()
  return teams.find((team) => normalizeName(team) === search) ?? null
}
