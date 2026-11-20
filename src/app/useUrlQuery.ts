import { useEffect, useRef, useState } from 'react'

import type { QueryState } from '../domain/query'
import { queryToSearch, searchToQuery } from '../domain/url'

/** Puts a screen in the address bar. Browsers can refuse (too many writes); the screen still works. */
function write(search: string, push: boolean): void {
  const url = `${window.location.pathname}${search}${window.location.hash}`
  try {
    if (push) window.history.pushState(null, '', url)
    else window.history.replaceState(null, '', url)
  } catch {
    // Not written; the browser's back / forward just skip this change.
  }
}

/**
 * The one `QueryState`, mirrored in the address bar (SM-6): a reload or a
 * shared link gives the same screen, and the browser's back / forward step
 * through the pages. `start` is the start screen (the saved defaults), shown
 * for the plain address.
 *
 * `go(next)` shows a screen. Changing the place (mode) or the view opens a
 * new page in the history, and so does `go(next, 'push')` (a saved search);
 * a filter or a typed letter only updates the current page, so Back never
 * steps through keystrokes.
 */
export function useUrlQuery(start: QueryState) {
  // Read once, on the first render. Writing the address here (not in an
  // effect) is safe to repeat: it writes the same thing each time.
  const [query, setQuery] = useState(() => {
    const first = searchToQuery(window.location.search, start)
    const search = queryToSearch(first, start)
    if (search !== window.location.search) write(search, false)
    return first
  })
  // The newest start screen, for the back / forward listener.
  const startRef = useRef(start)
  useEffect(() => {
    startRef.current = start
  })

  useEffect(() => {
    const onPopState = () => setQuery(searchToQuery(window.location.search, startRef.current))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function go(next: QueryState, how: 'push' | 'replace' = 'replace') {
    const search = queryToSearch(next, start)
    if (search !== window.location.search) {
      write(search, how === 'push' || next.mode !== query.mode || next.view !== query.view)
    }
    setQuery(next)
  }

  return { query, go }
}
