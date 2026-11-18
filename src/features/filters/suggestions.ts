import type { ReactNode } from 'react'

import type { QueryState } from '../../domain/query'
import type { RecentSearch } from '../../domain/recent'

/** One line of a combobox dropdown. */
export interface SuggestionItem {
  key: string
  label: ReactNode
  /** What choosing this item does (click, or Enter while highlighted). */
  pick: () => void
}

/** A run of items, optionally under a heading ('Recent players'). */
export interface SuggestionGroup {
  label?: string
  items: SuggestionItem[]
}

/** All the items of all groups in one list: the order arrow keys move through. */
export function flatten(groups: readonly SuggestionGroup[]): SuggestionItem[] {
  return groups.flatMap((group) => group.items)
}

/** What an empty box offers instead of suggestions: names and full searches. */
export interface Recents {
  namesLabel: string
  names: readonly string[]
  /** How a name is shown, when that differs from the name itself. */
  nameLabel?: (name: string) => string
  /** Pinned searches of this mode, shown first (like the Recent column). */
  pinned: readonly RecentSearch[]
  searches: readonly RecentSearch[]
  /** Picking a search loads the whole saved query. */
  onPickSearch: (query: QueryState) => void
}

/**
 * The pinned, names and recent groups; a group with nothing in it is left
 * out. Picking a name fills only the box; picking a search loads the whole
 * saved query.
 */
export function recentGroups(recents: Recents, pickName: (name: string) => void, close: () => void): SuggestionGroup[] {
  const searchItem = (prefix: string) => (entry: RecentSearch): SuggestionItem => ({
    key: `${prefix}:${entry.question}`,
    label: entry.question,
    pick: () => {
      recents.onPickSearch(entry.query)
      close()
    },
  })
  const groups: SuggestionGroup[] = [
    { label: 'Pinned searches', items: recents.pinned.map(searchItem('pinned')) },
    {
      label: recents.namesLabel,
      items: recents.names.map((name) => ({
        key: `name:${name}`,
        label: recents.nameLabel?.(name) ?? name,
        pick: () => pickName(name),
      })),
    },
    { label: 'Recent searches', items: recents.searches.map(searchItem('search')) },
  ]
  return groups.filter((group) => group.items.length > 0)
}
