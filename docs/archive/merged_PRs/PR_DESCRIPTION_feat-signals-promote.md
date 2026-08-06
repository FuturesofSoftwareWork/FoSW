# `signals:promote` — the last step of the finder pipeline

Adds the one script the AI-signals pipeline was missing: the step that moves
reviewed drafts into `public/content/ai-signals/` and updates `index.json`.

Implements [the publishing design](docs/superpowers/specs/2026-08-06-signals-publish-design.md).

## Why

The pipeline stopped one step short of the site. `reconcile` appended to the
seen-ledger and nothing else — **no script wrote signal files or touched
`index.json`**. Publishing meant splitting the finder's output by hand and
hand-editing a 96-entry index, where a forgotten paste is a silent omission
until the validator catches it at build time.

## The flow

```bash
npm run signals:prepare
#  run the finder prompt. It writes, itself:
#    data/signal-drafts/<id>.json           one file per selected signal
#    data/_finder-rejected-<dim>.jsonl      appended, one line per rejection
#    data/_finder-report-<dim>.md           retrieval report
#  review data/signal-drafts/, mv each file into accepted/ or rejected/
npm run signals:promote
```

`data/signal-drafts/` is the whole interface between a run and its reviewer:

| Folder | Meaning | What `promote` does |
|--------|---------|---------------------|
| `signal-drafts/` | Not yet reviewed | **Nothing.** Counts and reports it |
| `signal-drafts/accepted/` | You want it live | Moves to `public/`, indexes it, ledger `published` |
| `signal-drafts/rejected/` | You declined it | Ledger `rejected`; the file stays put |

Nothing moves unless you moved it first, so an interrupted review cannot publish
items nobody read.

## What's in the change

| Path | What |
|------|------|
| `scripts/promote-signals.mjs` | The command. Exports `promote({root})` so tests run against an isolated tree |
| `scripts/lib/signal-schema.mjs` | The schema rules, lifted out of `validate-signals.mjs` |
| `scripts/__tests__/promote.test.mjs` | 11 tests |
| `scripts/__tests__/signal-schema.test.mjs` | 13 tests |

`validate-signals.mjs` now imports the shared rules instead of carrying its own
copy — same checks, one home, so a draft is held to exactly the standard
published content is. It still re-exports `SIGNAL_TYPES`, so the existing test
is unchanged and passing.

`scripts/ledger.mjs` gains exports and no behaviour change: `readLedger`,
`recordFromSignal`, and an `appendRecords` extracted from the append block that
was inline in `cmdReconcile`, which now calls it. One dedup path, so a repeated
step is always a no-op.

## Design points worth reviewing

- **`promote` is the only schema gate.** The agent writes drafts directly with
  no script in between, so `promote` validates the whole batch and moves nothing
  if any file fails. A half-moved batch would leave `accepted/` partly emptied
  with no record of which failures were real.
- **It never overwrites published content.** A target that already exists aborts
  the run and names the file. Ids come from the agent, so this is the backstop
  against a bad id scan.
- **Files are written before `index.json`.** A crash between the two leaves
  orphan files, which the validator catches loudly — better than a dangling
  index entry pointing at nothing.
- **Index entries are appended, never reordered.** Order is arbitrary today and
  `ContentStream.tsx` sorts client-side, so appending gives the smallest diff.
- **`validate-signals.mjs` runs last**, so a bad promote fails immediately
  rather than at the next build.

## Verification

- `npm test` — **93 pass**, 0 fail (69 existing + 24 new)
- `npm run lint` — exit 0
- `npm run build` — full build through prerender
- `reconcile` smoke-tested in a temp tree after the refactor: appends 2, then
  skips 2 already-seen on a re-run
- End-to-end rehearsal against **copies of real content** — the first sector
  run's 5 drafts and the real 96-entry index: 3 promoted, index 96 → 99,
  ledger 110 → 124 (+3 published, +11 rejected), `accepted/` emptied,
  `rejected/` and the queue untouched, second run a clean no-op

No production content was modified by any of this; the rehearsal ran in a
temporary directory.

## Not in scope

`--dimension` on the collector and `scripts/lib/radar-sectors.mjs` (the first
run's retrieval report says build it, but it is separate work), the other six
sector prompts, retiring `reconcile`, any schema change, any cron.
