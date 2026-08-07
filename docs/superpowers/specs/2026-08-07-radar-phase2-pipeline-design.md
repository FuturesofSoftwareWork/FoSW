# Futures radar Phase 2 — bootstrap pipeline design

**Date:** 2026-08-07
**Status:** Designed, nothing built.
**Supersedes, in part:** the Pipeline section of
[`2026-08-04-futures-radar-design.md`](./2026-08-04-futures-radar-design.md).
Divergences are listed under *Where this departs from the 2026-08-04 spec*.

## What this is for

The radar renders in production only when **ten phenomena are published**. Today:

```
validate-phenomena: OK — 6 phenomena valid (0 published, launch gate closed (10 more needed))
  coverage: 37 of 102 published signals map to a phenomenon
```

Six phenomena exist, all `draft`, all hand-authored. Sixty-five published signals
are cited by nothing. Phase 2 is the pipeline that turns that corpus into
reviewed phenomena — and publishing the tenth is what switches the radar on.

Phases were built out of order on purpose: 1 (schema), 3 (UI) and 4 (preview) are
merged and deployed, because none of them needed a pipeline to exist. This is the
last one.

## Scope

**In:** `radar:prepare`, the clustering prompt, `radar:apply`, `radar:derive`,
`radar:accept`, the reach-review prompt, the machine/human field split,
`possibleReachChange`, and the Phase 1 carry-forwards that belong to those.

**Out:** `radar:snapshot`, `editions.json`, and `reachHistory` rendering. The
2026-08-04 spec puts them last and says history "will be thin at launch and gets
genuinely interesting after a year". Building a historical record before there is
any history is work with no reader.

Also out: the blip **label** crowding problem. Labels overlap each other at
eleven phenomena while blips stay cleanly separated. It is the most likely next
visible defect and it is not this phase's.

## Run order

```bash
npm run radar:prepare                              # -> data/_radar-input.json
#   clustering pass, docs/radar-clustering-prompt.md, in its OWN session
#                                                  -> data/_radar-proposal.json
npm run radar:apply -- data/_radar-proposal.json   # writes drafts, index, report; runs derive + validate
#   read the diff
#   reach review, docs/radar-reach-review-prompt.md, one phenomenon at a time
npm run radar:accept -- <ids...>                   # publish, stamp lastReviewed
npm run radar:reject -- <ids...> --reason "..."    # decline, record, release the signals
```

Steps 1, 3 and 5 are deterministic code. Steps 2 and 4 are LLM sessions.
`accept` and `reject` are the two outcomes of a review; a draft touched by
neither is still under consideration. This
follows the principle already in `docs/ai-signals-pipeline.md` — *retrieve
broadly in code, score editorially in the LLM* — with the addition the radar
needs: **numbers are computed in code, meaning is judged by the LLM, ring
placement is judged by a person, and all writes are deterministic.**

The commands can be run by an agent in the session rather than by hand; that
changes nothing about the gates, which are the diff and the reach conversation,
not who types `npm`.

## Components

| File | Role | New? |
|------|------|------|
| `scripts/lib/radar-fields.mjs` | The machine/human field split and `mergeMachineFields()` | new |
| `scripts/radar-prepare.mjs` | Build the digest | new |
| `scripts/radar-apply.mjs` | Apply a proposal — the only writer of machine-owned fields | new |
| `scripts/radar-derive.mjs` | Recompute derived values; raise `possibleReachChange` | new |
| `scripts/radar-accept.mjs` | Publish reviewed drafts, stamp `lastReviewed` | new |
| `scripts/radar-reject.mjs` | Decline a draft, record it, release its signals | new |
| `docs/radar-clustering-prompt.md` | The clustering pass | new |
| `docs/radar-reach-review-prompt.md` | The reach conversation | new |
| `scripts/lib/content.mjs` | `readIndex` / `readItems` / `indexById` | reused |
| `scripts/lib/derive.mjs` | `deriveEvidenceProfile` / `deriveDates` | reused |
| `scripts/lib/phenomenon-schema.mjs` | Enums, `REQUIRED_FIELDS` | edited |
| `scripts/validate-phenomena.mjs` | One relaxation, one new enum check | edited |
| `src/types/phenomenon.ts` | `possibleReachChange` | edited |
| `package.json` | `radar:prepare` / `apply` / `derive` / `accept` / `reject` | edited |
| `.gitignore` | `data/_radar-*` | edited |

`content.mjs` and `derive.mjs` were built in Phase 1 explicitly for this — the
header of `content.mjs` says so — so the pipeline inherits the defensive reads
and the counting rules rather than restating them.

## The digest — what `radar:prepare` selects

**Default: every published signal not cited as evidence by any phenomenon.**
Sixty-five today, and the count moves with every promoted signal — treat it as a
snapshot, not a constant.

The 2026-08-04 spec said `--since <date>`. Staging broke the assumption that
rested on. A signal now sits in `data/signal-drafts/accepted/` until someone runs
`signals:promote`, so its `date` can be weeks older than the run that published
it; a date window silently skips exactly those items, and every miss is
invisible. "Uncovered" has no such failure: a signal stays selected until
something cites it.

It is also not new logic. `validate-phenomena.mjs` already computes the covered
set to report coverage; this lifts it.

- Covered means cited by **any** phenomenon including drafts, so a draft's
  citations are not re-offered while that draft is still under consideration.
  Rejecting the draft releases them — see *Rejecting a proposal*.
- `--all` re-digests everything. A covered signal can legitimately be
  counter-evidence to a second phenomenon, and that is unreachable by default.
- `--since <date>` survives as an extra narrowing filter, not the selector.
- `--out <file>` for the output path, matching `collect-candidates.mjs`.
- Zero selected exits **0** with "nothing to cluster". A quiet week is not an
  error. (Contrast `collect-candidates.mjs`, which exits 1 when every source
  fails — there, an empty pool means collection broke.)

It also carries the rejected clusters from `data/_radar-rejected.jsonl`, so the
model does not re-propose what was already declined. See *Rejecting a proposal*.

Per signal the digest carries `id`, `title`, `summary`, `source`, `date`,
`category`, `tags`, `signalType`, `signalStrength`, `signalStage`,
`whyItMatters`. Per phenomenon: `id`, `label`, `title`, `thesis`,
`primaryDimension`, `status`, and the signal ids it already cites — enough to
attach to it or avoid re-proposing it, and not its full evidence.

### The coverage table goes to the reviewer, not the model

`radar:prepare` prints phenomena-per-dimension to stdout. That table is
**deliberately absent from the digest.**

Two of seven sectors have no phenomenon. `primaryDimension` is a property of what
a phenomenon claims, not of what is missing, so the model does not need the gap to
assign it — and handing a model a gap and asking it not to fill the gap is not a
control. The 2026-08-04 spec is explicit that the bootstrap has no quota:
*"inventing blips to reach a number is the failure the two-level model exists to
prevent."* A phenomenon manufactured to fill a sector reads exactly like a real
one.

The reviewer gets the table because "is the radar lopsided?" is a fair question
and computing it by hand is tedious.

## Reach — the one judgment the pipeline may not make

Distance from the centre is `observedReach`, and it means **how far the change has
spread**, not how confident anyone is or how much evidence exists. It is the whole
radar's meaning.

The flow is the one the 2026-08-04 spec already describes, unchanged:

1. The clustering pass proposes `observedReach` and a rationale.
2. A person confirms or rewrites both before publication.
3. Routine evidence attachment never moves a phenomenon.

What is new here is that steps 1 and 2 were previously separated only by
convention. **Nothing in the repo could tell a confirmed reach from an unconfirmed
one**, so "a person confirms" was an instruction rather than a state.

### The unconfirmed state is an absent `reachReviewedAt`

That field means *when a human last judged reach*. A phenomenon nobody has
reviewed has no such date, so:

- `reachReviewedAt` moves out of `REQUIRED_FIELDS`
  (`scripts/lib/phenomenon-schema.mjs:46`) and becomes a **published-only** check
  in `validate-phenomena.mjs`. A draft may lack it; a published phenomenon may
  not.
- `reachRationale` stays required for everything — the model always writes one,
  and a ring with no stated reason is unreviewable at any status.
- `radar:apply` writes the proposed ring and rationale and **deliberately leaves
  `reachReviewedAt` unset**.
- `radar:accept` refuses any id without it.

The date exists only because a conversation happened. That is the whole
enforcement, and it costs one validator change.

All six existing phenomena carry `reachReviewedAt` already, so nothing migrates.

The rejected alternative was a placeholder string — `observedReach:
"early-manifestations"` with an `UNREVIEWED` marker in the rationale. It works,
but it puts a fabricated review date and a fabricated ring into the file to keep a
required field non-empty, which is the field lying to satisfy a validator.

### The reach conversation, and the anchoring problem

`docs/radar-reach-review-prompt.md` runs at review time. Per unconfirmed
phenomenon it must present:

1. The evidence profile, and what each supporting item actually observed
2. Its proposed ring and rationale
3. **The strongest case for the ring one step in, and the ring one step out**

One phenomenon at a time. No batch confirmation.

Point 3 is the load-bearing one. A model that proposes a ring and a fluent
rationale for it is anchoring the reviewer, and "confirm" is a far lower bar than
"decide" — a reviewer who accepts by not objecting has judged nothing. Forcing the
proposal to argue against itself is the cheapest available counterweight and costs
only prompt text.

This risk was raised explicitly and accepted, on the grounds that drafting the
prose is genuinely what a model is good at and starting a reviewer from a blank
page wastes the model's read of the evidence. The mitigations exist because the
risk is real, not because it was overlooked.

Confirming and overriding are the same act and leave the same trace: the agent
writes the agreed ring and rationale, and stamps `reachReviewedAt`.

### The reach log

Every reach decision appends one line to `data/_radar-reach-log.jsonl`:

```json
{"id":"...","proposedReach":"gaining-traction","finalReach":"early-manifestations","overridden":true,"at":"2026-08-07"}
```

Gitignored, never in `public/`. It answers one question no other artifact can:
**is the review doing work?** A reviewer who accepts every proposal and one who
overrides two in five are indistinguishable afterwards, and the difference decides
whether human reach review is a safeguard or a rubber stamp.

It is also the most useful measurement this project can take for any future
version of the pipeline: if human judgment changes the answer often, that judgment
is the product; if it never does, the design is wrong somewhere.

## Rejecting a proposal

A phenomenon has no rejection path today. The status enum carries `retired`, but
nothing in the validator or the UI treats it specially — it is a vestige.
Declining a proposal therefore means hand-deleting a file *and* its `index.json`
entry, and forgetting the second fails the build with *"referenced by index.json
but missing on disk"* (`scripts/lib/content.mjs:43`).

That gap has a second effect, which is what surfaced it: **a declined draft's
signals stay invisible.** Covered is computed from files on disk, so as long as
the rejected file exists its citations are held out of every future digest.

`npm run radar:reject -- <ids...> --reason "..."`

1. Verify each id exists and is `draft`. **Refuse to reject a published
   phenomenon** — removing something already on the site is `retired`, a
   different act with a different meaning, and out of scope here.
2. Append one line per id to `data/_radar-rejected.jsonl`:
   ```json
   {"id":"...","label":"...","thesis":"...","signalIds":["2026-08-06-01"],"reason":"...","at":"2026-08-07"}
   ```
3. Delete the phenomenon file and its `index.json` entry **together**, so the
   build never observes a half-state.
4. Report which signals returned to the uncovered pool.

Deleting the file is what releases the signals, and it needs no machinery — the
covered set is derived, not stored. Everything else in this command exists for
the second problem.

### Why a store rather than just deleting

Delete-only releases the signals and then re-proposes the same cluster on the next
run, so the reviewer re-reads a proposal they already declined. This is the exact
mistake the signals pipeline made and corrected: its publish design records that
rejection-by-absence *"infers an editorial decision from a file not being there"*,
where an accidental `rm` and a considered decline are indistinguishable.

So `radar:prepare` includes rejected clusters in the digest as *previously
rejected — do not re-propose unless the evidence has materially changed*, and the
clustering prompt carries a section on honouring it. Same organising rule as the
seen-ledger: **the store is written at the moment a decision is made**, and the
model reads it so it does not re-surface what was already judged.

Keeping `label` and `thesis`, not just the id, is deliberate. The signal ledger
keeps only a claim and a URL, and the publish design notes that losing the whole
item is the part you regret. For a research project, *"what did we consider and
turn down, and why?"* is a question worth being able to answer — and is arguably a
finding in its own right.

### What this deliberately does not solve

A draft that is neither accepted nor rejected sits there, and its signals stay
invisible. That is correct: an undecided proposal is still under consideration,
and the drafts are the queue. `radar:prepare` reports the undecided count so the
queue cannot rot silently — the same role the root of `data/signal-drafts/` plays
for signals.

## Field ownership — structural, not validated

Once a phenomenon exists, its wording is research output. A routine run attaching
one signal must not be able to rewrite a thesis that took an hour to get right.

| Machine-owned — `apply` may write | Human-owned — unreachable from `apply` |
| --- | --- |
| `evidence[]` | `label`, `title`, `thesis`, `currentPressure` |
| `evidenceProfile` | `observedReach`, `reachRationale`, `reachReviewedAt` |
| `firstObserved`, `latestEvidenceDate` | `implications[]`, `developmentPaths[]` |
| `possibleReachChange` | `whatWouldChangeThis`, `related[]` |
| | `primaryDimension`, `potentialImpact` |
| | `contested`, `contestedNote`, `lastReviewed`, `status` |

`scripts/lib/radar-fields.mjs` owns this list and exports
`mergeMachineFields(existing, updates)`, which copies the existing phenomenon and
assigns only from the allowlist. **It is the only write path onto an existing
phenomenon**, so touching a human-owned field is not forbidden — there is no code
path that does it.

The 2026-08-04 spec's rule 12 said `apply` writes a field manifest and the
validator fails a run that touched a human-owned field. That is dropped, because
it makes a build-time content validator depend on a gitignored per-run artifact:
absent on every CI build and every clean checkout, so the rule would pass
vacuously nearly always. Structural impossibility plus a unit test asserts the
same property at every moment rather than only when a run artifact happens to be
lying around.

`apply` still emits `data/_radar-apply-report.md` — what changed per phenomenon,
and the model's `suggestions` for human-owned fields. Suggestions are read by a
person and acted on by a person. They never touch a file.

On a **new** phenomenon every field is written once, because there is nothing to
overwrite. `status` is forced to `draft` and `reachReviewedAt` is omitted
regardless of what the proposal says.

### The classification mirror test

`radar-fields.test.mjs` asserts every key of `Phenomenon` is classified as exactly
one of machine-owned or human-owned. This is the guard that matters: it fails the
day someone adds a field and forgets to classify it, which is precisely how an
ownership rule rots. The pattern already exists — `config.test.mjs:38-44` mirrors
`WORK_DIMENSION_IDS` against `src/config/radarDimensions.ts` the same way.

## `possibleReachChange`

A new field, machine-owned, and the only way the pipeline may speak about reach.

```ts
possibleReachChange?: { reason: string; raisedAt: string; signalIds: string[] } | null;
```

**Deliberately carries no suggested ring.** The 2026-08-04 spec's phrasing invited
one; a script naming a target ring, even as a suggestion, is closer to deciding
reach than this design should get. It says *look at this again*, and names what
prompted it.

Rule: `radar:derive` computes the evidence profile twice — once over all evidence,
once over evidence whose signal date is on or before `reachReviewedAt` — and
raises `possibleReachChange` only when `independentContexts` increased. Never on
`quartersSpanned` alone: time passing is not spread, and a phenomenon that
accumulates quarters without accumulating contexts is the exact case the reach
axis exists to hold still.

Needs adding in three places, mirrored as the others are: `src/types/phenomenon.ts`,
`scripts/lib/phenomenon-schema.mjs`, `scripts/validate-phenomena.mjs`. No UI in
this phase — it surfaces in the derive report.

`contested` needs no new machinery: `evidenceProfile.counterEvidence` is already
computed, so `derive` reports phenomena where it is true and `contested` is not
set, and a person decides. *"Is this disagreement substantive, or one dissenting
voice against ten studies?"* is not a countable question.

## The proposal format

```json
{
  "attachments": [
    { "phenomenonId": "...", "signalId": "...", "stance": "supports", "primary": true, "note": "..." }
  ],
  "newPhenomena": [
    { "label": "...", "title": "...", "thesis": "...", "currentPressure": "...",
      "primaryDimension": "...", "potentialImpact": "...", "observedReach": "...",
      "reachRationale": "...", "implications": [], "evidence": [], "whatWouldChangeThis": [] }
  ],
  "suggestions": [
    { "phenomenonId": "...", "field": "thesis", "observation": "..." }
  ]
}
```

`newPhenomena` carries no `id`, `status`, `reachReviewedAt`, `evidenceProfile`,
`firstObserved` or `latestEvidenceDate`. `apply` assigns the id from a slug of the
label, matching the existing file naming, and `derive` computes the rest.

The clustering prompt must apply the stance test per evidence item: *does this
show the change happening, or only that the conditions for it exist?* Most news
items answer the second, and `contextual` is the correct and expected outcome.
Only `supports` counts in the profile.

It must also author `implications`, and that is where a proposal most needs
review — a model will happily generate a plausible implication no evidence
supports. Every implication should be traceable to something in the phenomenon's
evidence.

### The clustering pass runs in its own session

Not for cost — for contamination. An agent that has just proposed eleven
phenomena is the worst available judge of whether they are any good; asked to
review them it will defend them, fluently. Clustering runs as its own session or
as a subagent returning only `_radar-proposal.json`, so the agent sitting with the
reviewer at the reach conversation reads those proposals cold.

The handoff is already a file on disk, so this costs nothing to honour.

## Error handling

**All three writing scripts are all-or-nothing at the batch level**, matching
`promote-signals.mjs`, which the team has already used.

`radar:apply` aborts and writes nothing when:

- an `attachments[].phenomenonId` does not exist
- a `signalId` does not resolve to a **published** signal
- a new phenomenon's slug collides with an existing file — **never overwrite**,
  the same backstop `promote` applies to `public/content/ai-signals/`
- the proposal is malformed

An attachment already present is a **no-op with a notice**, so re-running after a
partial failure is safe.

`apply` writes phenomenon files **before** `index.json`. A crash between the two
leaves orphan files, which `validate-phenomena.mjs` catches loudly; the reverse
order leaves an index entry pointing at nothing, which fails harder and is messier
to clean up. Failing toward the recoverable state is deliberate — the same choice
`promote` documents.

`apply` then runs `derive` and `validate-phenomena`, so a bad apply fails now
rather than at the next build.

`radar:accept` refuses the whole batch if any named id does not exist, is not
`draft`, lacks `reachReviewedAt`, or fails the published-only editorial minimums
(≥2 implications, ≥1 `supports` evidence, `signalType` present on supporting
signals). Pre-checking those means a refusal instead of a red build — and
`validate` runs first in `npm run build`, so a red build blocks everyone from
building, previewing or deploying anything.

It warns, without refusing, when `reachReviewedAt` predates `latestEvidenceDate`:
reach was judged before the newest evidence arrived.

`radar:reject` refuses the whole batch if any named id does not exist or is not
`draft`, and requires `--reason`. It appends to the store **before** deleting, so
an interrupted run loses a file whose record already exists rather than a decision
with no trace — the same failing-toward-the-recoverable-state choice `apply`
makes. Re-running with an already-rejected id is a no-op.

`radar:derive` is idempotent.

## Testing

`node --test`, five suites beside the eight that exist.

- **`radar-fields.test.mjs`** — the merge cannot write a human-owned field; every
  `Phenomenon` key is classified exactly once.
- **`radar-prepare.test.mjs`** — uncovered selection; `--all`; `--since`; a
  draft's citations count as covered; the coverage table is absent from the
  digest; zero selected exits 0.
- **`radar-apply.test.mjs`** — attachments merge; an existing phenomenon's
  human-owned fields are **byte-identical** after a proposal that tries to change
  them; a new phenomenon gets `draft`, the proposed reach, and no
  `reachReviewedAt`; slug collision aborts; unknown `phenomenonId` aborts;
  unpublished `signalId` aborts; duplicate attachment is a no-op; `index.json`
  gains exactly one entry per new phenomenon.
- **`radar-derive.test.mjs`** — profile and dates match `derive.mjs`;
  `possibleReachChange` raised on new independent contexts, not raised on elapsed
  quarters; idempotent.
- **`radar-accept.test.mjs`** — refuses a missing `reachReviewedAt`; refuses
  failing minimums before writing; stamps `lastReviewed`; all-or-nothing; warns on
  a stale `reachReviewedAt`.
- **`radar-reject.test.mjs`** — file and `index.json` entry are removed together;
  the store line carries label, thesis and signal ids; a published phenomenon is
  refused; a missing `--reason` is refused; the released signals reappear in the
  next `prepare`; re-rejecting is a no-op.

Plus `validate-phenomena.test.mjs` gains: a draft without `reachReviewedAt` is
valid, a published one without it is not.

Then the empirical check: `npm run verify:radar` against a preview build once new
phenomena exist. No harness change. **Take screenshots as well** — that harness
once reported 9/9 while the radar was visibly broken, which is why six of its
fifteen checks exist at all.

## The prototype boundary

This repo is public and stays public. What it publishes is a prototype and a
method; the pipeline's plumbing is ordinary and its editorial judgment is the
part worth having, which is already described in these specs.

If a more sophisticated version is ever built elsewhere — with signal review,
acceptance and reach review in software rather than in `mv`, `git diff` and a
conversation — the thing that ports is the method and the mechanics, not the
content. Keeping that port cheap costs nothing today and is worth stating as a
rule:

- **Mechanics stay domain-free.** Scripts encode the pipeline, not the subject.
- **Vocabulary stays in config.** The seven work dimensions and seven actors are
  specific to software-work futures; nothing else should be.
- **No cross-imports.** The pipeline never imports site code, the site never
  imports pipeline code. The one coupling that exists — the vocabulary mirror at
  `config.test.mjs:38-44` — is the interface, and is deliberate.

Today that rule already holds. A split would be a `git mv` plus publishing the
vocabulary, not a refactor. Keep it that way.

## Where this departs from the 2026-08-04 spec

| Departure | Reason |
| --- | --- |
| `--since` replaced by uncovered-by-default | Draft staging decoupled a signal's date from its publication, so a date window silently skips late-promoted items |
| Rule 12's manifest and validator check dropped | It made a build-time validator depend on a gitignored run artifact; structural impossibility plus a unit test holds at all times |
| `possibleReachChange` carries no suggested ring | A script naming a target ring is closer to deciding reach than this design should get |
| `reachReviewedAt` becomes published-only | It is the record of a human act; requiring it on drafts forces a fabricated date |
| `snapshot`, editions, `reachHistory` deferred | The spec puts them last; there is no history yet to record |
| Coverage table withheld from the model | The spec's own no-quota rule; a gap shown to a model is a gap it may fill |

One **addition** rather than a departure: `radar:reject` and
`data/_radar-rejected.jsonl`. The 2026-08-04 spec has no rejection path for a
proposal at all, which leaves declining one as a hand-edit that can break the
build and silently strands the signals it cited.

Reach authorship is **not** a departure. The 2026-08-04 spec already has the
clustering pass propose `observedReach` and a person confirm or rewrite it. What
is added is a machine-checkable trace that the second step happened.

## Deliberately not done

- **`radar:snapshot`, `editions.json`, `reachHistory` rendering.** Deferred, above.
- **Blip label layout.** Real, visible at eleven phenomena, and not this phase.
- **Any cron or unattended path.** The reach conversation cannot be automated —
  a dialogue with nobody on the other end is a model writing whatever it likes.
- **Automatic ring movement.** Attaching evidence never moves a blip. The payoff
  for running the pipeline is weaker for it, and deliberately so: automatic
  movement infers spread from coverage, which is the error this axis exists to
  avoid.
- **A `workDimensions` field on signals.** The sector stays a run-time lens.
- **Retiring a *published* phenomenon.** `radar:reject` covers drafts only. The
  `retired` status exists in the enum but nothing implements it, and removing
  something already on the site — with deep links pointing at it — is a different
  problem that deserves its own thinking.
- **Retiring `signals:reconcile`.** Out of scope; it still works.

## Things that will bite you

- **`observedReach` is the radar's meaning and no script may set it.** Everything
  structural here exists to hold that line. If a future change makes it
  convenient to compute, the axis has stopped meaning what it says.
- **Signals are not phenomena.** A good clustering run produces candidates;
  someone still has to accept them, and the ten-phenomenon gate is unaffected by
  how many signals exist.
- **`data/` is never published; `public/` is.** Vite copies `public/` into
  `dist`. The digest, the proposal, the reports and the reach log all stay in
  `data/`. **None of them are ignored yet** — the existing rules cover
  `_candidates*`, `_finder-output*`, `_finder-rejected*`, `_finder-report*` and
  `signal-drafts/` only, so `data/_radar-*` has to be added before the first run
  or the proposal and the reach log land in a public repo.
- **A proposal that argues only for itself will be nodded through.** The
  adjacent-ring requirement is not decoration.
- **The clustering agent must not be the reviewing agent.** It will defend its own
  proposals and it will sound reasonable doing it.
- **`prepare` counts a draft's citations as covered**, so an *undecided* draft
  holds its signals out of every digest. `radar:reject` releases them; leaving the
  draft to sit does not. Watch the undecided count `prepare` reports — a queue
  nobody empties looks exactly like a corpus with nothing left in it.
- **`rm` is not a rejection**, for the same reason it is not one on the signals
  side. Deleting a phenomenon by hand releases its signals but records no
  decision, breaks the build if the `index.json` entry is left behind, and lets
  the next clustering run re-propose the cluster you just declined.
