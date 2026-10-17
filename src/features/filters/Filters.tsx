import {
  COURT_OPTIONS,
  MAX_LAST_N,
  PERIOD_OPTIONS,
  QUARTER_OPTIONS,
  RESULT_OPTIONS,
  STAT_OPTIONS,
  TEAMS,
} from '../../domain/options'
import { parseLastN, type QueryState } from '../../domain/query'
import { ChipGroup } from './ChipGroup'
import styles from './Filters.module.css'
import { PlayerCombobox } from './PlayerCombobox'

interface Props {
  query: QueryState
  onChange: (changes: Partial<QueryState>) => void
  onSubmit: () => void
}

/** All the controls under the question: player, then one row per filter. */
export function Filters({ query, onChange, onSubmit }: Props) {
  return (
    // A form for semantics only; submitting is always cancelled.
    <form className={styles.controls} autoComplete="off" onSubmit={(event) => event.preventDefault()}>
      <div className={styles.row}>
        <label className={styles.rowLabel} htmlFor="player">
          Player
        </label>
        <PlayerCombobox id="player" value={query.player} onChange={(player) => onChange({ player })} onSubmit={onSubmit} />
      </div>

      <ChipRow label="Stat" options={STAT_OPTIONS} value={query.stat} onChange={(stat) => onChange({ stat })} />
      <ChipRow label="Quarter" options={QUARTER_OPTIONS} value={query.quarter} onChange={(quarter) => onChange({ quarter })} />
      <ChipRow label="Court" options={COURT_OPTIONS} value={query.court} onChange={(court) => onChange({ court })} />

      <div className={styles.row}>
        <label className={styles.rowLabel} htmlFor="opponent">
          Opponent
        </label>
        <div>
          <select
            id="opponent"
            className={styles.field}
            value={query.opponent}
            onChange={(event) => onChange({ opponent: event.target.value })}
          >
            <option value="">Any team</option>
            {TEAMS.map((team) => (
              <option key={team} value={team}>
                vs {team}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.rowLabel}>Period</div>
        <div className={styles.stack}>
          <ChipGroup
            label="Period"
            options={PERIOD_OPTIONS}
            // While "last N" is filled in, it wins, so no chip shows as on.
            value={query.lastN ? null : query.period}
            // Picking a chip clears "last N" so the chip takes effect.
            onChange={(period) => onChange({ period, lastN: '' })}
          />
          <div className={styles.inline}>
            <span className={styles.hint}>or last</span>
            <input
              type="number"
              inputMode="numeric"
              className={`${styles.field} ${styles.number}`}
              min={1}
              max={MAX_LAST_N}
              placeholder="N"
              aria-label="Last N games"
              value={query.lastN}
              onChange={(event) => onChange({ lastN: parseLastN(event.target.value) })}
            />
            <span className={styles.hint}>games</span>
          </div>
        </div>
      </div>

      <ChipRow label="Result" options={RESULT_OPTIONS} value={query.result} onChange={(result) => onChange({ result })} />
    </form>
  )
}

function ChipRow(props: Parameters<typeof ChipGroup>[0]) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLabel}>{props.label}</div>
      <ChipGroup {...props} />
    </div>
  )
}
