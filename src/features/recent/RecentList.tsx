import type { ReactNode } from 'react'

import type { QueryState } from '../../domain/query'
import { canPin, MAX_PINNED, type RecentSearch, type Saved } from '../../domain/recent'
import { statmuseUrl } from '../../domain/slug'
import styles from './RecentList.module.css'

interface Props {
  saved: Saved
  onEdit: (query: QueryState) => void
  onRemove: (index: number) => void
  onPin: (question: string) => void
  onUnpin: (question: string) => void
}

/** Pinned favorites (when there are any) above the rolling Recent list. */
export function RecentList({ saved, onEdit, onRemove, onPin, onUnpin }: Props) {
  const pinFull = !canPin(saved)

  const row = (entry: RecentSearch, buttons: ReactNode) => (
    <li key={entry.question} className={styles.item}>
      <a className={styles.link} href={statmuseUrl(entry.question)} target="_blank" rel="noopener noreferrer">
        {entry.question}
      </a>
      <span className={styles.buttons}>
        {buttons}
        <button type="button" className={styles.button} onClick={() => onEdit(entry.query)}>
          Edit
        </button>
      </span>
    </li>
  )

  return (
    <aside className={styles.recent}>
      {saved.pinned.length > 0 && (
        <section aria-labelledby="pinned-heading">
          <h2 id="pinned-heading" className={styles.heading}>
            Pinned
          </h2>
          <ul className={styles.list} data-testid="pinned">
            {saved.pinned.map((entry) =>
              row(
                entry,
                <button
                  type="button"
                  className={`${styles.button} ${styles.starOn}`}
                  aria-label={`Unpin “${entry.question}”`}
                  title="Unpin (back to Recent)"
                  onClick={() => onUnpin(entry.question)}
                >
                  ★
                </button>,
              ),
            )}
          </ul>
        </section>
      )}

      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className={styles.heading}>
          Recent
        </h2>
        <ul className={styles.list} data-testid="recent">
          {saved.recent.length === 0 && <li className={styles.empty}>Questions you send to StatMuse show up here.</li>}
          {saved.recent.map((entry, i) =>
            row(
              entry,
              <>
                <button
                  type="button"
                  className={styles.button}
                  aria-label={`Pin “${entry.question}”`}
                  aria-disabled={pinFull}
                  title={pinFull ? `Pinned is full (${MAX_PINNED})` : 'Pin'}
                  onClick={() => onPin(entry.question)}
                >
                  ☆
                </button>
                <button
                  type="button"
                  className={styles.button}
                  aria-label={`Remove “${entry.question}”`}
                  onClick={() => onRemove(i)}
                >
                  ✕
                </button>
              </>,
            ),
          )}
        </ul>
      </section>
    </aside>
  )
}
