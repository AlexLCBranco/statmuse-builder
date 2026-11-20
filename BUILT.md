# Built — statmuse-builder

Shipped work only, newest first. Planned work is in `FEATURE_BACKLOG.md`, never here.
Entries dated before 2026-11-16 were backfilled from the git commit messages (data, docs, test-only, merge and
spec commits left out). New entries name their backlog ID (see CLAUDE.md, "Feature backlog, built list and ideas").

## 2026-11-20
- SM-6 — Shared layout: pinned header menu, chips instead of dropdowns (v0.19.0)
  A header that stays at the top (back / forward, a breadcrumb whose parts jump to their neighbours, "Go anywhere" search on Ctrl+K, the gear) with the two places under it (Player · Team leaders); every choice is now in the address bar, so a reload or a shared link shows the same screen.

## 2026-11-18
- SM-3 — Back-to-back preset (v0.18.0)
  A "Back-to-back: 2nd night" chip adds "on the second night of a back to back" to any question; 1st night is left out (StatMuse misreads it).
- SM-1 — Phone-usable site (v0.17.0)
  On a phone the info tooltips (version, "Pinned is full") open on a tap, and dropdowns stay above the keyboard.
- Pinned searches in the empty box; dropdowns float over the page; player list re-synced (v0.16.0)
  Pinned searches show first in an empty Player or Team box, and the Opponent dropdown no longer stretches the column.

### Internal
- Live e2e runs pause Vercel's DDoS mitigation (you confirm) and resume it after (v0.18.1)

## 2026-11-15
- Swap players button; teams in the Player box (v0.15.0)
- Rotations button: open the player or team on rotationkit (v0.14.0)

## 2026-11-12
- Pressed chips and switches are an orange tint with an accent edge (v0.13.0)
- Game by game offers everything averages does (v0.12.0)
- Default selections: choose which buttons start pressed (v0.11.0)
- The page never scrolls: columns scroll inside themselves (v0.10.0)
- Full-width layout and bigger click targets (v0.9.0)
- Version badge, /version.json and a CI version check (v0.8.0)
- Team leaders mode, game by game view, pins, recents in the box (v0.7.0)

## 2026-10-18
- Stat chips: 3PM replaces 2PA (v0.6.1)
- Stat chips: FGA, FGM, 3PA, 2PA replace PRA, 3PM, steals, blocks (v0.6.0)

## 2026-10-17
- Without box for "without <teammate>" questions (v0.5.0)
- Vs player box for player matchups (v0.4.0)
- Opponent: dropdown you can type into to narrow teams (v0.3.0)
- Sync player suggestions to 2026-27 rosters (v0.2.0)
- Dark theme by default; light only via data-theme="light" (v0.1.1)
- Add README
- StatMuse Builder v0.1.0: port the reference build to Vite + React
