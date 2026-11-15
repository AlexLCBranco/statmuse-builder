import { useMemo, useState, type KeyboardEvent } from 'react'

import { PLAYERS } from '../../domain/data/players'
import { findPlayers, highlightRange } from '../../domain/playerSearch'
import { findSubjects, type SubjectHit } from '../../domain/subjectSearch'
import { exactTeam } from '../../domain/teamSearch'
import styles from './Filters.module.css'
import { SuggestionList } from './SuggestionList'
import { flatten, recentGroups, type Recents, type SuggestionGroup } from './suggestions'

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
  /** When given, the empty box lists these instead of nothing. */
  recents?: Recents
  /** The main box of the page is bigger than the filter boxes. */
  large?: boolean
  /** Also suggest teams (the Player box: a team there asks for team stats). */
  withTeams?: boolean
}

/**
 * A text box with suggestions (the ARIA "combobox" pattern): focus stays in
 * the input while arrow keys move a highlight through the list, and
 * aria-activedescendant tells screen readers which option is highlighted.
 * Any typed name is accepted; the list only helps. Used for the player, the
 * opponent player and the teammate, so ids are derived from `id` to stay
 * unique.
 *
 * The list has two states. Empty box: recent players and recent searches (if
 * `recents` is given). One letter typed: the normal name suggestions.
 */
export function PlayerCombobox({ id, value, onChange, onSubmit, placeholder = 'Type any player…', listLabel = 'Players', hint, recents, large = false, withTeams = false }: Props) {
  const listId = `${id}-suggestions`
  const optionId = (i: number) => `${id}-option-${i}`
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const hits: SubjectHit[] = useMemo(
    () =>
      withTeams
        ? findSubjects(PLAYERS, value)
        : findPlayers(PLAYERS, value).map((name) => ({ name, kind: 'player' as const })),
    [value, withTeams],
  )
  const isEmpty = value === ''
  // A full player name, or (when teams count) a full team nickname.
  const isKnown = PLAYERS.includes(value) || (withTeams && exactTeam(value) === value)

  function show() {
    setOpen(true)
    setActive(-1)
  }

  function close() {
    setOpen(false)
    setActive(-1)
  }

  function pick(name: string) {
    onChange(name)
    close()
  }

  const groups: SuggestionGroup[] = isEmpty
    ? recents
      ? recentGroups(recents, pick, close)
      : []
    : [
        {
          items: hits.map(({ name, kind }) => ({
            key: `${kind}:${name}`,
            label: (
              <>
                <Highlighted name={name} typed={value} />
                {/* aria-hidden: the option's accessible name stays the team name. */}
                {kind === 'team' && (
                  <span className={styles.kindTag} aria-hidden="true">
                    Team
                  </span>
                )}
              </>
            ),
            pick: () => pick(name),
          })),
        },
      ]
  const items = flatten(groups)

  // Nothing to suggest, or the only suggestion is exactly what's typed.
  const showList = open && items.length > 0 && !(hits.length === 1 && hits[0]?.name === value)

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Ctrl/Cmd+Enter is the page-wide "Ask" shortcut (see App).
    if (event.ctrlKey || event.metaKey) return
    if (event.key === 'ArrowDown' && showList) {
      event.preventDefault()
      setActive((i) => (i + 1) % items.length)
    } else if (event.key === 'ArrowUp' && showList) {
      event.preventDefault()
      setActive((i) => (i < 0 ? items.length - 1 : (i - 1 + items.length) % items.length))
    } else if (event.key === 'Escape') {
      close()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const highlighted = items[active]
      const first = hits[0]
      if (showList && highlighted) highlighted.pick()
      // Typed part of a name and pressed Enter: take the best suggestion.
      else if (showList && first && !isKnown) pick(first.name)
      else if (value.trim()) onSubmit()
    }
  }

  return (
    <div className={styles.player}>
      <div className={styles.inputWrap}>
        <input
          id={id}
          type="text"
          className={`${styles.playerInput} ${large ? styles.large : ''}`}
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
          onBlur={close}
          onKeyDown={handleKeyDown}
        />
        <SuggestionList id={listId} label={listLabel} groups={groups} active={active} optionId={optionId} hidden={!showList} />
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
