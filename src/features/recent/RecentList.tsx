import type { QueryState } from '../../domain/query'
import type { RecentSearch } from '../../domain/recent'
import { statmuseUrl } from '../../domain/slug'
import styles from './RecentList.module.css'

interface Props {
  recent: readonly RecentSearch[]
  onEdit: (query: QueryState) => void
  onRemove: (index: number) => void
}

export function RecentList({ recent, onEdit, onRemove }: Props) {
  return (
    <section className={styles.recent} aria-labelledby="recent-heading">
      <h2 id="recent-heading" className={styles.heading}>
        Recent
      </h2>
      <ul className={styles.list} data-testid="recent">
        {recent.length === 0 && <li className={styles.empty}>Questions you send to StatMuse show up here.</li>}
        {recent.map((entry, i) => (
          <li key={entry.question} className={styles.item}>
            <a className={styles.link} href={statmuseUrl(entry.question)} target="_blank" rel="noopener noreferrer">
              {entry.question}
            </a>
            <span className={styles.buttons}>
              <button type="button" className={styles.button} onClick={() => onEdit(entry.query)}>
                Edit
              </button>
              <button
                type="button"
                className={styles.button}
                aria-label={`Remove “${entry.question}”`}
                onClick={() => onRemove(i)}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
