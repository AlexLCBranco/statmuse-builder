// `npm run e2e:prod`: the e2e suite against the live site.
//
// A full run (desktop + phone) trips Vercel's automatic DDoS mitigation,
// which then challenges this machine's IP with a "Security Checkpoint" page
// (HTTP 403) and the tests fail on pages that never load. The Hobby plan
// cannot bypass it, so (the owner's choice, 2026-11-18) the run pauses the
// mitigation first and resumes it as soon as the tests end: passed, failed,
// crashed or stopped with Ctrl+C. Vercel lifts a forgotten pause by itself
// after 24 hours. Extra arguments go to Playwright (`npm run e2e:prod -- -g x`).
//
// Vercel only lets a person pause it, in a terminal, after a confirmation
// prompt; it refuses scripts and agents. So in a terminal the Vercel prompts
// show and the owner answers them. Without one (Claude, CI) the run goes
// ahead unpaused and may hit the checkpoint.

import { spawn, spawnSync } from 'node:child_process'

const SITE = 'https://statmuse-builder.vercel.app'

/** Runs the Vercel CLI (already logged in and linked: see CLAUDE.md). */
function vercel(...args) {
  const result = spawnSync('npx', ['-y', 'vercel@latest', 'firewall', 'system-mitigations', ...args], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  return result.status === 0
}

const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY)
let resumed = !interactive
function resume() {
  if (resumed) return
  resumed = true
  console.log('e2e-prod: resuming Vercel DDoS mitigation')
  if (!vercel('resume')) {
    console.error(`e2e-prod: RESUME FAILED. Run "npx vercel firewall system-mitigations resume" now (it lifts itself after 24h).`)
    process.exitCode = 1
  }
}

if (interactive) {
  console.log('e2e-prod: pausing Vercel DDoS mitigation for this run (confirm in the Vercel prompt)')
  if (!vercel('pause')) {
    console.error('e2e-prod: the mitigation was not paused; not running the tests')
    process.exit(1)
  }
} else {
  console.warn('e2e-prod: no terminal, so Vercel DDoS mitigation stays on; a full run may hit its 403 checkpoint')
}

const tests = spawn('npx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, BASE_URL: SITE },
})

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    tests.kill(signal)
    resume()
    process.exit(130)
  })
}

tests.on('error', (error) => {
  console.error(`e2e-prod: could not start Playwright: ${error.message}`)
  resume()
  process.exit(1)
})

tests.on('exit', (code) => {
  resume()
  process.exit(code ?? 1)
})
