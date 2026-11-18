# Feature backlog — statmuse-builder

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are SM-1, SM-2, ... (never reused; SM is this repo's prefix, unique across the owner's repos).

## Ready

### SM-3 — Back-to-back preset
**What:** a one-click preset that adds a back-to-back condition to the question: "2nd night of a back-to-back" (main one) and "1st night of a back-to-back". Step 1, then stop and report: test on StatMuse which phrasing it actually understands (e.g. "on the second night of a back-to-back", "on back-to-backs") and whether it works for players and teams; build only phrasings that return the right games. If it's not free or too hard, don't build it and don't mark it Blocked: move it to `IDEAS.md` (next free I ID) with one line on why (e.g. "not possible: no free source"), cut it from the backlog, and say so in the report. Must work on desktop and phone (SM-1 rules).
**Tests:** unit: the preset adds the verified phrasing to the generated question/URL; e2e: clicking the preset updates the preview; one live check that StatMuse answers the generated URL.
