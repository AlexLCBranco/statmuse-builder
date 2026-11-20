import { isGameLog, isLeague, isLeaders } from './availability'
import type { Bio } from './bio'
import { TEAMS } from './options'
import { effectiveStat, playerBoxTeam, subject, type QueryState } from './query'
import { TEAM_TRICODES } from './rotations'

/**
 * Links to other stats sites for the current selection (SM-5). Each site is
 * here for something StatMuse does not do well, and is free with no sign-in:
 *
 * - ESPN: a whole table at once. Every split of a player on one page (home,
 *   away, wins, losses, each month, each opponent), every game in one list,
 *   a team's or the league's players in a table you can sort by any column.
 *   StatMuse answers one split per question, hides its tables behind a
 *   sign-up prompt after a few questions, and ranks turnovers the wrong way.
 * - Basketball-Reference: the whole career on one page (every season,
 *   playoffs, advanced numbers, awards), a team's whole season, and the top
 *   20 of the league in every number at once.
 * - CraftedNBA: the shot chart and skill ratings (how well he shoots,
 *   passes, defends, compared with the league). StatMuse has neither.
 *
 * Each link opens the same thing as the question where the site has it, or
 * the closest page. Every kind of link is checked on the live sites
 * (scripts/check-sites.mjs, and e2e/sites.spec.ts in live runs).
 */

export type Site = 'espn' | 'bbref' | 'crafted'

export interface SiteLink {
  site: Site
  /** The site's name, as the button shows it. */
  name: string
  /** What the link opens, in a few plain words. */
  what: string
  /** Null: shown, but there is nowhere to go (the site has no page for him). */
  href: string | null
  /** The whole story for the hover: what opens, and why it is worth it. */
  tip: string
}

const ESPN = 'https://www.espn.com'
const BBREF = 'https://www.basketball-reference.com'
const CRAFTED = 'https://craftednba.com'

/** ESPN writes six teams its own way in addresses. */
const ESPN_CODES: Readonly<Record<string, string>> = { GSW: 'gs', NOP: 'no', NYK: 'ny', SAS: 'sa', UTA: 'utah', WAS: 'wsh' }
/** So does Basketball-Reference, for three. */
const BBREF_CODES: Readonly<Record<string, string>> = { BKN: 'BRK', CHA: 'CHO', PHX: 'PHO' }

export const espnTeamCode = (tricode: string): string => ESPN_CODES[tricode] ?? tricode.toLowerCase()
export const bbrefTeamCode = (tricode: string): string => BBREF_CODES[tricode] ?? tricode

/**
 * ESPN's league table for each stat chip: which of its three tables has the
 * column, and the column's name in the address.
 */
const ESPN_SORT: Readonly<Record<string, readonly [table: string, column: string]>> = {
  points: ['offensive', 'avgPoints'],
  rebounds: ['general', 'avgRebounds'],
  assists: ['offensive', 'avgAssists'],
  'field goals attempted': ['offensive', 'avgFieldGoalsAttempted'],
  'field goals made': ['offensive', 'avgFieldGoalsMade'],
  'three pointers attempted': ['offensive', 'avgThreePointFieldGoalsAttempted'],
  'three pointers made': ['offensive', 'avgThreePointFieldGoalsMade'],
  steals: ['defensive', 'avgSteals'],
  blocks: ['defensive', 'avgBlocks'],
  turnovers: ['offensive', 'avgTurnovers'],
  minutes: ['general', 'avgMinutes'],
}

/** The league's players sorted by a stat, most first. An unknown stat sorts by points. */
export function espnLeagueUrl(stat: string): string {
  const [table, column] = ESPN_SORT[stat] ?? ESPN_SORT.points!
  return `${ESPN}/nba/stats/player/_/table/${table}/sort/${column}/dir/desc`
}

/** "2026-27" -> 2027: Basketball-Reference names a season by the year it ends. */
export function seasonEndYear(season: string): number {
  return Number(season.slice(0, 4)) + 1
}

/** Who the links are for: a roster player (spelled as the roster does) and his record, once loaded. */
export interface SitePlayer {
  /** Null: not a roster player (a typed name the roster does not have). */
  name: string | null
  /** Null while it loads, or for a name that is not on a roster. */
  bio: Bio | null
}

/**
 * The buttons for the current selection. No subject: none. The league, a
 * team, or a player each get the pages that fit; a player's ESPN link is
 * his splits (Averages) or his game log (Game by game).
 */
export function siteLinks(query: QueryState, player: SitePlayer, season: string): SiteLink[] {
  const who = subject(query)
  if (!who) return []
  const year = seasonEndYear(season)

  if (isLeague(query)) {
    return [
      {
        site: 'espn',
        name: 'ESPN',
        what: 'Whole league',
        href: espnLeagueUrl(effectiveStat(query)),
        tip: 'ESPN: every player in the league in one table, most first. Click any column to sort by it.',
      },
      {
        site: 'bbref',
        name: 'Basketball-Reference',
        what: 'League leaders',
        href: `${BBREF}/leagues/NBA_${year}_leaders.html`,
        tip: 'Basketball-Reference: the top 20 of the league in every number, all on one page.',
      },
    ]
  }

  const team = isLeaders(query) ? who : playerBoxTeam(query)
  if (team !== null) {
    const tricode = TEAMS.includes(team) ? TEAM_TRICODES[team] : undefined
    if (!tricode) return []
    return [
      {
        site: 'espn',
        name: 'ESPN',
        what: 'Whole team',
        href: `${ESPN}/nba/team/stats/_/name/${espnTeamCode(tricode)}`,
        tip: `ESPN: every ${team} player's numbers in one table.`,
      },
      {
        site: 'bbref',
        name: 'Basketball-Reference',
        what: 'Team season',
        href: `${BBREF}/teams/${bbrefTeamCode(tricode)}/${year}.html`,
        tip: `Basketball-Reference: the ${team} season on one page: the roster, the results and every player's numbers.`,
      },
    ]
  }

  const name = player.name ?? who
  const espnId = player.bio?.espn
  const gameLog = isGameLog(query)
  const espn: SiteLink = !espnId
    ? {
        site: 'espn',
        name: 'ESPN',
        what: 'Search',
        href: `${ESPN}/search/_/q/${encodeURIComponent(name)}`,
        tip: `ESPN: search for ${name}.`,
      }
    : gameLog
      ? {
          site: 'espn',
          name: 'ESPN',
          what: 'Every game',
          href: `${ESPN}/nba/player/gamelog/_/id/${espnId}`,
          tip: `ESPN: every game ${name} played this season, one line each. No sign-up needed.`,
        }
      : {
          site: 'espn',
          name: 'ESPN',
          what: 'Home, away, wins',
          href: `${ESPN}/nba/player/splits/_/id/${espnId}`,
          tip: `ESPN: ${name}'s numbers at home, away, in wins, in losses, each month and against each team, all in one table.`,
        }
  const links: SiteLink[] = [
    espn,
    {
      site: 'bbref',
      name: 'Basketball-Reference',
      what: 'Whole career',
      href: `${BBREF}/search/search.fcgi?search=${encodeURIComponent(name).replace(/%20/g, '+')}`,
      tip: `Basketball-Reference: ${name}'s whole career on one page: every season, the playoffs, awards and the deeper numbers.`,
    },
  ]
  // Only roster players: the site's pages were checked for them one by one.
  if (player.name !== null) {
    const slug = player.bio?.crafted
    links.push({
      site: 'crafted',
      name: 'CraftedNBA',
      what: 'Shot chart',
      href: slug ? `${CRAFTED}/players/${slug}` : null,
      tip:
        slug || !player.bio
          ? `CraftedNBA: where ${name} shoots from, and how good he is at shooting, passing and defending next to the rest of the league.`
          : `CraftedNBA has no page for ${name} yet.`,
    })
  }
  return links
}
