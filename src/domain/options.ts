/**
 * The choices offered by each chip group. Each option pairs the exact words
 * that go into the StatMuse question (`value`) with the short chip text
 * (`label`). An empty `value` means "no filter" and adds nothing to the
 * question.
 */
export interface Option {
  readonly value: string
  readonly label: string
}

export const STAT_OPTIONS: readonly Option[] = [
  { value: 'stats', label: 'All stats' },
  { value: 'points', label: 'Points' },
  { value: 'rebounds', label: 'Rebounds' },
  { value: 'assists', label: 'Assists' },
  { value: 'field goals attempted', label: 'FGA' },
  { value: 'field goals made', label: 'FGM' },
  { value: 'three pointers attempted', label: '3PA' },
  { value: 'two pointers attempted', label: '2PA' },
]

export const QUARTER_OPTIONS: readonly Option[] = [
  { value: '', label: 'Full game' },
  { value: 'in the 1st quarter', label: 'Q1' },
  { value: 'in the 2nd quarter', label: 'Q2' },
  { value: 'in the 3rd quarter', label: 'Q3' },
  { value: 'in the 4th quarter', label: 'Q4' },
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
  { value: 'last 5 games', label: 'Last 5' },
  { value: 'last 10 games', label: 'Last 10' },
  { value: 'last 20 games', label: 'Last 20' },
  { value: 'this season', label: 'This season' },
  { value: 'last season', label: 'Last season' },
  { value: 'in the playoffs', label: 'Playoffs' },
  { value: 'career', label: 'Career' },
]

export const RESULT_OPTIONS: readonly Option[] = [
  { value: '', label: 'Any' },
  { value: 'in wins', label: 'Wins' },
  { value: 'in losses', label: 'Losses' },
]

/** Team nicknames as StatMuse understands them ("vs Lakers"), A to Z. */
export const TEAMS: readonly string[] = [
  '76ers', 'Bucks', 'Bulls', 'Cavaliers', 'Celtics', 'Clippers', 'Grizzlies',
  'Hawks', 'Heat', 'Hornets', 'Jazz', 'Kings', 'Knicks', 'Lakers', 'Magic',
  'Mavericks', 'Nets', 'Nuggets', 'Pacers', 'Pelicans', 'Pistons', 'Raptors',
  'Rockets', 'Spurs', 'Suns', 'Thunder', 'Timberwolves', 'Trail Blazers',
  'Warriors', 'Wizards',
]

/** The most games "last N games" accepts: one regular season. */
export const MAX_LAST_N = 82
