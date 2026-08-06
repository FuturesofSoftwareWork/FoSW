# Handover — radar sector-specific signal search

Written 2026-08-06, at the end of a session that designed the feature and wrote
the MVP. **Nothing here has been run yet.** Read this first if you are picking
the work up cold.

## Where we stopped (session ended 2026-08-06)

The session ended here deliberately — a display bug made long output unreadable,
so we committed the work and restarted rather than continuing.

| | |
| --- | --- |
| **Commit** | `350f81b` — "docs: add sector-specific signal search with a wellbeing MVP prompt" |
| **Branch** | `worktree-sector-signal-search`, pushed to `origin`, tracking set |
| **Based on** | `main` at `bca671f` (already contains the radar merge, PR #18) |
| **Changed** | 5 files, +978 lines, **documentation only** — no code, no schema, nothing under `public/` |
| **PR** | **Not opened.** `PR_DESCRIPTION_worktree-sector-signal-search.md` is written and ready to use as the body |
| **The prompt** | **Written, never run.** No finder output, no retrieval report, no ledger entries exist yet |

What was done: brainstormed the design, made the four decisions below, wrote the
wellbeing sector prompt, the spec, this handover, the PR description, and a
"Sector runs" section in `docs/ai-signals-pipeline.md`.

What was verified before committing: every path cited in the docs exists; the
phenomenon counts in the spec match the repo (6 total, two sectors at 0);
`ledger.mjs` accepts `reconcile <output.json> [--rejected <file>]` exactly as the
documented run order uses it. No code changed, so `npm test` and `npm run build`
are unaffected — neither was run in the worktree, which has no `node_modules`.

**Pick up at:** *The immediate next action*, below. Nothing is half-finished;
the next step is running the prompt for the first time.

## Where the work lives

- **Branch:** `worktree-sector-signal-search`, branched from `origin/main`
  (which already contains the radar merge, PR #18). Pushed — the work is safe on
  the remote regardless of what happens locally.
- **Created in a git worktree** at `.claude/worktrees/sector-signal-search`. That
  directory may be gone by the time you read this; the branch is not. From the
  main checkout: `git checkout worktree-sector-signal-search`, or merge it into
  whatever you are working on.
- **Files added** (all documentation — no code changed anywhere):
  - `docs/sector-prompts/worker-experience-identity-and-wellbeing.md` — the MVP,
    and the only thing that actually does anything.
  - `docs/superpowers/specs/2026-08-06-radar-sector-signal-search-design.md` —
    the design, the decisions and their reasons.
  - `docs/superpowers/HANDOVER-sector-signal-search.md` — this file.
  - `PR_DESCRIPTION_worktree-sector-signal-search.md` — per the CLAUDE.md
    convention.
  - `docs/ai-signals-pipeline.md` — one new section pointing at sector runs.

## What this is, in three sentences

The radar needs ten published phenomena to render and has six. Two of its seven
sectors have no phenomenon at all, because the one generic news-finder is tuned
for SDLC and tooling material and structurally under-samples the rest. A sector
run is a targeted finder pass aimed at a single work dimension, and the MVP is
one such prompt for `worker-experience-identity-and-wellbeing`.

## State right now

| Thing | State |
| --- | --- |
| Wellbeing sector prompt | **Written, never run** |
| Ethics sector prompt | Not written |
| Other five sector prompts | Not written |
| `--dimension` flag on the collector | Not built — deliberately, see below |
| `scripts/lib/radar-sectors.mjs` | Not built |
| Cron / automation | Not built |
| Signal schema | **Unchanged**, and intended to stay that way |

## The immediate next action

Run it:

```bash
npm run signals:prepare
# then run docs/sector-prompts/worker-experience-identity-and-wellbeing.md
npm run signals:reconcile -- data/_finder-output-worker-experience-identity-and-wellbeing.json \
  --rejected data/_finder-rejected-worker-experience-identity-and-wellbeing.json
```

Note there is **no `npm run signals:collect`** step. That is deliberate and is
the whole experiment — see the next section.

The prompt is self-contained. Launch it as its own job; it does not need the
generic finder prompt loaded alongside, and loading both would be actively
harmful because the quotas conflict.

## The one open question the first run must answer

**Does a sector run need its own candidate collector, or is web search enough?**

The collector exists because of a documented failure, recorded in
`scripts/collect-candidates.mjs`'s own header: generic web search "never
surfaces fresh practitioner/social posts well, which is why the finder only ever
returned published articles + arXiv."

The prediction on record for this sector: web search will find the developer
surveys, the HCI/CSCW research and the journalism (retrievable, mostly lagging),
and will under-find the r/ExperiencedDevs threads and personal blog posts
(hard to retrieve, most valuable). Nobody has verified this.

So the prompt requires a third output file —
`data/_finder-report-worker-experience-identity-and-wellbeing.md` — recording
what was searched, where the selected items came from, what could not be reached,
and a specific verdict on whether a collector would have helped and which feeds
it would need. **Read that report before deciding to build anything.**

A thin or empty run is a valid result, provided the report says which of "no
signal exists" and "I could not reach the signal" produced it.

## Decisions already made — do not silently reverse these

Each was a deliberate call, with the reasoning in the spec:

1. **The sector is a run-time lens only.** No `workDimensions` field on signals.
   Published signal JSON, the validator and legacy content are all untouched. If
   you find yourself wanting to add one, that is a real design change — go back
   to the spec's "Deliberately not done" section first.
2. **Each sector gets a standalone full prompt**, not a shared base plus
   overrides. It duplicates structure on purpose.
3. **Sector prompts replace the base quotas entirely.** This is what makes
   decision 2 honest — the parts that differ per sector are exactly the parts
   that would otherwise need overriding.
4. **Manual launch, one job per sector**, while the method is unproven. No cron
   rotation, no automatic thinnest-sector detection.
5. **MVP sector is wellbeing, not ethics.** Ethics was recommended (its signal
   is more retrievable, so it would more reliably return items); wellbeing was
   chosen instead. It is the harder retrieval case, which makes it the better
   test of the collector question but raises the odds of a thin first run. If the
   run comes back empty, that is the known risk of this choice — check the
   retrieval report before concluding the method fails.

## Things that will bite you

- **Output filenames are sector-suffixed** —
  `data/_finder-output-<dimension-id>.json`, not `_finder-output.json`. This
  stops a sector run overwriting the generic weekly run. `signals:reconcile`
  already accepts a path, so nothing needed changing; just do not forget to pass
  it.
- **`data/` is never published; `public/` is.** Vite copies `public/` into
  `dist`. The rejected-items files name stories the editorial team declined, and
  must not become world-readable on a VTT / University of Helsinki site. No
  pipeline working file goes under `public/`.
- **The prompt does its own ledger deduplication.** With no collector,
  already-seen URLs come back from search looking new. If the first run surfaces
  something already published, that is the mechanism.
- **Two failure modes look like success on the first run:** boundary leakage
  (careers or skills items wearing a wellbeing headline — check them against the
  boundary table in the prompt) and uniform bleakness (every item negative,
  every source a forum — check the named-individual count and whether
  disconfirming evidence was actually hunted). The prompt has guards for both;
  verify they worked rather than assuming.
- **The radar's ten-phenomenon gate still applies.** Signals are not phenomena.
  A good sector run produces evidence; someone still has to write the phenomenon,
  and `observedReach` is a human judgment that no script may set.

## If the first run works

The order from here, per the spec:

1. Decide the collector question from the retrieval report. If yes, the shape is
   already scoped: `--dimension <id>` on `collect-candidates.mjs` swapping in
   per-sector vocabulary from a new `scripts/lib/radar-sectors.mjs`, keyed by the
   seven ids in `src/config/radarDimensions.ts` and mirror-tested against them
   the way `WORK_DIMENSION_IDS` already is in `scripts/__tests__/config.test.mjs`.
   Write to `data/_candidates-<id>.json`; unknown id exits with the valid list.
2. Write the `ethics-responsibility-and-society` prompt — the other empty sector,
   and the one the base prompt's one-security-item cap suppresses hardest.
3. Only once several sectors have produced usable signal, consider automating the
   rotation.
