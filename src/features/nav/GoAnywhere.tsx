import { useEffect, useMemo, useState } from 'react'

import { PLAYERS } from '../../domain/data/players'
import { goEntries, goFind } from '../../domain/nav'
import type { QueryState } from '../../domain/query'
import type { Saved } from '../../domain/recent'
import styles from './Header.module.css'

interface Props {
  query: QueryState
  saved: Saved
  onGo: (query: QueryState) => void
}

/**
 * "Go anywhere": the button, or Ctrl+K (Cmd+K on a Mac), opens a box over the
 * page. Type a player, a team, a place or a saved search; Enter (or a click)
 * jumps straight there. Arrow keys move through the list, Escape closes it.
 */
export function GoAnywhere({ query, saved, onGo }: Props) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Built only while the box is open: 600 entries are not needed otherwise.
  const entries = useMemo(() => (open ? goEntries(query, saved, PLAYERS) : []), [open, query, saved])
  const found = useMemo(() => goFind(entries, typed), [entries, typed])

  function close() {
    setOpen(false)
    setTyped('')
    setActive(0)
  }

  function pick(index: number) {
    const entry = found[index]
    if (!entry) return
    close()
    onGo(entry.query)
  }

  return (
    <>
      <button
        type="button"
        className={styles.goButton}
        aria-label="Go anywhere (Ctrl+K)"
        title="Go anywhere: type a player, a team or a saved search (Ctrl+K)"
        data-testid="go-anywhere"
        onClick={() => setOpen(true)}
      >
        <svg className={styles.goIcon} viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="6.8" cy="6.8" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M10.3 10.3l3.9 3.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className={styles.goText}>Go anywhere</span>
        <kbd className={styles.goKey}>Ctrl K</kbd>
      </button>
      {open && (
        // A press on the dark area around the box closes it.
        <div className={styles.shade} onPointerDown={(event) => event.target === event.currentTarget && close()}>
          <div className={styles.dialog} role="dialog" aria-label="Go anywhere" data-testid="go-dialog">
            <input
              autoFocus
              className={styles.goInput}
              placeholder="Type a player, a team, a saved search…"
              value={typed}
              spellCheck={false}
              autoComplete="off"
              role="combobox"
              aria-expanded="true"
              aria-controls="go-list"
              aria-label="Where to go"
              data-testid="go-input"
              onChange={(event) => {
                setTyped(event.target.value)
                setActive(0)
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setActive((a) => Math.min(a + 1, found.length - 1))
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setActive((a) => Math.max(a - 1, 0))
                } else if (event.key === 'Enter') {
                  event.preventDefault()
                  // Keep Ctrl+Enter (Ask) from also firing on the page.
                  event.stopPropagation()
                  pick(active)
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  close()
                }
              }}
            />
            <div className={styles.goList} id="go-list" role="listbox" aria-label="Places to go" data-testid="go-list">
              {found.map((entry, i) => (
                <div
                  key={`${entry.kind}|${entry.label}`}
                  role="option"
                  aria-selected={i === active}
                  className={styles.goItem}
                  data-testid="go-item"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(i)}
                >
                  <span>{entry.label}</span>
                  <span className={styles.goKind}>{entry.kind}</span>
                </div>
              ))}
              {found.length === 0 && <div className={styles.goNone}>Nothing matches "{typed}"</div>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
