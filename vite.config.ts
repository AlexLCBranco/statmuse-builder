import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Site version: package.json's "version" (bumped with every app change;
// scripts/check-version.mjs enforces it in CI), shown in the page's
// bottom-right corner, plus the commit it was built from (Vercel and GitHub
// Actions pass it; locally git, with "+" when there are uncommitted changes).
// Both are also served as /version.json.
function git(command: string): string {
  try {
    return execSync(`git ${command}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}
const ciSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA
const sha = (ciSha || git('rev-parse HEAD')).slice(0, 7)
const dirty = !ciSha && git('status --porcelain') !== ''
const BUILD = {
  version: (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version,
  commit: sha ? `${sha}${dirty ? '+' : ''}` : 'dev',
  builtAt: new Date().toISOString(),
}

// One config for both Vite (dev/build) and Vitest (unit tests).
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'version-json',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(BUILD) })
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(BUILD.version),
    __APP_COMMIT__: JSON.stringify(BUILD.commit),
    __BUILT_AT__: JSON.stringify(BUILD.builtAt),
  },
  server: { port: 5190, strictPort: true },
  preview: { port: 5191, strictPort: true },
  test: {
    // Unit tests cover only pure logic, so no browser environment is needed.
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    environment: 'node',
  },
})
