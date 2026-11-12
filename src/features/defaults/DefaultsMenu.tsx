import { useEffect, useRef, useState } from 'react'

import styles from './DefaultsMenu.module.css'

/** How long a button says "Saved" / "Reset done" after it was pressed. */
const CONFIRM_MS = 1500

type Action = 'save' | 'reset'

interface Props {
  onSave: () => void
  onReset: () => void
}

/**
 * The gear button and its small popover with the two "default selections"
 * actions. The popover floats over the page (it is positioned against the
 * gear), so opening it moves nothing. It closes on a click outside it and on
 * Escape. After an action, that button's text confirms it for a moment.
 */
export function DefaultsMenu({ onSave, onReset }: Props) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState<Action | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const gearRef = useRef<HTMLButtonElement>(null)

  // Only listen while it is open.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      gearRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // The confirmation goes away by itself.
  useEffect(() => {
    if (!done) return
    const timer = window.setTimeout(() => setDone(null), CONFIRM_MS)
    return () => window.clearTimeout(timer)
  }, [done])

  function run(action: Action) {
    if (action === 'save') onSave()
    else onReset()
    setDone(action)
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={gearRef}
        type="button"
        className={styles.gear}
        aria-label="Default selections"
        title="Default selections"
        aria-expanded={open}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          {/* A thick dashed ring makes the eight teeth. */}
          <circle cx="12" cy="12" r="8.5" strokeWidth="3" strokeDasharray="3.34 3.34" />
          <circle cx="12" cy="12" r="6" strokeWidth="2" />
          <circle cx="12" cy="12" r="2" strokeWidth="2" />
        </svg>
      </button>

      {open && (
        <div className={styles.popover} role="group" aria-label="Default selections" data-testid="defaults-menu">
          <button type="button" className={styles.item} onClick={() => run('save')}>
            {done === 'save' ? 'Saved' : 'Set current selection as default'}
          </button>
          <button type="button" className={styles.item} onClick={() => run('reset')}>
            {done === 'reset' ? 'Reset done' : 'Reset to factory defaults'}
          </button>
          {/* Screen readers hear the confirmation too. */}
          <span className="visually-hidden" role="status">
            {done === 'save' ? 'Defaults saved' : done === 'reset' ? 'Factory defaults restored' : ''}
          </span>
        </div>
      )}
    </div>
  )
}
