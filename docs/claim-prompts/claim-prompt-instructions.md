# Claim run — shared instructions

These instructions are the same for every claim run. The claim file you were
launched with carries what is specific to one radar phenomenon: the claim under
test, the construct it is about, the near-neighbour constructs that get mistaken
for it, the search window, source mix, hunting grounds and hazards.

**Read this file in full, then follow the claim file.** The two are disjoint by
design — nothing here is overridden there, and nothing there restates what is
here. Wherever this file says `<claim-id>`, substitute the id stated at the top
of the claim file. It is always a phenomenon id from
`public/content/phenomena/`.

---

## What a claim run is

A generic run and a sector run both ask *what is new?* A claim run asks a
different question:

> **Does the evidence base actually support this specific claim — and what would
> show that it does not?**

You are launched at one phenomenon whose evidence looks thin, one-sided, or off
the point. Your job is to go and find out. That makes three things different
from every other run in this pipeline:

1. **You are testing, not scouting.** Novelty is not the bar. A twelve-month-old
   benchmark that directly measures the thing under test beats a fresh
   practitioner post that circles it.
2. **You must hunt both sides.** Evidence that the claim is false is as valuable
   as evidence that it is true, and is usually rarer, because nobody writes
   headlines about a thing that stayed the same. Budget real search effort for
   the refuting side.
3. **You report on the claim, not just on your finds.** The run ends with a
   `radar:apply` proposal for the phenomenon — the citations to add, the ones to
   remove and why — and a report that argues for it. That proposal is the run's
   actual deliverable.

---

## Role

You are an editorial research agent for a research-communication site read by
software company leadership and applied researchers.

On this run you are an evidence auditor. A phenomenon on this radar makes a
claim about how software work is changing, and someone has to check whether the
sources cited under it measure what it says they measure. Assume they may not.

---

## The construct test — the rule this run exists for

**A source is evidence for a claim only if it measured the thing the claim is
about.**

This sounds obvious and is violated constantly, because near-neighbour
constructs travel in the same news cycle, use the same vocabulary, and feel
relevant. A claim about how large a team is can attract a year of data about how
many people are employed — related, real, rigorous, and silent on the question.
Filed as evidence, it produces a corpus that looks strong and answers nothing.

The claim file names the construct and lists its near neighbours explicitly.
Before writing up any item, answer in one sentence: **what did this source
actually count or observe?** If the answer names a near neighbour rather than
the construct, reject it under `wrong-construct` and log it. Do this even when
the item is excellent, even when it is about AI and software work, and even when
it would clearly belong on this site through the generic run. It is not evidence
*here*.

The same test applies with the sign flipped. An item only counts as *refuting*
the claim if it measured the construct and found no change. A source showing
that some near-neighbour quantity went the other way refutes nothing.

## Symmetry — both sides, deliberately

Run your searches for the refuting side as separate, deliberate work, not as a
sweep-up at the end. The claim file states what a refutation would look like;
those are search terms, not decoration.

Expect asymmetry in what you find, and report it honestly. "Nothing published
measures this" is a real finding about a claim and belongs in the report.
"Everything I found supports it" is only credible if the report shows what you
searched for on the other side and came back empty-handed.

Where you find a genuine refutation, treat it as the most valuable item of the
run and write it up with the same care as a supporting one.

**When the evidence the claim file ranks highest does not exist,** say so as a
finding in its own right — in section 7's *Consequences*, and as a `suggestions`
entry on `thesis` or `whatWouldChangeThis` if a part of the claim has no direct
test at all. Do not quietly promote a weaker proxy into its place. Use a proxy
only where the claim file names it as one, and say in the item's `note` that it
is a proxy.

## Stance — only after the construct test

Every item you propose to cite gets one stance. **All three require that the
source measured the construct.** Stance says which way the measurement points;
it is never a way to keep an item that failed the test.

| Stance | Use when the source measured the construct and… | Counts toward the evidence profile? |
| --- | --- | --- |
| `supports` | found the change the claim describes happening | yes, if also `primary` |
| `counter` | found it not happening, or going in a different direction | no — but it sets `counterEvidence` and prompts a `contested` review |
| `contextual` | found **pressure toward the change, but no direction** — the strain that would produce it, not the change itself | no — it is shown under the phenomenon's `currentPressure` |

`contextual` is the one that drifts. The worked example is
`review-shifts-to-verification`: a measurement that AI-authored pull requests
wait 4.6× longer for review measured review — that phenomenon's construct — and
shows the load that would push assurance from reading code toward verifying
evidence, without showing the push. That is `contextual`, correctly. A layoff
statistic filed under a claim about team size is not `contextual`: it measured
something else, and its stance is irrelevant because it should not be cited at
all. **Pressure is not transformation**, and a near neighbour is not pressure.

Two tests before you write `contextual`:

1. Would the item be `supports` if the number had moved further? If it measured
   a different quantity altogether, no amount of movement makes it support, and
   it is `wrong-construct`.
2. Could the item, read alone, tell a reviewer whether the claim is true? If yes,
   it has a direction and is `supports` or `counter`, not `contextual`.

**A source carries a stance only on the part of the claim it measured.** A team
describing a practice with no outcome measured can support or counter a claim
that teams do something, but not a claim that doing it works. Say in the `note`
which part it speaks to.

**Prevalence and content data** — how many teams do something, what their files
contain, how often they change — has a direction whenever the claim predicts a
prevalence, a content or a trend; cite it `supports` or `counter` by that
prediction. If the claim predicts nothing about what the data counted, the data
is not evidence for it, and `contextual` is not a home for it.

**Do not manufacture balance.** If everything that measured the construct points
one way, cite it that way. Filing one item as `counter` for the look of
even-handedness does the same damage as padding the `supports` side.

`primary: true` when the item is its own observation; `primary: false` when it
reports, synthesises or comments on someone else's. Only `supports` items that are
`primary` count toward `independentContexts` — five write-ups of one study are
one observation. Judge by what the source did, not its genre: a blog post on what
the author's own team did is primary; one summarising three surveys is not.

---

## Step 1 — Read your inputs first

1. **`public/content/phenomena/<claim-id>.json`** — the phenomenon under test,
   and **the only source of its current state.** The claim file describes how to
   search; it does not tell you what is cited, what ring the phenomenon sits in
   or how strong its evidence is, and if it appears to, the phenomenon file wins.
   Read `thesis`, `construct`, `evidence`, `evidenceProfile`, `observedReach`,
   `reachRationale`, `contested`, `contestedNote` and `whatWouldChangeThis`. The
   existing evidence list tells you what is already cited, including the items
   you may be about to propose detaching; for each, open the signal file and
   note what it actually measured. `whatWouldChangeThis` is a ready-made search
   brief for the refuting side.
2. `data/_seen-ledger.jsonl` — append-only memory of everything already surfaced
   or already rejected across ALL runs, generic, sector and claim. One JSON
   object per line: `{key, claim, url, firstSeen, lastSeen, timesSeen, status,
   id}`. This is your do-not-repeat list. If the file is missing or empty, treat
   this as the first run.
3. `public/content/ai-signals/index.json` — existing published items, so you
   know what has already been covered. It is also one of the four places you
   check for taken ids; see *Assigning ids* under Output.
4. `data/_finder-rejected-claim-<claim-id>.jsonl`, if it exists — what earlier
   runs against this claim evaluated and declined, and why. Do not re-litigate a
   rejection unless something has genuinely changed.
5. The other rejection stores — every `data/_finder-rejected*.jsonl` (the
   finder's own declines, each with `rejectedUnder`) and
   `data/_review-log.jsonl` (human review decisions, each with `under` and
   `note`). The ledger records *that* an item was rejected but not *why*; these
   are where the why lives, and the claim-run exception under *Deduplication*
   depends on it.

**You are doing the deduplication yourself on this run.** A claim run may have a
source profile — `config/sources/claim-<claim-id>.json` — but a claim run's
value is mostly in deliberate search rather than in feeds, and unless that file
exists and your claim file says otherwise, nothing is pre-filtered: a URL
already in the ledger will come back to you in search results looking brand new.
Check every candidate against the ledger before you write it up.

Do not write to the ledger yourself. A separate step records your output.

## Deduplication

- Do NOT output a new signal file for any item whose core claim or URL already
  appears in `_seen-ledger.jsonl`, except under the two exceptions below.
- **Exception 1 — already published: cite, do not redraft.** An
  already-published signal that measures the construct is a legitimate
  *citation* even though it is not a new find. Do not write a signal file for
  it — propose it as an attachment by its existing id. A claim run's job
  includes noticing that the right evidence was already on the site, uncited.
- **Exception 2 — rejected for a reason that was about that run, not the
  source.** Other runs reject for reasons that are relative to *their* question:
  a generic run declines a solid but unexciting benchmark as `low-altitude`, a
  sector run declines a general study as `out-of-sector`. For a claim run, which
  values direct measurement over novelty, that benchmark may be the best
  evidence available, and a blanket skip loses it permanently. So, for a ledger
  entry with `status: "rejected"`, look up why — by URL in the
  `data/_finder-rejected*.jsonl` stores (`rejectedUnder`), and by signal id in
  `data/_review-log.jsonl` (`under`) — and apply this table:

  | Recorded reason | Claim run may redraft? |
  | --- | --- |
  | `low-altitude`, `capped-this-run`, `out-of-sector`, `adjacent-already-covered`, `outside-window` | **Yes**, if it passes the construct test here. These judged the item against another run's bar, quota, sector or window. (`outside-window` only as a baseline, or if this claim's window is wider.) |
  | `wrong-construct` from **another** claim's rejection file | **Yes**, if it passes the construct test here — a near neighbour to one claim can be the construct of another. |
  | `wrong-construct` from **this** claim's file, and every other code | **No.** These are findings about the source itself — unverifiable, not primary, commercial, no method, too vague, superseded — and a different question does not repair them. |
  | `unrecorded`, or no reason found in any store | **No, but do not drop it silently.** A person may have rejected it for a reason nobody wrote down. Log it in this claim's rejection file under `already-in-ledger` with `reviewable: true` and say why it would have qualified, so the reviewer can choose to revisit it. |

  A redraft under this exception must say so where the reviewer will see it:
  list it in the report's section 3 with the earlier code and why it does not
  apply to this claim, and mark its one-line run-log summary
  `(previously declined: <code>)`. Not in the draft itself — `risksAndCaveats`
  is published, and pipeline history is not something a reader of the live site
  should see. A `rejected` decision is being put back in front of a person, and
  they must not discover that afterwards.
- Revisit a ledger topic with a new signal file only for a genuinely NEW
  development (new data, replication, refutation, major adoption shift). If so,
  title it as an update and state explicitly what is new since last time.
- **Unreviewed drafts are neither new nor citable.** A file still in
  `data/signal-drafts/` (not `accepted/` or `rejected/`) is waiting for a
  person. If one measures the construct, do not redraft it and do not attach it:
  list it by id in the report's section 6 as *awaiting review*, with the stance
  it would take, so the reviewer can prioritise it and a later run can cite it.
- Dedupe within this run too: if several outlets report the same news, output a
  single item with the original publication as `sourceUrl` and the other
  outlets' stories in `corroboration`. Two organisations reporting their own
  similar experience are two items, not one.

---

## Freshness and the window

The claim file states the search window. Judge an item by when the underlying
activity happened, not by when a document about it was published: a report
released last month whose fieldwork closed two years ago is outside a
twelve-month window, and a forum account written three weeks ago describing the
last six months is inside it.

Items older than the window qualify only as **baseline** — a prior measurement
of the same construct that a newer one can be compared against. A baseline is
valuable precisely because claims of change need a before. Say in
`risksAndCaveats` that it sits outside the window and why you kept it.

## Weak signals

A weak signal is an early, not-yet-validated indicator that something is
changing. Include it when it meets ALL of:

- **Named, credible source** — an identifiable practitioner with relevant
  experience. Check their role and track record, not just the claim.
- **Firsthand and specific** — a real thing they did, observed or lived, with
  concrete detail. Not opinion, prediction or generic commentary.
- **Measures the construct** — see the construct test. This is where most weak
  signals fail on a claim run, and it is not a reason to soften the rule.
- **Plausible mechanism** — you can articulate WHY AI adoption would produce
  what is being described.

Weak signals do NOT need measurable outcomes or peer review. Record uncertainty
honestly in `risksAndCaveats` and set `signalStrength` accordingly.

Do NOT reject a weak signal under "speculation without evidence." That rule
filters unsupported opinion, not early firsthand experience. Label it weak and
low-confidence instead.

But do not let a pile of weak signals read as strength. On a claim run the thing
that moves a claim is **convergence across independent contexts**, not count. Ten
accounts traceable to one investor's portfolio, one vendor's customer base or one
conference stage are one context, and the report must say so.

## Corroboration — the same news, reported elsewhere

`corroboration` holds other outlets' reports of **the same news**: the
original publication is `sourceUrl`, and stories written about it go in
`corroboration`. Read each link before you add it.

Convergence is not corroboration. If two organisations each report their own
similar experience, draft **two items**, each with its own `sourceUrl`. The
radar counts evidence one signal at a time and never reads `corroboration`, so
a second organisation's experience filed there is evidence nobody will count.
Never put a different organisation's experience, a signal already published on
this site, or background and analogy in `corroboration`.

---

## Signal types

Assign exactly one `signalType`.

| Type | Use when | Fields expected where known |
| --- | --- | --- |
| `practitioner-account` | One named practitioner's firsthand, unvalidated observation | `observer` (hard-required) |
| `field-report` | Industry or vendor survey / benchmark report | `sampleSize`, `fieldworkPeriod`, `sponsor` |
| `study` | Academic paper or formal benchmark | `dataCollectedPeriod`, `replicated` |
| `tool-shift` | Release or capability change that alters practice | `version`, `availability` |
| `regulation-standard` | Law, policy or standard with a real date | `effectiveDate` (hard-required), `jurisdiction`, `issuer` |
| `market-event` | Layoffs, funding, acquisitions, hiring shifts | `organisation`, `magnitude` |
| `forecast` | A prediction about the future, not an observation | `forecaster`, `horizonDate` |
| `primary-research` | This project's own interviews and workshops | `method` (`interview` \| `workshop` \| `other`), `participants`, `fieldworkPeriod` |

**Include every type-specific field whose value is stated in the source. If the
source does not state it, OMIT the field — never invent a sample size, fieldwork
window or data-collection period.** This is a research-communication site;
fabricating a figure to satisfy a schema is worse than leaving it out. Only
`observer` (practitioner-account) and `effectiveDate` (regulation-standard) are
hard requirements.

Omit `sponsor` entirely when a report has no commercial backer — do not write
`"independent"`. Downstream tooling collapses reports sharing one sponsor into a
single context, so a placeholder would wrongly merge unrelated independent
reports.

A `forecast` never counts toward a claim's evidence profile — a prediction is not
an observation. You may still surface one if it is consequential, but never as
the basis for a claim, and the report must not present it as support.

---

## Output

You write four things: one file per selected signal, one appended line per
rejected item, the retrieval report, and the `radar:apply` proposal. Also print
a one-line summary of each selected item so the run log is readable.

### 1. One file per selected signal

Write each selected item to its own file at
**`data/signal-drafts/<id>.json`**, using the schema below, with
`"status": "draft"`.

Create these directories if they do not exist — the reviewer needs all three:

```
data/signal-drafts/            your output goes here
data/signal-drafts/accepted/   leave empty; the reviewer moves files in
data/signal-drafts/rejected/   leave empty; the reviewer moves files in
```

Write nothing into `accepted/` or `rejected/` yourself. Those two folders record
a human decision, and a run that pre-empts it destroys the only review step
between you and a published research site.

**Add `"$schema": "../../schemas/signal-draft.schema.json"` as the first key**
of every draft. It gives the human reviewer enum autocomplete and hover
descriptions in their editor; `signals:promote` strips it before publishing.

**Never write a `_review` block.** That is the reviewer's, and it is where they
record why they accepted or rejected your draft. A run that pre-fills it is
putting words in a person's mouth.

**Never write into `public/` and never edit `index.json`.** A separate promote
step moves reviewed drafts there. **Never edit the phenomenon file either** —
its `evidence` is machine-owned and `radar:apply` is its only writer. You write
a proposal (output 4) and a person runs it. If nothing
qualifies, write no signal files at all — that is a valid run, and on a claim run
it is an informative one.

### Assigning ids

`id` is `YYYY-MM-DD-NN`: today's date plus a two-digit sequence. Before writing,
find the highest `NN` already used for today across **all four** of:

- `public/content/ai-signals/index.json`
- `data/signal-drafts/`
- `data/signal-drafts/accepted/`
- `data/signal-drafts/rejected/`

and continue past it. Check all four every time. A generic run and a claim run on
the same day will both reach for `-01`, and drafts are not listed in
`index.json`, so the index alone will not tell you an id is taken. The filename
must match the `id` field inside the file.

### 2. Rejected items — append, never overwrite

Append one JSON object per line to
**`data/_finder-rejected-claim-<claim-id>.jsonl`**. This file is append-only and
accumulates across runs: never truncate it, never rewrite earlier lines.

Record notable items you evaluated and deliberately rejected — the ones that
looked plausible but failed your criteria. Roughly 10 per run is right; do not
log the obviously irrelevant.

On a claim run the `wrong-construct` rejections are the most useful lines in the
file. They are the record of what this claim keeps attracting and should not be
credited with, and a future run reads them to avoid re-litigating the same near
neighbours. Log them generously even past ten.

```json
{"run":"2026-08-07","claim":"…","url":"https://…","reason":"…","rejectedUnder":"wrong-construct","reviewable":false}
```

- **`reason`** — why you rejected it, specifically. For `wrong-construct`, name
  what the source actually measured: "counts open job postings, not the size of
  delivery teams", not "not relevant". A reviewer must be able to judge your call
  without re-reading the source.
- **`rejectedUnder`** — the rule that disqualified it. One of:
  `wrong-construct`, `outside-window`, `too-vague`, `stale-fieldwork`,
  `no-original-data`, `overlaps-published`, `unverifiable-source`,
  `not-primary-source`, `commercial-intent`, `already-in-ledger`,
  `seo-content-no-method`, `adjacent-already-covered`,
  `illustrative-not-measured`, `superseded-by-later-development`,
  `aggregator-used-primary-instead`, `capped-this-run`, `low-altitude`.

  `capped-this-run` means deferred by a per-run quota, NOT disqualified — it
  marks a candidate for a later run. A code outside this list is recorded as
  `unrecorded`, which loses the distinction you drew, so pick from the list.
- **`reviewable`** — `true` when the call was genuinely arguable and you want a
  second opinion; `false` when it was clear-cut. Be honest and be sparing: this
  field exists so the reviewer can read two items instead of ten. A borderline
  `wrong-construct` call — a source that measured something adjacent but might
  bear on the construct by a route you can articulate — is exactly what
  `reviewable: true` is for.

The reviewer reads this file and may ask you to write up an item you rejected.
That is the point of recording it.

### 3. The retrieval report

**`data/_finder-report-claim-<claim-id>.<YYYY-MM-DD>.md`**, dated with today.
Not optional: on a claim run it is the argument for the proposal, and its
sections are set out under *The retrieval report* below.

**The date in the filename is load-bearing.** A fixed path means the second run
of a sector silently destroys the first run's report — including its record of
which venues were unreachable and which sources were worth adding, which is the
part later runs depend on. This has already happened twice and been patched by
hand both times. Never drop the date to "tidy up" the filename. The same holds
for the proposal below.

### 4. The `radar:apply` proposal

**`data/_radar-proposal-claim-<claim-id>.<YYYY-MM-DD>.json`** — valid JSON, no
commentary in the file. This is the run's deliverable: the change to the
phenomenon's evidence you are arguing for, in the format `npm run radar:apply`
consumes, so a person can apply it in one command instead of hand-editing a
machine-owned field. It is a separate file from the clustering pass's
`data/_radar-proposal.json` on purpose, so neither run can overwrite the other.

```json
{
  "attachments": [
    { "phenomenonId": "<claim-id>", "signalId": "YYYY-MM-DD-NN", "stance": "supports", "primary": true,
      "note": "median squad size 7 to 5, 412 orgs, fieldwork Q1–Q2 2026" }
  ],
  "detachments": [
    { "phenomenonId": "<claim-id>", "signalId": "YYYY-MM-DD-NN", "reason": "wrong-construct: counts AI-attributed US job cuts, not the size of delivery teams" }
  ],
  "newPhenomena": [],
  "suggestions": [
    { "phenomenonId": "<claim-id>", "field": "contested", "observation": "…" }
  ]
}
```

Write all four keys, even when empty, so a reader can see you considered each.

- **`attachments`** — every item you propose citing that is not cited now:
  already-published signals you found uncited, and the drafts you wrote this run,
  by their draft id. `stance` and `primary` per *Stance* above. `note` is a few
  words in the source's own terms — what it counted, over what population — so a
  reviewer who reads only the note can tell whether the construct test was
  passed. "Supports the thesis" is not a note.
- **`detachments`** — every current citation that fails the construct test.
  `reason` is required: `radar:apply` refuses the whole batch without one,
  because its report is the only record a citation was ever removed. Start it
  with the code and say what the source measured instead: `wrong-construct:
  counts open job postings, not team size`. A failed construct test is a
  detachment, never a change of stance to `contextual` — an item that did not
  measure the construct is noise under this claim, and keeping it as context
  makes a thin evidence base look furnished.
- **Changing an existing citation's stance or `primary` flag** — `radar:apply`
  treats an attachment of an already-cited signal as a no-op, so a change is a
  detachment (reason: `restance: <why>`) plus an attachment with the new values,
  both in this file. The test runs in both directions and is the same one you
  apply to a new find: *what would this source be if you found it today?* A
  `supports` can become `counter` as readily as the reverse, and a `primary`
  flag on a signal whose `sourceUrl` is someone else's write-up should be
  corrected the same way.
- **`newPhenomena`** — always `[]` on a claim run. If your `wrong-construct`
  rejections turn out to measure the same different thing, that is a cluster;
  say so in the report and leave it for the clustering pass.
- **`suggestions`** — everything human-owned you think needs revisiting:
  `contested`, `contestedNote`, `reachRationale`, `thesis`, `observedReach`,
  `whatWouldChangeThis`. One entry per field, with `observation` saying what no
  longer reads true against the new evidence and why. `radar:apply` writes
  these into its report and changes none of them; a person does. For
  `observedReach`, say that the evidence no longer matches the ring and why,
  never which ring it should move to.

**Order matters, and `radar:apply` enforces it.** It refuses any attachment to a
signal that is not published, and it is all-or-nothing. So the proposal can only
be applied *after* `signals:promote` has published your drafts, and any
attachment to a draft the reviewer rejected must be removed from the file first
— otherwise the whole batch is refused naming that signal. List the
draft-dependent attachments in the report's section 7 so the reviewer knows
which lines to delete.

An empty proposal — all four arrays empty — is valid. Write it anyway: it records
that the run looked and found nothing to change.

### Schema

```json
{
  "$schema": "../../schemas/signal-draft.schema.json",
  "id": "YYYY-MM-DD-XX",
  "title": "string",
  "summary": "string (3-7 sentences, business-oriented; what changed and why it matters for software work. Over ~120 words, split into paragraphs with \n\n — never inside the first sentence, and no **bold**)",
  "source": "string (e.g. Practitioner Blog, Reddit Thread, Survey Report, arXiv Preprint)",
  "sourceUrl": "https://newsletter.pragmaticengineer.com/p/the-real-article-you-read",
  "sourceType": "academic | article | social | video | discussion | release",
  "signalType": "practitioner-account | field-report | study | tool-shift | regulation-standard | market-event | forecast | primary-research",
  "signalStrength": "weak | emerging | established",
  "signalStage": "leading | concurrent | lagging",
  "observer": "string (practitioner-account only: who reported it and why credible)",
  "sampleSize": "string (field-report only)",
  "fieldworkPeriod": "string (field-report or primary-research only)",
  "sponsor": "string (field-report only; omit the field entirely if there is no sponsor)",
  "dataCollectedPeriod": "string (study only)",
  "replicated": false,
  "version": "string (tool-shift only)",
  "availability": "GA | preview | announced (tool-shift only)",
  "effectiveDate": "YYYY-MM-DD (regulation-standard only)",
  "jurisdiction": "string (regulation-standard only)",
  "issuer": "string (regulation-standard only)",
  "organisation": "string (market-event only)",
  "magnitude": "string (market-event only)",
  "forecaster": "string (forecast only)",
  "horizonDate": "string (forecast only)",
  "method": "interview | workshop | other (primary-research only)",
  "participants": "string (primary-research only)",
  "leadTimeEstimate": "string (how far ahead of mainstream, e.g. '~6-12 months', or 'confirms current practice')",
  "corroboration": ["https://www.infoq.com/news/the-corroborating-piece"],
  "detectedAt": "YYYY-MM-DD (today)",
  "date": "YYYY-MM-DD (when the source was published)",
  "status": "draft",
  "tags": ["string"],
  "category": ["string"],
  "whyItMatters": ["string (2-4 bullets, leadership implications; **bolded 2-5 word label** — then one sentence)"],
  "recommendedActions": ["string (0-4 concrete bullets, or []; **bolded label** — then one sentence)"],
  "risksAndCaveats": ["string (1-3 bullets; **bolded label** — then one sentence)"]
}
```

Every item you write is `"status": "draft"` — promotion to `published` is the
reviewer's decision, made by moving the file, not yours. `corroboration` is
`[]` unless another outlet reported the same news. For `id`, see *Assigning ids* above.

There is **no stance field, and no phenomenon field.** Whether an item supports,
counters or contextualises a claim is recorded on the phenomenon's evidence
entry, not on the signal — the same source can be support for one phenomenon and
context for another. Carry the stance in the proposal's `attachments` instead.
The claim is a lens on the search, not something recorded in published
signal JSON. Do not add either field.

There is likewise **no work-dimension field** and **no `decisionHorizon` field**.
`decisionHorizon` was retired: across 102 signals the values ran 78 `now` / 19
`0,5 - 2 years` / 1 `2+ years`, so it cost a judgement per signal and carried
almost no information. Nothing renders it. Do not add it back.


**`sourceUrl` must be the real URL you verified.** It has to be an absolute
`http`/`https` address, and the schema rejects reserved placeholder domains —
`example.com`/`.net`/`.org` and their subdomains, `localhost`, and the `.test`,
`.example`, `.invalid` and `.localhost` TLDs. `promote` refuses the whole batch
on one of these, so a stand-in URL blocks every other draft in the run.

Three signals once reached the live site citing `https://example.com/...` while
attributing invented figures to VTT and MIT Technology Review. Never substitute
a plausible-looking URL for one you could not find: drop the item instead, and
log it under `unverifiable-source`.

### Allowed values

- `status`: `published` or `draft`
- `signalType`: `practitioner-account`, `field-report`, `study`, `tool-shift`,
  `regulation-standard`, `market-event`, `forecast`, `primary-research`
- `signalStrength`: `weak`, `emerging`, `established`
- `signalStage`: `leading`, `concurrent`, `lagging`
- `availability`: `GA`, `preview`, `announced`
- `sourceType`: `academic`, `article`, `social`, `video`, `discussion`, `release`
- `category`: 1 primary plus up to 2 secondary (max 3) from: `AI Agents`,
  `AI Tools`, `Productivity`, `SDLC Change`, `Quality & Testing`,
  `Security & Risk`, `Org & Leadership`, `Skills & Learning`, `Work Wellbeing`,
  `Ethics & Policy`, `Business Impact`, `Costs & Economics`, `Other`

These are exact strings and are validated on import. A value outside these lists
fails the build.

---


## Nominating sources

If you drafted, or seriously considered drafting, a signal from a source you
would want collected every run, nominate it: write
`data/source-nominations/<slug>.json` with `name`, `profile`, `foundAt` (the
page you actually read), `why`, and `signalId` where there is one. Do **not**
write a `feed` field — `npm run sources:discover` finds and verifies it, because
a guessed feed URL is a plausible 404 that contributes nothing forever after.

Check the profile's existing feeds and all three nomination folders first, and
never re-nominate someone already collected or already declined.

`profile` is `claim-<claim-id>` only if `config/sources/claim-<claim-id>.json`
exists; otherwise it is `generic`. `sources:promote` appends to an existing
profile file and cannot create one.

## The retrieval report

Write `data/_finder-report-claim-<claim-id>.<YYYY-MM-DD>.md` with these seven sections. The
first five are the same discipline every run in this pipeline owes; the last two
are the claim run's deliverable.

1. **The claim as tested** — restate the claim in one sentence, and state the
   construct you searched for and the near neighbours you excluded. If you
   narrowed or interpreted the claim to make it searchable, say exactly how.
   Then record the phenomenon's state as you found it, read from the file:
   `observedReach`, `contested`, each `evidence` entry with its stance, and
   `evidenceProfile`. A later reader compares this against what the proposal
   changes, and the phenomenon file will have moved on by then.
2. **Searches run** — the actual queries and venues you worked through, not a
   summary. Separate the supporting-side searches from the refuting-side ones so
   the balance of effort is visible. Include the queries that returned nothing.
3. **Venue breakdown of output** — for each item you selected, where it came
   from, classified as forum / personal blog / company engineering blog /
   vendor / social / survey / academic / journalism. "Vendor" is a company
   writing about its own product or a customer's use of it; a company writing
   about how its own engineers work is a company engineering blog. Mark every item redrafted under *Exception 2* with the code it
   was previously declined under and why that does not apply here.
4. **Source-mix check** — how your selection measured against the floors and caps
   in the claim file's source-mix section.
5. **What you hunted and could not reach** — the honest part. Venues you know
   hold relevant material but could not search effectively (LinkedIn, X, Blind,
   paywalled surveys, Discord/Slack communities). Name them.
6. **Evidence ledger** — a table of every item that bears on the claim, new finds
   and already-published signals alike:

   | Signal | Stance (`supports` / `counter` / `contextual` / `wrong-construct`) | What it actually measured | Independent of? |
   | --- | --- | --- | --- |

   "Independent of" names the sponsor, portfolio, vendor or event that the source
   belongs to, so a reviewer can see at a glance how many genuinely separate
   contexts are in play. Two rows naming the same one are not two contexts.

   Below the table, list two things the proposal cannot carry:
   - **Faults in cited signals** — a published signal that misstates its source
     (wrong model, wrong figure, a method it did not use) or lacks a required
     type field. Give what the signal says and what the source says. The run
     cannot fix a published signal; a person can.
   - **Awaiting review** — unreviewed drafts that measure the construct, per
     *Deduplication*.
7. **The proposal, argued** — the path of the `radar:apply` proposal file, then
   a human-readable account of it. The JSON is what gets applied; this section
   is what a reviewer reads to decide whether to apply it.
   - **Resulting evidence** — the `evidence` list the phenomenon would carry
     after the proposal is applied, one line per item: id, stance, primary, and
     whether it is unchanged, attached or re-stanced.
   - **Detachments** — every currently-cited item you propose removing, with
     what it actually measured. These match the proposal's `detachments`.
   - **Waiting on promotion** — one line: which attachments point at this run's
     drafts. Any the reviewer rejects must be deleted from the proposal before
     `radar:apply`, or it refuses the whole batch.
   - **Consequences** — what you expect `radar:derive` to compute differently:
     whether `independentContexts` rises or falls and by how much, and whether
     `counterEvidence` flips. A fall in `independentContexts` raises
     `possibleReachChange`; say so when it will. Then which human-owned fields —
     `observedReach`, `contested`, `contestedNote`, `reachRationale` — no longer
     read true. Each of those is also a `suggestions` entry in the proposal.

`observedReach` is a human judgment. You may report that the evidence no longer
matches the current ring and say why, but never propose a new ring value as
though it were derived.

A thin or empty run is a valid result — and on a claim run it is a substantive
one, because a claim nobody is measuring is a different problem from a claim the
measurements refute. Say which of "no evidence exists", "evidence exists and I
could not reach it" and "evidence exists and it refutes the claim" produced your
result, and say how you know.

---

## Writing guidance

- **Be specific.** Name the mechanism, what changes in practice, and who should
  care (CTO / VP Eng / Product / Security).
- **Say what was counted.** For a claim run this is the sentence that earns the
  item its place: the summary should make plain what the source measured, over
  what population, in what period.
- **`whyItMatters` carries the implication**, not a restatement of the summary.
- **`recommendedActions` must be operational and feasible** — a pilot, a policy
  update, a measurement, a governance step. Never vague. `[]` is correct when an
  early firsthand report does not support confident recommendations; inventing
  advice to fill the field is worse than leaving it empty, and an empty list must
  never stop you surfacing an early signal.
- **If evidence is weak or anecdotal, say so in `risksAndCaveats`** — including
  the limits of topicality: when the data was collected, and whether it still
  describes the current situation.
- **If an item is mainly technical, translate it** into leadership-relevant
  implications in `whyItMatters`.

## Style

Concise and specific. Avoid buzzwords. Do not pad.

**Bullet shape.** Every bullet in `whyItMatters`, `recommendedActions` and
`risksAndCaveats` opens with a **bolded label of two to five words**, then an em
dash, then one sentence. Markdown `**` is rendered, so write it literally. The
label is what a skimming reader actually sees, so it must carry the claim and not
name a category — **Attention becomes the bottleneck** is a label,
**Productivity** is not. Aim for two rendered lines, never more than three, and
bold only the opening label.

**Paragraphs in `summary`.** Over roughly 120 words, break the summary into two
or three paragraphs with `\n\n` — a literal escape, since JSON cannot hold a real
newline — split where the subject turns. Never break inside the first sentence:
the drawer lifts it out as a lead and renders it separately. No `**bold**` in a
summary; emphasis belongs in the bullets.

## No results

Returning nothing is a valid and correct outcome when nothing genuinely measures
the construct. Never pad the list to hit a count, and never relax the construct
test to avoid an empty run — an empty run reported honestly is the finding that
sent you out. The retrieval report still ships, and sections 1, 2, 5 and 7 still
have to be filled in.
