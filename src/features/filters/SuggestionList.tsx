import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'

import styles from './Filters.module.css'
import type { SuggestionGroup } from './suggestions'

interface Props {
  id: string
  /** Accessible name of the whole list. */
  label: string
  groups: readonly SuggestionGroup[]
  /** Index of the highlighted item, counting across all groups; -1 = none. */
  active: number
  optionId: (index: number) => string
  hidden: boolean
  /** Shown when there are no items at all. */
  emptyText?: string
}

/**
 * The dropdown under a combobox. Items can be split into labelled groups;
 * the highlight index still counts straight through them, so the keyboard
 * code in the comboboxes does not need to know about groups.
 *
 * The list floats over the page (position: fixed), placed from its box's
 * position on screen. Inside the scrolling builder column a plain absolute
 * list would make that column taller and get clipped by its edge instead.
 */
export function SuggestionList({ id, label, groups, active, optionId, hidden, emptyText }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const place = useFloatingPlace(ref, hidden)
  let index = 0
  const isEmpty = groups.every((group) => group.items.length === 0)
  return (
    <div ref={ref} id={id} className={styles.suggestions} style={place} role="listbox" aria-label={label} hidden={hidden}>
      {groups.map((group, g) => (
        <div key={group.label ?? g} role="group" aria-label={group.label} data-testid={group.label ? 'suggestion-group' : undefined}>
          {group.label && (
            <div className={styles.groupLabel} aria-hidden="true">
              {group.label}
            </div>
          )}
          {group.items.map((item) => {
            const i = index++
            return (
              <div
                key={item.key}
                id={optionId(i)}
                className={styles.option}
                role="option"
                aria-selected={i === active}
                // mousedown + preventDefault keeps focus in the input, so its
                // blur handler doesn't close the list before the pick lands.
                onMouseDown={(event) => {
                  event.preventDefault()
                  item.pick()
                }}
              >
                {item.label}
              </div>
            )
          })}
        </div>
      ))}
      {isEmpty && emptyText && <div className={styles.emptyOption}>{emptyText}</div>}
    </div>
  )
}

/** Opening upward needs at least this much more room above than below. */
const MIN_BELOW = 240

/**
 * Where the open list goes: under the box it belongs to (the list's parent),
 * or above it when the window has little room below. Follows the box while
 * any column scrolls or the window resizes. "The window" is the visual
 * viewport: on a phone that is the part above the on-screen keyboard. Gaps and the height cap stay in
 * CSS; this only passes the measured numbers in.
 */
function useFloatingPlace(ref: RefObject<HTMLDivElement | null>, hidden: boolean): CSSProperties | undefined {
  const [place, setPlace] = useState<CSSProperties>()

  useLayoutEffect(() => {
    const anchor = ref.current?.parentElement
    if (hidden || !anchor) return
    function measure() {
      const box = anchor!.getBoundingClientRect()
      const view = window.visualViewport
      const viewTop = view?.offsetTop ?? 0
      const viewBottom = viewTop + (view?.height ?? window.innerHeight)
      const below = viewBottom - box.bottom
      const above = box.top - viewTop
      const up = below < MIN_BELOW && above > below
      setPlace({
        left: box.left,
        width: box.width,
        ...(up ? { top: 'auto', bottom: document.documentElement.clientHeight - box.top } : { top: box.bottom }),
        ['--room' as string]: `${Math.floor(up ? above : below)}px`,
      })
    }
    measure()
    // Capture: a scroll in any column (they don't bubble) moves the box.
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    // The phone keyboard opening or closing resizes only the visual viewport.
    window.visualViewport?.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('scroll', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('scroll', measure)
    }
  }, [ref, hidden])

  return hidden ? undefined : place
}
