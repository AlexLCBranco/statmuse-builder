# StatMuse Builder — project summary

_Last updated: 2026-10-17, v0.1.1_

## What it is

A one-page web tool that builds an NBA player-stat question ("Jayson Tatum
points in the 4th quarter vs Lakers in wins") and opens it on StatMuse
(`https://www.statmuse.com/nba/ask/<slug>`). It improves on
stat-muse-helper.vercel.app with more filters, autocomplete, a live preview of
the exact question and URL, copy buttons, and a Recent list.

- Production: https://statmuse-builder.vercel.app
- Repo: https://github.com/AlexLCBranco/statmuse-builder (public). Every push
  to `main` deploys on Vercel.

## What it's not

Not part of the gauntlet and not a stone. A small standalone app. No backend,
no accounts, no StatMuse API: it only builds links. It does not check
StatMuse's answer.

## Stack

Vite, React 19, TypeScript (strict), CSS Modules + design tokens
(`src/styles/tokens.css`), Vitest (unit), Playwright (e2e), oxlint. No state
library. Fonts: Barlow Condensed, IBM Plex Sans/Mono (Google Fonts).

Layers: `app -> features -> lib -> domain -> styles`

- `domain/` — pure logic with unit tests: question builder (`query.ts`), slug
  (`slug.ts`), player matching and ranking (`playerSearch.ts`), Recent list
  (`recent.ts`), the chip options and teams (`options.ts`), and the 536-name
  2023-24 player list (`data/players-2023-24.ts`).
- `lib/` — browser helpers: safe localStorage, clipboard.
- `features/` — question card, filters (chips, player combobox), Recent list.
- `app/` — the page; holds the one `QueryState`.
- `reference/statmuse-builder.html` — the original single-file build this was
  ported from.

## What works now (v0.1.1)

- Live question preview (sentence + exact URL)
- Player box with suggestions from 536 2023-24 players; any typed name works.
  Arrow keys + Enter pick a suggestion; Enter with a player chosen sends the
  question
- Chips: stat (all / points / rebounds / assists / PRA / 3PM / steals /
  blocks), quarter/half, home/away, wins/losses, period (last 5/10/20, this
  season, last season, playoffs, career) + custom "last N games" (1–82, wins
  over the chips); opponent dropdown (30 teams)
- Ask StatMuse (a real link, new tab), Copy question, Copy link, Clear
- Recent: last 12 sent questions, saved in localStorage; Edit loads one back,
  ✕ removes it
- Dark theme by default, whatever the system prefers; light is opt-in via
  `data-theme="light"` on `<html>` (no toggle yet). Fits a 375px phone with
  no sideways scroll
- Tests: 63 unit tests (domain), 6 Playwright e2e tests. `npm run check` runs
  lint + typecheck + unit + e2e; `npm run e2e:prod` runs e2e against the live
  site

## StatMuse compatibility (checked 2026-10-17)

Fetched 9 generated URLs from statmuse.com; all 9 got a real answer:

| Question | Result |
|---|---|
| LeBron James stats last 10 games | answered |
| Stephen Curry three pointers made at home this season | answered, but "couldn't find anything for this season" and fell back to 2025-26 (the 2026-27 season hadn't started) |
| Jayson Tatum points in the 4th quarter vs Lakers in wins | answered (career) |
| Nikola Jokic points rebounds assists on the road in losses last 20 games | answered, but as total points only, not P+R+A |
| Luka Doncic assists in the 1st half in the playoffs | answered |
| Anthony Edwards steals in the 3rd quarter at home vs Celtics in wins last 7 games | answered (all filters echoed back) |
| Victor Wembanyama blocks in the 2nd half career | answered |
| De'Aaron Fox stats vs Trail Blazers last season | answered |
| LeBron James stats in the 1st quarter on the road in losses career | answered |

This is a sample, not proof that every combination works.

## Next steps

- Maybe: a light/dark toggle (tokens already support `data-theme="light"`)
- Maybe: refresh the player list to the current season

## Open problems

- PRA ("points rebounds assists") can be read by StatMuse as just points in
  some combos (seen with the Jokic query).
- "This season" returns last season's numbers until the new season has games.
- The player list is from 2023-24: newer players get no suggestions (typing
  their name still works).
