# Radar reach-review prompt

Paste the block below into a session with a person in it. Run order:

```
npm run radar:prepare
#   clustering pass, docs/radar-clustering-prompt.md, in its OWN session
npm run radar:apply -- data/_radar-proposal.json
#   a person reads the diff
<this prompt runs, one phenomenon at a time>       # -> the files, + data/_radar-reach-log.jsonl
npm run radar:derive                               # clears the possibleReachChange flags you resolved
npm run radar:accept -- <ids...>                   # or radar:reject -- <ids...> --reason "..."
```

**This session requires a human on the other end, and it cannot be run
unattended.** A reach conversation with nobody in it is a model writing whatever
it likes and stamping a date that says a person decided. If you find yourself
about to write `reachReviewedAt` without a human having answered, stop: that date
is the only trace in the repository that the judgment happened, and a fabricated
one is worse than an absent one, because an absent one is honest and `radar:accept`
already refuses it.

**Do not run this in the session that produced the proposals.** An agent that
just wrote eleven theses will defend all eleven, fluently. Read them cold.

---

## What reach is

Distance from the centre of the radar is `observedReach`, and it means **how far
the change has spread**. Centre outwards:

| Ring | Means |
| --- | --- |
| `field-level-shift` (centre) | It is changing common expectations, operating models, professional practice, institutions or competitive conditions across the software field. |
| `gaining-traction` (middle) | It is being replicated across independent organisations or contexts, and is beginning to influence investment, tooling or mainstream choices. |
| `early-manifestations` (rim) | Concrete examples are visible in forerunner organisations, experiments or localised practice. |

It is **not** confidence, **not** evidence volume, **not** importance, and
**not** desirability. Those are the four things it gets confused with, and each
confusion has a signature you can catch in a rationale:

- *Confidence.* "Four independent studies confirm this" argues that we are sure,
  which is a fact about our epistemics. Reach is a fact about the world. A
  meticulously evidenced practice at three startups is at the rim.
- *Evidence volume.* Counting sources measures collection effort. A phenomenon
  with two sources can sit at the centre if what those two sources describe is a
  standards body forming. The evidence profile is displayed separately and
  precisely so it does not have to double as a ring.
- *Importance.* That is `potentialImpact`, a separate field. Transformative and
  barely spread is an ordinary combination, and arguably the most interesting one
  a futures radar can show.
- *Desirability.* Reach is agnostic. A widely-spread change nobody wanted is a
  field-level shift.

Field-level shift does **not** require universal adoption. A small number of
organisations can constitute one if they materially change what the field expects,
what vendors build for, or what a role is understood to be.

No script may set this field. Everything structural in the pipeline exists to
hold that line: `radar:apply` writes the clustering pass's *proposal*, leaves
`reachReviewedAt` unset, and `radar:accept` refuses to publish anything without
it. You are the step those refusals are waiting for.

---

## Scope — what to review, and in what order

**Primary: every phenomenon with no `reachReviewedAt`.** That absence means no
human has ever judged its reach. Find them:

```bash
grep -L reachReviewedAt public/content/phenomena/*.json
```

Every phenomenon `radar:apply` created is in this state by construction, and so is
any older draft that predates the field.

**Secondary: any phenomenon carrying `possibleReachChange`.** `radar:derive`
raises it when the count of independent supporting contexts has changed in either
direction since reach was last judged, and it stays up until a human re-reviews.
It names what prompted the second look and deliberately carries no ring. Treat it
as a re-review of an already-judged phenomenon: the current ring is a real prior
decision by a person, not a proposal, so say so before you argue about it.

The downward case matters more than the upward one. A phenomenon that lost
contexts — because a claim run stripped off-construct evidence, say — may need to
move **outward**, and a radar that can only move blips inward is a hype
instrument.

### One at a time. Never a batch.

Present one phenomenon. Wait for the answer. Write the file. Then move to the
next.

Do not summarise five and ask "confirm all?". Do not present a table of proposed
rings with checkboxes. Do not carry forward a rhythm — after three confirmations
in a row the fourth gets confirmed because the previous three were, and that is
the failure this section exists to prevent. A batch confirmation produces the
same `reachReviewedAt` dates as five real decisions and none of the judgment, and
nothing afterwards can tell the two apart.

If the reviewer asks you to speed up and do several at once, say what is lost and
let them decide. It is their call. It is not yours to pre-empt.

---

## What to present, per phenomenon, in this order

The order is load-bearing. Evidence before proposal, proposal before challenge —
so the reviewer meets the world before they meet an argument about it.

### 1. The evidence profile, and what each supporting item actually observed

Start with the derived profile, verbatim:

> Observed in **2 independent contexts** across **2 evidence types** over
> **1 quarter**. Counter-evidence present.

Then, and this is the part that does the work, **list each `supports` item and
say what it observed** — the source's own measurement, in its own units, not a
restatement of the thesis. For `evals-become-the-spec` that reads:

- `2026-08-03-05` — named teams treating eval suites as their primary artifact; an
  "evals engineer" role appearing in job postings
- `2026-04-13-03` — structured pre-change impact analysis cutting agent regressions
  by 70%

Then name the `counter` items and what they measured, and say briefly that the
`contextual` items are pressure rather than direction. Do not hide the counters
in a footnote: whether a change has spread and whether it is disputed are
different questions, and the reviewer needs both.

Two things to check while you write this list, and to say out loud if either
fails:

- **Did each supporting item measure the phenomenon's `construct`?** If a
  phenomenon has no `construct`, say so — it cannot be published without one, and
  a reach judgment made over evidence nobody has construct-checked is a judgment
  about the wrong corpus. `teams-get-smaller` is the live example: six cited
  signals, one of which measures team size, and a reach conversation that took
  the other five at face value would be discussing a claim the evidence never
  addressed.
- **Does the profile describe spread, or repetition?** Three reports from one
  consultancy circuit are one context wearing three coats. The derivation already
  collapses same-sponsor field reports, but it cannot collapse three practitioner
  posts from the same conference hallway.

### 2. The proposed ring and its rationale

State the proposed `observedReach` and quote the proposed `reachRationale` in
full. Say plainly where it came from: the clustering pass proposed it, no human
has judged it, and it is not a default.

If the rationale argues about evidence quality rather than spread, say so here
rather than letting it stand. That is the most common defect and the easiest to
miss, because an argument about evidence quality sounds like exactly the kind of
thing a careful analyst would write.

### 3. The strongest case for the ring one step in, and one step out

Argue both, in good faith, at the same length and with the same conviction you
gave the proposal. Not caveats. Not "one could argue". The strongest version.

For `evals-become-the-spec`, proposed at the rim:

> **The case for `gaining-traction`:** a named role appearing in job postings is
> not one team's practice — it is employers, plural, having independently
> converged enough on the shape of the work to hire for it. Labour markets
> institutionalising a role is a replication signal that ordinarily marks the
> boundary between forerunner and traction, and the second supporting item comes
> from an entirely different context.
>
> **The case against having it on the radar at this ring at all:** both supporting
> items come from teams building AI features, which is the one population where
> eval-driven specification is a natural consequence of the product rather than a
> change in how software is specified. A practice that is universal inside a niche
> and absent outside it may be a property of the niche.

Note what the second half had to become. At the rim there is no ring further out,
and at the centre there is none further in. So:

- **At `early-manifestations`,** the outward case becomes the case that this is
  not yet a phenomenon — a forerunner curiosity, or a property of the population
  it was observed in rather than a change in the field. That is a real and useful
  question, and `radar:reject` is a legitimate answer to it.
- **At `field-level-shift`,** the inward case becomes the case for demotion to
  `gaining-traction`, and it should be pressed hard. The centre is the strongest
  claim this radar makes about anything.

If you genuinely cannot construct a case for an adjacent ring, say that, and say
why — that is a substantive finding about how clear-cut the call is. But say it
only after trying, and be honest with yourself about whether you tried.

### Why this third item exists

Because a proposal that argues only for itself gets nodded through.

The clustering pass wrote a ring and a fluent rationale for it, and fluent
rationales anchor. **Confirming is a far lower bar than deciding**: a reviewer who
accepts by not objecting has judged nothing, and the file afterwards looks
identical to one where they weighed it. Forcing the proposal to argue against
itself is the cheapest available counterweight, and it costs only prompt text.

This risk was raised when the pipeline was designed and accepted deliberately, on
the grounds that drafting the prose is genuinely what a model is good at and that
starting a reviewer from a blank page wastes the model's read of the evidence.
The adjacent-ring requirement exists because the risk is real, not because it was
overlooked. It is not decoration, and skipping it on an "obvious" one is exactly
where it would have earned its keep.

### Then ask, and then stop talking

Ask the reviewer for the ring and wait. Do not restate your preference while
waiting. Do not answer your own question after a pause. If they override, do not
argue the proposal back — ask what they saw that the rationale missed, and write
*that* into the new `reachRationale`. Their reasoning is the output; your
agreement is not.

---

## On confirm or override — the same act, the same trace

Confirming and overriding leave identical traces. Both mean a person judged
reach. There is no "just confirming" path that writes less.

**1. Write the agreed `observedReach` and `reachRationale` into the phenomenon
file.** Even on a confirmation, ask whether the rationale still says what the
reviewer means, and rewrite it in their words if not. The rationale is the
accountable part — it is what a reader disagrees with — and inheriting the
clustering pass's prose unexamined is how an anchor becomes a position.

**2. Stamp `reachReviewedAt` with today's date**, `YYYY-MM-DD`.

**3. Append exactly one line to `data/_radar-reach-log.jsonl`:**

```json
{"id":"...","proposedReach":"gaining-traction","finalReach":"early-manifestations","overridden":true,"at":"2026-08-10"}
```

`proposedReach` is what the clustering pass proposed — or, on a re-review, the
ring that was there when this conversation started. `overridden` is
`finalReach !== proposedReach`. The file is append-only and gitignored: never
truncate it, never rewrite an earlier line.

**Touch nothing else.** Those three fields are the entire output of this
conversation. In particular:

- **Do not clear `possibleReachChange` by hand.** It is machine-owned and it
  clears itself: `radar:derive` drops it once `reachReviewedAt` is on or after
  the `raisedAt` it carries. Run `npm run radar:derive` when you are done and it
  goes. Hand-editing it is editing a machine-owned field, and on the next derive
  run it comes back anyway.
- **Do not edit `evidence`, `evidenceProfile`, `firstObserved` or
  `latestEvidenceDate`.** All derived. The validator fails the build when a
  stored profile disagrees with what its evidence computes, so a hand-edit here
  breaks everyone's build, not just yours.
- **Do not set `status`.** `radar:accept` does that, after this conversation.
- **If the file carries a non-empty `reachHistory`**, the validator requires its
  last entry to match `observedReach`. Changing the ring on such a phenomenon
  means appending a matching history entry in the same edit, or the build fails.
  None of the current phenomena carry one, so this is a trap for later rather
  than today.

Then run `npm run validate:phenomena` before moving on. Catching a typo now is
cheaper than catching it in `radar:accept`'s refusal three phenomena later.

### What the log is for

It answers one question no other artifact can: **is human review doing work?**

A reviewer who accepts every proposal and one who overrides two in five are
otherwise indistinguishable. The phenomenon files look the same afterwards. The
dates look the same. The rationales look equally considered. Only the log
separates a safeguard from a rubber stamp — and this project's whole design rests
on the claim that reach is a human judgment, so whether that judgment ever
changes an answer is not a metric, it is the finding.

If human judgment changes the answer often, that judgment is the product. If it
never does, something in the design is wrong and it is better to know. Either way
the line has to be written honestly, including on the runs where you confirmed
everything.

Do not summarise the log back to the reviewer mid-session, and do not mention a
running override rate. A reviewer who knows they have confirmed four in a row is
a reviewer under pressure to override the fifth, which corrupts the measurement
in the other direction.

---

## Other gaps you will notice, and what to do with them

`radar:accept` refuses to publish a phenomenon that lacks `construct`, has fewer
than two `implications`, or has no `supports` evidence item. Those are separate
gates and this is not the session that fixes them — but you are reading the whole
file, and you will see them.

Name them to the reviewer when you see them, in one line, after the reach
decision is recorded. Do not fold them into the reach conversation: "the evidence
is thin and it also has no construct" is two findings, and mixing them makes the
ring argument sound like an evidence argument, which is the confusion this axis
exists to avoid.

The one worth flagging hardest is a **missing or unconvincing `construct`**,
because reach judged over an unchecked evidence base is reach judged over the
wrong corpus. If it is missing, the reviewer may want to write one on the spot —
that is a fine use of the session, and it is a human-owned field so they are the
right person to do it.

---

## When the answer is "not this one"

A reviewer may conclude the phenomenon should not be on the radar at all. That is
a legitimate outcome of a reach conversation, especially at the rim, where the
question *is this a change or a property of the population we observed it in?*
sits right beside the ring question.

Do not stamp `reachReviewedAt` on something being declined — leave the file
untouched and no log line. `npm run radar:reject -- <id> --reason "..."` records
the decision, releases its signals back to the uncovered pool, and stops the next
clustering run re-proposing it. `--reason` is required, because a decline with no
stated reason is not a decision, and *what did we consider and turn down, and
why?* is a question this project should be able to answer.

`rm` is not a rejection. It releases the signals, records nothing, breaks the
build if the `index.json` entry is left behind, and lets the next run re-propose
the cluster that was just declined.

## When you are done

Report, briefly: how many phenomena you reviewed, how many rings you confirmed,
how many were overridden and in which direction, and which phenomena you left
unreviewed and why. Then run `npm run radar:derive`, and hand back the list of
ids that are ready for `radar:accept` and the ones that are not, with the gate
each is still failing.
