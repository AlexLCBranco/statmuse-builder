import { useEffect, useRef, useState, type MouseEvent, type Ref } from 'react'

import { buildQuestion, hasPlayer, questionParts, type QueryState } from '../../domain/query'
import { statmuseUrl } from '../../domain/slug'
import { copyText, selectContents } from '../../lib/clipboard'
import styles from './QuestionCard.module.css'

interface Props {
  query: QueryState
  /** Lets the page "press" Ask from the keyboard (Enter in the player box). */
  askRef: Ref<HTMLAnchorElement>
  /** Called when the question is sent, so it can be saved to Recent. */
  onAsk: () => void
  /** Called when Ask is pressed without a player. */
  onMissingPlayer: () => void
  onClear: () => void
}

const TOAST_MS = 1800

/** The hero: the question as a sentence, its exact URL, and the actions. */
export function QuestionCard({ query, askRef, onAsk, onMissingPlayer, onClear }: Props) {
  const ready = hasPlayer(query)
  const question = buildQuestion(query)
  const url = statmuseUrl(question)
  const urlElement = useRef<HTMLDivElement>(null)
  const [toast, setToast] = useState('')

  // Clear the toast a moment after it appears; a new toast restarts the timer.
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  async function copy(text: string, what: string) {
    if (await copyText(text)) {
      setToast(`${what} copied`)
    } else {
      if (urlElement.current) selectContents(urlElement.current)
      setToast('Press Ctrl/Cmd+C to copy')
    }
  }

  function handleAsk(event: MouseEvent<HTMLAnchorElement>) {
    if (!ready) {
      event.preventDefault()
      onMissingPlayer()
      return
    }
    // No preventDefault: the browser follows the link in a new tab as usual.
    onAsk()
  }

  return (
    <section className={styles.card} aria-labelledby="question-label">
      <div id="question-label" className={styles.label}>
        Your question
      </div>
      <p className={styles.text} data-testid="question" aria-live="polite">
        {questionParts(query).map((part, i) => (
          <span key={i}>
            {i > 0 && ' '}
            {part.isPlayer ? (
              ready ? (
                <b className={styles.player}>{part.text}</b>
              ) : (
                <span className={styles.placeholder}>Pick a player</span>
              )
            ) : (
              part.text
            )}
          </span>
        ))}
      </p>
      <div ref={urlElement} className={styles.url} data-testid="question-url">
        {ready ? url : 'statmuse.com/nba/ask/…'}
      </div>
      <div className={styles.actions}>
        {/* A real link (not window.open) so middle-click, "copy link" and
            screen readers all treat it as the link it is. */}
        <a
          ref={askRef}
          className={`${styles.button} ${styles.primary}`}
          href={ready ? url : '#'}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!ready}
          onClick={handleAsk}
        >
          Ask StatMuse <span aria-hidden="true">↗</span>
        </a>
        <button
          type="button"
          className={styles.button}
          aria-disabled={!ready}
          onClick={() => ready && void copy(question, 'Question')}
        >
          Copy question
        </button>
        <button
          type="button"
          className={styles.button}
          aria-disabled={!ready}
          onClick={() => ready && void copy(url, 'Link')}
        >
          Copy link
        </button>
        <button type="button" className={styles.button} onClick={onClear}>
          Clear
        </button>
        <span className={styles.toast} role="status">
          {toast}
        </span>
      </div>
    </section>
  )
}
