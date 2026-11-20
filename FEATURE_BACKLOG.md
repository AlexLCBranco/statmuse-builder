# Feature backlog — statmuse-builder

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are SM-1, SM-2, ... (never reused; SM is this repo's prefix, unique across the owner's repos).

## Ready

### SM-6 — Shared layout: pinned header menu, chips instead of dropdowns
**In short:** statmuse-builder gets the shared layout every app now uses: a header always at the top (back/forward, breadcrumb, main places, "Go anywhere" search), and under it "What" chips and a "How" switch, so nothing is hidden in dropdowns.
**What:**
- Follow [NAV_PATTERN.md](https://github.com/AlexLCBranco/backlogkit/blob/main/NAV_PATTERN.md) exactly (read it first; it is the spec). Same look as footykit FK-65 so the apps read as one site; if FK-65 has shipped, copy its header styles rather than re-designing.
- Used on the phone: the 390 px rules in section 4 are a must. Pick the Where tabs from the app's real pages (at most 5); flag in the report how you mapped them.
- Replace every `<select>` used to pick what's shown with chips/strips. Every state in the URL; old URLs keep working.
**Tests:** as in NAV_PATTERN.md section 6.

### SM-4 — Draft, college and hometown next to Rotations
**In short:** In Player mode, next to the "Rotations ↗" button, a short line shows the player's draft spot, college and where he's from, with links to his full draft and his college team's roster.
**What:**
- Only for the main player in Player mode (same player the Rotations link uses). Compact line in the empty space right of "Rotations ↗", e.g. "2023 #1 (SAS) · no US college · France".
- Draft: year, pick number (and round if 2nd), drafting team; "Undrafted" when so. Link: the full draft order of that year (e.g. Basketball-Reference's draft page for that year; verify the URL works).
- College: school name and years if he played US college; "No US college" otherwise (show his pre-NBA club/country league if the source has it). Link: that college team's roster for his season(s), so his college teammates are visible (e.g. Sports-Reference college basketball; verify). College stats line only if the same free source gives it.
- Hometown: US-born → city, state; foreign-born → country (city too if the source has it).
- Hover (tap on phone) shows the full details; must work on desktop and phone (owner's rule for this app) and keep everything on one screen, no scrolling.
- Data: free source only (e.g. NBA's player info, through a small cached serverless function if the browser can't call it directly). Cache per player. If a field has no free source, leave it out and say so in the report; never guess.
- Must not slow down typing/searching; the line loads after the player is picked.
**Tests:** unit: formatting for drafted / undrafted / 2nd round / foreign with and without US college; e2e with mocked data: pick a player, the line and both links appear next to Rotations; one live check against the real source for Victor Wembanyama.

### SM-5 — Links to other stats sites, not only StatMuse
**In short:** Besides the StatMuse question, the current search can open on other stats sites that aren't the owner's own.
**What:** for the current selection, extra link buttons that open the same search (or the closest page) on other sites.
**Answered (2026-11-19):** which sites, and what each should open? → Anything StatMuse is known to be limited on that has an excellent free alternative; Claude Code researches and picks them. For each pick: what StatMuse can't do there, which free site does it well, and what the link opens for the current selection. Free sites only (no paywall or login needed for the page opened). Test every link against the live site before shipping, and list the picks with one line of reason each in the report.
