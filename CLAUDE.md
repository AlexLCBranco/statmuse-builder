# StatMuse Builder — context for Claude

A one-page tool that builds an NBA player-stat question and opens it on
StatMuse. Standalone: NOT part of the gauntlet and NOT a stone. The owner is
learning frontend: keep code clean and explain decisions briefly.

## Rules

- **Layering.** `app -> features -> lib -> domain -> styles`. `domain/` is pure
  TypeScript (no React, no browser APIs): question building, slug, player
  search, Recent list logic. Every domain change gets a Vitest test.
- **State.** One `QueryState` object in `App`; no state library, no backend.
- **No hardcoded visual constants.** Colours, fonts, sizes from
  `src/styles/tokens.css`; components use CSS Modules.
- **localStorage** only through `lib/storage.ts` (never throws).
- `reference/statmuse-builder.html` is the original single-file build. Don't
  edit it; it's there to compare behaviour and look.
- Bump `package.json`'s version with every user-visible change, and update
  `PROJECT.md` (incl. "Last updated") at the end of every session.

## Workflow

1. Read `PROJECT.md` and `git log --oneline | head`.
2. Build; new pure logic in `domain/` with tests.
3. `npm run check` (lint + typecheck + unit + e2e) must pass before every
   commit.
4. Commit on `main`, push. Vercel deploys every push to `main`.
5. After the deploy, `npm run e2e:prod` runs the e2e suite against the live
   site.

## Git and deploy

- Repo: github.com/AlexLCBranco/statmuse-builder (public).
- Vercel project `statmuse-builder` (team `alexlcbrancos-projects`), linked to
  the repo; production: https://statmuse-builder.vercel.app. The Vercel CLI is
  logged in: `npx -y vercel@latest ls statmuse-builder`.
- Dev server: `statmuse-builder` in `.claude/launch.json` (port 5190). The
  e2e suite builds and serves on 5191.

## Testing policy

Automate every check that can be automated: unit, integration, and end-to-end
with Playwright against the live site, using throwaway data the test creates
and deletes itself. Never hand the owner a manual checklist for something a
script can do. Manual steps only for what truly can't be automated (browser
permission prompts like folder pickers, and judging feel/usability). Keep
those to the minimum, say why each one can't be automated, and give one short
step at a time.

## Commands

```bash
npm run dev       # dev server on :5190
npm run check     # lint + typecheck + unit + e2e (run before every commit)
npm run e2e:prod  # e2e against https://statmuse-builder.vercel.app
```
