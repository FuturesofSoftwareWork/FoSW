# Signal publishing — design

Two commands, `signals:publish` and `signals:promote`, that turn a finder run's
JSON output into signal files under `public/content/ai-signals/` with a human
review step in between.

Written 2026-08-06. Nothing here is built yet.

## The gap

The pipeline stops one step short of the site. Today:

```
signals:prepare → [finder prompt] → data/_finder-output.json → signals:reconcile
```

`reconcile` appends to the seen-ledger and nothing else. **No script writes
`public/content/ai-signals/<id>.json` or updates `index.json`.** Both finder
prompts say so explicitly — *"Do not create individual signal files or edit
index.json. Publishing is a separate, reviewed step"* — and that separate step is
currently a person splitting the array by hand and hand-editing the index.
`validate-signals.mjs` checks the result; nothing produces it.

The hand-editing is error-prone in a specific way: `index.json` has 96 entries
and a signal file is invisible to the site unless its entry is present, so a
forgotten paste is a silent omission until the validator catches it at build
time.

## What gets built

| Path | What |
|------|------|
| `scripts/lib/signal-schema.mjs` | Enums + `validateSignal(item)`, lifted out of `validate-signals.mjs` |
| `scripts/publish-signals.mjs` | Stages finder output as drafts. `npm run signals:publish` |
| `scripts/promote-signals.mjs` | Moves reviewed drafts into `public/`, writes the ledger. `npm run signals:promote` |

`scripts/ledger.mjs` gains exports so the two new scripts can reuse its
append-and-dedup path; its behaviour is unchanged. See *The organising rule*.

Three new test suites under `scripts/__tests__/`, matching the six that exist.

## Staging model

Drafts live **outside** `public/`, in a three-state review folder:

```
data/signal-drafts/                 publish writes here — the queue
  2026-08-06-05.json                  still to review
  accepted/
    2026-08-06-06.json                → public/content/ai-signals/, ledger: published
  rejected/
    2026-08-06-07.json                → ledger: rejected, file stays put
```

### Why outside `public/`, and not a `status: "draft"` field

`status: "draft"` does not keep a draft off the live site. Vite copies `public/`
into `dist`, so the JSON still ships and is served at its URL; `useContent.ts:51`
merely filters it out of the UI. For a VTT / University of Helsinki site where
wellbeing signals quote named individuals from forum threads, unreviewed material
being fetchable is a real if small exposure.

It buys nothing back, either. `includeDrafts()` is passed only to the phenomena
fetch (`src/hooks/useContent.ts:99`); the signals fetch takes the default
`["published"]`. **A draft signal renders nowhere** — not in dev, not in the
`/FoSW/preview/` deployment, not in production. There is no build in which you
could eyeball one on the site, so review is a file-and-diff activity whichever
model is chosen. The folder move therefore costs nothing in reviewability and
gains a physical guarantee: unreviewed content is not in the deployed tree at
all.

Supporting fact: there are **zero draft signals** in the repo today (six draft
phenomena, no signals), so the draft-status path for signals is untested
machinery rather than an established convention.

### Why three folders and not two

With a queue and a rejected folder only, "unreviewed" and "approved" are the same
state, and `promote` cannot tell them apart. A review interrupted halfway would
publish items nobody read.

Three folders make review a positive act on both sides: nothing moves unless it
was moved. The root folder is then a real queue — whatever is still in it is
exactly what is left to do — so a review can be spread across sessions.

The cost is one `mv` per accepted item. That is cheaper than naming ids on the
command line, which is the alternative it replaces.

### Why a rejected folder rather than inferring rejection from deletion

The rejected-by-absence design (stage a manifest, treat missing files as
declines) infers an editorial decision from a file not being there. An accidental
`rm`, an interrupted write, or a file moved elsewhere would all be recorded as
"the team evaluated this and declined it".

A folder makes the decision deliberate and evidenced, makes it reversible (`mv`
back), and keeps the whole item — title, summary, source, why-it-matters —
against the day someone asks what was turned down. The ledger keeps only a claim
and a URL.

Consequence, accepted deliberately: an item hard-`rm`'d from the queue produces
no ledger record at all and may resurface in a later run. That is honest — no
decision was recorded because none was made.

### Why the folder is gitignored

`FuturesofSoftwareWork/FoSW` is a **public** repository. Committing drafts would
publish unreviewed material on github.com — not on the site, but public all the
same, and permanently in history after a rejected one is deleted. That defeats
the point of staging outside `public/`.

So `data/signal-drafts/` is local scratch. Only the promote commit is visible,
and it contains exactly what was kept.

## Run order

```bash
npm run signals:prepare
#  run the sector prompt → data/_finder-output-<dim>.json
#                          data/_finder-rejected-<dim>.json
#                          data/_finder-report-<dim>.md
npm run signals:publish -- data/_finder-output-<dim>.json \
  --rejected data/_finder-rejected-<dim>.json
#  review data/signal-drafts/ ; mv each file into accepted/ or rejected/
npm run signals:promote
```

The generic weekly run is identical minus the sector suffixes, and gains
`npm run signals:collect` at step 2 as it has today.

### The organising rule

**The ledger is written at the moment a decision is made.**

| Decision | Made by | Recorded by | Ledger status |
|----------|---------|-------------|---------------|
| The finder evaluated and declined it | the model, at output time | `publish` | `rejected` |
| You declined it during review | you, in `rejected/` | `promote` | `rejected` |
| It went live | you, in `accepted/` | `promote` | `published` |

`published` records are kept forever; `rejected` age out after `RETENTION_DAYS`
(90), so a story that becomes relevant later can return. Recording an editorial
decline as `published` — which is what happens today if you drop an item after
the finder chose it — both mislabels it and suppresses it permanently.

`reconcile` keeps its current signature and stays documented, so nothing existing
breaks and no migration is forced. The new flow simply does not need it.
Retiring it is out of scope.

`scripts/ledger.mjs` gains **exports only, no behaviour change**: `readLedger`
(line 106), `recordFromSignal` (line 145) and an `appendRecords(records)`
extracted from the append block inside `cmdReconcile`, so `publish` and `promote`
write the ledger through the same key-dedup path rather than reimplementing it.
`prepare` and `reconcile` keep working exactly as they do now, and
`scripts/__tests__` must show that. `keyFor`, `normalizeUrl` and `normalizeText`
are already exported.

## `publish` — stage drafts

`node scripts/publish-signals.mjs <finder-output.json> [--rejected <file>]`

1. Read the finder-output array. **Validate every item** via `signal-schema.mjs`.
   On any failure, write nothing and exit 1, listing per-item errors.
2. Assign ids (below).
3. Write one file per item to `data/signal-drafts/<id>.json` with
   `status: "draft"`.
4. Append `--rejected` items to the ledger as `rejected`, reusing the existing
   key-dedup so a re-run is a no-op.
5. Print the id mapping.

Nothing under `public/` is touched, and `index.json` is not read for writing —
only for id scanning.

### Id assignment

`publish` owns ids. The prompt's `id` values are treated as suggestions and
discarded.

The prompt picks `YYYY-MM-DD-NN` by reading `index.json`, but staged drafts are
not in `index.json`. A sector run and the generic weekly run on the same day
would therefore both assign `2026-08-06-01`, and the second `publish` would
silently overwrite the first one's draft.

So `publish` scans `index.json`, `data/signal-drafts/`,
`data/signal-drafts/accepted/` and `data/signal-drafts/rejected/` for the highest
sequence already used on each item's `detectedAt` date, and assigns the next free
ids in array order. Scanning the rejected folder too means a rejected id is never
reused, so a ledger line always points at one item.

This follows the pipeline's own stated principle: state lives in deterministic
code, not in model discipline. The alternative — teaching the prompt to read the
drafts folder — is exactly the failure mode the ledger was built in code to
avoid.

`_finder-output.json` is **not** rewritten. `promote` reads ids from the staged
files themselves, so there is nothing to keep in sync, and the finder output
stays an honest record of what the model actually said.

### Why the batch is all-or-nothing

A schema failure in one item almost always means a systematic prompt problem, not
one bad apple. Staging the valid half consumes ids and leaves a state that has to
be unpicked by hand before a re-run. Failing the batch keeps the fix in one
place: correct the finder output, run again.

## `promote` — go live

`node scripts/promote-signals.mjs`

1. Validate every file in `data/signal-drafts/accepted/`. Any failure → nothing
   moves, exit 1.
2. Move each into `public/content/ai-signals/<id>.json`, rewriting `status` to
   `"published"`. **Never overwrite an existing file.** `publish` should have
   made a collision impossible, so one here means something was hand-edited —
   abort the whole run and name the file rather than clobbering published
   content.
3. Append one `index.json` entry per item to the end of `items`; bump
   `lastUpdated`.
4. Ledger: promoted items as `published`, everything in `rejected/` as
   `rejected`. Rejected files stay where they are.
5. Run `validate-signals.mjs` last, so a bad promote fails now rather than at the
   next build.

`promote` **never touches the root queue.** It reports the count as a reminder
and exits 0. An empty `accepted/` and empty `rejected/` is a clean no-op, not an
error.

### Index entries are appended, not sorted

`index.json` order is arbitrary today — neither id-sorted nor date-sorted — and
`ContentStream.tsx:97` sorts client-side on `date` or `detectedAt`. Appending
gives the smallest diff and has no effect on display order.

## Error handling

Both commands are all-or-nothing at the batch level.

`promote` writes signal files **before** `index.json`. A crash between the two
leaves orphan files, which `validate-signals.mjs` catches loudly — *"exists on
disk but is not listed in index.json (invisible to the site)"*. The reverse order
would leave an index entry pointing at nothing, which fails the build with a
missing-file error and is harder to clean up. Failing toward the recoverable
state is deliberate.

Ledger appends are idempotent through the existing `keyFor` dedup, so re-running
`promote` after a partial failure adds nothing twice.

## Testing

`node --test`, three suites alongside the existing six.

- `signal-schema.test.mjs` — every enum, required fields, the array-shape rules,
  the `regulation-standard` / `practitioner-account` conditional requirements.
  Must also assert the extraction changed nothing: the same rules
  `validate-signals.mjs` enforced before.
- `publish.test.mjs` — id reassignment past both `index.json` and all three
  folders; a same-day collision between two runs; an invalid item blocking the
  whole batch; `--rejected` items reaching the ledger; the finder output being
  left untouched.
- `promote.test.mjs` — `accepted/` moves and `rejected/` does not; the root queue
  is untouched and reported; `index.json` gains exactly one entry per item;
  `status` is flipped to `published`; a second run is a no-op; an empty run
  exits 0.

## Also in scope

**`.gitignore` fix.** It currently lists three exact paths:

```
data/_candidates.json
data/_finder-output.json
data/_finder-rejected.json
```

Sector runs write sector-suffixed filenames, so
`data/_finder-rejected-worker-experience-identity-and-wellbeing.json` — a list of
stories the editorial team declined, on a public repo — is **not ignored** and
would be committed. Replace with globs and add the drafts folder:

```
data/_candidates*.json
data/_finder-output*.json
data/_finder-rejected*.json
data/_finder-report*.md
data/signal-drafts/
```

**Documentation.** `docs/ai-signals-pipeline.md` (run order, the file table, a
staging section), both finder prompts (run-order block; soften the id instruction
to say `publish` reassigns), `CLAUDE.md` and `AGENTS.md` (commands and the
`public/` vs `data/` boundary).

## Deliberately not done

- `--dimension` on `collect-candidates.mjs`, and `scripts/lib/radar-sectors.mjs`.
  Still gated on the first sector run's retrieval report.
- The other six sector prompts.
- Retiring `reconcile`.
- Any change to the AI Signal schema, including a `workDimensions` field. The
  sector remains a run-time lens.
- Any cron or unattended path. Review is the point of the design; automating past
  it would remove the only human gate.
- Pruning `data/signal-drafts/rejected/`. The files are small, gitignored, and
  re-recording them is a no-op.

## Things that will bite you

- **`data/` is never published; `public/` is.** No pipeline working file goes
  under `public/`. `validate-signals.mjs` already fails the build on any file
  under `public/content/ai-signals/` whose name starts with `_`.
- **The prompt's ids are not the final ids.** Anything referring to an item by
  the id in `_finder-output.json` — including the retrieval report — is naming a
  suggestion, not a file.
- **`rm` is not a rejection.** Removing a file from the queue records nothing and
  the item can come back. Move it to `rejected/`.
- **Signals are not phenomena.** A good run produces evidence; someone still has
  to write the phenomenon, and `observedReach` is a human judgment no script may
  set. The radar's ten-phenomenon gate is unaffected by any of this.
