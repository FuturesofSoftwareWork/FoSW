# Pipeline runbook

**Who this is for:** whoever is operating the content pipeline this week. It is
the operator's page — what to type, in what order, what each step decides, and
what to do when one refuses.

For *why* the pipeline is shaped this way, read
[`ai-signals-pipeline.md`](./ai-signals-pipeline.md) and
[the Phase 2 design](./superpowers/specs/2026-08-07-radar-phase2-pipeline-design.md).
This page does not repeat their reasoning.

---

## The one thing to understand first

There are **two pipelines**, not one. They are joined in the middle by a
clustering pass, and each is complete on its own.

```
  STAGE A — signals                        STAGE B — radar
  ────────────────                         ───────────────

  signals:prepare   (memory)             radar:prepare
  signals:collect   (retrieval)                │
        │                                      ▼
        ▼                              clustering pass  (LLM, own session)
  finder run  (LLM)                            │
        │                                      ▼
        ▼                                  radar:apply
  data/signal-drafts/                          │  you: read the diff
        │  you: mv to accepted/ or rejected/   ▼
        ▼                              reach review  (LLM + a person)
  signals:promote                              │
        │                                      ▼
        ▼                                  radar:derive
  public/content/ai-signals/ ──────►           │
   published signals                           ▼
   (live on the site)              radar:accept  /  radar:reject
                                               │
                                               ▼
                                   public/content/phenomena/
                                    published phenomena
                                    (radar renders at 10)
```

A **signal** is a dated observation: this source said this, on this date.
Publishing one puts it on the site and nothing else — the radar learns nothing.

A **phenomenon** is a forward-looking claim that something in software work is
changing, stated so it could turn out to be wrong, backed by signals as
evidence. Stage B is the only thing that creates one.

Running Stage A and never running Stage B is a valid week. The reverse is not:
Stage B can only cluster signals that are already published.

---

## Stage A — publishing signals

### A1. Before the finder runs: memory, then retrieval

Two deterministic steps set up the LLM pass, both **before** it. `prepare` runs
for every kind of run; `collect` runs for the generic run and for any sector or
claim run that has a source profile.

```bash
npm run signals:prepare      # -> data/_seen-ledger.jsonl   (memory)
npm run signals:collect      # -> data/_candidates.json     (retrieval, generic)
npm run signals:collect -- --profile <name>   # -> data/_candidates-<name>.json
```

**`signals:prepare`** (`scripts/ledger.mjs prepare`) rebuilds the seen-ledger
from published history — `index.json` plus the published signal files — merged
with the existing ledger, deduped on a normalised key (protocol, `www.`, query,
hash and trailing slash stripped), with `rejected` records older than 90 days
pruned. The finder prompt is stateless; this file is its memory, and
bootstrapping it from `index.json` means there is no cold-start window where the
back-catalogue leaks back in. `published` records are kept **forever** — that is
why an already-covered study never returns. `rejected` records age out, so
something genuinely newly relevant can come back.

**`signals:collect`** (`scripts/collect-candidates.mjs`) pulls fresh items from
zero-auth feeds, dedupes them against the ledger and published history, keeps
the last N days, and writes the candidate pool the prompt scores. Sources are
tuned in `config/sources/<profile>.json`, not in the script: Hacker News terms,
Dev.to tags, subreddits, GitHub releases, leadership RSS/Atom, Substack archives.

| Flag | Effect |
|------|--------|
| `--profile NAME` | which `config/sources/<name>.json` to collect, default `generic` |
| `--days N` | window; overrides the profile's `windowDays`, which defaults to 10 |
| `--out FILE` | output path; defaults to the profile-derived one |
| `--timeout MS` | per-request timeout, default 15000 |

**Which** sources get collected lives in `config/sources/*.json`, not in the
script. Profiles are standalone — no inheritance — so a sector profile lists
only the venues the generic run cannot reach. The pool path is derived from the
profile name, so a sector run cannot overwrite the generic pool, and an unknown
profile exits 1 rather than quietly collecting the wrong sources.

Two behaviours matter when this runs unattended:

- The pool is **interleaved round-robin by source**, not sorted by score.
  Points, reactions and hearts are not comparable across sources, and a global
  sort buried every feed item beneath Hacker News — the exact bias the
  leadership feeds were added to fix.
- Failures are isolated per request, and a partial run still writes a pool and
  exits 0. **If every source fails it exits 1 and writes nothing.** Whatever
  runs the cron must treat a non-zero exit as *collection broke*, not *no news*
  — an empty pool would be indistinguishable from a quiet week, and the finder
  would silently fall back to web search.

Reddit `403`s every unauthenticated `.json` request from any address — the route
requires OAuth now, so nothing about *where* the run happens changes it — and
GitHub rate-limits at 60/hr unauthenticated. Both are isolated failures, not run
failures. Reddit contributes nothing until a script-type OAuth app is
configured; see *Known source limitations* in
[`ai-signals-pipeline.md`](./ai-signals-pipeline.md).

**A sector or claim run uses `signals:collect` only if a profile exists** for it
at `config/sources/<name>.json`; otherwise it skips straight to web search. Both
always run `signals:prepare`. `worker-experience-identity-and-wellbeing` has a
profile; no claim profile has been written yet.

Even with a profile, a sector run still dedupes by hand: the pool covers feeds
and search APIs only, and everything found by web search — most of a sector
run's value — arrives undeduped.

### A2. Signals arrive as drafts

Every finder run — [generic](./ai-signals-finder-prompt.md),
[sector](./sector-prompts/), [claim](./claim-prompts/) — writes one file per
selected signal to `data/signal-drafts/<id>.json` with `status: "draft"`, and
appends its declines to an append-only `data/_finder-rejected*.jsonl`. None of
them write into `public/` or edit `index.json`. Ids are assigned by scanning
`index.json` plus all three draft folders, because drafts are not in the index
and two runs on the same day both reach for `-01`.

The whole `data/signal-drafts/` tree is gitignored. This repo is public, and a
draft is by definition unreviewed.

> **`signals:reconcile` is not part of any run order.** It belongs to a retired
> contract in which the finder wrote one `data/_finder-output.json` array that
> was published directly. Nothing converts that array into drafts, so items
> written that way never reach `promote` — while `reconcile` records them in the
> ledger as `published`, so no later run re-surfaces them either. If you inherit
> a scheduled job that still ends in `reconcile`, fix the job. The script still
> works and is kept for that older shape only.

### A3. Review is a folder move

```bash
ls data/signal-drafts/          # the unreviewed queue
# read each file, then:
mv data/signal-drafts/<id>.json data/signal-drafts/accepted/
mv data/signal-drafts/<id>.json data/signal-drafts/rejected/
```

The root of `data/signal-drafts/` **is** the queue. Anything still sitting there
is unreviewed, and `signals:promote` will not touch it — so an interrupted
review cannot publish something nobody read.

### A4. Promote

```bash
npm run signals:promote
```

All-or-nothing. In order:

1. Validates every file in `accepted/` against `scripts/lib/signal-schema.mjs`.
   **One bad file and nothing moves at all.**
2. Moves them to `public/content/ai-signals/` as `status: "published"`. It
   refuses to overwrite an existing published file.
3. Appends their entries to `public/content/ai-signals/index.json`.
4. Records every decision in `data/_seen-ledger.jsonl` — `accepted/` as
   `published`, `rejected/` as `rejected`, and every line of every
   `data/_finder-rejected*.jsonl` as `rejected`.

It reports how many drafts are still queued. Step 4 is what stops next week's
run re-surfacing the same story, which is why rejections have to go through
`rejected/` rather than being deleted.

### A5. Ship

```bash
npm run build      # validate runs first, inside build
```

Push. Stage A is done.

**If it was a claim run:** apply the report's proposed evidence block to
`public/content/phenomena/<claim-id>.json` before you run `radar:prepare`. See
[Traps](#traps), first entry.

---

## Stage B — turning signals into phenomena

Five steps: two scripts, an LLM pass, a human conversation, one more script.
Mechanics and rationale are in
[the Phase 2 design](./superpowers/specs/2026-08-07-radar-phase2-pipeline-design.md);
what follows is what an operator has to decide.

### B1. Prepare the digest

```bash
npm run radar:prepare                       # -> data/_radar-input.json
npm run radar:prepare -- --all              # include already-cited signals
```

Selects **every published signal not cited by any phenomenon**, drafts included
— so an undecided draft holds its signals out of every digest until you accept
or reject it. Use `--all` when hunting counter-evidence for a second phenomenon.

It prints two things it deliberately withholds from the model: the
phenomena-per-dimension coverage table, and the count of undecided drafts. Both
are for you. Showing a model an empty sector invites it to fill it.

### B2. The clustering pass — LLM, in its own session

Paste [`radar-clustering-prompt.md`](./radar-clustering-prompt.md) into a
**fresh session**. It reads the digest and writes one file,
`data/_radar-proposal.json`. It edits nothing itself.

> **Run this in a session that will not sit with the reviewer afterwards.** An
> agent that has just proposed eleven phenomena is the worst available judge of
> whether they are any good; asked to review them it will defend them, fluently.
> The handoff is a file on disk, so this costs nothing to honour.

### B3. Apply

```bash
npm run radar:apply -- data/_radar-proposal.json
```

The only writer of a phenomenon's `evidence`. New phenomena arrive as `draft`
with `reachReviewedAt` unset; existing ones are merged through the allowlist in
`scripts/lib/radar-fields.mjs`, so a routine run **structurally cannot** rewrite
a thesis. All-or-nothing, and re-running after a failure is safe.

Two things need you rather than the script:

- **`data/_radar-apply-report.md` carries the model's `suggestions`** for
  human-owned wording. Nothing acts on them. If you don't read them, they are
  lost.
- **Detaching the last `supports` evidence warns and proceeds.** A claim nobody
  is measuring is a finding, not an error — but it is yours to notice.

### B4. Read the diff

```bash
git diff public/content/phenomena/
cat data/_radar-apply-report.md
```

This is a gate, not a formality. Check especially that every `implications`
entry on a proposed phenomenon is traceable to something in its evidence — a
model will happily generate a plausible implication no evidence supports.

### B5. The reach review — LLM, **with a person in the room**

```
paste docs/radar-reach-review-prompt.md, one phenomenon at a time
```

`observedReach` — distance from the centre — means **how far the change has
spread**. Not confidence, not evidence volume, not importance, not desirability.
It is the radar's whole meaning and **no script may set it**.

The prompt must argue against its own proposal — the strongest case for the ring
one step in and one step out. That is load-bearing, not decoration: a fluent
rationale anchors you, and "confirm" is a much lower bar than "decide".

Two things are settled here and nowhere else, and `radar:accept` refuses without
either: **`reachReviewedAt`**, whose absence *is* the "nobody has judged this"
state, and **`construct`** — one sentence naming what a source must measure to
count as evidence for this phenomenon.

Overriding and confirming leave the same trace: the agreed ring, the rationale,
the date, and a line in `data/_radar-reach-log.jsonl` recording which it was.

> **Not the session that produced the proposals**, and **never unattended**. A
> reach conversation with nobody in it is a model writing whatever it likes and
> stamping a date that claims a person decided.

### B6. Re-derive

```bash
npm run radar:derive
```

Recomputes the derived fields and clears the `possibleReachChange` flags you
just resolved. Idempotent.

A raised `possibleReachChange` means a phenomenon's independent-context count
moved since reach was last judged — **in either direction**. A fall is the more
urgent read: stripping off-construct evidence can take a phenomenon from four
contexts to one, and the blip may need to move *outward*. The flag names what
prompted it and never suggests a ring; it stays raised until someone reviews
reach.

### B7. Accept, or reject

```bash
npm run radar:accept -- <id> [<id>...]
npm run radar:reject -- <id> [<id>...] --reason "why"
```

**Accept** publishes and stamps `lastReviewed`. It pre-checks each id against
the real validator, so a bad batch is a refusal rather than a red build — and
because `validate` runs first inside `npm run build`, a red build would block
everyone from building, previewing or deploying anything. The refusals worth
anticipating are a missing `reachReviewedAt` and a missing `construct`; both
mean the reach review has not happened yet.

It **warns without refusing** when reach was judged before the newest evidence
arrived. Your call whether to re-review first.

**Reject is not `rm`.** It records the id, label, thesis, signal ids and your
`--reason` before deleting anything, then reports which signals returned to the
uncovered pool. Deleting by hand instead releases the signals but records no
decision, breaks the build if the `index.json` entry is left behind, and lets the
next clustering run re-propose what you just declined.

A draft touched by neither is **still under consideration**. That is why
`prepare` reports the undecided count — a queue nobody empties looks exactly
like a corpus with nothing left in it.

### B8. Ship

```bash
npm run build
```

The radar renders in production only when **ten phenomena are `published`**.
Below that it is visible in dev and at `/FoSW/preview/` only — see the next
section, which is also how you look at draft phenomena before deciding anything.

---

## Seeing the radar locally

You do **not** need to accept a phenomenon to look at it. Drafts render in dev
and in the preview build, which is the whole point of both.

```bash
npm run dev            # quickest — then open http://localhost:5173/FoSW/
npm run preview:radar  # what the preview deployment will actually serve
```

`preview.bat` at the repo root is `preview:radar`, double-clickable on Windows.
`npm run preview:radar -- --help` documents itself; it builds, serves, runs the
radar checks and stays up until Ctrl+C.

Two things the commands cannot tell you:

- **Which to use.** `dev` is for looking at content and layout. `preview:radar`
  is for anything about how the deployment behaves — the prerendered shell,
  `noindex`, the missing sitemap, the real base path — and is what to trust
  before a release.
- **Screenshot as well as running the harness.** It once reported 9/9 while the
  radar was visibly broken, which is why six of its fifteen checks exist at all.
  It cannot see label collisions the way a person reads them.

Assembling the steps by hand instead — `build:preview`, `vite preview --base`,
`verify:radar` — is where the Windows traps live. See
[When something refuses](#when-something-refuses) if you end up there.

---

## Who decides what

| Decision | Made by | Recorded as |
|---|---|---|
| Is this signal worth publishing? | you, in `mv` | the `accepted/` / `rejected/` folder, then the ledger |
| Does this signal evidence this phenomenon? | clustering LLM, gated by the construct test | an `evidence` entry written by `radar:apply` |
| Should this wording change? | you | a `suggestion` in the apply report; you edit the file |
| How far has this spread? | **you**, in conversation | `observedReach` + `reachReviewedAt` + a reach-log line |
| Does this phenomenon go on the radar? | you | `radar:accept` / `radar:reject` |

Everything a script decides is countable. Everything countable is derived. The
two judgments that are neither — what a phenomenon claims, and how far it has
spread — are the ones no script can reach.

---

## Command reference

| Command | Writes | All-or-nothing? |
|---|---|---|
| `npm run signals:prepare` | `data/_seen-ledger.jsonl` | — |
| `npm run signals:collect [-- --profile NAME]` | `data/_candidates[-NAME].json` | exits 1 if *all* sources fail, or on a bad profile |
| `npm run signals:reconcile -- <out> --rejected <rej>` | the ledger — **retired contract, not in any run order** | — |
| `npm run signals:promote` | `public/content/ai-signals/`, its `index.json`, the ledger | yes |
| `npm run radar:prepare` | `data/_radar-input.json` | — |
| `npm run radar:apply -- <proposal>` | phenomenon files, their `index.json`, `data/_radar-apply-report.md` | yes |
| `npm run radar:derive` | phenomenon files (derived fields only) | idempotent |
| `npm run radar:accept -- <ids>` | phenomenon files, their `index.json` | yes |
| `npm run radar:reject -- <ids> --reason "..."` | `data/_radar-rejected.jsonl`, deletes file + index entry | yes |
| `npm run validate` | nothing | — |
| `npm run build` | `dist/` (runs `validate` first) | — |
| `npm run dev` | nothing — serves at `/FoSW/`, drafts on | — |
| `npm run preview:radar` | `dist/` — builds, serves on 4180, verifies, stays up | `preview.bat` is the same thing |
| `npm run build:preview` | `dist/` based at `/FoSW/preview/`, drafts on | needs `MSYS_NO_PATHCONV=1` in Git Bash |
| `npm run verify:radar <baseUrl>` | nothing — needs a server already running | — |

**`data/` is never published; `public/` is.** Vite copies `public/` into `dist`.
Every working file — the ledger, the digest, the proposal, the reports, the
reach log — stays in `data/`. The seen-ledger and the rejection stores contain
stories the editorial team evaluated and declined; on a VTT / University of
Helsinki research site those are not world-readable.

---

## When something refuses

| Symptom | Cause | Fix |
|---|---|---|
| `signals:collect` exits 1 | every source failed | collection broke — do **not** run the finder on the empty pool |
| `collect: unknown profile 'x'` | no `config/sources/x.json` | it lists what exists; there is deliberately no fallback to `generic` |
| `collect: profile field ... does not match filename` | the `profile` key and the filename disagree | fix one; otherwise the pool path would misreport its origin |
| `collect: ... declares no sources` | every source key in the profile is empty | a profile that collects nothing is a mistake, not a configuration |
| a finder run's items never appear in `data/signal-drafts/` | the job still uses the retired `_finder-output.json` + `reconcile` contract | split the array into per-file drafts, drop the premature ledger lines, and fix the job — see A2 |
| `signals:promote` moves nothing | one file in `accepted/` fails the schema | fix that file; the batch is deliberately atomic |
| `promote` refuses to overwrite | that id is already published | the finder assigns ids by scanning `index.json` plus all three draft folders — a collision means a stale draft |
| `promote` or `validate` refuses on `sourceUrl` | the URL is not an absolute http(s) address, or its host is a reserved placeholder (`example.com`, `localhost`, `.test`, `.invalid`) | find the real source, or reject the draft. Do not invent a URL to clear the check — an unverifiable citation is the thing it exists to stop |
| `radar:prepare` selects nothing | every published signal is cited | expected after a full clustering pass; use `--all` to look for second-phenomenon counter-evidence |
| `radar:apply` aborts | unknown id, unpublished signal, slug collision, or a new phenomenon with no `construct` | fix `_radar-proposal.json`; re-running is safe |
| `radar:accept` refuses "no reachReviewedAt" | the reach review has not happened for that id | run B5. Do not hand-write the date |
| `radar:accept` refuses on `construct` | required on published, absent on the draft | write one during the reach review |
| `radar:accept` warns about a stale reach | reach was judged before the newest evidence | not a blocker; decide whether to re-review first |
| build fails on `evidenceProfile` / `firstObserved` / `latestEvidenceDate` | someone hand-edited a derived field | `npm run radar:derive` |
| build fails "referenced by index.json but missing on disk" | a phenomenon was deleted by hand | that is what `radar:reject` exists to prevent; restore the file or remove the index entry |
| green deploy, stale site | the Pages deployment wedged after `gh-pages` was written | `gh api repos/FuturesofSoftwareWork/FoSW/pages --jq .status`; cancel a wedged deployment |
| no radar in dev | you opened `http://localhost:5173/` — the base is `/FoSW/` | open `http://localhost:5173/FoSW/` |
| 404 from `vite preview --base /FoSW/preview/` | MSYS rewrote the base; the log shows `/Program%20Files/Git/...` | prefix `MSYS_NO_PATHCONV=1` |
| preview build serves unstyled / assets 404 | MSYS rewrote the base at build time — silent, exit code 0 | rebuild with `MSYS_NO_PATHCONV=1`; verify with `grep -o 'src="[^"]*"' dist/index.html` |
| `npm.ps1 cannot be loaded … not digitally signed` | PowerShell execution policy blocks the npm shim | use Git Bash, or call `npm.cmd` directly |
| `Pre-render failed: TimeoutError … [role="dialog"]`, and `dist/index.html` holds Vite's *"public base URL"* error page | a stale server on port 4173 answered the prerenderer. It binds `::1` while the prerenderer binds `0.0.0.0`, so they do not collide — they coexist | `netstat -ano \| grep :4173`, then `taskkill //PID <pid> //F`, and rebuild |
| `verify:radar` fails `exactly N blips render` | the harness hardcodes the count at `verify-radar.mjs:97` | update it when the corpus grows |

---

## Traps

- **A run that ends in `signals:reconcile` loses its signals.** Every prompt in
  `docs/` now writes per-file drafts and ends at `signals:promote`. A job still
  on the old `_finder-output.json` + `reconcile` shape produces items that
  `promote` cannot see and that the ledger has already marked `published`, so
  they are both unpublishable and unfindable again. This happened on 2026-08-10.
  Check what a scheduled job actually runs before trusting an empty
  `signal-drafts/`.
- **A claim run's signals arrive uncovered.** Nothing on a signal records which
  claim it was found for. Apply the proposed evidence block to the phenomenon
  *before* the next `prepare`, or clustering will offer you a new phenomenon
  built from evidence gathered to test an old one. Applying it makes those
  signals covered and they drop out of the digest on their own.
- **An undecided draft phenomenon hides its signals.** Covered is computed from
  files on disk, so a draft nobody has decided on holds its citations out of
  every future digest. A queue nobody empties looks exactly like a corpus with
  nothing left in it. Watch the count `prepare` prints.
- **`rm` is not a rejection** — on either side. It records no decision, and the
  next run re-proposes what you already declined.
- **The clustering agent must not be the reviewing agent.** It will defend its
  own proposals and it will sound reasonable doing it.
- **Off-construct evidence makes a thin claim look furnished and an uncontested
  one look contested.** `teams-get-smaller` is the worked example and it is
  still in the repo. If clustering starts filing near-neighbour material as
  `contextual` rather than rejecting it, the construct gate is not being
  applied.
- **Never run a generic, sector and claim prompt against one another.** They are
  forks, not extensions; a sector prompt's quotas and altitude test *replace*
  the generic one's.
- **Prefix every `--base=/FoSW/preview/` command with `MSYS_NO_PATHCONV=1`** in
  Git Bash — the build *and* `vite preview`. MSYS rewrites the path, and on the
  build it does so silently: exit 0, wrong base. PowerShell also avoids it, but
  a locked-down execution policy blocks `npm.ps1` on some machines here, so Git
  Bash plus the prefix is the reliable route.
- **A green deploy run does not mean the site updated.** It means `gh-pages` was
  written. Publishing is a separate Pages deployment that can wedge afterwards.
