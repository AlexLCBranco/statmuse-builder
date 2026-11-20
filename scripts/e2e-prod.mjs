// `npm run e2e:prod`: a small e2e run against the live site.
//
// The full suite (desktop + phone, 90 tests) opens the site so often that
// Vercel's automatic DDoS mitigation challenges this machine's IP with a
// "Security Checkpoint" page (HTTP 403), and the tests then fail on pages
// that never load. Pausing the mitigation needs Vercel's Pro plan ("IP
// Bypass is unavailable", error 402, seen 2026-11-20), and this is a personal
// tool on the Hobby plan. So the live run is small instead (the owner's
// choice, 2026-11-20):
//
// only the tests tagged `@live` in the specs:
// - the ones that only make sense live (their title says "live site only"):
//   StatMuse, rotationkit, ESPN and the other sites really answer;
// - one or two per feature: enough to see that the deployed build works,
//   on desktop and on the phone.
//
// One browser at a time, so the requests are spread out. The full suite
// still runs on the same production build locally (`npm run check`) and in
// CI. No prompt, no Vercel CLI: Claude can run this too.
//
// Extra arguments go to Playwright (`npm run e2e:prod -- --headed`). To try
// the whole suite anyway: `npm run e2e:prod -- --all` (expect the 403).

import { spawn } from 'node:child_process'

const SITE = 'https://statmuse-builder.vercel.app'

const args = process.argv.slice(2)
const all = args.includes('--all')
const extra = args.filter((arg) => arg !== '--all')
// One plain word: on Windows the arguments pass through a shell.
const subset = all ? [] : ['--grep=@live', '--workers=1']
if (all) console.warn('e2e-prod: --all runs the whole suite; Vercel will probably answer 403 partway through')

const tests = spawn('npx', ['playwright', 'test', ...subset, ...extra], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, BASE_URL: SITE },
})

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    tests.kill(signal)
    process.exit(130)
  })
}

tests.on('error', (error) => {
  console.error(`e2e-prod: could not start Playwright: ${error.message}`)
  process.exit(1)
})

tests.on('exit', (code) => process.exit(code ?? 1))
