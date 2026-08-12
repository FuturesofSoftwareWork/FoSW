# Source profiles and the review log

**Date:** 2026-08-12
**Status:** design, approved for implementation
**Covers:** making candidate collection sector- and claim-aware, and recording
why a human accepted or rejected a draft.

Two pieces, specified together because they land in the same two files
(`collect-candidates.mjs`, `promote-signals.mjs`) and share one purpose: the
pipeline currently discards what it knows about *where* it looked and *why* a
person decided. The nomination loop that grows a roster automatically is
deliberately **not** in this spec — see [Out of scope](#out-of-scope).

---

## Part A — source profiles

### The problem

`signals:collect` serves the generic run only. Sector and claim runs skip it and
use web search, because the source lists are module-level constants in
`scripts/collect-candidates.mjs` with no way to vary them per run.

That is not a theoretical gap. The worker-experience retrieval report records it
directly:

> there was no candidate collector on this run, so already-seen material came
> back through search looking new

and three of that sector's own named hunting grounds — Reddit, Hacker News and
Blind — were unreachable through general search. The generic run's sources are
all practitioner-technical, which is why every org-design, roles and reskilling
signal has had to come from ad-hoc search, and why the non-SDLC radar sectors
are structurally under-sampled.

### Decision: standalone profiles, no inheritance

A profile is a JSON file listing every source that run collects. There is no
`extends`, no `add`, no merge step. **What you read is what runs.**

Inheritance was considered and rejected for two reasons.

The decisive one is operational: the generic run executes weekly regardless, so
its sources are already collected, already scored, and already in the ledger by
the time a sector run happens. A sector profile that re-listed them would
re-fetch items the generic run had seen days earlier, and `signals:collect`
filters against the ledger before writing the pool — so the inherited half would
be empty by construction. Inheritance would buy duplicate work at the cost of
merge semantics.

The second is that per-key merge is ambiguous in a way a reader cannot resolve
from the file: when a child defines `feeds`, does it replace the parent's or
append to them? Both are defensible. This repo has been bitten repeatedly by
exactly that class of problem — MSYS silently rewriting `--base` to produce a
green build with wrong asset paths, a stale server on 4173 answering the
prerenderer, `signals:reconcile` recording as published what nothing could
publish. Each is an invisible layer between what you wrote and what ran, and the
answer here has consistently been to make the actual behaviour explicit.

The cost accepted is duplication of genuinely shared sources across profiles.
Mitigated below, not eliminated.

**Consequence to state plainly:** a profile that lists no `githubRepos` collects
no GitHub releases. Nothing is inherited, so each profile must be written
deliberately. That is the intent — the generic run's tooling sources are the
bias that under-samples the other sectors.

### Profile schema

`config/sources/<profile>.json`. Committed, human-edited, no generated fields.

```json
{
  "profile": "worker-experience-identity-and-wellbeing",
  "description": "Venues the generic run structurally cannot reach for this sector.",
  "hackerNewsTerms": ["developer burnout", "agent supervision"],
  "devtoTags": ["career"],
  "subreddits": [],
  "githubRepos": [],
  "feeds": [{ "name": "Sean Goedecke", "url": "https://www.seangoedecke.com/rss.xml" }],
  "substacks": [{ "name": "The Pragmatic Engineer", "host": "newsletter.pragmaticengineer.com" }],
  "windowDays": 10
}
```

- Every source key is **optional**; an absent or empty key means that collector
  does not run for this profile. An empty list is not a failure.
- `profile` must equal the filename stem. Checked, because a mismatch makes the
  output path lie about what produced it.
- `windowDays` is optional and defaults to 10. It exists because sources publish
  at very different cadences: Pragmatic Engineer returned nothing on 2026-08-10
  not through any fault but because its newest post was 12 days old against a
  10-day window. A profile built around low-cadence writers needs a wider one.
- `description` is for the human reading the file and is never used by code.
- `subreddits` exists so `generic.json` can hold today's constants verbatim.
  It collects nothing until Reddit OAuth is wired — see Part A's reachability
  table — and a new profile should leave it empty.

`config/sources/generic.json` holds today's constants **verbatim**, so the
generic run's behaviour is unchanged by this work and the change is reviewable
as a pure move.

### CLI

```bash
npm run signals:collect                       # profile: generic  -> data/_candidates.json
npm run signals:collect -- --profile worker-experience-identity-and-wellbeing
                                              #                   -> data/_candidates-<profile>.json
```

- `--profile <name>` resolves `config/sources/<name>.json`.
- The output path is **derived from the profile**, not passed separately, so a
  sector pool can never silently overwrite the generic one. `--out` remains
  supported and overrides the derived path when explicitly given.
- `--days` overrides `windowDays`. Precedence: flag > profile > default 10.
- An unknown profile name is a hard failure listing the available profiles. It
  must not fall back to generic: silently collecting the wrong sources produces
  a plausible pool that answers the wrong question.
- `data/_candidates*.json` is already gitignored by glob, so profile pools are
  covered without touching `.gitignore`.

### What a profile can and cannot reach

Stated in the spec because it sets expectations for whoever writes the next one.

| Venue named by the sector/claim prompts | Collectable |
|---|---|
| Hacker News threads | yes, via `hackerNewsTerms` |
| Personal blogs, Substacks, LeadDev, trade press | yes, via `feeds` / `substacks` |
| Dev.to | yes, via `devtoTags` |
| Reddit | **no** — `.json` routes require OAuth (see `ai-signals-pipeline.md`) |
| LinkedIn, X, Blind | **no** — no zero-auth search |
| DORA / Stack Overflow / JetBrains surveys | no — not feed-shaped |
| arXiv `cs.HC`, `cs.SE` | technically yes, **deliberately excluded** |

arXiv is excluded on purpose. It is already the single largest host in the
corpus at 19 of 102 signals, the finder prompt caps academic items at 2 per run,
and academic work is a lagging indicator here. Adding an arXiv collector would
feed the exact bias the collector exists to correct.

So a sector profile covers roughly half of its prompt's venue list. It is still
worth building, because the half it covers arrives **pre-deduped against the
ledger**, which is the specific failure the worker-experience report named.

The sector and claim prompts must be updated: their "Where to hunt" sections
currently open with *"There is no candidate pool for this run"*, which will be
false. They should say which venues the pool covers and which remain manual.

### Run ordering

Both runs use a window wider than the weekly cadence, so pools overlap by
design; the ledger absorbs it. But **whichever run happens first takes the
item** — `signals:collect` drops anything already in the ledger, and
`signals:promote` writes it. If the generic run lands first, a burnout story
appearing in both pools is scored under generic quotas rather than by the
sector prompt with its distress-selection hazard section.

This spec does not choose the order. It requires the runbook to state that the
order is a decision with consequences, so it is made deliberately.

---

## Part B — review rationale and the review log

### Current state

Three facts, verified 2026-08-12.

1. **A human rejection records no rationale.** `promote-signals.mjs` turns a
   file in `rejected/` into a ledger line carrying `key`, `claim`, `url`,
   `status`. Not who, not when, not why.
2. **The agent's rejections are rich.** The sector and claim prompts require
   `reason` (free text naming the disqualifying fact), `rejectedUnder` (coded),
   and `reviewable` (was the call arguable). All 55 rejection lines sitting in
   `data/` today carry a code, and the reasoning in them is good.
3. **`finderRejections()` discards all three.** It reads those files and copies
   out claim, url and status only. The editorial reasoning the prompts work to
   produce is deleted at the last step.

So this is not a new system. It is retaining one that already exists and letting
the human write into it.

### How a reviewer records rationale

By editing the draft file, which is already open while deciding. No CLI syntax.

```jsonc
// data/signal-drafts/2026-08-10-02.json
{
  "$schema": "../../schemas/signal-draft.schema.json",
  "id": "2026-08-10-02",
  "title": "GhostApproval — symlink flaw in six coding assistants",
  "_review": {
    "under": "commercial-intent",
    "note": "too technically focused security news — the consequence is the exploit, not a policy change",
    "reviewer": "arto"
  }
}
```

Then move the file to `accepted/` or `rejected/` as today.

- **The folder is the decision; `_review` is only the rationale.** `_review`
  carries no `decision` field, so the two can never disagree.
- `_review` is valid on accepted drafts too — "accepted despite thin sourcing
  because…" is worth keeping.
- All three subfields are optional. A bare `mv` keeps working.
- `reviewer` defaults to `git config user.name` when absent, so it never has to
  be typed. An explicit value still wins, which matters the moment more than one
  person reviews on the same checkout. If git has no `user.name` configured the
  field is omitted rather than guessed.
- The `_` prefix follows this repo's existing convention for working data, and
  `promote` **strips `_review` and `$schema`** before writing to
  `public/content/ai-signals/`. Editorial commentary must never reach the live
  site. A test asserts this.

`schemas/signal-draft.schema.json` is committed and gives VS Code enum
autocomplete and hover descriptions on `under` at the moment of writing, without
any editor config — `.vscode/settings.json` is gitignored, so an inline
`$schema` key is the only mechanism that survives a fresh checkout. The finder
prompts are updated to emit the key in every draft.

### The review log

`data/_review-log.jsonl` — append-only, one event per decision, two writers.

```jsonl
{"ts":"2026-08-12T09:14:00Z","id":"2026-08-10-02","decision":"rejected","by":"human","reviewer":"arto","under":"commercial-intent","note":"too technically focused security news…","profile":"generic"}
{"ts":"2026-08-12T09:15:00Z","id":"2026-08-10-05","decision":"accepted","by":"human","reviewer":"arto","note":""}
{"ts":"2026-08-07T00:00:00Z","claim":"Werner Vogels…","url":"https://…","decision":"rejected","by":"finder","under":"too-vague","reviewable":true,"note":"states a principle, gives no team size…"}
```

- `by` distinguishes `human` from `finder`, so agent declines and editorial
  decisions live in one stream without being confused for each other.
- Written by `signals:promote`, which is already the only thing that records
  decisions. No new command.
- **The seen-ledger is unchanged.** It stays a lean dedup index; judgment lives
  here, exactly as `_radar-reach-log.jsonl` sits beside the phenomenon files
  rather than inside them.
- A draft moved with no `_review` is recorded with `under: "unrecorded"`.
  `promote` reports the count and **does not refuse** — refusing would punish a
  reviewer at the end of a session and break the guarantee that an interrupted
  review cannot publish anything. The unrecorded rate is a number to watch.

### Privacy: this file is gitignored

`data/_review-log.jsonl` is added to `.gitignore`.

Free-text editorial judgment about named third parties — vendors, publications,
individual practitioners — must not be world-readable, and this repo is public.
That is the same reasoning already applied to `data/_finder-rejected*`. The
seen-ledger is committed and does name declined stories, but it carries no
reasons; adding candid commentary to a permanent public git history is a
different exposure.

The cost is real and worth naming: the log is local to one machine, so it is not
shared between reviewers and does not survive a lost checkout. **This is the
clearest concrete pressure toward the private-repo/app direction** — a shared
private store is precisely what removes this limitation.

### The learning loop

The next finder run reads `_review-log.jsonl` alongside the seen-ledger: here
are the last N calls the editorial team actually made, and why. Same mechanism
as ledger memory, one more input file, no new machinery.

The coded `under` field makes it countable — several `commercial-intent`
rejections in a row is measurable evidence that the prompt's vendor-discount
rule needs tightening, rather than a feeling.

### Vocabulary alignment

`rejectedUnder` is documented in the sector and claim instructions but the
**generic** finder prompt asks only for free-text `reason`. All three must emit
the same shape or the log is half-coded and cannot be aggregated across run
types. The union, as documented today:

`out-of-sector`, `wrong-construct`, `outside-window`, `too-vague`,
`stale-fieldwork`, `no-original-data`, `overlaps-published`,
`unverifiable-source`, `not-primary-source`, `commercial-intent`,
`already-in-ledger`, plus `unrecorded` (written by code, never by a human).

`low-altitude` is added: it is the generic prompt's single most-used rejection
rule and has no code today.

The enum lives in `scripts/lib/review-schema.mjs`, mirrored into the JSON Schema
and the prompts — one source of truth, following `signal-schema.mjs`.

---

## Data flow

```
config/sources/<profile>.json
        │
        ▼
signals:collect --profile <p>  ──► data/_candidates-<p>.json
        │                              (ledger-deduped)
        ▼
   finder run (LLM)  ──► data/signal-drafts/<id>.json      (may carry $schema)
        │             └─► data/_finder-rejected-<p>.jsonl  (reason, under, reviewable)
        ▼
   you: add "_review", then mv to accepted/ | rejected/
        ▼
signals:promote
   ├─► public/content/ai-signals/   (_review and $schema stripped)
   ├─► data/_seen-ledger.jsonl      (dedup index, unchanged)
   └─► data/_review-log.jsonl       (every decision, human and finder)
```

## Failure handling

| Situation | Behaviour |
|---|---|
| `--profile` names a file that does not exist | fail, list available profiles. Never fall back to generic |
| `profile` field disagrees with filename | fail — the output path would misreport its origin |
| Profile parses but every source key is empty | fail: a profile that collects nothing is a mistake, not a configuration |
| All sources in a profile fail at runtime | exit 1, write nothing — unchanged from today |
| Draft moved with no `_review` | record `under: "unrecorded"`, warn with a count, continue |
| `_review.under` is not in the enum | fail the batch, as any schema violation does |
| `_review` present on an accepted draft | normal; stripped before publish |

## Testing

Following the existing convention — pure logic in `scripts/lib/`, unit-tested
with `node --test`, no network in tests.

**Part A**
- profile loader: valid profile; missing file; filename/`profile` mismatch;
  all-empty profile; `windowDays` default and override; flag-over-profile
  precedence
- output path derivation, including that `--out` overrides it
- a profile omitting a source key runs no collector for it
- `generic.json` deep-equals the constants it replaces — pins the "pure move"
  claim and fails if the extraction drifted

**Part B**
- `_review` and `$schema` are stripped from published output (guards leaking
  editorial commentary to the live site)
- a bare `mv` yields an `unrecorded` event, and promote still succeeds
- an out-of-enum `under` fails the batch and moves nothing
- finder `reason`/`under`/`reviewable` survive into the review log — the
  regression test for the discard bug
- the ledger's shape is unchanged by any of this
- accepted and rejected both produce exactly one event

## Out of scope

- **The nomination loop.** Authors are hand-written in profiles for now. The
  loop that lets a finder run nominate a discovered author gets its own spec,
  written after a profile has run at least once, so it is designed against
  observed behaviour rather than assumption.
- **Reddit OAuth.** Separate, independent piece.
- **The review app.** See below.
- **Run cadence / cron.** Still unresolved and still worth resolving.

## Notes for a future app

Choices made here to keep that option cheap, per the direction discussion:

- `scripts/lib/signal-schema.mjs` and the new `review-schema.mjs` are pure
  functions over plain objects with no filesystem knowledge. An app is a third
  consumer, not a fork.
- A profile is data, not code — a JSON file today is a table row later.
- The review-log event is deliberately the app's core record: `reviewer` is
  filled by auth, `note` is the comment box, `under` is the dropdown, `by`
  separates agent from human. Porting means pointing the writer at a store, not
  redesigning the workflow.
- Every stage still hands off through a named artifact, so one stage can be
  replaced without owning the rest.
