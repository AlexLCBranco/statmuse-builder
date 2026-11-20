import { useEffect, useRef, useState } from 'react'

import type { QueryState } from '../domain/query'
import { queryToSearch, searchToQuery } from '../domain/url'

/**
 * Where this screen sits in the app's own page history: `index` counts the
 * pages opened since the app loaded, `last` is the newest one. Kept in the
 * browser's history entry, so it survives a reload.
 */
interface Position {
  index: number
  last: number
}

function readPosition(): Position {
  const state = window.history.state as Partial<Position> | null
  const index = typeof state?.index === 'number' ? state.index : 0
  const last = typeof state?.last === 'number' ? Math.max(state.last, index) : index
  return { index, last }
}

/** Puts a screen in the address bar. Browsers can refuse (too many writes); the screen still works. */
function write(search: string, position: Position, push: boolean): void {
  const url = `${window.location.pathname}${search}${window.location.hash}`
  try {
    if (push) window.history.pushState(position, '', url)
    else window.history.replaceState(position, '', url)
  } catch {
    // Not written; back / forward just skip this change.
  }
}

/**
 * The one `QueryState`, mirrored in the address bar (SM-6): a reload or a
 * shared link gives the same screen, and back / forward step through the
 * pages. `start` is the start screen (the saved defaults), shown for the
 * plain address.
 *
 * `go(next)` shows a screen. Changing the place (mode) or the view opens a
 * new page in the history, and so does `go(next, 'push')` (a jump from the
 * header, a saved search); a filter or a typed letter only updates the
 * current page, so Back never steps through keystrokes.
 */
export function useUrlQuery(start: QueryState) {
  // Read once, on the first render. Writing the address here (not in an
  // effect) is safe to repeat: it writes the same thing each time.
  const [screen, setScreen] = useState(() => {
    const query = searchToQuery(window.location.search, start)
    const position = readPosition()
    const search = queryToSearch(query, start)
    if (search !== window.location.search) write(search, position, false)
    return { query, position }
  })
  // The newest values, for the back / forward listener.
  const startRef = useRef(start)
  const lastRef = useRef(screen.position.last)
  useEffect(() => {
    startRef.current = start
    lastRef.current = screen.position.last
  })

  useEffect(() => {
    function onPopState() {
      const { index } = readPosition()
      const position = { index, last: Math.max(lastRef.current, index) }
      // Remember the newest page on this entry too, for after a reload.
      write(window.location.search, position, false)
      setScreen({ query: searchToQuery(window.location.search, startRef.current), position })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function go(next: QueryState, how: 'push' | 'replace' = 'replace') {
    const { query, position } = screen
    const search = queryToSearch(next, start)
    if (search === window.location.search) {
      setScreen({ query: next, position })
      return
    }
    const push = how === 'push' || next.mode !== query.mode || next.view !== query.view
    const nextPosition = push ? { index: position.index + 1, last: position.index + 1 } : position
    write(search, nextPosition, push)
    setScreen({ query: next, position: nextPosition })
  }

  return {
    query: screen.query,
    go,
    canBack: screen.position.index > 0,
    canForward: screen.position.index < screen.position.last,
    back: () => window.history.back(),
    forward: () => window.history.forward(),
  }
}
