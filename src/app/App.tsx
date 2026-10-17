import { useRef, useState } from 'react'

import { buildQuestion, CLEARED_QUERY, DEFAULT_QUERY, type QueryState } from '../domain/query'
import { Filters } from '../features/filters/Filters'
import { QuestionCard } from '../features/question/QuestionCard'
import { RecentList } from '../features/recent/RecentList'
import { useRecent } from '../features/recent/useRecent'
import styles from './App.module.css'

/**
 * The whole page. All state lives here in one `query` object; every control
 * reads from it and sends back changes, and the question is recomputed from
 * it on each render. That's small enough that no state library is needed.
 */
export function App() {
  const [query, setQuery] = useState<QueryState>(DEFAULT_QUERY)
  const { recent, add, remove } = useRecent()
  const askRef = useRef<HTMLAnchorElement>(null)

  const update = (changes: Partial<QueryState>) => setQuery((q) => ({ ...q, ...changes }))
  const focusPlayer = () => document.getElementById('player')?.focus()

  function clear() {
    setQuery(CLEARED_QUERY)
    focusPlayer()
  }

  function edit(saved: QueryState) {
    setQuery(saved)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.brand}>
          Stat<span className={styles.slash}>/</span>Muse Builder
        </h1>
        <div className={styles.tag}>NBA · builds the question, StatMuse answers it</div>
      </header>

      <main className={styles.main}>
        <QuestionCard
          query={query}
          askRef={askRef}
          onAsk={() => add({ question: buildQuestion(query), query })}
          onMissingPlayer={focusPlayer}
          onClear={clear}
        />
        {/* Enter in the player box "clicks" the Ask link, so the keyboard
            path opens the tab and saves to Recent exactly like a click. */}
        <Filters query={query} onChange={update} onSubmit={() => askRef.current?.click()} />
        <RecentList recent={recent} onEdit={edit} onRemove={remove} />
      </main>
    </div>
  )
}
