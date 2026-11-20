import { useEffect, useMemo, useRef } from 'react'

import { isLeaders } from '../domain/availability'
import { applyFactory, startQuery } from '../domain/defaults'
import { pageTitle } from '../domain/nav'
import { buildQuestion, clearAll, swapPlayers, type QueryState } from '../domain/query'
import { DefaultsMenu } from '../features/defaults/DefaultsMenu'
import { useDefaults } from '../features/defaults/useDefaults'
import { Filters } from '../features/filters/Filters'
import { Header } from '../features/nav/Header'
import { QuestionCard } from '../features/question/QuestionCard'
import { RecentList } from '../features/recent/RecentList'
import { useSaved } from '../features/recent/useSaved'
import { SiteVersion } from '../features/version/SiteVersion'
import styles from './App.module.css'
import { useUrlQuery } from './useUrlQuery'

/**
 * The whole page. All state lives in one `query` object; every control
 * reads from it and sends back changes, and the question is recomputed from
 * it on each render. The query is mirrored in the address bar (useUrlQuery),
 * so a reload or a shared link shows the same screen. That's small enough
 * that no state library is needed.
 */
export function App() {
  const { defaults, save: saveDefaults, reset: resetDefaults } = useDefaults()
  // The plain address starts from the saved default selections, if any.
  const start = useMemo(() => startQuery(defaults), [defaults])
  const { query, go, canBack, canForward, back, forward } = useUrlQuery(start)
  const { saved, add, removeRecent, pin, unpin } = useSaved()
  const askRef = useRef<HTMLAnchorElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const question = buildQuestion(query)

  const update = (changes: Partial<QueryState>) => go({ ...query, ...changes })
  // The first box: the player, or the team in leaders mode.
  const focusFirst = (of: QueryState = query) => document.getElementById(isLeaders(of) ? 'team' : 'player')?.focus()
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

  // The browser tab (and its history list) names the screen.
  useEffect(() => {
    document.title = pageTitle(query, question)
  }, [query, question])

  function clear() {
    go(clearAll(query, defaults))
    focusFirst()
  }

  // Forgets the saved defaults and shows the factory ones right away.
  function factoryReset() {
    resetDefaults()
    go(applyFactory(query))
  }

  // A jump (a saved search, a place, a search hit) opens a new page in the history.
  function jump(next: QueryState) {
    go(next, 'push')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // The page never scrolls; the builder does (or the whole layout, in one column).
    for (const scroller of [mainRef.current, mainRef.current?.parentElement]) {
      scroller?.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
    }
  }

  return (
    <div className={styles.page}>
      <Header
        query={query}
        saved={saved}
        canBack={canBack}
        canForward={canForward}
        onBack={back}
        onForward={forward}
        onGo={jump}
        onPickSubject={() => focusFirst()}
        end={<DefaultsMenu onSave={() => saveDefaults(query)} onReset={factoryReset} />}
      />

      <div className={styles.body}>
        <div className={styles.layout}>
          <main ref={mainRef} className={styles.main}>
            <QuestionCard
              query={query}
              askRef={askRef}
              onAsk={() => add({ question, query })}
              onMissingSubject={() => focusFirst()}
              onClear={clear}
              onSwap={() => go(swapPlayers(query))}
            />
            <Filters query={query} onChange={update} onReplace={go} onSubmit={ask} saved={saved} />
          </main>
          <RecentList saved={saved} onEdit={jump} onRemove={removeRecent} onPin={pin} onUnpin={unpin} />
        </div>
        {/* Fixed in the corner, over this box's bottom padding. */}
        <SiteVersion />
      </div>
    </div>
  )
}
