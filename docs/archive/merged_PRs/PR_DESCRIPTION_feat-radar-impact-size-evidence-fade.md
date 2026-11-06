# Radar: blip size shows potential impact, fading shows evidence age

## What this does

Blip size used to show how recent the evidence was, but readers take a bigger blip to mean a more important one, and nothing on the page said otherwise. Size now shows `potentialImpact`, and a blip fades as its newest evidence gets older. A key under the legend explains both.

## Changes

- **Size.** `BLIP_RADIUS` is keyed by `potentialImpact`: low 5.5, moderate 7.5, high 10, transformative 13. The old steps (9 and 7.5) were too close to tell apart.
- **Fade.** New `BLIP_FADE` sets fill strength from `freshnessOf`, using the existing 92, 183 and 365 day steps: 1, 0.8, 0.65, 0.5.
  - A blip stops at a floor and never disappears, because quiet does not mean false.
  - The floor stays above the filter's 0.18 dim, so the two cannot be confused.
  - Faded blips keep a solid full-colour outline. Fill alone would drop purple near the bright centre below 2:1.
  - Hovering or focusing a blip draws it at full strength.
- **Key.** Two samples under the legend, drawn from the same constants as the canvas.
- **Screen readers.** `aria-label` now states the rating and, when relevant, how long there has been no new evidence.
- **Ring labels.** Larger blips could cover a ring label. `placeBlips` now keeps blips off the label boxes, using a new shared `ringLabelBox`, so the canvas and placement cannot drift apart.
- **Validator.** `potentialImpact` is now required on published phenomena, so `radar:accept` refuses an unrated draft. Drafts may omit it and draw at the moderate size.
- **Content.** `maintenance-at-scale` is rated high instead of moderate, and `agents-write-the-code` is retitled "Writing code by hand is becoming the exception". `the-gain-shrinks-downstream` is relabelled "Productivity gain shrinks downstream"; its id and URL stay the same.
- **Docs.** Design spec, `CLAUDE.md`, `AGENTS.md`, the runbook and the reach review prompt updated. The prompt now asks the person to confirm the rating during reach review.

## Sign-off needed

The impact ratings become the most visible thing on the radar, so Arto Wallin signs them off before release. So far this PR changes one: `maintenance-at-scale` goes from moderate to high.

## Verification

- `npm run build`, `npm test` and `npm run lint` pass.
- `verify:radar` against a preview build passes 18 of 18, up from 15. The three new checks are: size follows the rating, older evidence is never drawn stronger than newer, and no blip covers a ring label. Each was run against a build without the change and failed as intended.
- Checked in the browser at desktop and phone widths: sizes, fade, key, hover card and filter.

## Not in this PR

- The 9px horizontal overflow at phone width comes from a decorative hero background and is already on the live site.
- Some phenomena have an implication in almost every dimension, so filtering by Organisation & leadership still leaves 14 of 16 undimmed. This filter behaviour is unchanged.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
