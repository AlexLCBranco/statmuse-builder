import { useEffect, useState } from 'react'

import type { Bio } from '../../domain/bio'

type Bios = Readonly<Record<string, Bio>>

/** The data once loaded, kept for the whole visit: every player after the first is instant. */
let loaded: Bios | null = null

/**
 * The background of one roster player, or null while it loads (or when there
 * is no `name`). The data is a separate file the browser fetches the first
 * time a player is picked, so the page's first paint and typing in the boxes
 * never wait for it.
 */
export function useBio(name: string | null): Bio | null {
  const [bios, setBios] = useState<Bios | null>(loaded)

  useEffect(() => {
    if (!name || bios) return
    let live = true
    import('../../domain/data/bios').then(
      (module) => {
        loaded = module.BIOS
        if (live) setBios(module.BIOS)
      },
      // Offline or blocked: no line, the rest of the page works.
      () => undefined,
    )
    return () => {
      live = false
    }
  }, [name, bios])

  return name && bios ? (bios[name] ?? null) : null
}
