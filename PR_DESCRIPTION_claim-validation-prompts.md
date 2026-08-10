# Claim runs: a third finder prompt type, for validating a phenomenon's evidence

## Why

`teams-get-smaller` cites six signals. One of them measures team size. The other
five measure employment — two layoff `market-event`s filed as `contextual`, and
two labour-market datasets filed as `counter` that argue against AI-driven job
loss rather than against the delivery unit shrinking. The phenomenon reads as
contested by strong opposing evidence. It is not: it is one investor field report
about its own portfolio, surrounded by material that never asked the question.

That happens because evidence accumulates by topical association rather than by
measurement. Nothing in the pipeline currently checks whether a source measured
the thing a phenomenon claims, and no run is pointed at a claim rather than at a
beat.

## What this adds

A third kind of finder prompt, alongside the generic run and the sector runs: a
**claim run**, launched at one phenomenon, that asks whether its evidence base
supports what it says and goes looking for what would show that it does not.

- `docs/claim-prompts/claim-prompt-instructions.md` — the shared half. Role,
  input files (including the phenomenon file itself), deduplication, freshness,
  signal types, output contract, schema, allowed values, retrieval-report format,
  writing guidance. A fork of the sector shared instructions, not an extension.
- `docs/claim-prompts/teams-get-smaller.md` — the first claim file: the claim, its
  construct, its near neighbours, what would refute it, a twelve-month window,
  source mix, hunting grounds and hazards.
- `docs/ai-signals-pipeline.md` — a *Claim runs* section formalising the type:
  why it exists, how it differs, file naming, run order, and which fields move
  when the proposed evidence block is applied.

## Three things make a claim run different

1. **It tests rather than scouts.** Novelty is not the bar. A twelve-month-old
   benchmark that measures the construct beats a fresh post that circles it.
2. **It hunts both sides deliberately.** `whatWouldChangeThis` on the phenomenon
   is a ready-made search brief for the refuting side, and refutations are rarer
   because nothing that stayed the same makes news. Supporting-side and
   refuting-side searches are reported separately so the balance of effort is
   visible.
3. **Its deliverable is an evidence block, not a set of drafts.** The report ends
   with the `evidence` array proposed for the phenomenon file, plus proposed
   removals and their consequences. The run never edits the phenomenon file.

## The construct test

The rule the whole type exists for: **a source is evidence for a claim only if it
measured the thing the claim is about.** Each claim file names the construct and
tabulates the near neighbours — for `teams-get-smaller`, layoffs, hiring rates,
job postings, total headcount, wages, junior hiring, output per developer, tool
adoption, attrition and revenue per employee. All are rejected under
`wrong-construct` however well reported, and `wrong-construct` is a removal
reason rather than a demotion to `contextual`: leaving noise in as context makes
a thin evidence base look furnished.

`revenue per employee` and `output per developer` get called out by name, because
both are consistent with the delivery unit staying exactly the same size and
doing more — which is a named competing development path in the phenomenon file,
not evidence for it.

## Mechanics

Working files carry a `claim-` infix so a claim run cannot collide with the
generic run or a sector run:

- `data/_finder-rejected-claim-<claim-id>.jsonl`
- `data/_finder-report-claim-<claim-id>.md`

`promote-signals.mjs` already sweeps every `data/_finder-rejected*.jsonl` into the
seen-ledger, so rejections are remembered with no further wiring. Signal drafts
land in `data/signal-drafts/` and go through the same folder-move review and
`npm run signals:promote` as every other run.

`rejectedUnder` gains `wrong-construct` and `outside-window` and drops
`out-of-sector`. The vocabulary is prompt-side only; nothing machine-reads it.

No schema change. The claim is a run-time lens exactly as the sector is: there is
no phenomenon field and no stance field on a signal, because stance belongs to
the phenomenon's evidence entry — the same source can be support for one
phenomenon and context for another.

## Not in this PR

The `teams-get-smaller` evidence list is untouched. The run comes first, so the
prune is decided against a real replacement corpus and the file is edited once.
When it is applied, three things move with it: `evidenceProfile.counterEvidence`
is derived and `validate-phenomena.mjs` fails the build on a mismatch;
`contested` gates a radar bolt that `scripts/verify-radar.mjs:116` counts by name;
and `reachRationale` and `contestedNote` both currently describe the
counter-evidence that would be leaving. `firstObserved` and `latestEvidenceDate`
do not move — the extremes come from signals that are staying.

## Verification

Docs only — no code, content or schema touched. `npm run validate` passes.
