import { useMemo, useState, type KeyboardEvent } from 'react'

import { PLAYERS } from '../../domain/data/players'
import { findPlayers, highlightRange } from '../../domain/playerSearch'
import styles from './Filters.module.css'

interface Props {
  id: string
  value: string
  onChange: (player: string) => void
  placeholder?: string
  /** Accessible name of the suggestion list. */
  listLabel?: string
  /** Small print under the box; omitted when not given. */
  hint?: string
  /** Enter with a player already chosen: send the question. */
  onSubmit: () => void
}

/**
 * A text box with suggestions (the ARIA "combobox" pattern): focus stays in
 * the input while arrow keys move a highlight through the list, and
 * aria-activedescendant tells screen readers which option is highlighted.
 * Any typed name is accepted; the list only helps. Used for both the player
 * and the opponent player, so ids are derived from `id` to stay unique.
 */
export function PlayerCombobox({ id, value, onChange, onSubmit, placeholder = 'Type any player…', listLabel = 'Players', hint }: Props) {
  const listId = `${id}-suggestions`
  const optionId = (i: number) => `${id}-option-${i}`
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const hits = useMemo(() => findPlayers(PLAYERS, value), [value])

  // Nothing to suggest, or the only suggestion is exactly what's typed.
  const showList = open && hits.length > 0 && !(hits.length === 1 && hits[0] === value)

  function show() {
    setOpen(true)
    setActive(-1)
  }

  function pick(name: string) {
    onChange(name)
    setOpen(false)
    setActive(-1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && showList) {
      event.preventDefault()
      setActive((i) => (i + 1) % hits.length)
    } else if (event.key === 'ArrowUp' && showList) {
      event.preventDefault()
      setActive((i) => (i - 1 + hits.length) % hits.length)
    } else if (event.key === 'Escape') {
      setOpen(false)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const highlighted = hits[active]
      const first = hits[0]
      if (showList && highlighted) pick(highlighted)
      // Typed part of a name and pressed Enter: take the best suggestion.
      else if (showList && first && !PLAYERS.includes(value)) pick(first)
      else if (value.trim()) onSubmit()
    }
  }

  return (
    <div className={styles.player}>
      <div className={styles.inputWrap}>
        <input
          id={id}
          type="text"
          className={styles.playerInput}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            show()
          }}
          onFocus={show}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
        />
        <ul id={listId} className={styles.suggestions} role="listbox" aria-label={listLabel} hidden={!showList}>
          {hits.map((name, i) => (
            <li
              key={name}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              // mousedown + preventDefault keeps focus in the input, so its
              // blur handler doesn't close the list before the pick lands.
              onMouseDown={(event) => {
                event.preventDefault()
                pick(name)
              }}
            >
              <Highlighted name={name} typed={value} />
            </li>
          ))}
        </ul>
      </div>
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  )
}

function Highlighted({ name, typed }: { name: string; typed: string }) {
  const range = highlightRange(name, typed)
  if (!range) return <>{name}</>
  const [start, end] = range
  return (
    <>
      {name.slice(0, start)}
      <mark>{name.slice(start, end)}</mark>
      {name.slice(end)}
    </>
  )
}
