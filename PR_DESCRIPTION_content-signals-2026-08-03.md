# Publish 7 AI signals from the 2026-08-03 finder run

Content only — no code changes. These are the items reconciled into the
seen-ledger in the first supervised run of the reworked finder pipeline.

## What is published

| id | type | category | signal |
|----|------|----------|--------|
| `-04` | — | Security & Risk | Hugging Face's firsthand postmortem of an eval agent that escaped its sandbox and ran a ~4.5-day intrusion |
| `-05` | — | Quality & Testing | Evals are becoming the spec: "eval-driven development" and a first-class evals-engineer role |
| `-06` | — | Skills & Learning | Korea field interviews sharpen the junior-pipeline story |
| `-07` | — | Org & Leadership | Standardize the gateway, not the tool: the Shopify/Ramp operating model |
| `-08` | `weak-signal` | Quality & Testing | Code review is quietly being replaced by verification as parallel agents outrun human reading speed |
| `-09` | `study` | Quality & Testing | SlopCodeBench: newer models pass more incremental-change checkpoints but emit ~11.6x more slop |
| `-10` | `field-report` | Org & Leadership | Insight Partners: engineering teams rebuilt at five or fewer; 10-15% pay premium for "AI-ready" leaders |

`-04` through `-07` come from an earlier run that predates the signal-type
system, so they carry no `signalType`. That is deliberate: 84 of the 89
previously published signals are untyped too, so four more changes nothing. A
backfill belongs with the radar work, when there is a rendering to calibrate
against.

## One content fix the validator caught

`-04` through `-07` used `signalStrength` values `strong` and `moderate`, which
predate the enum and are not valid. Both scales are three-tier and
order-preserving, so they were mapped:

```
strong   -> established
moderate -> emerging
weak     -> weak (unchanged)
```

This reinterprets the earlier run's editorial judgement, so it is called out
rather than buried. Without the mapping the build would have failed — which is
the validator doing its job, since it now runs first in `npm run build`.

## What was deliberately NOT published

Two candidates were rejected on editorial grounds and recorded in the ledger with
their reasons, so future runs will not resurface them:

- **Git worktrees are not an isolation boundary for coding agents** — correct and
  genuinely useful, but its durable takeaway is a command substitution
  (`git clone --shared` over `git worktree`). Too low-altitude for this
  publication.
- **Document-borne AI worm through Copilot for Word** — strong security research,
  but the substance is how the exploit works rather than what teams must do
  differently.

Both rejections drove prompt changes (an Altitude section and a tightened
security rule) that shipped separately in the dedup-key PR.

## Verification

- `npm run signals:validate` → `OK — 96 signals valid`
- `npm run build` → PASS; all 7 files present in `dist`, no pipeline working
  files leaked into the published output
- `npm run lint` → clean
- Rendered in a dev server: all 7 cards appear in the stream (they sort by
  `date`, so several sit below the first page and need "Show more"). Drawer spot
  checks:
  - `-08` shows `Weak signal` + `Emerging` badges, the observer/lead-time
    evidence line, and `Corroborated by 3 independent sources` with working
    hostname links.
  - `-10` shows `Field report` + `Emerging` and the full provenance line
    (sample size, fieldwork period, sponsor, lead time).
  - No console errors.
