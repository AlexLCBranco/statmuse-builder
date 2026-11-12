import { LEAGUE, PERIOD_OPTIONS, STAT_OPTIONS, type Option } from './options'
import type { QueryState } from './query'

/**
 * What each mode offers. StatMuse does not understand every phrasing in every
 * kind of question, so a chip or filter is only offered where a real StatMuse
 * page answered it correctly (see the compatibility table in PROJECT.md).
 * Hidden filters keep their value in the state, so switching back restores
 * them; they are just left out of the question.
 */
export type FilterKey = 'stat' | 'quarter' | 'court' | 'opponent' | 'vsPlayer' | 'without' | 'result' | 'period'

type Context = Pick<QueryState, 'mode' | 'view' | 'team'>

export const isLeaders = (query: Pick<Context, 'mode'>): boolean => query.mode === 'leaders'

/** Game by game only exists in player mode. */
export const isGameLog = (query: Pick<Context, 'mode' | 'view'>): boolean =>
  query.mode === 'player' && query.view === 'gamelog'

export const isLeague = (query: Context): boolean => isLeaders(query) && query.team === LEAGUE

/** Leaders questions have no single player to match up or sit out. */
const HIDDEN_IN_LEADERS: readonly FilterKey[] = ['vsPlayer', 'without']

/** Player questions (averages and game by game alike) take every filter. */
export function offersFilter(query: Context, key: FilterKey): boolean {
  return isLeaders(query) ? !HIDDEN_IN_LEADERS.includes(key) : true
}

/**
 * "All stats leaders" is not a question, and "turnovers leaders" comes back
 * ranked fewest-first, which is not what "leaders" promises.
 */
const NOT_LEADER_STATS: readonly string[] = ['stats', 'turnovers']

export function statOptions(query: Context): readonly Option[] {
  return isLeaders(query) ? STAT_OPTIONS.filter((o) => !NOT_LEADER_STATS.includes(o.value)) : STAT_OPTIONS
}

const LAST_GAMES = /^last \d+ games$/

export function periodOptions(query: Context): readonly Option[] {
  // League-wide, StatMuse reads "last 10 games" as each player's own last
  // 10 games, all-time (the answer was Kobe Bryant), so it is not offered.
  if (isLeague(query)) return PERIOD_OPTIONS.filter((o) => !LAST_GAMES.test(o.value))
  return PERIOD_OPTIONS
}

/** Whether the custom "last N games" box is offered. */
export function offersLastN(query: Context): boolean {
  return !isLeague(query)
}
