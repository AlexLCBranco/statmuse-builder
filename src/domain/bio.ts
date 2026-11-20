import { isLeaders } from './availability'
import { normalizeName } from './playerSearch'
import type { QueryState } from './query'

/**
 * A player's background (SM-4): where he was picked in the draft, his US
 * college seasons and where he is from. The data comes from ESPN (see
 * `data/bios.ts`); this file only says who gets a line and how it reads.
 * A field the source does not have is left out, never guessed.
 */

/** One college season; `year` is the year it ended (2017 = 2016-17). */
export interface BioSeason {
  year: number
  games?: number
  points?: number
  rebounds?: number
  assists?: number
}

export interface BioCollege {
  /** ESPN's id of the college team, for the link to that season's team. */
  id: string
  name: string
  /** Oldest first. Empty when only the school's name is known. */
  seasons: BioSeason[]
}

export interface Bio {
  from?: { city?: string; state?: string; country?: string }
  /** Missing: he was not drafted. `pick` counts from the first pick of round 1. */
  draft?: { year: number; round: number; pick: number; team?: string; teamName?: string }
  /** US colleges in the order he played for them. Missing: none. */
  colleges?: BioCollege[]
}

/**
 * The roster player the Player box holds, spelled as the roster spells him
 * ("lebron james" -> "LeBron James"), or null: Team leaders, an empty box, a
 * team, a half-typed or unknown name. Only an exact name gets a line, so
 * nothing loads or flickers while typing.
 */
export function bioPlayer(query: QueryState, players: readonly string[]): string | null {
  if (isLeaders(query)) return null
  const typed = normalizeName(query.player).trim().replace(/\s+/g, ' ')
  if (!typed) return null
  return players.find((name) => normalizeName(name) === typed) ?? null
}

/** "2016-17" for the season that ended in 2017; "1999-00" for 2000. */
export function seasonLabel(year: number): string {
  return `${year - 1}-${String(year % 100).padStart(2, '0')}`
}

/**
 * The years of a run of seasons: "2016-17" for one, "2015-18" for seasons
 * in a row (2015-16 to 2017-18), each one listed when there is a gap.
 */
export function yearsLabel(seasons: readonly BioSeason[]): string {
  const years = seasons.map((s) => s.year)
  if (years.length === 0) return ''
  if (years.length === 1) return seasonLabel(years[0]!)
  const inARow = years.every((year, i) => i === 0 || year === years[i - 1]! + 1)
  if (!inARow) return years.map(seasonLabel).join(', ')
  return `${years[0]! - 1}-${String(years.at(-1)! % 100).padStart(2, '0')}`
}

/** The whole draft of one year, pick by pick, on Basketball-Reference. */
export function draftUrl(year: number): string {
  return `https://www.basketball-reference.com/draft/NBA_${year}.html`
}

/** ESPN's oldest college season with a team page. */
const FIRST_COLLEGE_PAGE = 2003

/**
 * That college team in that season on ESPN: every teammate with his
 * numbers. Null for a season ESPN has no page for.
 */
export function collegeUrl(collegeId: string, year: number): string | null {
  if (year < FIRST_COLLEGE_PAGE) return null
  return `https://www.espn.com/mens-college-basketball/team/stats/_/id/${collegeId}/season/${year}`
}

/** One piece of the short line; a link when there is a page to open. */
export interface BioPart {
  key: 'draft' | 'college' | 'home'
  text: string
  href?: string
  /** What the link opens, in plain words (its hover and screen-reader name). */
  linkLabel?: string
}

const isUsa = (country?: string): boolean => country === 'USA' || country === 'United States'

function draftPart(bio: Bio): BioPart {
  const draft = bio.draft
  if (!draft) return { key: 'draft', text: 'Not drafted' }
  const round = draft.round > 1 ? `round ${draft.round}, ` : ''
  const team = draft.team ? ` (${draft.team})` : ''
  return {
    key: 'draft',
    text: `Draft ${draft.year}, ${round}pick ${draft.pick}${team}`,
    href: draftUrl(draft.year),
    linkLabel: `See every pick of the ${draft.year} draft`,
  }
}

function collegePart(bio: Bio): BioPart {
  // The line names the last school; the details list them all.
  const last = bio.colleges?.at(-1)
  if (!last) return { key: 'college', text: 'No US college' }
  const years = yearsLabel(last.seasons)
  const lastYear = last.seasons.at(-1)?.year
  const href = lastYear ? collegeUrl(last.id, lastYear) : null
  return {
    key: 'college',
    text: years ? `${last.name} ${years}` : last.name,
    ...(href && lastYear && { href, linkLabel: `See the ${last.name} team of ${seasonLabel(lastYear)}` }),
  }
}

function homePart(bio: Bio): BioPart | null {
  const from = bio.from
  if (!from) return null
  // US-born: city and state. Born elsewhere: the country.
  const text = isUsa(from.country) ? [from.city, from.state].filter(Boolean).join(', ') : (from.country ?? from.city ?? '')
  return text ? { key: 'home', text } : null
}

/** The short line: "Draft 2023, pick 1 (SAS) · No US college · France". */
export function bioParts(bio: Bio): BioPart[] {
  return [draftPart(bio), collegePart(bio), homePart(bio)].filter((part) => part !== null)
}

/** One line of the full details, with the page it can open. */
export interface BioDetail {
  label: string
  text: string
  href?: string
  linkText?: string
}

const perGame = (season: BioSeason): string => {
  const numbers = [
    season.points !== undefined && `${season.points.toFixed(1)} points`,
    season.rebounds !== undefined && `${season.rebounds.toFixed(1)} rebounds`,
    season.assists !== undefined && `${season.assists.toFixed(1)} assists`,
  ].filter(Boolean)
  return numbers.length ? `${numbers.join(', ')} a game` : ''
}

/**
 * Everything, in full sentences: the draft with the team's whole name, each
 * college season with its per-game numbers and a link to that team, and the
 * birthplace with its city.
 */
export function bioDetails(bio: Bio): BioDetail[] {
  const details: BioDetail[] = []
  const draft = bio.draft
  if (draft) {
    const by = draft.teamName ? `, by the ${draft.teamName}` : ''
    details.push({
      label: 'Draft',
      text: `${draft.year}: round ${draft.round}, pick ${draft.pick}${by}.`,
      href: draftUrl(draft.year),
      linkText: `Every pick of the ${draft.year} draft`,
    })
  } else {
    details.push({ label: 'Draft', text: 'No team picked him in the draft. He signed with a team afterwards.' })
  }

  const colleges = bio.colleges ?? []
  if (colleges.length === 0) details.push({ label: 'College', text: 'He did not play for a US college.' })
  for (const college of colleges) {
    if (college.seasons.length === 0) details.push({ label: 'College', text: `${college.name}.` })
    for (const season of college.seasons) {
      const numbers = perGame(season)
      const href = collegeUrl(college.id, season.year)
      details.push({
        label: 'College',
        text: `${college.name}, ${seasonLabel(season.year)}${numbers ? `: ${numbers}` : ''}.`,
        ...(href && { href, linkText: 'His teammates that season' }),
      })
    }
  }

  const from = bio.from
  const place = from && [from.city, from.state, isUsa(from.country) ? '' : from.country].filter(Boolean).join(', ')
  if (place) details.push({ label: 'From', text: `${place}.` })
  return details
}
