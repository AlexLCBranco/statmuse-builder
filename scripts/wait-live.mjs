// After a push: waits until the live site's /version.json shows this
// checkout's package.json version (Vercel takes a minute or so to deploy),
// then prints it. Exits 1 if it still doesn't after 5 minutes.

import { readFileSync } from 'node:fs'

const URL = 'https://statmuse-builder.vercel.app/version.json'
const wanted = JSON.parse(readFileSync('package.json', 'utf8')).version
const deadline = Date.now() + 5 * 60_000

let live = 'nothing'
while (Date.now() < deadline) {
  try {
    const response = await fetch(URL, { cache: 'no-store' })
    if (response.ok) {
      const build = await response.json()
      live = `v${build.version} (commit ${build.commit})`
      if (build.version === wanted) {
        console.log(`wait-live: the live site is ${live}, built ${build.builtAt}`)
        process.exit(0)
      }
    } else {
      live = `HTTP ${response.status}`
    }
  } catch (error) {
    live = String(error)
  }
  await new Promise((resolve) => setTimeout(resolve, 5000))
}
console.error(`wait-live: expected v${wanted}, but the live site still shows ${live}`)
process.exit(1)
