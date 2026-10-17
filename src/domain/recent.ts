import { DEFAULT_QUERY, type QueryState } from './query'

/** A question the user sent to StatMuse, with the choices that built it. */
export interface RecentSearch {
  question: string
  query: QueryState
}

export const MAX_RECENT = 12

/** Puts a search at the top, drops an older copy of it, keeps the newest 12. */
export function addRecent(list: readonly RecentSearch[], entry: RecentSearch): RecentSearch[] {
  return [entry, ...list.filter((r) => r.question !== entry.question)].slice(0, MAX_RECENT)
}

export function removeRecent(list: readonly RecentSearch[], index: number): RecentSearch[] {
  return list.filter((_, i) => i !== index)
}

/**
 * Rebuilds the list from whatever was saved. Storage is outside our control
 * (old versions, manual edits), so anything malformed is skipped instead of
 * crashing the page, and missing fields fall back to the defaults.
 */
export function parseRecent(saved: unknown): RecentSearch[] {
  if (!Array.isArray(saved)) return []
  const list: RecentSearch[] = []
  for (const item of saved as unknown[]) {
    if (typeof item !== 'object' || item === null) continue
    const { question, query } = item as Record<string, unknown>
    if (typeof question !== 'string' || typeof query !== 'object' || query === null) continue
    const merged = { ...DEFAULT_QUERY }
    for (const key of Object.keys(DEFAULT_QUERY) as (keyof QueryState)[]) {
      const value = (query as Record<string, unknown>)[key]
      if (typeof value === 'string') merged[key] = value
    }
    list.push({ question, query: merged })
  }
  return list.slice(0, MAX_RECENT)
}
