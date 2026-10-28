# Launch the futures radar at 13 published phenomena

## What this does

Publishes the radar. Thirteen phenomena are now `published`, past the ten needed to open the launch gate, so the radar renders on the production site for the first time. Until this merges it is visible only in dev and at `/FoSW/preview/`.

## Changes

- **Phenomena (13 published).** Four are new: `same-tool-different-outcomes`, `agents-write-the-code`, `roles-blur-into-builders`, `maintenance-at-scale`. The rest were drafts and are now accepted. `maintenance-becomes-the-constraint` was declined through `radar:reject` (recorded in `data/_radar-rejected.jsonl`) and is replaced by `maintenance-at-scale`.
- **Reach.** Reviewed with a person on 2026-10-27. Two proposals were overridden: `configuring-the-machine` (gaining-traction to field-level-shift) and `teams-get-smaller` (early-manifestations to gaining-traction).
  - field-level-shift: compute-becomes-a-budget-line, configuring-the-machine, same-tool-different-outcomes
  - early-manifestations: evals-become-the-spec, roles-blur-into-builders, the-management-layer-thins
  - gaining-traction: the other seven
- **Signals.** Seven added (three from the `configuring-the-machine` claim run, four promoted from review). Twenty older signals have updated content from the claim run's re-audit.
- **Hover card fix.** `RadarBlips.tsx` drew the card inside its blip's group, so any later blip covered it. It now renders in its own layer after every blip.
- **`verify:radar`.** Checks the card paints on top. Two stale checks fixed: the renamed "Justifying machine spend" blip, and the draft-mark check, which failed when no drafts exist.
- **Docs.** New claim prompt `docs/claim-prompts/configuring-the-machine.md`, updated claim-prompt instructions, one row in `ai-signals-pipeline.md`.

## Verification

- `npm run validate`: 140 signals, 13 phenomena valid, launch gate open
- `npm test`: 287/287; `tsc` and lint clean
- `npm run build` and `build:preview` succeed
- `verify:radar`: 15/15 against the preview build; preview looked at by hand

## Open questions

- `radar:derive` warns that six phenomena have counter-evidence but are not marked `contested`: review-shifts-to-verification, evals-become-the-spec, configuring-the-machine, compute-becomes-a-budget-line, supervision-without-recovery, maintenance-at-scale. Left as-is; `contested` is human-owned. If any should be contested, the radar will show a bolt on it.
- After deploy, check `gh api repos/FuturesofSoftwareWork/FoSW/pages --jq .status` returns `built`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
