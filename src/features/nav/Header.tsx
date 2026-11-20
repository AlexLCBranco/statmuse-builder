import type { ReactNode } from 'react'

import { goToPlace, PLACES } from '../../domain/nav'
import type { Mode, QueryState } from '../../domain/query'
import styles from './Header.module.css'

interface Props {
  query: QueryState
  /** Jumps to another place. */
  onGo: (query: QueryState) => void
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
 * The header: the places, and the small tools on the right, on one line. Always at the top, always the same height, on every
 * screen; the rows under it scroll away.
 */
export function Header({ query, onGo, end }: Props) {
  return (
    <header className={styles.header} data-testid="top-bar">
      <h1 className="visually-hidden">StatMuse Builder</h1>
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
      <span className={styles.end}>{end}</span>
    </header>
  )
}
