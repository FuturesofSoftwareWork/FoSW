# Publish 26 signals and three phenomena, and tighten phenomenon wording

## What this does

Publishes this week's reviewed signals, adds three phenomena to the radar (16 published, up from 13), rewrites the titles and summaries of the published phenomena so they read at a glance, and adds wording rules so the pipeline stops producing the old style.

## Changes

- **Signals (26 published).** Promoted from the reviewed drafts with `signals:promote`; index and seen-ledger updated. Six older signals gained a `signalType` (`field-report`: DX, METR survey, Harness; `study`: the Science paper, METR revision, AgenticFlict) because a published phenomenon cannot cite an untyped signal as support. No other field on those six changed.
- **New phenomena (3, reach reviewed with a person on 2026-11-05).**
  - `competence-checks-get-redesigned`: early-manifestations (confirmed)
  - `agents-operate-developer-platforms`: gaining-traction (confirmed)
  - `the-gain-shrinks-downstream` ("Individual speed-ups shrink at team and company level"): field-level-shift (overrode the proposed gaining-traction). 25 evidence items; the Amazon 50-team pilot is attached as counter-evidence. `contested` is deliberately left unset.
  - An earlier draft, `delivery-absorbs-the-gain`, was declined through `radar:reject` and redrafted as the productivity phenomenon above, to avoid overlapping `review-shifts-to-verification`.
- **Published phenomena reworded.** Titles and summaries rewritten for 12 phenomena: descriptive titles, summaries about the phenomenon rather than one study, and refutation conditions removed from the thesis (each was already covered in `whatWouldChangeThis`). Evidence, reach and other fields are unchanged. `compute-becomes-a-budget-line` is relabelled "Justifying AI spend".
- **Instruction files.** `docs/radar-clustering-prompt.md` now has rules for `title`, `thesis` and `label` (plain descriptive title, about 70-word thesis, no "would be wrong if" in the thesis, no bare figures from one study). `claim-prompt-instructions.md`, `CLAUDE.md` and `AGENTS.md` point to them.
- **Expert insights.** Three articles now list `the-gain-shrinks-downstream` in `relatedPhenomena`: the workflow article, "Your Developers Are More Productive", and "Productivity Paradox 2.0".
- **Already in the working tree before this run (commit 4c8cf2e).** Expert-insight links and charts, drawer and radar-geometry changes, and validator/verify-script updates, committed separately so they can be reviewed or dropped on their own.

## Verification

- `npm run validate`: 166 signals, 16 phenomena valid (16 published), launch gate open
- `tsc`: clean
- **Not run:** `npm run build`, `npm test`, `build:preview` and `verify:radar`. They could not be run where this was prepared, because `node_modules` is installed for Windows. The UI and validator changes in 4c8cf2e were never built. Please run `npm run build` and `npm test` before merging.

## Open questions

- `radar:derive` warns that several phenomena carry counter-evidence but are not marked `contested`, including the new `the-gain-shrinks-downstream` (the Amazon pilot). `contested` is human-owned and was left as is.
- The `signalType` additions did not add optional fields such as `sponsor`, `sampleSize` or fieldwork periods to the six signals. They can be added later.
- After deploy, check `gh api repos/FuturesofSoftwareWork/FoSW/pages --jq .status` returns `built`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01ETtN95r5g1nMtZj47AihWw
