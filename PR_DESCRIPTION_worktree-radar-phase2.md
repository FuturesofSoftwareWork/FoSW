# Futures Radar Phase 2 — the signals → phenomena pipeline

Phase 1 put a radar on the page. It renders six phenomena, and the section is
gated at ten. This branch builds the machinery that turns dated news items into
research claims a person can put on that radar — without letting any of it decide
where a blip sits.

Five scripts, two prompts, two schema fields, an ownership split enforced by a
mirror test, and 82 new tests. No new dependencies, no runtime code paths
touched beyond one type and one drawer guard.

## Why

`teams-get-smaller` is the reason. It cites six signals, of which **one** measures
team size: two layoff `market-event`s filed as `contextual`, two labour-market
datasets filed as `counter` that argue against AI-driven job loss rather than
against the delivery unit shrinking. The phenomenon reads as contested by strong
opposing evidence. It is one investor field report surrounded by material that
never asked the question.

That is what "attach topically related signals" produces at scale. Bootstrapping
from six phenomena to sixteen means every one of them may accumulate
topically-associated noise that makes a thin evidence base look furnished — and
the radar's whole claim is that a blip's ring means observed spread, not coverage
volume.

So the pipeline is built around two rules, and everything structural in it exists
to hold those two lines:

1. **The construct test gates attachment, ahead of every other test.** A source is
   evidence for a claim only if it measured the thing the claim is about. If it
   did not, it is not attached at any stance — `wrong-construct` is a rejection,
   never a demotion to `contextual`.
2. **`observedReach` is a human judgment and no script may set it.** Not compute
   it, not suggest it, not nudge it.

## Run order

```bash
npm run radar:prepare                              # -> data/_radar-input.json
# the clustering prompt runs, in its own session   # -> data/_radar-proposal.json
npm run radar:apply -- data/_radar-proposal.json   # writes drafts + the apply report
# a person reads the diff
# the reach-review prompt runs, with a human on the other end
npm run radar:derive                               # clears the flags that were resolved
npm run radar:accept -- <ids...>                   # or radar:reject -- <ids...> --reason "..."
```

## The five scripts

- **`scripts/radar-prepare.mjs`** (`radar:prepare`) — the clustering digest. Picks
  the uncovered published signals, writes them with the existing phenomena and
  their constructs, and hands the coverage table to the *reviewer*, not the model:
  telling a model which sectors look under-covered is telling it what to find.
- **`scripts/radar-derive.mjs`** (`radar:derive`) — recomputes `evidenceProfile`,
  `firstObserved` and `latestEvidenceDate`, and raises `possibleReachChange` when
  the count of independent supporting contexts has moved in **either** direction.
  It compares against the *stored* profile rather than re-filtering evidence by
  date, because a date filter can only ever see additions — and a claim run that
  strips off-construct evidence produces exactly the decrease that matters most.
- **`scripts/radar-apply.mjs`** (`radar:apply`) — the only writer of evidence.
  All-or-nothing: every record it would write, merged existing ones as well as
  new ones, is built in memory and put through `validate-phenomena`'s own
  `validatePhenomenon` before anything reaches disk.
- **`scripts/radar-accept.mjs`** (`radar:accept`) — the publish gate. Split out of
  apply so `lastReviewed` is honest: apply runs before anyone has looked, so
  stamping it there would claim a review that had not happened, on exactly the
  phenomena where staleness matters most.
- **`scripts/radar-reject.mjs`** (`radar:reject`) — records the decline in an
  append-only store, then removes the file. Deleting the file is what releases the
  signals ("covered" is derived from files on disk, not stored), so the release
  needs no machinery. The store exists for the second problem: without it the next
  clustering run re-proposes the cluster just declined, and rejection-by-absence
  cannot tell a considered decline from an accidental `rm`.

## The two prompts

- **`docs/radar-clustering-prompt.md`** — the clustering pass. Construct test
  first, then stance, then primary. Emits attachments, detachments, new
  phenomena, and *suggestions* for human-owned fields it may not write.
- **`docs/radar-reach-review-prompt.md`** — the reach conversation. It requires a
  human on the other end and cannot be run unattended: a reach dialogue with
  nobody in it is a model writing whatever it likes and stamping a date that says
  a person decided.

## Two schema fields

- **`construct`** — what a source must measure to be evidence for this
  phenomenon. Required on every new phenomenon (`radar:apply` refuses the batch
  without it) and on every published one. It is human-owned precisely because a
  script that could rewrite it could redefine the claim and then satisfy it.
- **`possibleReachChange`** — `{ reason, raisedAt, signalIds }`, and deliberately
  **no ring**. It names what prompted a second look and carries no target, because
  a script naming a target ring is most of the way to deciding reach. The
  validator rejects a `suggested` key outright. It stays up until a human reviews
  reach *after* the date it was raised; clearing it on a quiet run would drop a
  review nobody performed.

## Design decisions worth knowing

**Field ownership is structural, not validated.** `scripts/lib/radar-fields.mjs`
splits every field of `Phenomenon` into `MACHINE_OWNED` and `HUMAN_OWNED`, and
`mergeMachineFields` is the only write path onto a phenomenon that already exists.
Rewriting a thesis is therefore not forbidden but *unreachable* — there is no code
path that does it. Where the model believes human-owned content should change, it
writes a suggestion into the apply report, which a person reads and a person acts
on. `scripts/__tests__/radar-fields.test.mjs` asserts every key of the TypeScript
interface appears in exactly one list, so the day someone adds a field and forgets
to classify it, the suite fails.

**The unconfirmed state is an absent `reachReviewedAt`,** not a boolean. A
phenomenon `radar:apply` created has never had its reach judged by anyone, and
that absence is the only machine-checkable trace of it. `radar:accept` refuses to
publish without the date; nothing else can write it. A draft may omit it — drafts
are visible in preview builds precisely so they can be unfinished.

**`possibleReachChange.signalIds` names what changed, not what survived.** On a
loss the removed ids are already gone from `evidence`, so the surviving ids would
name precisely the items that did *not* move. `radar:apply` knows what it detached
and passes it through; standalone `radar:derive` cannot recover it and falls back
to the current evidence ids. The list may be empty, and empty is meaningful: every
signal that changed is no longer cited.

**Detaching the last `supports` item is allowed, and warns.** It drops the
phenomenon below the minimum `radar:accept` enforces. That is a finding — a claim
nobody is measuring — not an error, and suppressing it by leaving one weak item in
place would be protecting the number rather than the reader. Both `radar:apply`
and `radar:reject` refuse without a stated reason: removing evidence, like
declining a cluster, is a decision, and the report is the only place it is
recorded.

**`data/` is never published; `public/` is.** Vite copies `public/` into `dist`,
so the digest, the proposal, the reports and the reach log all live in `data/`,
`data/_radar-*` is gitignored, and `validate-phenomena` fails the build if a
working file starting with `_` is found under `public/content/phenomena/`.

## Deliberately not in scope

- **`radar:snapshot`, `editions.json`, and `reachHistory` rendering.** Reach
  history is written by hand for now; the edition machinery is a Phase 3 problem
  and would be built against one edition's worth of data.
- **Blip label layout.** Real, visible at eleven phenomena, and not this phase.
- **Automatic ring movement.** Attaching evidence never moves a blip. The payoff
  for running the pipeline is weaker for it, deliberately: automatic movement
  infers spread from coverage, which is the error this axis exists to avoid.
- **Any cron or unattended path.** See the reach conversation, above.
- **Retiring a *published* phenomenon.** `radar:reject` covers drafts only. The
  `retired` status exists in the enum but nothing implements it; removing
  something already on the site, with deep links pointing at it, is a different
  act that deserves its own thinking.
- **A `workDimensions` field on signals.** The sector stays a run-time lens.

## Verification

- `npm test` — 176 passing (94 at branch point).
- `npm run lint` — clean at `--max-warnings 0`.
- `npx tsc --noEmit` — clean.
- `npm run validate` — 102 signals, 6 phenomena valid.
- `git status public/` — clean. No script in this branch has been run against
  real content; every test writes to a temporary fixture root.
