import { useCallback, useRef, useState, type ReactNode } from 'react'

import { crumbs, goToPlace, PLACES, type Crumb } from '../../domain/nav'
import type { Mode, QueryState } from '../../domain/query'
import type { Saved } from '../../domain/recent'
import { useDismiss } from '../../lib/useDismiss'
import { GoAnywhere } from './GoAnywhere'
import styles from './Header.module.css'

interface Props {
  query: QueryState
  saved: Saved
  canBack: boolean
  canForward: boolean
  onBack: () => void
  onForward: () => void
  /** Jumps to another screen (a place, a breadcrumb neighbour, a search hit). */
  onGo: (query: QueryState) => void
  /** A breadcrumb part with nothing to jump to ("Pick a player") was pressed. */
  onPickSubject: () => void
  /** Small tools at the right end (the defaults gear). */
  end?: ReactNode
}

/** One small picture per place, drawn in the text colour. */
const ICONS: Record<Mode, ReactNode> = {
  // One person.
  player: (
    <>
      <circle cx="8" cy="4.6" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.8 14c.4-3 2.4-4.6 5.2-4.6s4.8 1.6 5.2 4.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  // A winners' podium: first place in the middle.
  leaders: <path d="M1.8 14V9.5h4V14M5.8 14V5h4.4v9M10.2 14V7.5h4V14M1 14h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
}

/**
 * The shared header every app has (backlogkit's NAV_PATTERN.md, same build as
 * footykit's): back / forward and the breadcrumb, "Go anywhere" and the small
 * tools on the right, and under them the places. Always at the top, always
 * the same height, on every screen; the rows under it scroll away.
 */
export function Header({ query, saved, canBack, canForward, onBack, onForward, onGo, onPickSubject, end }: Props) {
  const parts = crumbs(query, saved)
  return (
    <header className={styles.header} data-testid="top-bar">
      <h1 className="visually-hidden">StatMuse Builder</h1>
      <div className={styles.row}>
        <span className={styles.history} role="group" aria-label="Page history" data-testid="page-history">
          <button type="button" className={styles.historyButton} disabled={!canBack} aria-label="Back" title={canBack ? 'Back to the page before' : 'Nothing to go back to'} onClick={onBack}>
            ←
          </button>
          <button type="button" className={styles.historyButton} disabled={!canForward} aria-label="Forward" title={canForward ? 'Forward again' : 'Nothing to go forward to'} onClick={onForward}>
            →
          </button>
        </span>
        <nav className={styles.crumbs} aria-label="You are here" data-testid="breadcrumb">
          {parts.map((part, i) => (
            <CrumbPart key={`${i}|${part.what}`} part={part} last={i === parts.length - 1} onGo={onGo} onEmpty={onPickSubject} />
          ))}
        </nav>
        <span className={styles.end}>
          <GoAnywhere query={query} saved={saved} onGo={onGo} />
          {end}
        </span>
      </div>
      <nav className={styles.places} aria-label="Places" data-testid="where-tabs">
        {PLACES.map((place) => {
          const on = place.mode === query.mode
          return (
            <button
              key={place.mode}
              type="button"
              className={styles.place}
              aria-current={on ? 'page' : undefined}
              title={place.tip}
              data-testid={`where-${place.mode}`}
              onClick={() => !on && onGo(goToPlace(query, place.mode))}
            >
              <svg className={styles.placeIcon} viewBox="0 0 16 16" aria-hidden="true">
                {ICONS[place.mode]}
              </svg>
              {/* data-text reserves the bold width, so picking a place moves nothing. */}
              <span className={styles.placeLabel} data-text={place.label}>
                {place.label}
              </span>
            </button>
          )
        })}
      </nav>
    </header>
  )
}

interface CrumbProps {
  part: Crumb
  last: boolean
  onGo: (query: QueryState) => void
  onEmpty: () => void
}

/** One breadcrumb part: pressing it lists its neighbours to jump sideways. */
function CrumbPart({ part, last, onGo, onEmpty }: CrumbProps) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLSpanElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, box, close)
  const hasMenu = part.items.length > 0

  return (
    <span className={styles.crumb} ref={box} data-testid="crumb">
      <span className={styles.separator} aria-hidden="true">
        ›
      </span>
      <button
        type="button"
        className={`${styles.crumbButton} ${last ? styles.crumbLast : ''}`}
        aria-haspopup={hasMenu ? 'menu' : undefined}
        aria-expanded={hasMenu ? open : undefined}
        title={hasMenu ? `${part.what}: ${part.label}. Press to jump to another` : `${part.what}: ${part.label}. Press to pick one`}
        data-testid="crumb-btn"
        onClick={() => (hasMenu ? setOpen((wasOpen) => !wasOpen) : onEmpty())}
      >
        {part.label}
      </button>
      {open && (
        <span className={styles.menu} role="menu" aria-label={part.what} data-testid="crumb-menu">
          {part.items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={styles.menuItem}
              aria-current={item.on || undefined}
              // The current one is in view when a long list (31 teams) opens.
              ref={item.on ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
              onClick={() => {
                setOpen(false)
                if (!item.on) onGo(item.query)
              }}
            >
              {item.label}
            </button>
          ))}
        </span>
      )}
    </span>
  )
}
