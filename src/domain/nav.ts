import { isLeaders } from './availability'
import { LEAGUE, LEAGUE_OPTION, TEAMS, VIEW_OPTIONS } from './options'
import { normalizeName } from './playerSearch'
import { setMode, subject, type Mode, type QueryState, type View } from './query'
import { boxRecents, type Saved } from './recent'
import { TEAM_CITIES } from './teamSearch'

/**
 * The shared header's rules (SM-6, backlogkit's NAV_PATTERN.md): the places
 * ("Where" tabs), the breadcrumb with each part's neighbours, and the
 * "Go anywhere" search. Pure logic; the header in `features/nav` draws it.
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

/** Somewhere a breadcrumb part's list can jump to. */
export interface Jump {
  label: string
  /** The one being shown now. */
  on: boolean
  query: QueryState
}

/** One part of the breadcrumb; `items` are its neighbours (empty: nothing to jump to). */
export interface Crumb {
  label: string
  /** What this part is, for the hover: "Place", "Player", "Team", "How". */
  what: string
  items: Jump[]
}

const teamLabel = (team: string): string => (team === LEAGUE ? LEAGUE_OPTION.label : team)

/**
 * The path to the current screen: "Player › LeBron James › Averages" or
 * "Team leaders › Celtics". The place lists the places, the player lists the
 * recent players, the team lists every team, the last part lists the views.
 */
export function crumbs(query: QueryState, saved: Saved): Crumb[] {
  const place: Crumb = {
    label: PLACES.find((p) => p.mode === query.mode)?.label ?? '',
    what: 'Place',
    items: PLACES.map((p) => ({ label: p.label, on: p.mode === query.mode, query: goToPlace(query, p.mode) })),
  }
  const who = subject(query)

  if (isLeaders(query)) {
    return [
      place,
      {
        label: who ? teamLabel(who) : 'Pick a team',
        what: 'Team',
        items: [LEAGUE, ...TEAMS].map((team) => ({ label: teamLabel(team), on: team === query.team, query: { ...query, team } })),
      },
    ]
  }

  const recent = boxRecents(saved, 'player').names
  const names = who && !recent.includes(who) ? [who, ...recent] : recent
  return [
    place,
    {
      label: who || 'Pick a player',
      what: 'Player',
      // Only the current name: nowhere to jump.
      items: names.length > (who ? 1 : 0) ? names.map((name) => ({ label: name, on: name === who, query: { ...query, player: name } })) : [],
    },
    {
      label: VIEW_OPTIONS.find((o) => o.value === query.view)?.label ?? '',
      what: 'How',
      items: VIEW_OPTIONS.map((o) => ({ label: o.label, on: o.value === query.view, query: { ...query, view: o.value as View } })),
    },
  ]
}

/** One thing "Go anywhere" can open. */
export interface GoEntry {
  label: string
  /** What it is, shown beside it: "Place", "Player", "Team", "Pinned"... */
  kind: string
  /** Everything it can be found by, simplified like `normalizeName`. */
  keys: string
  /** 0: also listed before anything is typed. Lower comes first. */
  rank: number
  query: QueryState
}

/**
 * Everything "Go anywhere" knows: the places and views, pinned and recent
 * searches, every player, and every team (its own numbers, or its leaders).
 * Jumping to a player or team keeps the filters; a saved search is loaded
 * whole.
 */
export function goEntries(query: QueryState, saved: Saved, players: readonly string[]): GoEntry[] {
  const asPlayer = goToPlace(query, 'player')
  const asLeaders = goToPlace(query, 'leaders')
  const entry = (label: string, kind: string, rank: number, next: QueryState, more = ''): GoEntry => ({
    label,
    kind,
    keys: normalizeName(`${label} ${kind} ${more}`),
    rank,
    query: next,
  })
  return [
    ...PLACES.map((p) => entry(p.label, 'Place', 0, goToPlace(query, p.mode))),
    entry('League leaders (NBA)', 'Place', 0, { ...asLeaders, team: LEAGUE }, 'top players'),
    ...VIEW_OPTIONS.map((o) => entry(o.label, 'How', 0, { ...asPlayer, view: o.value as View }, 'player game log')),
    ...saved.pinned.map((s) => entry(s.question, 'Pinned', 0, s.query, 'saved search')),
    ...saved.recent.map((s) => entry(s.question, 'Recent', 0, s.query, 'saved search')),
    ...players.map((name) => entry(name, 'Player', 1, { ...asPlayer, player: name })),
    ...TEAMS.flatMap((team) => [
      entry(team, 'Team', 2, { ...asPlayer, player: team }, `${TEAM_CITIES[team] ?? ''} stats numbers`),
      entry(`${team} leaders`, 'Team leaders', 3, { ...asLeaders, team }, `${TEAM_CITIES[team] ?? ''} top best players`),
    ]),
  ]
}

/**
 * The entries matching what was typed, best first: every typed word must be
 * found ("lakers lead" finds "Lakers leaders"; accents and case are ignored).
 * Nothing typed: the places, views and saved searches.
 */
export function goFind(entries: readonly GoEntry[], typed: string, limit = 12): GoEntry[] {
  const search = normalizeName(typed).trim().replace(/\s+/g, ' ')
  if (!search) return entries.filter((e) => e.rank === 0).slice(0, limit)
  const words = search.split(' ')
  const scored: { entry: GoEntry; score: number }[] = []
  for (const entry of entries) {
    if (!words.every((word) => entry.keys.includes(word))) continue
    const label = normalizeName(entry.label)
    const fit = label === search ? 0 : label.startsWith(search) ? 1 : words.every((word) => label.includes(word)) ? 2 : 3
    scored.push({ entry, score: fit * 10 + entry.rank })
  }
  // Stable sort: ties keep the list's own order.
  scored.sort((a, b) => a.score - b.score || a.entry.label.length - b.entry.label.length)
  return scored.slice(0, limit).map((s) => s.entry)
}

/** The browser tab's title for a screen: the question, or the place while empty. */
export function pageTitle(query: QueryState, question: string): string {
  const what = subject(query) ? question : (PLACES.find((p) => p.mode === query.mode)?.label ?? '')
  return `${what} — StatMuse Builder`
}
