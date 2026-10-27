# Claim runs: read state from the phenomenon, deliver a `radar:apply` proposal

## Why

The claim-run prompts had drifted from the pipeline around them in four ways.

1. **The only claim file described a phenomenon that no longer exists.**
   `teams-get-smaller.md` stated the ring (`early-manifestations`), `contested`,
   "one investor field report", six citations, and a list of four items to
   remove. Since then the phenomenon was pruned, re-evidenced and moved out to
   `gaining-traction` with five `supports` items in four independent contexts.
   A rerun would have audited a stale picture and hunted for removals already
   made. Even its quoted thesis no longer matched the file.
2. **The deliverable bypassed `radar:apply`.** The run produced a paste-ready
   `evidence` array and the runbook said to apply it by hand — to a field
   CLAUDE.md calls machine-owned, with `radar:apply` as its only writer. That
   skipped apply's checks (published signals only, reasons required on removals)
   and left no record of why a citation was removed.
3. **The ledger rule threw away the evidence a claim run exists to find.** "Skip
   anything in the ledger, regardless of status" meant a solid benchmark a
   generic run declined as `low-altitude` could never be cited, though a claim
   run values exactly that kind of direct measurement over novelty.
4. **`contextual` was never defined.** The prompt said what it was not, not what
   it was, which is how near-neighbour material drifts back in as padding.

Also a garbled paragraph in the report-path instructions, and a stale note about
`verify-radar.mjs` bolt counts.

## What changes

- **`docs/claim-prompts/teams-get-smaller.md`** — states no current state. The
  run reads ring, `contested`, evidence and `evidenceProfile` from the phenomenon
  file and records them in report section 1. The phenomenon's `construct` and
  `whatWouldChangeThis` are named as the authority; the claim file only expands
  them into search terms. The 2026-08-07 prune stays as history, with an
  instruction to re-audit every current citation.
- **`docs/claim-prompts/claim-prompt-instructions.md`**
  - New output 4: `data/_radar-proposal-claim-<id>.<date>.json` in the
    `radar:apply` format (attachments, detachments with reasons, `newPhenomena:
    []`, suggestions for human-owned fields). Report section 7 becomes the
    argument for it, including a *Waiting on promotion* list of attachments to
    this run's drafts.
  - A *Stance* section defining `supports` / `counter` / `contextual` — all three
    require the construct to have been measured; `contextual` is pressure without
    direction — plus two tests before writing `contextual`, and `primary`.
  - A second dedupe exception: a ledger-rejected item may be redrafted when the
    recorded reason was relative to another run (`low-altitude`,
    `capped-this-run`, `out-of-sector`, `adjacent-already-covered`,
    `outside-window`, or `wrong-construct` under a different claim). Reasons
    about the source itself still block. No recorded reason → logged
    `reviewable: true`, not redrafted. Redrafts are flagged in the report and
    run log, never in published `risksAndCaveats`.
  - The garbled paragraph repaired; the bolt-count note removed.
- **`docs/ai-signals-pipeline.md`, `docs/pipeline-runbook.md`** — run order and
  Stage A now end in `radar:apply -- data/_radar-proposal-claim-…json` after
  `signals:promote`, not a hand edit.
- **`scripts/radar-apply.mjs`** — detachments now run before attachments. Found
  by dry-running the documented proposal shape against a copy of the content: a
  re-stance written as detach + attach of the same signal made the attachment a
  no-op (still cited) and then removed the item, silently losing the citation.
  Behaviour is unchanged for every other proposal.
- **`scripts/__tests__/radar-apply.test.mjs`** — a test for the re-stance case.

## Not in scope

- Claim files for other phenomena. Candidates from the current data:
  `same-tool-different-outcomes` (`field-level-shift` on three `supports`),
  `agents-become-the-perimeter` (no counter-evidence), `the-management-layer-thins`
  (one support against two counter).
- Any content change. The working tree's unrelated signal and phenomenon edits
  are not part of this branch.

## Verification

- `npm test` — 287 pass, including the new re-stance test.
- Dry run of the documented proposal shape on a scratch copy of
  `public/content/`: re-stance applies, the suggestion reaches
  `_radar-apply-report.md`, and an attachment to an unpublished id is refused.
- `npm run build` passes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
