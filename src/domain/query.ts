import { isGameLog, isLeaders, offersFilter, offersLastN, periodOptions, statOptions, type FilterKey } from './availability'
import { MAX_LAST_N } from './options'

export type Mode = 'player' | 'leaders'
export type View = 'averages' | 'gamelog'

/**
 * Everything the user has chosen. `mode` picks the kind of question: one
 * player's numbers, or a ranked list of a team's leaders. `view` (player mode
 * only) picks averages or one row per game. Each mode keeps its own subject:
 * `player` is free text, `team` is a nickname from TEAMS or LEAGUE.
 *
 * Each filter holds the exact question words from `options.ts` ('' = no
 * filter). `lastN` is the custom "last N games" box, kept as a string because
 * it mirrors a text input ('' = empty). `vsPlayer` is a typed player matchup
 * ("vs Kon Knueppel") and `without` a teammate who sat out, both free text.
 */
export interface QueryState {
  mode: Mode
  view: View
  player: string
  team: string
  stat: string
  quarter: string
  court: string
  opponent: string
  vsPlayer: string
  without: string
  period: string
  lastN: string
  result: string
}

/**
 * The button rows: the part of a query that "default selections" saves.
 * `period` and `lastN` go together (the custom "last N games").
 */
export type Selections = Pick<QueryState, 'mode' | 'view' | 'stat' | 'quarter' | 'court' | 'result' | 'period' | 'lastN'>

/** First load: nothing chosen, "All stats", every filter on "Any". */
export const DEFAULT_QUERY: QueryState = {
  mode: 'player',
  view: 'averages',
  player: '',
  team: '',
  stat: 'stats',
  quarter: '',
  court: '',
  opponent: '',
  vsPlayer: '',
  without: '',
  period: '',
  lastN: '',
  result: '',
}

/** The stat a mode starts on: a leaders question needs one specific stat. */
export function defaultStat(query: Pick<QueryState, 'mode'>): string {
  return isLeaders(query) ? 'points' : 'stats'
}

/** The stat that goes into the question: the chosen one, if this mode offers it. */
export function effectiveStat(query: QueryState): string {
  return statOptions(query).some((o) => o.value === query.stat) ? query.stat : defaultStat(query)
}

/**
 * A typed "last N games" wins over the period chips. A period this mode does
 * not offer counts as "Any".
 */
export function effectivePeriod(query: QueryState): string {
  if (query.lastN && offersLastN(query)) return `last ${query.lastN} games`
  return periodOptions(query).some((o) => o.value === query.period) ? query.period : ''
}

/**
 * Switches mode and keeps every filter. Only the stat can change: one the new
 * mode does not offer ("All stats" in leaders mode) becomes "points".
 */
export function setMode(query: QueryState, mode: Mode): QueryState {
  const next = { ...query, mode }
  return { ...next, stat: statOptions(next).some((o) => o.value === query.stat) ? query.stat : 'points' }
}

/** Who the question is about: the player, or the team in leaders mode. */
export function subject(query: QueryState): string {
  return isLeaders(query) ? query.team : query.player.trim()
}

/** Ask and Copy need a subject: a player, or a team in leaders mode. */
export function isReady(query: QueryState): boolean {
  return subject(query) !== ''
}

/** The filters that are in the question, in order, with the words each adds. */
function filterWords(query: QueryState): [FilterKey, string][] {
  const all: [FilterKey, string][] = [
    ['quarter', query.quarter],
    ['court', query.court],
    ['opponent', query.opponent && `vs ${query.opponent}`],
    ['vsPlayer', query.vsPlayer.trim() && `vs ${query.vsPlayer.trim()}`],
    ['without', query.without.trim() && `without ${query.without.trim()}`],
    ['result', query.result],
    ['period', effectivePeriod(query)],
  ]
  return all.filter(([key, words]) => words !== '' && offersFilter(query, key))
}

/** One piece of the question; the subject piece is styled differently. */
export interface QuestionPart {
  text: string
  isSubject: boolean
}

/**
 * The question in order: subject, stat, quarter, court, opponent team,
 * opponent player, without, result, period. StatMuse reads both "vs" parts
 * together ("vs Warriors vs Stephen Curry"). The stat part is "game log" in
 * game by game view and "<stat> leaders" in leaders mode. Empty and hidden
 * filters are left out; the subject part is always first, even when empty, so
 * the UI can show a placeholder in its place.
 */
export function questionParts(query: QueryState): QuestionPart[] {
  const stat = effectiveStat(query)
  const statPart = isGameLog(query) ? 'game log' : isLeaders(query) ? `${stat} leaders` : stat
  return [
    { text: subject(query), isSubject: true },
    { text: statPart, isSubject: false },
    ...filterWords(query).map(([, text]) => ({ text, isSubject: false })),
  ]
}

export function buildQuestion(query: QueryState): string {
  return questionParts(query)
    .map((part) => part.text)
    .filter(Boolean)
    .join(' ')
}

/** How many filters (not counting the stat) are in the question. */
export function activeFilterCount(query: QueryState): number {
  return filterWords(query).length
}

/**
 * StatMuse loses the thread when a matchup and a missing teammate are stacked
 * with more filters: team + vs player + without + wins got no answer.
 */
export function tooManyFilters(query: QueryState): boolean {
  const keys = filterWords(query).map(([key]) => key)
  return keys.includes('vsPlayer') && keys.includes('without') && keys.length >= 4
}

/** Whether a filter row shows its default, so it needs no reset button. */
export function isRowDefault(query: QueryState, key: FilterKey): boolean {
  if (key === 'stat') return effectiveStat(query) === defaultStat(query)
  if (key === 'period') return effectivePeriod(query) === ''
  return query[key].trim() === ''
}

/** Puts one row back to its default; Period also clears "last N". */
export function resetRow(query: QueryState, key: FilterKey): QueryState {
  if (key === 'stat') return { ...query, stat: defaultStat(query) }
  if (key === 'period') return { ...query, period: '', lastN: '' }
  return { ...query, [key]: '' }
}

/**
 * "Clear all": the boxes are emptied and the button rows go back to the
 * user's saved defaults (the factory ones when nothing is saved), but the
 * mode and view stay as they are. A saved stat this mode does not offer
 * becomes the mode's own default.
 */
export function clearAll(query: QueryState, defaults: Selections | null = null): QueryState {
  const next: QueryState = { ...DEFAULT_QUERY, ...defaults, mode: query.mode, view: query.view }
  return { ...next, stat: effectiveStat(next) }
}

/**
 * Cleans what was typed in the "last N games" box: digits only, at least 1,
 * capped at one season. Returns '' when there is no usable number.
 */
export function parseLastN(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  const n = Number(digits)
  if (!digits || n < 1) return ''
  return String(Math.min(n, MAX_LAST_N))
}
