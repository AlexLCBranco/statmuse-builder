import { setMode, subject, type Mode, type QueryState } from './query'

/**
 * The header's rules: the places ("Where" tabs) and the tab title. Pure
 * logic; the header in `features/nav` draws it.
 */

/** A main place of the app. This app has two: the two kinds of question. */
export interface Place {
  mode: Mode
  label: string
  /** Plain words for the hover. */
  tip: string
}

export const PLACES: readonly Place[] = [
  { mode: 'player', label: 'Player', tip: 'Numbers for one player (or one team)' },
  { mode: 'leaders', label: 'Team leaders', tip: "A team's best players, top to bottom" },
]

/** Going to a place keeps every filter (see `setMode`). */
export function goToPlace(query: QueryState, mode: Mode): QueryState {
  return query.mode === mode ? query : setMode(query, mode)
}

/** The browser tab's title for a screen: the question, or the place while empty. */
export function pageTitle(query: QueryState, question: string): string {
  const what = subject(query) ? question : (PLACES.find((p) => p.mode === query.mode)?.label ?? '')
  return `${what} — StatMuse Builder`
}
