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
- **Phone and desktop.** Every change must work at 390px (phone) and 1280px
  (desktop), and the `phone` Playwright project (`e2e/phone.spec.ts`, Pixel 7
  at 390x844 with touch) must pass along with the desktop one.
- Bump `package.json`'s version with every app change (patch for fixes,
  minor for features); CI fails the push otherwise
  (`scripts/check-version.mjs`). The page shows it bottom-right. Update
  `PROJECT.md` (incl. "Last updated") at the end of every session.

## Workflow

1. Read `PROJECT.md` and `git log --oneline | head`.
2. Build; new pure logic in `domain/` with tests.
3. `npm run check` (lint + typecheck + unit + e2e) must pass before every
   commit.
4. Commit on `main`, push. Vercel deploys every push to `main`.
5. `npm run wait-live` waits until the live `/version.json` shows the new
   version; tell the owner that number. Then `npm run e2e:prod` runs the e2e
   suite against the live site.

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
npm run wait-live # wait for the live site to serve this version
npm run e2e:prod  # e2e against https://statmuse-builder.vercel.app
```

## Feature backlog, built list and ideas (owner's standing workflow, updated 2026-11-15)

Three lists, never mixed:
- `FEATURE_BACKLOG.md`: planned work only. Nothing built is ever in it. It is the only list of planned work:
  "next", "queued" or "plan" sections in other docs are history, not the plan.
- `BUILT.md`: shipped work only, newest first.
- `IDEAS.md`: ideas the owner mentioned that are not planned (maybe later, maybe never). Never built from directly.

The owner's messages. Always read the lists from `main` on GitHub, never from your local checkout or branch
(Claude Code sessions run on a branch made at session start, so `git pull` there does NOT bring in backlog
items added later): run `git fetch origin main`, then read with `git show origin/main:FEATURE_BACKLOG.md`
(same for `BUILT.md` and `IDEAS.md`). Before building, merge `origin/main` into your branch.
- "build what's planned" / "build the backlog": build only the items under Ready in `FEATURE_BACKLOG.md` on
  `origin/main`. If there are none, say "Backlog is empty" and stop. Never build from `IDEAS.md`, `PLAN.md` or
  any other doc, and never fill gaps in a spec with your own defaults: ask.
- "what's planned" / "what's in the backlog": read `FEATURE_BACKLOG.md` only. List each item as
  `SM-n — title — one plain sentence on what changes in the app`. Build nothing.
- "what's built" / "what shipped" (maybe "since <date>" or "last N"): read `BUILT.md` only and list it.
- "ideas" / "what ideas": read `IDEAS.md` only and list it as `I-n — idea`.
- "next batch" / "build the backlog": every item, top to bottom. "next": the top item only. "build SM-n": that item only.
- "promote I-n": cut it from `IDEAS.md` and add it at the bottom of Ready in `FEATURE_BACKLOG.md` with the next free
  SM ID and a `From I-n` line. Build it only if the owner also asks for that.

Before building, list the IDs and titles you are about to build, in plain words.

When an item ships: in the same commit/PR as the code, cut it from `FEATURE_BACKLOG.md` and add it at the top of
`BUILT.md` under that day's `## <YYYY-MM-DD>` heading (one heading per day, newest first) as
`- SM-n — title (v<version>)`, then at most one plain sentence on what the owner sees. An item is never in both files. IDs are
never reused. Work shipped without a backlog item (a direct request, a fix) gets the same line without the ID:
`- title (v<version>)`. Housekeeping the owner can't see (handoff notes, pins, test-only or CI fixes, docs) goes under a
`### Internal` subheading at the bottom of that day, not in the main list. The same format is used in every one of
the owner's repos, so `gauntlet` can merge them into one `ALL_BUILT.md`.
Follow this file's other rules (branches, tests, version bump) as usual.

When the owner mentions something that isn't to be built now (an aside, "later", "someday", "maybe"), add it at the
bottom of `IDEAS.md` as `- I-n — the idea in plain words (YYYY-MM-DD)` and say so in the report. Never put an idea
in the backlog yourself.

If an item is unclear or blocked, don't guess: leave it in `FEATURE_BACKLOG.md` with a `Blocked:` note saying what's
missing, and continue with the next one. Don't add, rewrite or reorder backlog items yourself; only remove shipped
ones and add `Blocked:` notes. End with a short report: built / blocked / ideas added / what the owner must test by
hand (only what couldn't be automated). A pasted prompt overrides this section.

Guard: `scripts/check-lists.mjs` runs with the checks (inside `npm run check-version`, in CI) and fails if an ID is both planned and built, an
ID repeats, or package.json's version has no `BUILT.md` entry. Fix the lists, never the check.
