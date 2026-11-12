import { useState } from 'react'

import { currentSelections, parseDefaults, toStored } from '../../domain/defaults'
import type { QueryState, Selections } from '../../domain/query'
import { readJson, removeKey, writeJson } from '../../lib/storage'

export const DEFAULTS_STORAGE_KEY = 'smb.defaults'

/**
 * The user's saved default selections (null = none, so the factory ones
 * apply), kept in React state and mirrored to localStorage. Storage is read
 * once, on first render. What is saved and how it is checked lives in
 * `domain/defaults.ts`.
 */
export function useDefaults() {
  const [defaults, setDefaults] = useState<Selections | null>(() => parseDefaults(readJson(DEFAULTS_STORAGE_KEY)))

  return {
    defaults,
    /** Saves the button rows of this query as the defaults. */
    save(query: QueryState) {
      const selections = currentSelections(query)
      setDefaults(selections)
      writeJson(DEFAULTS_STORAGE_KEY, toStored(selections))
    },
    /** Forgets the saved defaults. */
    reset() {
      setDefaults(null)
      removeKey(DEFAULTS_STORAGE_KEY)
    },
  }
}
