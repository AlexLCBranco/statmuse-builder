/**
 * Simplifies a name for matching: lowercase, no accents, hyphens become
 * spaces (so "alexander" is a word in "Gilgeous-Alexander"), and other
 * punctuation is dropped ("de'aaron" -> "deaaron", "p.j." -> "pj").
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
}

/**
 * How well a name matches the search (lower is better), or null for no match:
 * 0 = the full name starts with it ("leb" -> LeBron James)
 * 1 = a later word starts with it ("jam" -> LeBron James)
 * 2 = it appears inside a word ("bron" -> LeBron James)
 */
export function matchRank(name: string, search: string): number | null {
  const n = normalizeName(name)
  if (n.startsWith(search)) return 0
  if (n.split(' ').some((word) => word.startsWith(search))) return 1
  if (n.includes(search)) return 2
  return null
}

/**
 * The best `limit` players for what was typed. Ties keep the list's own
 * order (the data file is sorted by last name).
 */
export function findPlayers(players: readonly string[], typed: string, limit = 8): string[] {
  const search = normalizeName(typed).trim().replace(/\s+/g, ' ')
  if (!search) return []
  const ranked: { name: string; rank: number }[] = []
  for (const name of players) {
    const rank = matchRank(name, search)
    if (rank !== null) ranked.push({ name, rank })
  }
  // Array.prototype.sort is stable, so equal ranks keep the original order.
  ranked.sort((a, b) => a.rank - b.rank)
  return ranked.slice(0, limit).map((r) => r.name)
}

/**
 * Where to bold the typed text inside a suggestion, as [start, end) or null.
 * Only offered when normalizing didn't change the name's length, so the
 * positions still line up with the original name.
 */
export function highlightRange(name: string, typed: string): [number, number] | null {
  const n = normalizeName(name)
  const search = normalizeName(typed).trim()
  if (!search || n.length !== name.length) return null
  const start = n.indexOf(search)
  return start < 0 ? null : [start, start + search.length]
}
