import { useMemo, useRef, useState, type KeyboardEvent } from 'react'

import { TEAMS } from '../../domain/options'
import { exactTeam, findTeams } from '../../domain/teamSearch'
import styles from './Filters.module.css'

interface Props {
  id: string
  /** A team nickname from TEAMS, or '' for any team. */
  value: string
  onChange: (team: string) => void
}

const LIST_ID = 'team-suggestions'
const optionId = (i: number) => `team-option-${i}`
const ANY = { value: '', label: 'Any team' }

/**
 * A dropdown you can also type into. Opening it (click, focus or the ▾
 * button) lists every team; typing narrows the list by nickname or city.
 * Unlike the player box, only a real team can be chosen: leaving the box
 * with half a name typed puts the last team back.
 */
export function TeamCombobox({ id, value, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null)
  // What's typed while editing; null = not editing, so the box shows `value`.
  const [text, setText] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  // Until something is typed, show the full list (with "Any team" first).
  const filtering = text !== null && text !== value
  const options = useMemo(
    () =>
      filtering
        ? findTeams(text).map((team) => ({ value: team, label: team }))
        : [ANY, ...TEAMS.map((team) => ({ value: team, label: team }))],
    [filtering, text],
  )

  function openList() {
    setOpen(true)
    // Start the highlight on the current team, so arrows move from there.
    setActive(filtering ? -1 : TEAMS.indexOf(value) + 1)
  }

  function close() {
    setText(null)
    setOpen(false)
    setActive(-1)
  }

  function pick(team: string) {
    onChange(team)
    close()
  }

  /** Leaving the box: keep an exact team name or an empty box, else revert. */
  function commit() {
    if (text !== null) {
      const team = text.trim() ? exactTeam(text) : ''
      if (team !== null && team !== value) onChange(team)
    }
    close()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = options.length
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) return openList()
      if (count === 0) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i < 0 && step < 0 ? count - 1 : (i + step + count) % count))
    } else if (event.key === 'Escape') {
      close()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      // The highlighted team, or the best match for what's typed.
      const chosen = options[active] ?? (filtering ? options[0] : undefined)
      if (open && chosen) pick(chosen.value)
      else commit()
    }
  }

  return (
    <div className={`${styles.inputWrap} ${styles.team}`}>
      <input
        ref={input}
        id={id}
        type="text"
        className={styles.teamInput}
        placeholder="Any team"
        role="combobox"
        aria-expanded={open}
        aria-controls={LIST_ID}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        spellCheck={false}
        value={text ?? value}
        onChange={(event) => {
          setText(event.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={(event) => {
          setText(value)
          openList()
          // Select it all, so typing replaces the current team.
          event.target.select()
        }}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className={styles.toggle}
        aria-label="Show all teams"
        tabIndex={-1}
        // mousedown + preventDefault keeps focus in the input, like the options below.
        onMouseDown={(event) => {
          event.preventDefault()
          if (document.activeElement !== input.current) input.current?.focus()
          else if (open) setOpen(false)
          else {
            setText(value)
            openList()
          }
        }}
      >
        ▾
      </button>
      <ul id={LIST_ID} className={styles.suggestions} role="listbox" aria-label="Teams" hidden={!open}>
        {options.map((option, i) => (
          <li
            key={option.value || 'any'}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            // mousedown + preventDefault keeps focus in the input, so its
            // blur handler doesn't run before the pick lands.
            onMouseDown={(event) => {
              event.preventDefault()
              pick(option.value)
            }}
          >
            {option.label}
          </li>
        ))}
        {options.length === 0 && <li className={styles.empty}>No team matches</li>}
      </ul>
    </div>
  )
}
