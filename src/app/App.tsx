import { useEffect, useRef, useState } from 'react'

import { isLeaders } from '../domain/availability'
import { applyFactory, startQuery } from '../domain/defaults'
import { buildQuestion, clearAll, type QueryState } from '../domain/query'
import { DefaultsMenu } from '../features/defaults/DefaultsMenu'
import { useDefaults } from '../features/defaults/useDefaults'
import { Filters } from '../features/filters/Filters'
import { QuestionCard } from '../features/question/QuestionCard'
import { RecentList } from '../features/recent/RecentList'
import { useSaved } from '../features/recent/useSaved'
import { SiteVersion } from '../features/version/SiteVersion'
import styles from './App.module.css'

/**
 * The whole page. All state lives here in one `query` object; every control
 * reads from it and sends back changes, and the question is recomputed from
 * it on each render. That's small enough that no state library is needed.
 */
export function App() {
  const { defaults, save: saveDefaults, reset: resetDefaults } = useDefaults()
  // The first render starts from the saved default selections, if any.
  const [query, setQuery] = useState<QueryState>(() => startQuery(defaults))
  const { saved, add, removeRecent, pin, unpin } = useSaved()
  const askRef = useRef<HTMLAnchorElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  const update = (changes: Partial<QueryState>) => setQuery((q) => ({ ...q, ...changes }))
  // The first box: the player, or the team in leaders mode.
  const focusFirst = () => document.getElementById(isLeaders(query) ? 'team' : 'player')?.focus()
  // "Clicks" the Ask link, so every keyboard path opens the tab and saves to
  // Recent exactly like a click.
  const ask = () => askRef.current?.click()

  // Ctrl+Enter (Cmd+Enter on Mac) anywhere on the page presses Ask.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      askRef.current?.click()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function clear() {
    setQuery(clearAll(query, defaults))
    focusFirst()
  }

  // Forgets the saved defaults and shows the factory ones right away.
  function factoryReset() {
    resetDefaults()
    setQuery(applyFactory(query))
  }

  function edit(savedQuery: QueryState) {
    setQuery(savedQuery)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // The page never scrolls; the builder does (or the whole layout, in one column).
    for (const scroller of [mainRef.current, mainRef.current?.parentElement]) {
      scroller?.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.brand}>
          Stat<span className={styles.slash}>/</span>Muse Builder
        </h1>
        <div className={styles.tag}>NBA · builds the question, StatMuse answers it</div>
      </header>

      <div className={styles.layout}>
        <main ref={mainRef} className={styles.main}>
          <QuestionCard
            query={query}
            askRef={askRef}
            onAsk={() => add({ question: buildQuestion(query), query })}
            onMissingSubject={focusFirst}
            onClear={clear}
          />
          <Filters
            query={query}
            onChange={update}
            onReplace={setQuery}
            onSubmit={ask}
            recent={saved.recent}
            corner={<DefaultsMenu onSave={() => saveDefaults(query)} onReset={factoryReset} />}
          />
        </main>
        <RecentList saved={saved} onEdit={edit} onRemove={removeRecent} onPin={pin} onUnpin={unpin} />
      </div>
      <SiteVersion />
    </div>
  )
}
