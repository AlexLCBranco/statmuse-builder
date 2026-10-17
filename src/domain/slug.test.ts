import { describe, expect, it } from 'vitest'

import { slugify, statmuseUrl } from './slug'

describe('slugify', () => {
  it('lowercases and joins words with dashes', () => {
    expect(slugify('LeBron James stats last 10 games')).toBe('lebron-james-stats-last-10-games')
  })

  it('drops accents', () => {
    expect(slugify('Luka Dončić')).toBe('luka-doncic')
    expect(slugify('Nikola Jokić')).toBe('nikola-jokic')
    expect(slugify('Dāvis Bertāns')).toBe('davis-bertans')
  })

  it('removes apostrophes instead of splitting the word', () => {
    expect(slugify("De'Aaron Fox")).toBe('deaaron-fox')
    expect(slugify('D’Angelo Russell')).toBe('dangelo-russell')
    expect(slugify("Devonte' Graham")).toBe('devonte-graham')
  })

  it('removes periods in initials and suffixes', () => {
    expect(slugify('P.J. Tucker')).toBe('pj-tucker')
    expect(slugify('Jaren Jackson Jr.')).toBe('jaren-jackson-jr')
    expect(slugify('Marcus Morris Sr. points')).toBe('marcus-morris-sr-points')
  })

  it('keeps roman-numeral suffixes as words', () => {
    expect(slugify('Marvin Bagley III')).toBe('marvin-bagley-iii')
    expect(slugify('Trey Murphy III stats')).toBe('trey-murphy-iii-stats')
  })

  it('collapses hyphens, spaces and symbols into one dash and trims the ends', () => {
    expect(slugify('  Shai Gilgeous-Alexander  ')).toBe('shai-gilgeous-alexander')
    expect(slugify('Karl-Anthony Towns -- vs 76ers!')).toBe('karl-anthony-towns-vs-76ers')
  })

  it('returns an empty slug for empty or symbol-only text', () => {
    expect(slugify('')).toBe('')
    expect(slugify(" .' - ")).toBe('')
  })
})

describe('statmuseUrl', () => {
  it('appends the slug to the NBA ask URL', () => {
    expect(statmuseUrl('Stephen Curry points')).toBe('https://www.statmuse.com/nba/ask/stephen-curry-points')
  })
})
