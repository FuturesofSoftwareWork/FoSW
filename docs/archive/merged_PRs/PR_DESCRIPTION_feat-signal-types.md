# Signal finder: stateful pipeline + typed signals

Two related changes to the AI-signals pipeline, both complete and verified.

## Why

The news finder had three recurring failures:

1. **It re-surfaced the same landmark studies every scan** (the Faros study
   appeared in almost every run). The prompt is stateless — it had no memory of
   prior runs, so every scan rediscovered the same items.
2. **It over-indexed on arXiv and vendor security content.** Academic papers are
   easy to retrieve with clean URLs, and AI-security vendors publish high volumes
   of well-optimised content, so both crowded out everything else. arXiv also
   describes engineering practice from 6–18 months earlier.
3. **It could not find social or practitioner signals.** A generic web search
   does not surface fresh LinkedIn/Dev.to/HN posts well, so weak signals — the
   whole point of the project — never appeared.

Investigating (3) surfaced a deeper cause: **the uniform signal schema was
itself filtering out weak signals.** All 84 published signals carry
`whyItMatters`, `recommendedActions` and `risksAndCaveats`. To publish anything,
the finder had to produce confident leadership implications and concrete
recommended actions — which a single practitioner's firsthand observation cannot
honestly support. The bias lived in the required fields, not the ranking rules.

## Part 1 — Stateful pipeline (complete)

Two-stage design: **retrieve broadly in code → score editorially in the LLM.**
The prompt can only reason over what it is given, so discovery and deduplication
moved into scripts.

- **`scripts/ledger.mjs`** — owns an append-only seen-ledger
  (`public/content/ai-signals/_seen-ledger.jsonl`).
  `prepare` bootstraps and compacts it from published history; `reconcile`
  appends a run's output afterwards. Ledger writes are done by code, not by the
  model, so state cannot be lost to a model slip or a run that dies mid-write.
  Published records are kept permanently; rejected records age out after 90 days.
- **`scripts/collect-candidates.mjs`** — pulls candidates from zero-auth feeds
  (Hacker News, Dev.to, Reddit, GitHub releases), dedupes against the ledger and
  published history, and writes a per-run candidate pool. Each source is isolated
  so one failing feed cannot kill the run.
- **`scripts/validate-signals.mjs`** — schema validator for all indexed signals.
  Content is runtime-fetched and never type-checked by `tsc`, so this is the only
  enforcement of the signal schema; `npm run build` now runs it first, so invalid
  content fails the build instead of shipping. Also available as
  `npm run signals:validate`.
- **`docs/ai-signals-finder-prompt.md`** — rewritten finder prompt: reframed
  around lead time, adds a weak-signal track with non-benchmark credibility
  criteria, source-mix quotas, caps on academic and security items, a
  commercial-intent discount, and ledger-based deduplication.
- **`docs/ai-signals-pipeline.md`** — how the pieces fit together and how to run
  them.

Verified end to end: `prepare` bootstrapped 83 records from published history
(including the Faros study, so it can no longer resurface); `reconcile`
correctly skipped an already-seen item, appended new and rejected ones, and was
idempotent on re-run; `collect` returned 129 live candidates across HN, Dev.to
and GitHub while isolating a Reddit 403.

Run order:

```bash
npm run signals:prepare
npm run signals:collect
# finder prompt runs
npm run signals:reconcile -- public/content/ai-signals/_finder-output.json \
  --rejected public/content/ai-signals/_finder-rejected.json
```

## Part 2 — Typed signals (spec; implementation follows)

Design doc: `docs/superpowers/specs/2026-08-03-signal-types-radar-design.md`

Introduces a `signalType` discriminator with five types — `weak-signal`,
`field-report`, `study`, `regulatory`, `tool-shift` — sharing one schema, each
adding a few type-specific fields and, critically, relaxing which core fields are
required.

- **`recommendedActions` becomes optional for `weak-signal`.** This is the
  structural fix for the bias above: the finder no longer has to invent three
  confident action bullets to justify surfacing an early signal.
- **Provenance fields make staleness visible** — `dataCollectedPeriod` on
  studies, `fieldworkPeriod` and `sponsor` on field reports. A paper published
  this week about 2025 data now reads as a lagging indicator rather than as news.
- **Evidence tiers become visually distinct.** A survey of 635 leaders and one
  engineer's blog post currently render identically, which is a credibility risk
  for a research site.

The fields also supply the planned **signal radar**: ring = time-to-impact,
sector = category, marker fill = certainty, marker shape = signal type. Certainty
and timing are kept orthogonal so "we are unsure this is real" is never confused
with "this is real but distant". The radar itself is out of scope here.

Also corrects two stale type declarations that never matched the data (content is
runtime-fetched, so it is never type-checked):

- `DecisionHorizon` was `"2026" | "2027-2028" | "2029+"` — used by **zero**
  published files. Actual values: `"now"` (59), `"0,5 - 2 years"` (16),
  `"0-6m"` (8).
- `AISignalSourceType` was capitalised; the data is predominantly lowercase.

And normalises the content to match: 8 × `"0-6m"` → `"now"`, 5 stray capitalised
`sourceType` values, and 5 orphan signal files that exist on disk but are absent
from `index.json` (invisible to the site, and would be invisible to the radar).

## Fixes surfaced during implementation

- **Duplicate signal id (user-facing).** `2026-02-09-01.json` carried the in-file
  id `2026-02-05-01`. Indexing the orphan file of that name made two live signals
  share it, and the site keys on the in-file id — so a shared deep link opened the
  wrong article. Corrected. Three other non-colliding id mismatches were left
  alone deliberately, to avoid breaking already-shared links.
- **Null values passed the required-field check**, which would crash the signal
  list when a user typed in the search box. Tightened.
- **Reconcile lost the whole published batch** if the optional `--rejected` file
  was missing or malformed — the exact state-loss the ledger exists to prevent.
  Rejected-file errors are now non-fatal; main-output errors still fail loudly.
- **`CLAUDE.md` documented a schema that no longer existed** (six categories that
  are not real values, and `decisionHorizon` values used by zero files). Updated,
  since it is the first file future contributors and agents read.

## Notes

- All new schema fields are optional, so the 84 existing signals remain valid and
  render unchanged.
- Type-specific fields are expected only where the source states the value. On a
  research-communication site an invented sample size or fieldwork window is a
  credibility risk, so the docs say "omit rather than fabricate" and the validator
  hard-requires only `observer` (weak-signal) and `effectiveDate` (regulatory).
- `npm run lint` is broken repo-wide and was NOT fixed here: eslint is named in
  `package.json`'s lint script but is not a declared dependency, is not installed,
  and has no config. Pre-existing and out of scope for this branch.
- `_seen-ledger.jsonl` is committed state. `_candidates.json` and the finder
  output/rejected files are per-run artifacts and are gitignored.
- X/Twitter and LinkedIn are deliberately not collected — neither offers
  zero-auth post search, and LinkedIn scraping violates its terms. Both are
  documented as curated-account workflows instead.
