import { TEAMS } from './options'
import { matchRank, normalizeName } from './playerSearch'
import { teamRank } from './teamSearch'

/** One suggestion for the Player box: a player, or a team (team stats). */
export interface SubjectHit {
  name: string
  kind: 'player' | 'team'
}

/**
 * The best `limit` players and teams for what was typed, in one list. Both
 * are ranked the same way (see `matchRank`; a team's city ranks after any
 * name match), so "timb" puts the Timberwolves first and "lebr" LeBron James.
 * On a tie the team comes first: there are only 30, and a typed nickname
 * ("heat") should not sit under players whose names merely start with it.
 */
export function findSubjects(players: readonly string[], typed: string, limit = 8): SubjectHit[] {
  const search = normalizeName(typed).trim().replace(/\s+/g, ' ')
  if (!search) return []
  const ranked: (SubjectHit & { rank: number; order: number })[] = []
  for (const team of TEAMS) {
    const rank = teamRank(team, search)
    if (rank !== null) ranked.push({ name: team, kind: 'team', rank, order: 0 })
  }
  for (const name of players) {
    const rank = matchRank(name, search)
    if (rank !== null) ranked.push({ name, kind: 'player', rank, order: 1 })
  }
  // Stable sort: within a rank, teams first, then each list's own order.
  ranked.sort((a, b) => a.rank - b.rank || a.order - b.order)
  return ranked.slice(0, limit).map(({ name, kind }) => ({ name, kind }))
}
