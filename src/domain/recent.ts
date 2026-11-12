import { DEFAULT_QUERY, type Mode, type QueryState } from './query'

/** A question the user sent to StatMuse, with the choices that built it. */
export interface RecentSearch {
  question: string
  query: QueryState
}

/** Everything saved: the rolling Recent list and the pinned favorites. */
export interface Saved {
  recent: RecentSearch[]
  pinned: RecentSearch[]
}

export const MAX_RECENT = 12
export const MAX_PINNED = 12
/** How many recent players/teams and searches an empty box suggests. */
export const MAX_SUGGESTED = 5

/** Puts a search at the top, drops an older copy of it, keeps the newest 12. */
export function addRecent(list: readonly RecentSearch[], entry: RecentSearch): RecentSearch[] {
  return [entry, ...list.filter((r) => r.question !== entry.question)].slice(0, MAX_RECENT)
}

export function removeRecent(list: readonly RecentSearch[], index: number): RecentSearch[] {
  return list.filter((_, i) => i !== index)
}

/** A sent question goes to Recent, unless it is already pinned. */
export function recordAsk(saved: Saved, entry: RecentSearch): Saved {
  if (saved.pinned.some((p) => p.question === entry.question)) return saved
  return { ...saved, recent: addRecent(saved.recent, entry) }
}

export function canPin(saved: Saved): boolean {
  return saved.pinned.length < MAX_PINNED
}

/** Moves a Recent row to the end of Pinned. Does nothing when Pinned is full. */
export function pin(saved: Saved, question: string): Saved {
  const entry = saved.recent.find((r) => r.question === question)
  if (!entry || !canPin(saved)) return saved
  return {
    recent: saved.recent.filter((r) => r.question !== question),
    pinned: [...saved.pinned, entry],
  }
}

/** Moves a pinned row back to the top of Recent. */
export function unpin(saved: Saved, question: string): Saved {
  const entry = saved.pinned.find((p) => p.question === question)
  if (!entry) return saved
  return {
    recent: addRecent(saved.recent, entry),
    pinned: saved.pinned.filter((p) => p.question !== question),
  }
}

function unique(values: string[], max: number): string[] {
  return [...new Set(values.filter(Boolean))].slice(0, max)
}

/** The players of the latest player-mode searches, newest first, no repeats. */
export function recentPlayers(list: readonly RecentSearch[], max = MAX_SUGGESTED): string[] {
  return unique(
    list.filter((r) => r.query.mode === 'player').map((r) => r.query.player.trim()),
    max,
  )
}

/** The teams of the latest leaders searches, newest first, no repeats. */
export function recentTeams(list: readonly RecentSearch[], max = MAX_SUGGESTED): string[] {
  return unique(
    list.filter((r) => r.query.mode === 'leaders').map((r) => r.query.team),
    max,
  )
}

/** The latest full searches made in one mode. */
export function recentSearches(list: readonly RecentSearch[], mode: Mode, max = MAX_SUGGESTED): RecentSearch[] {
  return list.filter((r) => r.query.mode === mode).slice(0, max)
}

/**
 * Rebuilds a saved query. Entries saved before v0.7 have no mode, team or
 * view; those (and anything else missing or malformed) fall back to the
 * defaults: player mode, averages.
 */
export function parseQuery(saved: unknown): QueryState {
  const merged: QueryState = { ...DEFAULT_QUERY }
  if (typeof saved !== 'object' || saved === null) return merged
  const raw = saved as Record<string, unknown>
  for (const key of Object.keys(DEFAULT_QUERY) as (keyof QueryState)[]) {
    const value = raw[key]
    if (typeof value !== 'string') continue
    if (key === 'mode') {
      if (value === 'player' || value === 'leaders') merged.mode = value
    } else if (key === 'view') {
      if (value === 'averages' || value === 'gamelog') merged.view = value
    } else {
      merged[key] = value
    }
  }
  return merged
}

/**
 * Rebuilds a list from whatever was saved. Storage is outside our control
 * (old versions, manual edits), so anything malformed is skipped instead of
 * crashing the page.
 */
export function parseRecent(saved: unknown, max = MAX_RECENT): RecentSearch[] {
  if (!Array.isArray(saved)) return []
  const list: RecentSearch[] = []
  for (const item of saved as unknown[]) {
    if (typeof item !== 'object' || item === null) continue
    const { question, query } = item as Record<string, unknown>
    if (typeof question !== 'string' || typeof query !== 'object' || query === null) continue
    list.push({ question, query: parseQuery(query) })
  }
  return list.slice(0, max)
}
