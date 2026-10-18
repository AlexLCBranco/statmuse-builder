import { describe, expect, it } from 'vitest'

import { STAT_OPTIONS } from './options'

describe('STAT_OPTIONS', () => {
  it('offers the shooting stats in chip order', () => {
    expect(STAT_OPTIONS.map((o) => o.label)).toEqual([
      'All stats', 'Points', 'Rebounds', 'Assists', 'FGA', 'FGM', '3PA', '2PA',
    ])
  })

  it('spells each shooting stat out the way StatMuse reads it', () => {
    const words = Object.fromEntries(STAT_OPTIONS.map((o) => [o.label, o.value]))
    expect(words['FGA']).toBe('field goals attempted')
    expect(words['FGM']).toBe('field goals made')
    expect(words['3PA']).toBe('three pointers attempted')
    expect(words['2PA']).toBe('two pointers attempted')
  })
})
