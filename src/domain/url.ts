import {
  COURT_OPTIONS,
  LEAGUE,
  PERIOD_OPTIONS,
  QUARTER_OPTIONS,
  REST_OPTIONS,
  RESULT_OPTIONS,
  STAT_OPTIONS,
  TEAMS,
  type Option,
} from './options'
import { DEFAULT_QUERY, parseLastN, type QueryState } from './query'

/**
 * The whole screen in the address bar (SM-6): every choice is a `?name=value`
 * pair, so a reload, a shared link, and back / forward all give the same
 * screen. Only what differs from the factory defaults is written, which keeps
 * the address short ("?player=LeBron+James&stat=points").
 *
 * The plain address (no `?...`) is the start screen: the user's saved default
 * selections. Old links are all the plain address, so they keep working.
 */

/** Each field's name in the address. */
const PARAMS: readonly (readonly [keyof QueryState, string])[] = [
  ['mode', 'mode'],
  ['view', 'view'],
  ['player', 'player'],
  ['team', 'team'],
  ['stat', 'stat'],
  ['quarter', 'quarter'],
  ['court', 'court'],
  ['opponent', 'opponent'],
  ['vsPlayer', 'vs'],
  ['without', 'without'],
  ['rest', 'rest'],
  ['result', 'result'],
  ['period', 'period'],
  ['lastN', 'lastN'],
]

/** The longest typed name an address may carry. */
const MAX_TEXT = 80

const values = (options: readonly Option[]): readonly string[] => options.map((o) => o.value)

/** The values each field accepts from an address; a field not listed is free text. */
const ALLOWED: Partial<Record<keyof QueryState, readonly string[]>> = {
  mode: ['player', 'leaders'],
  view: ['averages', 'gamelog'],
  team: [LEAGUE, ...TEAMS],
  stat: values(STAT_OPTIONS),
  quarter: values(QUARTER_OPTIONS),
  court: values(COURT_OPTIONS),
  opponent: TEAMS,
  rest: values(REST_OPTIONS),
  result: values(RESULT_OPTIONS),
  period: values(PERIOD_OPTIONS),
}

const sameQuery = (a: QueryState, b: QueryState): boolean => PARAMS.every(([key]) => a[key] === b[key])

/**
 * The address for a screen: "" (the plain address) or "?a=b&c=d".
 * `start` is the start screen (the saved defaults). When the screen is the
 * factory one but the start screen is not, the mode is written anyway, so the
 * address is not mistaken for "the start screen".
 */
export function queryToSearch(query: QueryState, start: QueryState = DEFAULT_QUERY): string {
  const params = new URLSearchParams()
  for (const [key, name] of PARAMS) {
    if (query[key] !== DEFAULT_QUERY[key]) params.set(name, query[key])
  }
  let search = params.toString()
  if (!search && !sameQuery(start, DEFAULT_QUERY)) search = `mode=${query.mode}`
  return search ? `?${search}` : ''
}

/**
 * The screen an address asks for. No known name in it: the start screen.
 * Otherwise the factory defaults plus what the address says; a value that is
 * not a real choice (a typo, an old chip) is ignored.
 */
export function searchToQuery(search: string, start: QueryState = DEFAULT_QUERY): QueryState {
  const params = new URLSearchParams(search)
  if (!PARAMS.some(([, name]) => params.has(name))) return start
  const query: Record<string, string> = { ...DEFAULT_QUERY }
  for (const [key, name] of PARAMS) {
    const value = params.get(name)
    if (value === null) continue
    const allowed = ALLOWED[key]
    if (allowed) {
      if (allowed.includes(value)) query[key] = value
    } else if (key === 'lastN') {
      if (parseLastN(value) === value) query[key] = value
    } else {
      query[key] = value.slice(0, MAX_TEXT)
    }
  }
  return query as unknown as QueryState
}
