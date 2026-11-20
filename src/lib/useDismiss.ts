import { useEffect, type RefObject } from 'react'

/**
 * Closes something that floats over the page (a menu, a dialog) on Escape or
 * on a press outside `box`. Listens only while it is open.
 */
export function useDismiss(open: boolean, box: RefObject<HTMLElement | null>, close: () => void): void {
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!box.current?.contains(event.target as Node)) close()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, box, close])
}
