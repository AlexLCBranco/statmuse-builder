# Feature backlog — statmuse-builder

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are SM-1, SM-2, ... (never reused; SM is this repo's prefix, unique across the owner's repos).

## Ready

### SM-1 — Phone-usable site (desktop stays as is)
The owner wants to use statmuse-builder on his phone too. Desktop layout at >= 1280px must not change.

Current state (checked in the code, Nov 2026, not yet seen on a real phone): there are already some phone-width rules
(`@media (max-width: 640px)` in App.module.css and Filters.module.css, plus a < 1100px rule in RecentList), and only a
few hover tooltips (`title=`, about 6). e2e runs only on desktop Chrome. So this is mostly check-and-fix, not a redesign.

Wanted, at widths < 768px:
- Everything usable at 390px: question builder, filters, autocomplete, live preview, Recent list, defaults.
- **No page-level horizontal scroll** on any screen.
- Autocomplete dropdowns and pickers fit the screen and work with touch and with the phone keyboard open (not hidden
  behind it).
- The "open on StatMuse" action is reachable without scrolling far.
- Tooltips that carry information open on tap and close on tap outside (no hover on phones).
- Tap targets comfortably finger-sized.
- Add a rule to CLAUDE.md: every future change must work at 390px and 1280px, and the phone e2e project must pass.

**Tests (automated; no manual testing beyond one final look on a real phone):**
- Add a Playwright `phone` project (Pixel 7, 390x844, touch) that runs by default alongside desktop, locally and in
  `e2e:prod`.
- For every screen/state (empty builder, filters open, autocomplete open, Recent list): assert
  `document.documentElement.scrollWidth <= clientWidth`, and save a full-page screenshot as a test artifact.
- Build a full question on the phone project by tapping (player via autocomplete, filters) and assert the generated
  StatMuse URL equals the desktop result for the same inputs.
- Desktop e2e suite still passes unchanged.

### SM-3 — Back-to-back preset
**What:** a one-click preset that adds a back-to-back condition to the question: "2nd night of a back-to-back" (main one) and "1st night of a back-to-back". Step 1, then stop and report: test on StatMuse which phrasing it actually understands (e.g. "on the second night of a back-to-back", "on back-to-backs") and whether it works for players and teams; build only phrasings that return the right games. If it's not free or too hard, don't build it and don't mark it Blocked: move it to `IDEAS.md` (next free I ID) with one line on why (e.g. "not possible: no free source"), cut it from the backlog, and say so in the report. Must work on desktop and phone (SM-1 rules).
**Tests:** unit: the preset adds the verified phrasing to the generated question/URL; e2e: clicking the preset updates the preview; one live check that StatMuse answers the generated URL.
