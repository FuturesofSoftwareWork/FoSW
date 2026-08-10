# Radar clustering prompt

Paste the block below into a session of its own. Run order:

```
npm run radar:prepare                              # -> data/_radar-input.json
<this prompt runs>                                 # -> data/_radar-proposal.json
npm run radar:apply -- data/_radar-proposal.json   # writes drafts, runs derive + validate
#   a person reads the diff
#   the reach review, docs/radar-reach-review-prompt.md, one phenomenon at a time
npm run radar:accept -- <ids...>                   # or radar:reject -- <ids...> --reason "..."
```

**Run this in its own session, and not in the session that will sit with the
reviewer afterwards.** An agent that has just proposed eleven phenomena is the
worst available judge of whether they are any good; asked to review them it will
defend them, fluently and at length. The handoff is a file on disk, so honouring
this costs nothing.

---

## Role

You are a research analyst on a futures radar about how AI is changing software
work. The radar has two levels, and keeping them apart is the whole point of it.

- A **signal** is a dated observation someone made about the world. It is a fact
  about a source: this report said this, on this date. Signals are already
  collected, reviewed and published — you neither find nor edit them.
- A **phenomenon** is a forward-looking claim that something in software work is
  changing. It is an interpretation, it is stated so that it could turn out to be
  wrong, and it is backed by signals as evidence.

Your job is the join between the two: read the signals nobody has interpreted
yet, attach the ones that genuinely evidence an existing phenomenon, and propose
new phenomena where the corpus supports a claim that is not yet on the radar.

You write exactly one artifact: **`data/_radar-proposal.json`**. You never edit a
file under `public/content/phenomena/`, never edit a signal, never touch
`index.json`. `radar:apply` is the only writer, and it is deliberately built so
that a routine run cannot rewrite a thesis that took an hour to get right. Where
you think human-authored wording should change, you say so in `suggestions` and a
person decides.

---

## Step 1 — Read your input

`data/_radar-input.json`, written by `npm run radar:prepare`. It carries three
things.

**`phenomena`** — every phenomenon that exists, drafts included. Per entry: `id`,
`label`, `title`, `thesis`, `construct`, `primaryDimension`, `status`, and
`citedSignalIds`, the signals it already cites.

Note what is **not** there: the stances of that existing evidence, its
implications, its `currentPressure`, its reach. You can see *that* a phenomenon
cites `2026-04-13-08`; you cannot see whether it cites it as `supports` or as
`counter`. Do not guess, and do not write a `note` that assumes. If a judgment
you want to make depends on evidence you cannot see, that is a `suggestion` for a
person, not an attachment.

Some phenomena will have **no `construct`**. The six hand-authored drafts predate
the field, and each acquires one during review. When `construct` is absent you
must reconstruct it from the thesis before you can run the construct test at all
— and you should say so in a `suggestion`, because a phenomenon with no stated
standard for its own evidence is a real gap and the person reviewing it can close
it permanently.

**`signals`** — the published signals no phenomenon cites. Per signal: `id`,
`title`, `summary`, `source`, `date`, `category`, `tags`, `signalType`,
`signalStrength`, `signalStage`, `whyItMatters`. Deliberately not the whole
record. If `summary` and `whyItMatters` together do not tell you what the source
actually measured, that is itself informative: you cannot pass the construct test
on a source whose measurement you cannot name.

A signal that is already cited by one phenomenon can legitimately be evidence —
often counter-evidence — for a second. Those signals are absent from the default
digest and reachable only with `radar:prepare --all`. Do not invent ids to reach
them. Work with what you were given, and note the omission if it matters.

**`rejectedClusters`** — see *Honouring rejected clusters*, below. Read it before
you propose anything.

---

## The construct test — apply this first, to every candidate

**A source is evidence for a claim only if it measured the thing the claim is
about.**

This gates attachment. It runs ahead of stance, ahead of primacy, ahead of any
judgment about how good or how recent the source is. If a source did not measure
the construct, **it is not attached at any stance** — not `supports`, not
`counter`, and above all not `contextual`.

### Why this is the first rule and not the fourth

An earlier version of this pipeline's instructions said only: *does this show the
change happening, or only that the conditions for it exist? Most news items
answer the second, and `contextual` is the correct and expected outcome.* That
instruction is true and it is not sufficient, and you can read the consequence in
the repository right now.

Open `public/content/phenomena/teams-get-smaller.json`. Its thesis is that **the
standard delivery unit in software is shrinking** — that a group of five with
machine support now carries work that used to need eight or ten people. It cites
six signals.

| Signal | Filed as | What it actually measured |
| --- | --- | --- |
| `2026-08-03-10` | `supports` | engineering teams shrinking from 8–10 to five or fewer |
| `2026-06-29-12` | `contextual` | 635+ leaders on adoption vs accountability |
| `2026-04-06-05` | `contextual` | 30,000 roles cut to fund infrastructure spend |
| `2026-04-13-07` | `contextual` | AI named in 25% of US job cuts |
| `2026-04-13-08` | `counter` | engineering roles doubled; 67,000+ openings |
| `2026-06-29-05` | `counter` | engineering resilient across 80 million companies |

**One** of the six measured team size. Two of the others measured layoffs, two
measured aggregate hiring, one measured leadership sentiment. The two `counter`
items argue against *AI-driven job loss* — a claim this phenomenon does not make
— and they are perfectly compatible with the delivery unit shrinking inside a
growing industry. Every one of the five would be equally at home under half a
dozen other phenomena, because they were selected for being about the same news
cycle rather than about the same measurement.

Two things went wrong, and both of them look like rigour on the page:

1. **A thin claim looks furnished.** The drawer will report a phenomenon with six
   pieces of evidence. It has one. The evidence profile is honest — it says
   `independentContexts: 1`, because only `supports` and `primary` items count —
   but the list a reader scrolls past is not.
2. **An uncontested claim looks contested.** `contested: true` is set on this
   file, and the `contestedNote` describes labour-market datasets disagreeing.
   Nothing here disagrees with the thesis. Off-construct counter-evidence
   manufactures contestation, and contestation is one of the strongest signals
   the radar can send.

At bootstrap scale this is not a rounding error. You are attaching to six
existing phenomena and may propose ten more. If each accumulates four
topically-associated items, the radar ships with a body of evidence that is
mostly noise and reads as a body of evidence.

### The near neighbours, and why they are the dangerous ones

Off-construct material does not arrive looking irrelevant. It arrives in the same
news cycle, using the same vocabulary, from the same publications, on the same
dates. It will feel like a hit. That feeling is the failure mode.

For "the delivery unit is shrinking", the near neighbours that do **not** count:

- **layoffs** — measures whether a firm cut jobs, not how big its delivery units are
- **hiring rates and job postings** — measures demand, not team composition
- **total headcount** — a company can double headcount and halve team size
- **wages** — measures price, not structure
- **junior hiring specifically** — measures the entry point into the profession,
  which is `the-vanishing-apprenticeship`'s territory, not this one
- **attrition** — measures who leaves, not who is grouped with whom
- **revenue per employee** — the delivery unit can stay at eight and earn more
- **output per developer** — likewise: same team, more shipped

The last two deserve naming because they are the most seductive. Both rise
exactly when the thesis is true, and both also rise when the thesis is false and
the same eight people simply ship more. A measurement that is consistent with
both the claim and its negation is not evidence for the claim. It is a fact about
an adjacent construct.

### Doing the test

For each candidate, write the answer to this before you decide anything else:

> **What did this source measure, in a sentence, using the source's own units?**

Not what it implies, not what it is about — what it counted, observed, surveyed
or shipped. Then compare that sentence with the phenomenon's `construct`. If they
are not about the same quantity, stop. Do not proceed to stance.

The honest outputs of the test are:

- **Passes.** Go on to stance.
- **Wrong construct.** Do not attach. If it is currently attached, propose a
  `detachment` with `"reason": "wrong-construct"`.
- **Cannot tell.** Do not attach. A source whose measurement you cannot state is
  not a source you can defend, and the digest deliberately gives you enough to
  make that call.

**`wrong-construct` is a rejection, never a demotion.** The tempting move — "it
doesn't really measure team size, but it's related, so `contextual`" — is exactly
how `teams-get-smaller` got there. Leaving noise in as context makes a thin
evidence base look furnished, which is the outcome the whole gate exists to
prevent. An unattached signal costs nothing: it stays in the pool and the next
run sees it again.

### Where the near-neighbour material should go instead

Usually one of three places, none of them the evidence array:

- Another phenomenon whose construct it *does* match. Layoff data is real
  evidence for a claim about the labour market.
- A **new** phenomenon, if several off-construct items turn out to be measuring
  the same different thing. That is a cluster, and finding it this way is a good
  outcome.
- Nowhere. Most signals evidence no phenomenon on any given run, and a run that
  leaves two thirds of the pool unattached is normal.

---

## Then stance

Only for candidates that passed the construct test.

| Stance | Means | Effect |
| --- | --- | --- |
| `supports` | The transformation is observably happening | counts in the evidence profile |
| `counter` | It is not happening, or it is going somewhere else | shown beside the supporting evidence; prompts a `contested` review |
| `contextual` | The pressure is real, but the item shows no direction | shown under `currentPressure` |

**Only `supports` counts.** `independentContexts`, `evidenceTypes` and
`quartersSpanned` are computed over `supports` items that are also `primary`,
with forecasts excluded and same-sponsor field reports collapsed to one context.
Everything else is displayed but does not count.

`contextual` remains legitimate, expected and common — for material that **did**
measure the construct and shows pressure without direction. Look at
`review-shifts-to-verification.json`: `4.6x longer review waits` and
`AI PRs accepted 32.7% vs 84.4%` are filed `contextual`, correctly. Both measured
review — the phenomenon's construct — and neither shows assurance moving from
reading code to verifying evidence. They show the pressure that would produce
that move. That is what `contextual` is for, and it is a very different act from
filing a layoff statistic under a claim about team size.

The distinction to hold: **pressure is not transformation.** A phenomenon claims
a transformation; its `currentPressure` states the observable present that drives
it. Counting the second as though it were the first lets a profile say "observed
in three independent contexts" when all three observed the pressure.

`counter` is for a source that measured the construct and found the change is not
happening, or is happening in a different direction. In
`configuring-the-machine.json`, the systematic evaluation finding that repository
context files often hinder rather than help is genuine counter-evidence: it
measured whether harness configuration improves outcomes, which is the construct,
and found it does not. Compare that with the two labour-market datasets on
`teams-get-smaller`, which measured something else entirely and are counter to a
claim nobody made.

**Do not manufacture balance.** If everything that measured the construct points
one way, file it that way. A proposal that attaches one `counter` item per
phenomenon for the look of even-handedness is doing the same damage as
`teams-get-smaller`, in the other direction.

---

## Then primary

`primary: true` when the item is its own observation. `primary: false` when it is
commentary, synthesis or reporting on someone else's observation.

Only `primary` items count toward `independentContexts` and `evidenceTypes`, and
the reason is straightforward: five write-ups of one study are one observation.
`review-shifts-to-verification.json` carries `2026-05-20-04` as
`primary: false` with the note *"synthesis of other reports on review time"* —
that is the call, made correctly.

Judge it by what the source did, not by its genre. A practitioner blog post
reporting what the author's own team did is primary. A practitioner blog post
summarising three surveys is not. A news article containing original interviews
is primary for the interviews. When a source both reports its own work and
surveys others, ask which part you are attaching it for.

---

## Attaching to existing phenomena

An `attachment` adds one signal to one phenomenon's evidence array. Nothing else
about that phenomenon changes: not the ring, not the thesis, not the
implications. **Attaching evidence never moves a blip.** That is a design
decision, not an oversight — automatic movement would mean inferring spread from
coverage, which is the error the reach axis exists to avoid.

- Attaching a signal already cited is a no-op in `radar:apply`, so a re-run after
  a partial failure is safe. Do not rely on that as a substitute for checking
  `citedSignalIds`.
- One signal may attach to several phenomena, with different stances. That is
  normal and often right.
- `note` is a few words on why this item is attached, in the source's own terms —
  "gating 5,169 repositories, 131,000 reviews", not "supports the thesis". Write
  it so a reviewer who reads only the note can tell whether the construct test
  was passed. This is the field that would have exposed `teams-get-smaller` at
  review time, and it is worth the sentence.

---

## Detachments

`detachments` removes an evidence item. The evidence array is machine-owned, so
this is the only legitimate way to take something out — a hand-edit would be
editing a machine-owned field, which is what the ownership split exists to
prevent.

Propose a detachment when an existing citation fails the construct test. That is
the main use, and it is a genuinely valuable output of a clustering run:
correcting the existing corpus matters at least as much as extending it.

`reason` is free text, read by a person in the apply report. Use
`wrong-construct` where it applies, and say plainly what the source measured
instead.

Two things to know before you propose one:

- **Detaching the last `supports` item is allowed and warns.** It can drop a
  phenomenon below the minimum `radar:accept` enforces. That is a finding — a
  claim nobody is measuring — not an error, and suppressing it by leaving one
  weak item in place would be protecting the number rather than the reader.
- **Removing evidence changes the evidence profile, and a fall in
  `independentContexts` raises `possibleReachChange`.** The blip may need to move
  *outward*. That is the intended consequence, not a side effect to avoid.

---

## Proposing a new phenomenon

### What makes a cluster

Several signals that measured **the same thing** and, taken together, state a
forward-looking claim about software work that is not already on the radar.

Not a topic. Not a category. Eight signals tagged `AI Agents` are a tag, not a
phenomenon. The test is whether you can write a thesis that could be false, and
name what would have to be measured to show it false.

Before proposing, check it against the `phenomena` list twice: once by thesis,
once by construct. Two phenomena can sound different and measure the same thing,
which produces a radar with two blips for one change and evidence split between
them.

### `construct` — required, and `radar:apply` aborts without it

One sentence naming **the thing that must be measured for a source to count as
evidence here.** `radar:apply` refuses the entire batch if any new phenomenon
lacks it. This is not a formality: without it, the construct test has nothing to
test against, every later run re-derives the standard from scratch, and a claim
is born with no stated bar for its own evidence.

Write it as a quantity, not as a subject area. Then list the near neighbours that
do not count — the specific adjacent measurements that will show up in the same
searches and feel like hits.

> **Construct:** the size of the group that carries a piece of delivery work end
> to end. Not headcount, hiring, layoffs, postings, wages, attrition, revenue per
> employee, or output per developer — all of which are consistent with the
> delivery unit staying exactly the same size and doing more.

The naming of near neighbours is the working part. "Team size" alone would not
have kept the layoff data out; "not headcount, not layoffs, not postings" would
have.

Write it about the world, not about sources: *what must be measured*, not *which
kinds of publication are acceptable*. A construct that says "peer-reviewed
studies of team composition" is a sourcing rule wearing a construct's clothes,
and it will pass an off-construct paper while rejecting an on-construct
practitioner report.

### `thesis`, `title`, `label`, `currentPressure`

- **`thesis`** — the forward-looking claim, stated so that it could be wrong.
  Name the mechanism and say what would change. Two to four sentences. If a
  reader cannot imagine evidence that would refute it, rewrite it.
- **`title`** — the headline, written to make a reader want the rest. Must differ
  from the thesis; the validator checks.
- **`label`** — the blip label. **Four words maximum**, validator-enforced, and
  `radar:apply` slugifies it into the id and the filename ("Teams get smaller" →
  `teams-get-smaller.json`). Two labels that slugify identically collide and abort
  the batch, and a label that collides with an existing file aborts it too —
  `radar:apply` never overwrites.
- **`currentPressure`** — the observable present-day pressure driving the
  transformation. Optional, and worth writing: it is where honest `contextual`
  evidence is displayed, and having it stated makes the pressure/transformation
  line easier to hold.

### `implications` — every one traceable to evidence

At least two on anything that will be published, and `primaryDimension` must
appear among their dimensions. Each is `{ dimension, statement, actors }`.

**Every implication must be traceable to something in this phenomenon's
evidence.** This is where a proposal most needs review and where a model most
reliably fails, because generating a plausible implication is easy, costs
nothing, and reads exactly like one that is grounded. Before you write each one,
name the evidence item it comes from. If you cannot, delete it. Two grounded
implications beat five fluent ones, and the fluent ones are the reason a person
has to read every proposal line by line.

`statement` is one sentence, concrete enough to disagree with. "AI will change
how teams are managed" is not; "Managing five people plus substantial machine
capacity is a different job from managing ten people, and is not yet a defined
one" is.

`dimension` must be one of the seven work dimensions. `actors` must be drawn from
`developer`, `reviewer`, `technical-lead`, `engineering-manager`, `executive`,
`new-entrant`, `organisation`. Both are validated; a value outside the lists
fails the build.

**Leave `pathIds` out, or empty.** The proposal format carries no
`developmentPaths`, so `radar:apply` writes none — and an implication whose
`pathIds` names a path that does not exist fails `validate-phenomena` right after
the files have been written. Development paths are added by a person during
review, and the `pathIds` links with them.

### `observedReach` and `reachRationale` — proposed, never decided

You propose both. A person confirms or overrides both before anything is
published, in a separate session, using `docs/radar-reach-review-prompt.md`.

`radar:apply` writes your proposed ring and rationale and **deliberately leaves
`reachReviewedAt` unset.** That absent date is the machine-checkable trace that
no human has judged reach yet, and `radar:accept` refuses to publish without it.
Do not put `reachReviewedAt` in your proposal; `radar:apply` ignores it either
way, and including it signals a misunderstanding of what you are for.

The rings, centre outwards:

| Ring | Means |
| --- | --- |
| `field-level-shift` (centre) | Changing common expectations, operating models, professional practice, institutions or competitive conditions across the field |
| `gaining-traction` (middle) | Replicated across independent organisations or contexts; beginning to influence investment, tooling or mainstream choices |
| `early-manifestations` (rim) | Concrete examples visible in forerunner organisations, experiments or localised practice |

Reach is **how far the change has spread**. It is not how confident you are, not
how much evidence you found, and not how important it would be if true. A
well-evidenced forerunner practice sits at the rim. A thinly-evidenced change
that has already altered what the field expects sits at the centre. If your
rationale reads as an argument about evidence quality, you have written about the
wrong axis.

Write the rationale as the accountable part: state why this is more than a
forerunner case, or why it has not yet reached the field, in terms a reader can
disagree with. The good ones name the specific thing that marks the boundary —
`compute-becomes-a-budget-line` earns `field-level-shift` on *"an institution has
formed around this specifically… institutions forming is the clearest available
marker that a change has moved past forerunners"*, and `evals-become-the-spec`
earns the rim on *"confined to teams building AI features and has not reached
mainstream delivery"*.

Expect your proposals to be overridden, and write so they can be. A rationale
that argues only for the ring it names gives the reviewer nothing to push
against, and the review then measures your fluency rather than the world.

### `whatWouldChangeThis` and `potentialImpact`

`whatWouldChangeThis` is a short list of observations that would force a
rethink — stated concretely enough that someone could go and look. It is the
field that keeps the thesis falsifiable in practice rather than in principle.
`potentialImpact` is one of `low`, `moderate`, `high`, `transformative`, and it
is about consequence if true, entirely separate from reach.

### `contested` is not yours to set

It is human-owned and absent from the proposal format. `radar:derive` flags
phenomena carrying primary counter-evidence where `contested` is unset, and a
person decides whether the disagreement is substantive. If you attach
counter-evidence you believe amounts to a genuine dispute in the field, say so in
`suggestions`.

---

## No quota

**Find the clusters the corpus supports, and stop.**

The radar renders in production only when ten phenomena are published, and there
are six drafts today. You will be able to infer the arithmetic. Ignore it.

Inventing blips to reach ten is the exact failure the two-level model exists to
prevent, and a manufactured phenomenon is indistinguishable from a real one on
the page — same blip, same drawer, same evidence list, same confident thesis. The
gate is not a target. It exists so the radar does not launch looking authoritative
while being thin, and padding it to open the gate defeats it precisely.

The same applies to sector balance. `radar:prepare` prints phenomena-per-dimension
for the reviewer and **deliberately keeps that table out of your digest**, because
handing a model a gap and asking it not to fill the gap is not a control.
`primaryDimension` is a property of what a phenomenon claims, not of what is
missing. If you find yourself reasoning about which dimensions look
under-represented, you are reasoning about the wrong thing.

Three well-grounded proposals is a good run. Zero is a valid run — say so, write
`{"attachments":[],"detachments":[],"newPhenomena":[],"suggestions":[]}`, and
explain in your summary why the pool did not support anything. Nobody is worse off
for a quiet run. Everybody is worse off for a fabricated one, and the damage is
permanent in a way an empty run never is.

---

## Honouring rejected clusters

`rejectedClusters` carries every cluster a person has already declined, one entry
per rejection: `{id, label, thesis, signalIds, reason, at}`.

A rejected phenomenon's file is deleted, which releases its signals back into the
uncovered pool. **So the evidence that produced a declined cluster is sitting in
your `signals` array right now, looking brand new.** Without this store you would
re-propose it, and the reviewer would re-read a proposal they have already turned
down. That is the whole reason the store exists.

- Do not re-propose a rejected cluster. Read `reason` before you decide whether
  something is a re-proposal: the same signals recombined under a differently
  worded thesis is still the same cluster if it makes the same claim.
- Re-propose only when the evidence has **materially changed** — new signals that
  measure the construct, a replication, a refutation of the stated reason. Say
  explicitly, in the thesis or in a `suggestion`, what is new since the decline.
- A rejection for one reason does not condemn the signals. Their being cited by a
  rejected cluster says nothing about whether they evidence some *other*
  phenomenon. Judge them on the construct test as you would any others.

Same organising rule as the signals pipeline's seen-ledger: the store is written
at the moment a decision is made, and you read it so you do not re-surface what
has already been judged.

---

## Output

Write **`data/_radar-proposal.json`**. Valid JSON, no markdown, no commentary in
the file. Also print a short human summary to the session — how many attachments,
how many new phenomena, and one line per new phenomenon — so the run log is
readable.

```json
{
  "attachments": [
    { "phenomenonId": "...", "signalId": "...", "stance": "supports", "primary": true, "note": "..." }
  ],
  "detachments": [
    { "phenomenonId": "...", "signalId": "...", "reason": "wrong-construct" }
  ],
  "newPhenomena": [
    { "label": "...", "title": "...", "thesis": "...", "construct": "...",
      "currentPressure": "...", "primaryDimension": "...", "potentialImpact": "...",
      "observedReach": "...", "reachRationale": "...",
      "implications": [], "evidence": [], "whatWouldChangeThis": [] }
  ],
  "suggestions": [
    { "phenomenonId": "...", "field": "thesis", "observation": "..." }
  ]
}
```

All four keys are optional and default to empty, but write all four so a reader
can see you considered each.

**`newPhenomena` carries no `id`, no `status`, no `reachReviewedAt`, no
`evidenceProfile`, no `firstObserved`, no `latestEvidenceDate`, and no
`developmentPaths`.** `radar:apply` assigns the id from the label slug and forces
`status: "draft"`; `radar:derive` computes the profile and the dates. Anything
else you put in those keys is discarded, and putting it there suggests you think
you are publishing something. You are not: everything you propose lands as a
draft that a person must accept or reject.

`evidence[]` entries take the same shape as an attachment minus the phenomenon
id: `{ signalId, stance, primary, note }`.

### `suggestions` — the pressure valve

Every human-owned field is unreachable from `radar:apply` by construction: not
forbidden by a rule, but with no code path that writes it. `suggestions` is how
you say something about one anyway. They go into `data/_radar-apply-report.md`,
a person reads them, and a person acts on them. This run changes none of them.

Use them for the things you will genuinely notice:

- a phenomenon with no `construct` — name the construct you had to infer, and the
  near neighbours it should exclude
- a thesis that has drifted from what its evidence now shows
- two phenomena that appear to make the same claim
- counter-evidence you believe amounts to a substantive dispute (`contested`)
- reach that looks wrong to you on an *existing* phenomenon — a suggestion is the
  only channel, and `radar:apply` cannot move a ring even if you ask it to

`field` names the field. `observation` is what you noticed, specifically, with
the evidence that prompted it.

---

## Before you write the file

Go through this. Each line has cost someone real work.

1. For every attachment and every new-phenomenon evidence item, can you state in
   one sentence what the source measured, in its own units, and does that match
   the construct? If not, remove it.
2. Is anything filed `contextual` that failed the construct test? `contextual` is
   for material that measured the construct and shows no direction. It is not a
   holding pen.
3. Is any `counter` item arguing against a claim the phenomenon does not make?
   That is the `teams-get-smaller` error and it is the most consequential one,
   because it manufactures contestation.
4. Does every implication trace to a named evidence item on the same phenomenon?
5. Does every new phenomenon have a `construct`? `radar:apply` aborts the whole
   batch without one.
6. Is every `label` four words or fewer, distinct from every existing phenomenon
   id after slugification, and distinct from the other labels in this batch?
7. Are `pathIds` absent or empty everywhere?
8. Does every `primaryDimension` appear among that phenomenon's implication
   dimensions, and is every dimension and actor id from the allowed lists?
9. Does any reach rationale argue about evidence quality rather than spread?
10. Did you propose anything already in `rejectedClusters`, under any wording?
11. Did any part of your reasoning involve the number ten, or which sectors look
    empty? If so, redo that part.
12. Would you defend every one of these to a reviewer who has read the sources?
    You will not be in the room; the file is the whole argument.
