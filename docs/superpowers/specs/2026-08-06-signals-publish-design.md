# Signal publishing — design

One command, `signals:promote`, that moves reviewed signal drafts into
`public/content/ai-signals/` and updates `index.json`. The finder agent writes
the drafts itself; the reviewer sorts them; `promote` does the rest.

Written 2026-08-06. Revised the same day after the first real sector run — see
*Revision: the publish step was removed* at the end. Nothing here is built yet.

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
#  run the sector prompt. It writes, itself:
#    data/signal-drafts/<id>.json           one file per selected signal
#    data/_finder-rejected-<dim>.jsonl      appended, one line per rejection
#    data/_finder-report-<dim>.md           retrieval report
#  review data/signal-drafts/ ; mv each file into accepted/ or rejected/
npm run signals:promote
```

The generic weekly run is identical minus the sector suffixes, and gains
`npm run signals:collect` before the prompt as it has today.

There is no staging script. The agent writes the drafts where they belong, which
is what makes the folder tree the whole interface between the run and the
reviewer.

### The organising rule

**The ledger is written at the moment a decision is made.**

| Decision | Made by | Recorded by | Ledger status |
|----------|---------|-------------|---------------|
| The finder evaluated and declined it | the model, in the `.jsonl` | `promote` | `rejected` |
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
extracted from the append block inside `cmdReconcile`, so `promote` writes the
ledger through the same key-dedup path rather than reimplementing it. `prepare`
and `reconcile` keep working exactly as they do now, and `scripts/__tests__` must
show that. `keyFor`, `normalizeUrl` and `normalizeText` are already exported.

## What the agent writes

Specified in full in `docs/sector-prompts/sector-prompt-instructions.md`;
summarised here because `promote` depends on it.

- **One file per selected signal** at `data/signal-drafts/<id>.json`, with
  `"status": "draft"`. The agent creates `accepted/` and `rejected/` empty and
  writes nothing into them — those two folders record a human decision.
- **Ids** are `YYYY-MM-DD-NN`, assigned by scanning all four of `index.json`,
  `signal-drafts/`, `accepted/` and `rejected/` for the highest sequence used
  today. All four matter: a sector run and a generic run on the same day both
  reach for `-01`, and drafts are not listed in `index.json`.
- **Rejections** append one line per item to
  `data/_finder-rejected-<dimension-id>.jsonl` — append-only, never truncated —
  carrying `reason`, `rejectedUnder` and `reviewable` alongside `claim` and
  `url`.

### Why rejections carry a reason and a reviewable flag

The first run's rejected list was ten `{claim, url}` pairs with no reason field,
and the agent responded by cramming its justification into the `claim` string
("fieldwork traces to Survation 2021 and predates any AI mechanism"). It wanted
somewhere to put the reason, so the format should give it one.

Reading those reasons showed why it matters: eight of ten were sound calls a
reviewer would endorse, and two were arguable — a 1,154-post qualitative study
rejected for overlapping an already-published signal, and a positive firsthand
account rejected on unverifiable authorship, in a sector whose prompt explicitly
asks for disconfirming positive accounts. Neither was visible without reading the
raw file, and the next run would have overwritten it.

`reviewable: true` is the agent's own flag for a call it thinks is arguable. It
exists so the reviewer reads two items rather than ten. `rejectedUnder` gives a
fixed vocabulary so patterns are countable across runs — if a sector keeps
rejecting under `unverifiable-source`, that is a finding about retrieval, not
about the sector.

## `promote` — go live

`node scripts/promote-signals.mjs`

1. Validate every file in `data/signal-drafts/accepted/`. Any failure → nothing
   moves, exit 1, listing per-file errors.
2. Move each into `public/content/ai-signals/<id>.json`, rewriting `status` to
   `"published"`. **Never overwrite an existing file.** A collision means the
   agent's id scan missed something or a file was hand-edited — abort the whole
   run and name the file rather than clobbering published content.
3. Append one `index.json` entry per item to the end of `items`; bump
   `lastUpdated`.
4. Ledger: promoted items as `published`; everything in `rejected/` and every
   line of `data/_finder-rejected-*.jsonl` as `rejected`. Rejected files and
   lines stay where they are.
5. Run `validate-signals.mjs` last, so a bad promote fails now rather than at the
   next build.

**`promote` is the only schema gate.** With the agent writing drafts directly
there is no script between it and the folder, so step 1 has to be strict: whole
batch or nothing. A partial move would leave `accepted/` half-emptied with no
record of which failures were real, and the reviewer would have to reconstruct
the split by hand.

`promote` **never touches the root queue.** It reports the count as a reminder
and exits 0. An empty `accepted/` and empty `rejected/` is a clean no-op, not an
error.

### Index entries are appended, not sorted

`index.json` order is arbitrary today — neither id-sorted nor date-sorted — and
`ContentStream.tsx:97` sorts client-side on `date` or `detectedAt`. Appending
gives the smallest diff and has no effect on display order.

## Error handling

`promote` is all-or-nothing at the batch level.

`promote` writes signal files **before** `index.json`. A crash between the two
leaves orphan files, which `validate-signals.mjs` catches loudly — *"exists on
disk but is not listed in index.json (invisible to the site)"*. The reverse order
would leave an index entry pointing at nothing, which fails the build with a
missing-file error and is harder to clean up. Failing toward the recoverable
state is deliberate.

Ledger appends are idempotent through the existing `keyFor` dedup, so re-running
`promote` after a partial failure adds nothing twice.

## Testing

`node --test`, two suites alongside the existing six.

- `signal-schema.test.mjs` — every enum, required fields, the array-shape rules,
  the `regulation-standard` / `practitioner-account` conditional requirements.
  Must also assert the extraction changed nothing: the same rules
  `validate-signals.mjs` enforced before.
- `promote.test.mjs` — `accepted/` moves and `rejected/` does not; the root queue
  is untouched and reported; one invalid file in `accepted/` blocks the whole
  batch and moves nothing; a target that already exists in `public/` aborts
  rather than overwriting; `index.json` gains exactly one entry per item;
  `status` is flipped to `published`; `.jsonl` rejection lines reach the ledger;
  a second run is a no-op; an empty run exits 0.

The agent's side — id scanning, draft placement, the rejection format — has no
script to test. It is prompt-specified, so the check is the run itself: the
first run produced five schema-valid items with correctly sequenced,
non-colliding ids, which is the evidence this design rests on. A run that
regresses on that is the signal to reconsider.

## Also in scope

**`.gitignore`** — done ahead of the rest, because a sector run could be launched
before this is built. Sector runs write sector-suffixed filenames, so the three
original exact paths missed `data/_finder-rejected-<dimension-id>.json` entirely.
Note `data/_finder-rejected*` carries **no `.json` suffix** in the pattern: the
rejection store is `.jsonl`, and `data/_finder-rejected*.json` does not match a
name ending in `.jsonl`.

```
data/_candidates*.json
data/_finder-output*.json
data/_finder-rejected*
data/_finder-report*.md
data/signal-drafts/
```

**Documentation.** `docs/ai-signals-pipeline.md` (run order, the file table, a
staging section), `CLAUDE.md` and `AGENTS.md` (commands and the `public/` vs
`data/` boundary).

The prompt side is already done: `docs/sector-prompts/sector-prompt-instructions.md`
carries the draft-writing, id-scanning and rejection format.

## Deliberately not done

- `--dimension` on `collect-candidates.mjs`, and `scripts/lib/radar-sectors.mjs`.
  No longer gated — the first sector run's retrieval report came back
  *"yes, decisively"*, naming the feeds (Reddit JSON sorted by comment count, HN
  Algolia, a curated practitioner blogroll, arXiv `cs.HC`/`cs.SE`, a survey-release
  watchlist). Out of scope **here** only because it is a separate piece of work,
  not because the question is open.
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
- **The agent owns ids, so a bad id scan is a silent overwrite.** If it checks
  only `index.json` and a draft with that id is already queued, it writes over
  it. This is the one place the design depends on the model following an
  instruction, and it is why `promote` refuses to overwrite anything in
  `public/` — that refusal is the backstop.
- **`rm` is not a rejection.** Removing a file from the queue records nothing and
  the item can come back. Move it to `rejected/`.
- **The rejection store is append-only.** A run that truncates
  `_finder-rejected-<dimension-id>.jsonl` destroys every earlier run's reasoning,
  which is exactly what the first version of this pipeline did.
- **Signals are not phenomena.** A good run produces evidence; someone still has
  to write the phenomenon, and `observedReach` is a human judgment no script may
  set. The radar's ten-phenomenon gate is unaffected by any of this.

## Revision: the publish step was removed

The first version of this spec had two scripts. `publish` read a single
`_finder-output-<dimension-id>.json` array, assigned ids, and split it into
per-item draft files; the prompts carried a matching instruction, *"Do not create
individual signal files."*

That was wrong against the original request — *"it would be good that it
automatically adds files in right places in repo"* — and it was justified on a
premise the first run disproved. The argument for script-side ids was that the
pipeline's own principle keeps state in deterministic code rather than model
discipline. But the run assigned five sequential ids with no collision against a
96-entry `index.json` and produced a fully schema-valid payload unprompted. The
splitting step was doing work the agent was already doing correctly, at the cost
of a script, a file format, and an instruction telling the agent not to do the
thing that was wanted.

What survives from that argument is the id-scan requirement — all four
locations, not just `index.json` — which moved into the prompt, and `promote`'s
refusal to overwrite, which is now the backstop rather than a redundancy.

`_finder-output-<dimension-id>.json` is dropped entirely: with per-item drafts on
disk it would be a second copy of the same content, free to drift.
