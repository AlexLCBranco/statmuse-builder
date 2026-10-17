import { MAX_LAST_N } from './options'

/**
 * Everything the user has chosen. Each filter holds the exact question words
 * from `options.ts` ('' = no filter). `lastN` is the custom "last N games"
 * box, kept as a string because it mirrors a text input ('' = empty).
 * `vsPlayer` is a typed player matchup ("vs Kon Knueppel"), free text like
 * `player`. `without` is a teammate who sat out ("without Stephen Curry"),
 * also free text.
 */
export interface QueryState {
  player: string
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

/** What the page shows on first load: a complete example question. */
export const DEFAULT_QUERY: QueryState = {
  player: 'LeBron James',
  stat: 'stats',
  quarter: '',
  court: '',
  opponent: '',
  vsPlayer: '',
  without: '',
  period: 'last 10 games',
  lastN: '',
  result: '',
}

/** What "Clear" resets to: no player and no period. */
export const CLEARED_QUERY: QueryState = { ...DEFAULT_QUERY, player: '', period: '' }

/** One piece of the question; the player piece is styled differently. */
export interface QuestionPart {
  text: string
  isPlayer: boolean
}

/** A typed "last N games" wins over the period chips. */
export function effectivePeriod(query: QueryState): string {
  return query.lastN ? `last ${query.lastN} games` : query.period
}

/**
 * The question in order: player, stat, quarter, court, opponent team,
 * opponent player, without, result, period. StatMuse reads both "vs" parts together
 * ("vs Warriors vs Stephen Curry"). Empty filters are left out; the player part is always first, even
 * when empty, so the UI can show a placeholder in its place.
 */
export function questionParts(query: QueryState): QuestionPart[] {
  const parts: QuestionPart[] = [{ text: query.player.trim(), isPlayer: true }]
  const rest = [
    query.stat,
    query.quarter,
    query.court,
    query.opponent && `vs ${query.opponent}`,
    query.vsPlayer.trim() && `vs ${query.vsPlayer.trim()}`,
    query.without.trim() && `without ${query.without.trim()}`,
    query.result,
    effectivePeriod(query),
  ]
  for (const text of rest) {
    if (text) parts.push({ text, isPlayer: false })
  }
  return parts
}

export function buildQuestion(query: QueryState): string {
  return questionParts(query)
    .map((part) => part.text)
    .filter(Boolean)
    .join(' ')
}

export function hasPlayer(query: QueryState): boolean {
  return query.player.trim() !== ''
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
