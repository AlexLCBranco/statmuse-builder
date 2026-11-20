/**
 * The choices offered by each chip group. Each option pairs the exact words
 * that go into the StatMuse question (`value`) with the short chip text
 * (`label`). An empty `value` means "no filter" and adds nothing to the
 * question. Which of these a mode actually offers is decided in
 * `availability.ts`.
 */
export interface Option {
  readonly value: string
  readonly label: string
  /** Plain words for a short label ("FGA"), shown on hover. */
  readonly tip?: string
}

export const STAT_OPTIONS: readonly Option[] = [
  { value: 'stats', label: 'All stats' },
  { value: 'points', label: 'Points' },
  { value: 'rebounds', label: 'Rebounds' },
  { value: 'assists', label: 'Assists' },
  { value: 'field goals attempted', label: 'FGA', tip: 'Shots tried (field goals attempted)' },
  { value: 'field goals made', label: 'FGM', tip: 'Shots made (field goals made)' },
  { value: 'three pointers attempted', label: '3PA', tip: 'Three-point shots tried' },
  { value: 'three pointers made', label: '3PM', tip: 'Three-point shots made' },
  { value: 'steals', label: 'Steals' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'turnovers', label: 'Turnovers' },
  { value: 'minutes', label: 'Minutes' },
]

export const QUARTER_OPTIONS: readonly Option[] = [
  { value: '', label: 'Full game' },
  { value: 'in the 1st quarter', label: 'Q1', tip: '1st quarter' },
  { value: 'in the 2nd quarter', label: 'Q2', tip: '2nd quarter' },
  { value: 'in the 3rd quarter', label: 'Q3', tip: '3rd quarter' },
  { value: 'in the 4th quarter', label: 'Q4', tip: '4th quarter' },
  { value: 'in the 1st half', label: '1st half' },
  { value: 'in the 2nd half', label: '2nd half' },
]

export const COURT_OPTIONS: readonly Option[] = [
  { value: '', label: 'Any' },
  { value: 'at home', label: 'Home' },
  { value: 'on the road', label: 'Away' },
]

export const PERIOD_OPTIONS: readonly Option[] = [
  { value: '', label: 'Any' },
  { value: 'last 5 games', label: 'Last 5', tip: 'The last 5 games' },
  { value: 'last 10 games', label: 'Last 10', tip: 'The last 10 games' },
  { value: 'last 20 games', label: 'Last 20', tip: 'The last 20 games' },
  { value: 'this season', label: 'This season' },
  { value: 'last season', label: 'Last season' },
  { value: 'in the playoffs', label: 'Playoffs' },
  { value: 'career', label: 'Career', tip: 'Every season, all added together' },
]

/**
 * Back-to-backs. StatMuse reads "on the second night of a back to back" as
 * "no rest" (0 days) for players, teams and leaders. The first night is not
 * offered: every phrasing tried came back with the same 0-rest games.
 */
export const REST_OPTIONS: readonly Option[] = [
  { value: '', label: 'Any' },
  { value: 'on the second night of a back to back', label: '2nd night', tip: 'The second game in two days (a back-to-back)' },
]

export const RESULT_OPTIONS: readonly Option[] = [
  { value: '', label: 'Any' },
  { value: 'in wins', label: 'Wins' },
  { value: 'in losses', label: 'Losses' },
]

export const MODE_OPTIONS: readonly Option[] = [
  { value: 'player', label: 'Player' },
  { value: 'leaders', label: 'Team leaders' },
]

export const VIEW_OPTIONS: readonly Option[] = [
  { value: 'averages', label: 'Averages', tip: 'The usual numbers per game' },
  { value: 'gamelog', label: 'Game by game', tip: 'One line for each game' },
]

/** Team nicknames as StatMuse understands them ("vs Lakers"), A to Z. */
export const TEAMS: readonly string[] = [
  '76ers', 'Bucks', 'Bulls', 'Cavaliers', 'Celtics', 'Clippers', 'Grizzlies',
  'Hawks', 'Heat', 'Hornets', 'Jazz', 'Kings', 'Knicks', 'Lakers', 'Magic',
  'Mavericks', 'Nets', 'Nuggets', 'Pacers', 'Pelicans', 'Pistons', 'Raptors',
  'Rockets', 'Spurs', 'Suns', 'Thunder', 'Timberwolves', 'Trail Blazers',
  'Warriors', 'Wizards',
]

/** The "team" for league-wide leaders: "NBA assists leaders this season". */
export const LEAGUE = 'NBA'
export const LEAGUE_OPTION: Option = { value: LEAGUE, label: 'League (NBA)' }

/** The most games "last N games" accepts: one regular season. */
export const MAX_LAST_N = 82
