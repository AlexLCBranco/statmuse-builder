import { useState } from 'react'

import {
  MAX_PINNED,
  parseRecent,
  pin,
  recordAsk,
  removeRecent,
  unpin,
  type RecentSearch,
  type Saved,
} from '../../domain/recent'
import { readJson, writeJson } from '../../lib/storage'

export const RECENT_STORAGE_KEY = 'smb.recent'
export const PINNED_STORAGE_KEY = 'smb.pinned'

/**
 * The Recent list and the pinned favorites, kept in React state and mirrored
 * to localStorage so they survive reloads. Storage is read once, on first
 * render (the function form of useState), not on every render. The rules
 * (what pinning does, the limits) live in `domain/recent.ts`.
 */
export function useSaved() {
  const [saved, setSaved] = useState<Saved>(() => ({
    recent: parseRecent(readJson(RECENT_STORAGE_KEY)),
    pinned: parseRecent(readJson(PINNED_STORAGE_KEY), MAX_PINNED),
  }))

  function save(next: Saved) {
    setSaved(next)
    writeJson(RECENT_STORAGE_KEY, next.recent)
    writeJson(PINNED_STORAGE_KEY, next.pinned)
  }

  return {
    saved,
    add: (entry: RecentSearch) => save(recordAsk(saved, entry)),
    removeRecent: (index: number) => save({ ...saved, recent: removeRecent(saved.recent, index) }),
    pin: (question: string) => save(pin(saved, question)),
    unpin: (question: string) => save(unpin(saved, question)),
  }
}
