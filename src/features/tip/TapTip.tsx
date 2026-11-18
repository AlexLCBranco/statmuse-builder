import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

import styles from './TapTip.module.css'

interface Props {
  /** What the tip says. */
  text: string
  /** The trigger; call `toggle` from its click handler to show or hide the tip. */
  children: (toggle: () => void, tipId: string | undefined) => ReactNode
  /** Where the bubble goes: left of the trigger (default), or above it, right edges aligned. */
  placement?: 'left' | 'above'
}

/**
 * A tooltip that also works on phones, where there is no hover: a tap (or
 * click) on the trigger shows `text` in a small bubble next to it; a tap
 * anywhere else, or Escape, closes it. Keep `title` on the trigger as well
 * for mouse users who hover.
 */
export function TapTip({ text, children, placement = 'left' }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  const tipId = useId()

  // Only listen while it is open, like the defaults popover.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <span ref={rootRef} className={styles.root}>
      {children(() => setOpen((o) => !o), open ? tipId : undefined)}
      {open && (
        <span id={tipId} role="tooltip" className={`${styles.bubble} ${styles[placement]}`}>
          {text}
        </span>
      )}
    </span>
  )
}
