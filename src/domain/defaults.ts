import { offersLastN } from './availability'
import {
  COURT_OPTIONS,
  MODE_OPTIONS,
  PERIOD_OPTIONS,
  QUARTER_OPTIONS,
  RESULT_OPTIONS,
  STAT_OPTIONS,
  VIEW_OPTIONS,
  type Option,
} from './options'
import { DEFAULT_QUERY, effectivePeriod, effectiveStat, parseLastN, type QueryState, type Selections } from './query'

/**
 * "Default selections": the buttons the user wants pressed every time the
 * app loads. Only the button rows are saved (see `Selections`); the player,
 * team, opponent, vs player and without boxes always start empty.
 */

/** Raised when the saved shape changes; other versions are ignored. */
export const DEFAULTS_VERSION = 1

/** What goes into localStorage. */
export interface StoredDefaults extends Selections {
  version: number
}

/** The button rows of a query. */
function pick(query: QueryState): Selections {
  const { mode, view, stat, quarter, court, result, period, lastN } = query
  return { mode, view, stat, quarter, court, result, period, lastN }
}

/** What the app starts with when nothing is saved. */
export const FACTORY_SELECTIONS: Selections = pick(DEFAULT_QUERY)

/**
 * The button rows as they show right now. Stat and Period are saved as the
 * chip that is pressed; a filled-in "last N games" is saved instead of a
 * period chip, because it is what the question uses.
 */
export function currentSelections(query: QueryState): Selections {
  const lastN = offersLastN(query) ? query.lastN : ''
  return {
    ...pick(query),
    stat: effectiveStat(query),
    period: lastN ? '' : effectivePeriod(query),
    lastN,
  }
}

export function toStored(selections: Selections): StoredDefaults {
  return { version: DEFAULTS_VERSION, ...selections }
}

const ROW_OPTIONS: Record<Exclude<keyof Selections, 'lastN'>, readonly Option[]> = {
  mode: MODE_OPTIONS,
  view: VIEW_OPTIONS,
  stat: STAT_OPTIONS,
  quarter: QUARTER_OPTIONS,
  court: COURT_OPTIONS,
  result: RESULT_OPTIONS,
  period: PERIOD_OPTIONS,
}

/**
 * Rebuilds saved defaults from whatever is in storage. Returns null when
 * there is nothing usable (nothing saved, not an object, another version).
 * A value that is not one of its row's options (an old chip that was
 * removed, a manual edit) falls back to the factory default for that row.
 */
export function parseDefaults(saved: unknown): Selections | null {
  if (typeof saved !== 'object' || saved === null) return null
  const raw = saved as Record<string, unknown>
  if (raw.version !== DEFAULTS_VERSION) return null

  const merged: Record<string, string> = { ...FACTORY_SELECTIONS }
  for (const [key, options] of Object.entries(ROW_OPTIONS)) {
    const value = raw[key]
    if (typeof value === 'string' && options.some((o) => o.value === value)) merged[key] = value
  }
  // "last N" must be a number the box itself would accept (1 to 82).
  if (typeof raw.lastN === 'string' && parseLastN(raw.lastN) === raw.lastN) merged.lastN = raw.lastN
  return merged as unknown as Selections
}

/** The query the app starts with: factory defaults, then the saved ones. */
export function startQuery(defaults: Selections | null): QueryState {
  return { ...DEFAULT_QUERY, ...defaults }
}

/** "Reset to factory defaults": the button rows go back, the boxes stay. */
export function applyFactory(query: QueryState): QueryState {
  return { ...query, ...FACTORY_SELECTIONS }
}
