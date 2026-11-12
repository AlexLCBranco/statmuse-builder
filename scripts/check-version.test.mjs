import { describe, expect, it } from 'vitest'

import { changesNeedBump, isBumped } from './check-version.mjs'

describe('changesNeedBump', () => {
  it('is true when app files changed', () => {
    expect(changesNeedBump(['src/domain/query.ts'])).toBe(true)
    expect(changesNeedBump(['index.html'])).toBe(true)
    expect(changesNeedBump(['vite.config.ts'])).toBe(true)
    expect(changesNeedBump(['PROJECT.md', 'src/styles/tokens.css'])).toBe(true)
    expect(changesNeedBump(['package.json'])).toBe(true)
  })

  it('is false for tests, docs, CI and tooling only', () => {
    expect(
      changesNeedBump([
        'src/domain/query.test.ts',
        'e2e/builder.spec.ts',
        'scripts/sync-players.mjs',
        'PROJECT.md',
        'CLAUDE.md',
        'README.md',
        '.github/workflows/ci.yml',
        'playwright.config.ts',
        'reference/statmuse-builder.html',
      ]),
    ).toBe(false)
    expect(changesNeedBump([])).toBe(false)
  })
})

describe('isBumped', () => {
  it.each([
    ['0.7.0', '0.7.1', true],
    ['0.7.0', '0.8.0', true],
    ['0.9.9', '1.0.0', true],
    ['0.9.0', '0.10.0', true],
    ['0.7.0', '0.7.0', false],
    ['0.7.1', '0.7.0', false],
    ['1.0.0', '0.9.9', false],
  ])('%s -> %s: %s', (before, after, expected) => {
    expect(isBumped(before, after)).toBe(expected)
  })
})
