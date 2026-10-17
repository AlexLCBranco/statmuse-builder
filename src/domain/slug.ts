/**
 * Turns a question into the URL slug StatMuse expects:
 * "Luka Dončić points at home" -> "luka-doncic-points-at-home".
 *
 * - Accents are dropped (č -> c) so the slug stays plain ASCII.
 * - Apostrophes and periods are removed rather than turned into dashes, so
 *   "De'Aaron Fox" -> "deaaron-fox" and "P.J. Tucker" -> "pj-tucker".
 *   StatMuse resolves both these and the dashed forms; this keeps slugs short
 *   and matches how the names are usually typed.
 * - Every other run of non-letters/digits becomes a single dash.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const STATMUSE_ASK_URL = 'https://www.statmuse.com/nba/ask/'

export function statmuseUrl(question: string): string {
  return STATMUSE_ASK_URL + slugify(question)
}
