import type { ReactNode } from 'react'

import { isLeaders, offersFilter, offersLastN, periodOptions, statOptions, type FilterKey } from '../../domain/availability'
import { PLAYERS_SEASON } from '../../domain/data/players'
import {
  COURT_OPTIONS,
  LEAGUE,
  LEAGUE_OPTION,
  MAX_LAST_N,
  MODE_OPTIONS,
  QUARTER_OPTIONS,
  RESULT_OPTIONS,
  VIEW_OPTIONS,
} from '../../domain/options'
import {
  effectivePeriod,
  effectiveStat,
  isRowDefault,
  parseLastN,
  resetRow,
  setMode,
  type Mode,
  type QueryState,
  type View,
} from '../../domain/query'
import { recentPlayers, recentSearches, recentTeams, type RecentSearch } from '../../domain/recent'
import { ChipGroup } from './ChipGroup'
import styles from './Filters.module.css'
import { PlayerCombobox } from './PlayerCombobox'
import { TeamCombobox } from './TeamCombobox'

interface Props {
  query: QueryState
  /** Changes some fields. */
  onChange: (changes: Partial<QueryState>) => void
  /** Swaps in a whole query (mode switch, row reset, a recent search). */
  onReplace: (query: QueryState) => void
  onSubmit: () => void
  /** The saved Recent list, for the empty player/team box. */
  recent: readonly RecentSearch[]
  /** Shown at the right end of the mode/view line (the defaults gear). */
  corner?: ReactNode
}

/**
 * All the controls under the question: the mode and view switches, the
 * player (or team), then the filters this mode offers. Short filters share a
 * row so everything fits one desktop screen.
 */
export function Filters({ query, onChange, onReplace, onSubmit, recent, corner }: Props) {
  const leaders = isLeaders(query)
  const offers = (key: FilterKey) => offersFilter(query, key)

  // One filter: label, control, and a ✕ that shows only off the default.
  const filter = (key: FilterKey, label: string, control: ReactNode, htmlFor?: string) => (
    <div className={styles.field}>
      {htmlFor ? (
        <label className={styles.rowLabel} htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <div className={styles.rowLabel}>{label}</div>
      )}
      <div className={styles.control}>{control}</div>
      <div className={styles.resetSlot}>
        {!isRowDefault(query, key) && (
          <button
            type="button"
            className={styles.reset}
            aria-label={`Reset ${label}`}
            title={`Reset ${label}`}
            onClick={() => onReplace(resetRow(query, key))}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )

  return (
    // A form for semantics only; submitting is always cancelled.
    <form className={styles.controls} autoComplete="off" onSubmit={(event) => event.preventDefault()}>
      <div className={styles.switches}>
        <ChipGroup
          label="Mode"
          variant="switch"
          options={MODE_OPTIONS}
          value={query.mode}
          onChange={(mode) => onReplace(setMode(query, mode as Mode))}
        />
        {!leaders && (
          <ChipGroup
            label="View"
            variant="switch"
            options={VIEW_OPTIONS}
            value={query.view}
            onChange={(view) => onChange({ view: view as View })}
          />
        )}
        {corner}
      </div>

      {leaders ? (
        <div className={styles.field}>
          <label className={styles.rowLabel} htmlFor="team">
            Team
          </label>
          <div className={styles.control}>
            <TeamCombobox
              id="team"
              large
              value={query.team}
              onChange={(team) => onChange({ team })}
              onSubmit={onSubmit}
              first={LEAGUE_OPTION}
              placeholder="Pick a team…"
              listLabel="Leader teams"
              toggleLabel="Show the team list"
              recents={{
                namesLabel: 'Recent teams',
                names: recentTeams(recent),
                nameLabel: (team) => (team === LEAGUE ? LEAGUE_OPTION.label : team),
                searches: recentSearches(recent, 'leaders'),
                onPickSearch: onReplace,
              }}
            />
          </div>
          <div className={styles.resetSlot} />
        </div>
      ) : (
        <div className={styles.field}>
          <label className={styles.rowLabel} htmlFor="player">
            Player
          </label>
          <div className={styles.control}>
            <PlayerCombobox
              id="player"
              large
              value={query.player}
              onChange={(player) => onChange({ player })}
              onSubmit={onSubmit}
              hint={`Suggestions cover the ${PLAYERS_SEASON} rosters; any name you type still works.`}
              recents={{
                namesLabel: 'Recent players',
                names: recentPlayers(recent),
                searches: recentSearches(recent, 'player'),
                onPickSearch: onReplace,
              }}
            />
          </div>
          <div className={styles.resetSlot} />
        </div>
      )}

      {offers('stat') && (
        <Row>
          {filter(
            'stat',
            'Stat',
            <ChipGroup label="Stat" options={statOptions(query)} value={effectiveStat(query)} onChange={(stat) => onChange({ stat })} />,
          )}
        </Row>
      )}

      <Row>
        {filter(
          'quarter',
          'Quarter',
          <ChipGroup label="Quarter" options={QUARTER_OPTIONS} value={query.quarter} onChange={(quarter) => onChange({ quarter })} />,
        )}
      </Row>

      <Row>
        {offers('court') &&
          filter(
            'court',
            'Court',
            <ChipGroup label="Court" options={COURT_OPTIONS} value={query.court} onChange={(court) => onChange({ court })} />,
          )}
        {filter(
          'result',
          'Result',
          <ChipGroup label="Result" options={RESULT_OPTIONS} value={query.result} onChange={(result) => onChange({ result })} />,
        )}
      </Row>

      <Row>
        {filter(
          'opponent',
          'Opponent',
          <TeamCombobox id="opponent" value={query.opponent} onChange={(opponent) => onChange({ opponent })} />,
          'opponent',
        )}
      </Row>

      {offers('vsPlayer') && offers('without') && (
        <Row>
          {filter(
            'vsPlayer',
            'Vs player',
            <PlayerCombobox
              id="vs-player"
              value={query.vsPlayer}
              onChange={(vsPlayer) => onChange({ vsPlayer })}
              onSubmit={onSubmit}
              placeholder="A matchup"
              listLabel="Opponent players"
            />,
            'vs-player',
          )}
          {filter(
            'without',
            'Without',
            <PlayerCombobox
              id="without"
              value={query.without}
              onChange={(without) => onChange({ without })}
              onSubmit={onSubmit}
              placeholder="A teammate who sat out"
              listLabel="Teammates"
            />,
            'without',
          )}
        </Row>
      )}

      <Row>
        {filter(
          'period',
          'Period',
          <div className={styles.inline}>
            <ChipGroup
              label="Period"
              options={periodOptions(query)}
              // While "last N" is filled in, it wins, so no chip shows as on.
              value={query.lastN && offersLastN(query) ? null : effectivePeriod(query)}
              // Picking a chip clears "last N" so the chip takes effect.
              onChange={(period) => onChange({ period, lastN: '' })}
            />
            {offersLastN(query) && (
              <div className={styles.lastN}>
                <span className={styles.hint}>or last</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className={`${styles.input} ${styles.number}`}
                  min={1}
                  max={MAX_LAST_N}
                  placeholder="N"
                  aria-label="Last N games"
                  value={query.lastN}
                  onChange={(event) => onChange({ lastN: parseLastN(event.target.value) })}
                />
                <span className={styles.hint}>games</span>
              </div>
            )}
          </div>,
        )}
      </Row>
    </form>
  )
}

/** One line of filters: a single filter, or two short ones side by side. */
function Row({ children }: { children: ReactNode }) {
  return (
    <div className={styles.row} data-testid="filter-row">
      {children}
    </div>
  )
}
