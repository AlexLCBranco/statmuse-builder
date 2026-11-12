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
 */
export function SuggestionList({ id, label, groups, active, optionId, hidden, emptyText }: Props) {
  let index = 0
  const isEmpty = groups.every((group) => group.items.length === 0)
  return (
    <div id={id} className={styles.suggestions} role="listbox" aria-label={label} hidden={hidden}>
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
