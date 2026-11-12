import { useRef, useState, type KeyboardEvent } from 'react'

import { TEAMS, type Option } from '../../domain/options'
import { exactTeam, findTeams, isExactOption, optionMatches } from '../../domain/teamSearch'
import styles from './Filters.module.css'
import { SuggestionList } from './SuggestionList'
import { flatten, recentGroups, type Recents, type SuggestionGroup } from './suggestions'

const ANY: Option = { value: '', label: 'Any team' }

interface Props {
  id: string
  /** A team nickname from TEAMS, `first.value`, or '' for none. */
  value: string
  onChange: (team: string) => void
  /** The entry above the 30 teams: "Any team" (default) or "League (NBA)". */
  first?: Option
  placeholder?: string
  /** Accessible names of the list and of the ▾ button. */
  listLabel?: string
  toggleLabel?: string
  /** When given, the empty box lists these above the teams. */
  recents?: Recents
  /** Enter with a team chosen and the list closed: send the question. */
  onSubmit?: () => void
  /** The main box of the page is bigger than the filter boxes. */
  large?: boolean
}

/**
 * A dropdown you can also type into. Opening it (click, focus or the ▾
 * button) lists every team; typing narrows the list by nickname or city.
 * Unlike the player box, only a real team can be chosen: leaving the box
 * with half a name typed puts the last team back.
 */
export function TeamCombobox({
  id,
  value,
  onChange,
  first = ANY,
  placeholder = 'Any team',
  listLabel = 'Teams',
  toggleLabel = 'Show all teams',
  recents,
  onSubmit,
  large = false,
}: Props) {
  const listId = `${id}-suggestions`
  const optionId = (i: number) => `${id}-option-${i}`
  const input = useRef<HTMLInputElement>(null)
  // What's typed while editing; null = not editing, so the box shows `value`.
  const [text, setText] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  // The box shows a special entry by its label ("League (NBA)").
  const shown = value !== '' && value === first.value ? first.label : value
  // Until something is typed, show the full list.
  const filtering = text !== null && text !== shown

  function close() {
    setText(null)
    setOpen(false)
    setActive(-1)
  }

  function pick(team: string) {
    onChange(team)
    close()
  }

  const toItem = (option: Option) => ({ key: option.value || 'any', label: option.label, pick: () => pick(option.value) })
  const everyOption = [first, ...TEAMS.map((team) => ({ value: team, label: team }))]

  let groups: SuggestionGroup[]
  if (filtering) {
    const matches = findTeams(text).map((team) => ({ value: team, label: team }))
    if (first.value && optionMatches(first, text)) matches.unshift(first)
    groups = [{ items: matches.map(toItem) }]
  } else {
    // An empty box leads with the recent groups, like the player box.
    const recent = recents && value === '' ? recentGroups(recents, pick, close) : []
    groups = [...recent, { label: recent.length > 0 ? 'All teams' : undefined, items: everyOption.map(toItem) }]
  }
  const items = flatten(groups)

  function openList() {
    setOpen(true)
    // Start the highlight on the current team, so arrows move from there.
    // (Recent groups only show for an empty box, so the full list starts at 0.)
    const current = everyOption.findIndex((option) => option.value === value)
    setActive(filtering || (recents && value === '') ? -1 : current)
  }

  /** Leaving the box: keep an exact team name or an empty box, else revert. */
  function commit() {
    if (text !== null) {
      const typed = text.trim()
      const team = typed === '' ? '' : first.value && isExactOption(first, typed) ? first.value : exactTeam(typed)
      if (team !== null && team !== value) onChange(team)
    }
    close()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Ctrl/Cmd+Enter is the page-wide "Ask" shortcut (see App).
    if (event.ctrlKey || event.metaKey) return
    const count = items.length
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
      const chosen = items[active] ?? (filtering ? items[0] : undefined)
      if (open && chosen) chosen.pick()
      else {
        commit()
        if (!open && value) onSubmit?.()
      }
    }
  }

  return (
    <div className={`${styles.inputWrap} ${styles.team}`}>
      <input
        ref={input}
        id={id}
        type="text"
        className={`${styles.teamInput} ${large ? styles.large : ''}`}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        spellCheck={false}
        value={text ?? shown}
        onChange={(event) => {
          setText(event.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={(event) => {
          setText(shown)
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
        aria-label={toggleLabel}
        tabIndex={-1}
        // mousedown + preventDefault keeps focus in the input, like the options.
        onMouseDown={(event) => {
          event.preventDefault()
          if (document.activeElement !== input.current) input.current?.focus()
          else if (open) setOpen(false)
          else {
            setText(shown)
            openList()
          }
        }}
      >
        ▾
      </button>
      <SuggestionList
        id={listId}
        label={listLabel}
        groups={groups}
        active={active}
        optionId={optionId}
        hidden={!open}
        emptyText="No team matches"
      />
    </div>
  )
}
