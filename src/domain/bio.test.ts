import { describe, expect, it } from 'vitest'

import { bioDetails, bioParts, bioPlayer, collegeUrl, draftUrl, seasonLabel, yearsLabel, type Bio } from './bio'
import { BIOS } from './data/bios'
import { PLAYERS } from './data/players'
import { DEFAULT_QUERY, type QueryState } from './query'

const q = (changes: Partial<QueryState>): QueryState => ({ ...DEFAULT_QUERY, ...changes })
const line = (bio: Bio) => bioParts(bio).map((part) => part.text).join(' · ')

// The four kinds the spec names, as ESPN gives them.
const WEMBANYAMA: Bio = { from: { city: 'Paris', country: 'France' }, draft: { year: 2023, round: 1, pick: 1, team: 'SAS', teamName: 'San Antonio Spurs' } }
const BRUNSON: Bio = {
  from: { city: 'New Brunswick', state: 'NJ', country: 'USA' },
  draft: { year: 2018, round: 2, pick: 33, team: 'DAL', teamName: 'Dallas Mavericks' },
  colleges: [{ id: '222', name: 'Villanova', seasons: [{ year: 2016, games: 40, points: 9.6, rebounds: 1.8, assists: 2.5 }, { year: 2017 }, { year: 2018, games: 40, points: 18.9, rebounds: 3.1, assists: 4 }] }],
}
const REAVES: Bio = {
  from: { city: 'Newark', state: 'AR', country: 'USA' },
  colleges: [
    { id: '2724', name: 'Wichita State', seasons: [{ year: 2017 }, { year: 2018 }] },
    { id: '201', name: 'Oklahoma', seasons: [{ year: 2020 }, { year: 2021, games: 25, points: 18.3, rebounds: 5.5, assists: 4.6 }] },
  ],
}
const EMBIID: Bio = {
  from: { city: 'Yaounde', country: 'Cameroon' },
  draft: { year: 2014, round: 1, pick: 3, team: 'PHI', teamName: 'Philadelphia 76ers' },
  colleges: [{ id: '2305', name: 'Kansas', seasons: [{ year: 2014, games: 28, points: 11.2, rebounds: 8.1, assists: 1.4 }] }],
}

describe('bioPlayer', () => {
  it('is the roster player in the Player box, however it is typed', () => {
    expect(bioPlayer(q({ player: 'lebron james' }), PLAYERS)).toBe('LeBron James')
    expect(bioPlayer(q({ player: '  Shai  Gilgeous Alexander ' }), PLAYERS)).toBe('Shai Gilgeous-Alexander')
    expect(bioPlayer(q({ player: 'LeBron James', view: 'gamelog' }), PLAYERS)).toBe('LeBron James')
  })

  it('is null for a half-typed or unknown name, a team, an empty box and Team leaders', () => {
    expect(bioPlayer(q({ player: 'LeBron Jam' }), PLAYERS)).toBeNull()
    expect(bioPlayer(q({ player: 'Michael Jordan' }), PLAYERS)).toBeNull()
    expect(bioPlayer(q({ player: 'Lakers' }), PLAYERS)).toBeNull()
    expect(bioPlayer(DEFAULT_QUERY, PLAYERS)).toBeNull()
    expect(bioPlayer(q({ mode: 'leaders', player: 'LeBron James', team: 'Lakers' }), PLAYERS)).toBeNull()
  })
})

describe('season and years labels', () => {
  it('names a season by both its years', () => {
    expect(seasonLabel(2017)).toBe('2016-17')
    expect(seasonLabel(2000)).toBe('1999-00')
  })

  it('joins seasons in a row and lists them when there is a gap', () => {
    expect(yearsLabel([])).toBe('')
    expect(yearsLabel([{ year: 2017 }])).toBe('2016-17')
    expect(yearsLabel([{ year: 2016 }, { year: 2017 }, { year: 2018 }])).toBe('2015-18')
    expect(yearsLabel([{ year: 2017 }, { year: 2019 }])).toBe('2016-17, 2018-19')
  })
})

describe('links', () => {
  it('opens the whole draft of the year, and the college team of the season', () => {
    expect(draftUrl(2023)).toBe('https://www.basketball-reference.com/draft/NBA_2023.html')
    expect(collegeUrl('96', 2017)).toBe('https://www.espn.com/mens-college-basketball/team/stats/_/id/96/season/2017')
  })

  it('has no college link for a season before ESPN has pages', () => {
    expect(collegeUrl('96', 2002)).toBeNull()
  })
})

describe('the short line', () => {
  it('drafted, foreign, no US college', () => {
    expect(line(WEMBANYAMA)).toBe('Draft 2023, pick 1 (SAS) · No US college · France')
    const [draft, college, home] = bioParts(WEMBANYAMA)
    expect(draft).toMatchObject({ href: draftUrl(2023), linkLabel: 'See every pick of the 2023 draft' })
    expect(college!.href).toBeUndefined()
    expect(home!.href).toBeUndefined()
  })

  it('second round names the round; US-born shows city and state', () => {
    expect(line(BRUNSON)).toBe('Draft 2018, round 2, pick 33 (DAL) · Villanova 2015-18 · New Brunswick, NJ')
    expect(bioParts(BRUNSON)[1]).toMatchObject({ href: collegeUrl('222', 2018), linkLabel: 'See the Villanova team of 2017-18' })
  })

  it('undrafted, two colleges: the last school on the line', () => {
    expect(line(REAVES)).toBe('Not drafted · Oklahoma 2019-21 · Newark, AR')
    expect(bioParts(REAVES)[0]!.href).toBeUndefined()
  })

  it('foreign with a US college: the country, and the college link', () => {
    expect(line(EMBIID)).toBe('Draft 2014, pick 3 (PHI) · Kansas 2013-14 · Cameroon')
  })

  it('leaves out what the source does not have', () => {
    expect(line({ draft: { year: 2021, round: 1, pick: 6 } })).toBe('Draft 2021, pick 6 · No US college')
    expect(line({ colleges: [{ id: '1', name: 'Duke', seasons: [] }] })).toBe('Not drafted · Duke')
    expect(bioParts({ colleges: [{ id: '1', name: 'Duke', seasons: [] }] })[1]!.href).toBeUndefined()
    expect(line({ from: { state: 'ON', country: 'Canada', city: 'Toronto' } })).toBe('Not drafted · No US college · Canada')
  })
})

describe('the full details', () => {
  it('spells out the draft, with the team by name', () => {
    expect(bioDetails(WEMBANYAMA)).toEqual([
      { label: 'Draft', text: '2023: round 1, pick 1, by the San Antonio Spurs.', href: draftUrl(2023), linkText: 'Every pick of the 2023 draft' },
      { label: 'College', text: 'He did not play for a US college.' },
      { label: 'From', text: 'Paris, France.' },
    ])
  })

  it('lists every college season with its numbers and its own link', () => {
    const details = bioDetails(REAVES)
    expect(details.map((d) => d.text)).toEqual([
      'No team picked him in the draft. He signed with a team afterwards.',
      'Wichita State, 2016-17.',
      'Wichita State, 2017-18.',
      'Oklahoma, 2019-20.',
      'Oklahoma, 2020-21: 18.3 points, 5.5 rebounds, 4.6 assists a game.',
      'Newark, AR.',
    ])
    expect(details[4]).toMatchObject({ href: collegeUrl('201', 2021), linkText: 'His teammates that season' })
    expect(bioDetails(BRUNSON)[3]!.text).toBe('Villanova, 2017-18: 18.9 points, 3.1 rebounds, 4.0 assists a game.')
  })
})

describe('the synced data', () => {
  it('has a record for every roster player, in the shape the app reads', () => {
    for (const name of PLAYERS) expect(BIOS[name], name).toBeDefined()
    for (const [name, bio] of Object.entries(BIOS)) {
      if (bio.draft) expect(bio.draft.year >= 1995 && bio.draft.round >= 1 && bio.draft.pick >= 1, name).toBe(true)
      for (const college of bio.colleges ?? []) {
        expect(college.name && college.id, name).toBeTruthy()
        for (const season of college.seasons) expect(season.year, name).toBeGreaterThan(1995)
      }
      // Every record makes a line without an empty piece.
      for (const part of bioParts(bio)) expect(part.text.trim(), name).not.toBe('')
    }
  })

  it('knows Victor Wembanyama: first pick of 2023 by the Spurs, no US college, from France', () => {
    expect(line(BIOS['Victor Wembanyama']!)).toBe('Draft 2023, pick 1 (SAS) · No US college · France')
  })
})
