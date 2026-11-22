# Feature backlog — statmuse-builder

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are SM-1, SM-2, ... (never reused; SM is this repo's prefix, unique across the owner's repos).

## Ready

### SM-7 — Hoop Rotations link moves to the "Other sites" row, first and highlighted
**In short:** The link to Hoop Rotations sits first in the "Other sites" row with its name on it, in orange, so it is found where the owner looks for links to other sites.

Why: on 2026-11-22 the owner looked for the Hoop Rotations link in the "Other sites" row and did not find it. Today it is the "<name> rotations ↗" button after "Clear all": it looks like the Copy / Clear action buttons and never says the site's name.

What changes:
- Remove the Rotations button from the action row (Ask StatMuse, Copy question, Copy link, Clear all, Swap players).
- Add it as the FIRST button of the "Other sites" row, before ESPN, in the same shape as the others (site name + what opens + ↗):
  - Player (both views): **Hoop Rotations** "When he plays ↗"
  - A team (Team leaders, or a team in the Player box): **Hoop Rotations** "When they play ↗"
- Highlight: the words "Hoop Rotations" are in the accent orange (same orange as the player's name in the question). ESPN, Basketball-Reference and CraftedNBA stay as they are. Use a token, no hardcoded colour.
- Hover text, like the other site buttons: "Opens <name>'s rotations on Hoop Rotations: who was on the court, minute by minute."
- Same links as today (`#/player?name=<name>`, `#/team/<TRICODE>`), new tab, no filters go across.
- League, or an empty box: the Hoop Rotations button is not shown (hidden, not disabled). The disabled "Rotations ↗" button goes away.
- The draft / college / country line stays where it is, now right after the last action button.
- "Hoop Rotations" is a placeholder name (the public name of rotationkit is not final): keep it in one constant so it changes in one place.
- Update the existing Rotations tests (unit, e2e desktop + phone, and the `@live` one that checks rotationkit opens Anfernee Simons' page) to the new place and label. Must fit at 390px and 1280px.

