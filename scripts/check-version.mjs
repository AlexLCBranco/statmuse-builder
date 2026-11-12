// CI: a commit that changes the app (anything that ends up on the site) must
// raise package.json's version (MAJOR.MINOR.PATCH), so the corner label on
// the live site always tells versions apart. Compares HEAD with its parent
// (CI checks out 2 commits). Exits 1 with the reason otherwise.

import { execSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

/** Files whose change doesn't need a new version: tests, docs, CI and tooling. */
const NO_BUMP = [
  /\.test\.(ts|tsx|mjs)$/,
  /^e2e\//,
  /^scripts\//,
  /^reference\//,
  /^\.github\//,
  /^\.claude\//,
  /^(PROJECT|CLAUDE|README)\.md$/,
  /^\.gitignore$/,
  /^\.gitattributes$/,
  /^\.oxlintrc\.json$/,
  /^playwright\.config\.ts$/,
]

/** Whether any of the changed files is part of the app. */
export const changesNeedBump = (files) => files.some((file) => !NO_BUMP.some((pattern) => pattern.test(file)))

/** Whether `after` is a higher version than `before`. */
export function isBumped(before, after) {
  const a = before.split('.').map(Number)
  const b = after.split('.').map(Number)
  for (let i = 0; i < 3; i++) if (b[i] !== a[i]) return b[i] > a[i]
  return false
}

// Only when run directly (`node scripts/check-version.mjs`), not when imported by its test.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const git = (command) => execSync(`git ${command}`, { encoding: 'utf8' }).trim()
  const files = git('diff --name-only HEAD~1 HEAD').split('\n').filter(Boolean)
  const version = (ref) => JSON.parse(git(`show ${ref}:package.json`)).version
  const [before, after] = [version('HEAD~1'), version('HEAD')]
  if (!changesNeedBump(files)) {
    console.log(`check-version: no app change (${files.length} files), version ${after}`)
  } else if (isBumped(before, after)) {
    console.log(`check-version: ${before} -> ${after}`)
  } else {
    const changed = files.filter((file) => changesNeedBump([file])).join(', ')
    console.error(
      `check-version: the app changed (${changed}) but package.json's version is still ${after} (was ${before}). ` +
        'Bump it: patch for fixes, minor for features, major for big changes.',
    )
    process.exit(1)
  }
}
