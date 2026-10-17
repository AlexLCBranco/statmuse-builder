import { useState } from 'react'

import { addRecent, parseRecent, removeRecent, type RecentSearch } from '../../domain/recent'
import { readJson, writeJson } from '../../lib/storage'

export const RECENT_STORAGE_KEY = 'smb.recent'

/**
 * The Recent list, kept in React state and mirrored to localStorage so it
 * survives reloads. Storage is read once, on first render (the function form
 * of useState), not on every render.
 */
export function useRecent() {
  const [recent, setRecent] = useState<RecentSearch[]>(() => parseRecent(readJson(RECENT_STORAGE_KEY)))

  function save(next: RecentSearch[]) {
    setRecent(next)
    writeJson(RECENT_STORAGE_KEY, next)
  }

  return {
    recent,
    add: (entry: RecentSearch) => save(addRecent(recent, entry)),
    remove: (index: number) => save(removeRecent(recent, index)),
  }
}
