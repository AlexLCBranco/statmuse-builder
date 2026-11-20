import { describe, expect, it } from 'vitest'

import { goToPlace, pageTitle, PLACES } from './nav'
import { DEFAULT_QUERY, type QueryState } from './query'

const q = (changes: Partial<QueryState>): QueryState => ({ ...DEFAULT_QUERY, ...changes })

describe('places', () => {
  it('has at most five, each with a label and plain-word tip', () => {
    expect(PLACES.length).toBeLessThanOrEqual(5)
    for (const place of PLACES) expect(place.label && place.tip).toBeTruthy()
  })

  it('going to a place keeps the filters; "All stats" becomes points in leaders', () => {
    const from = q({ player: 'LeBron James', quarter: 'in the 4th quarter', team: 'Celtics' })
    expect(goToPlace(from, 'leaders')).toEqual({ ...from, mode: 'leaders', stat: 'points' })
    expect(goToPlace(from, 'player')).toBe(from)
  })
})

describe('pageTitle', () => {
  it('is the question, or the place while there is no subject', () => {
    expect(pageTitle(q({ player: 'LeBron James' }), 'LeBron James stats')).toBe('LeBron James stats — StatMuse Builder')
    expect(pageTitle(DEFAULT_QUERY, 'stats')).toBe('Player — StatMuse Builder')
    expect(pageTitle(q({ mode: 'leaders' }), 'points leaders')).toBe('Team leaders — StatMuse Builder')
  })
})
