# Claim run — teams get smaller

**Before anything else, read `docs/claim-prompts/claim-prompt-instructions.md`
in full.** It carries the role, the construct test, the input files, the
deduplication rules, the output contract and schema, the retrieval-report format
and the writing guidance — all of which apply to this run unchanged. This file
carries only what is specific to this claim, and adds to those instructions
rather than overriding them.

Claim id: **`teams-get-smaller`**
Phenomenon file: `public/content/phenomena/teams-get-smaller.json`

---

## The claim under test

> The standard delivery unit in software is shrinking. A small group with machine
> support now carries work that previously needed a full team, and the
> consequences run past headcount into how work is coordinated, how careers
> progress, and what a manager is for.

The radar currently rates this `early-manifestations` and `contested`, on the
strength of **one** investor field report describing portfolio teams going from
eight to ten people down to five or fewer. Everything else cited under it
measures employment, not team shape.

This run exists to answer: **is there anything else, in either direction?**

## The construct

**The size and composition of the unit that delivers a piece of software** — how
many people are in the group that owns a service, product area, squad, pod,
stream or feature team, and what mix of roles sits inside it.

Sources measure the construct when they report things like:

- median, mean or typical team size, at a named organisation or across a sample
- squad, pod or stream-aligned team composition, before and after a change
- a reorganisation that states the new team shape — how many teams, of what size
- engineers per service, per product line, or per unit of delivery scope
- span of control: reports per engineering manager, ratio of ICs to managers,
  layers between an engineer and an executive
- the role mix inside a delivery unit — how many specialists, whether QA,
  ops, design or analysis sit in the team or outside it
- staffing levels attached to a project or a piece of work, stated as such
- an explicit team-sizing norm and its revision ("two-pizza", "we cap squads at
  eight", "we now staff these at three")

## Near neighbours — reject these under `wrong-construct`

Every one of these is real, adjacent, and silent on how large a delivery unit is.
They will dominate your search results, because they are what gets written about.

| Near neighbour | Why it is not this construct |
| --- | --- |
| Layoffs and job cuts | Measures how many people an employer stopped employing. Says nothing about the size of the teams the remaining people work in — the same headcount cut is consistent with fewer teams of the same size. |
| Hiring rates, job postings, open roles | Measures demand for labour. A firm can double its postings while halving its squads. |
| Total engineering headcount, workforce share | Measures the denominator, not the unit. |
| Wages, compensation, salary trends | A price, not a structure. |
| Graduate and junior hiring volumes | Measures entry to the profession. It bears on `the-vanishing-apprenticeship`, not on this. |
| Individual productivity, output per developer | Measures throughput. The claim's own competing reading — *same teams, more output* — is exactly this, which is why it cannot settle the question. |
| AI tool adoption rates | Measures the input, and assumes the consequence under test. |
| Attrition, retention, quiet-quitting | Measures flow through the org, not the shape of its units. |
| Company size, revenue per employee | A firm-level ratio. A ten-thousand-person firm can raise revenue per employee without any team changing size. |
| Vendor "pod" and "squad" offerings | Measures what a supplier sells, not how a client's delivery unit is composed. Staff-augmentation and agency firms package a fixed team — "a pod is 3-5 senior engineers plus agents" — and publish it as though it described the industry. It describes a price list. |

**`revenue per employee` and `output per developer` are the two most seductive.**
They are quantitative, they are trending, and they will be offered to you as
proof of exactly this claim. They are not: both are consistent with the delivery
unit staying the same size and doing more, which is a named competing
development path in the phenomenon file.

Reject all of these even when the source itself frames them as evidence about
team size. The framing is the failure mode; your job is to look at what was
counted.

## What would refute the claim

These are search terms, not decoration. Give them their own passes.

- Survey or benchmark data showing **median team size holding steady** through
  2025–2026 while delivery volume rises
- Organisations reporting that they **kept team size and changed the work** —
  the *same teams, more output* path
- Evidence that very small teams are **confined to well-funded startups** and do
  not appear in enterprise or public-sector engineering — the *forerunner only*
  path
- Team sizes **growing** where AI adoption is highest, for example because
  review, verification and integration load rose
- Engineering-org benchmarks reporting **span of control unchanged** or manager
  ratios widening for reasons unrelated to AI

A credible instance of any of these is the most valuable item this run can
return, and belongs in the proposed evidence block as `stance: "counter"`.

---

## Altitude — this claim's failure mode is the announced reorg

**The test: does the source state, or let you compute, how many people are in a
delivery unit — before, after, or both?**

- **Right altitude:** a benchmark reporting median squad size across a stated
  sample; a named engineering leader describing their reorg with the numbers in
  it ("we went from six squads of nine to eleven squads of four"); a survey wave
  that asked about team composition and can be compared to its own prior wave; a
  practitioner describing, with detail, the team they now ship with and the team
  they shipped with a year ago.
- **Wrong altitude:** "AI means smaller teams" think-pieces; a reorg announcement
  with no numbers; a CEO saying the company will "do more with less"; vendor
  content whose evidence is a customer quote; any item where the only number is a
  headcount reduction.

**An announcement is not a practice.** A stated intention to run smaller teams,
a new operating model, or a target team size in a strategy deck is a `forecast`
at best. It does not measure the construct until someone reports what the teams
actually look like. Log these under `wrong-construct` with the reason naming the
gap, or write them up as `forecast` if genuinely consequential — never as
support.

**Count what the source counted.** "Team" is not a standard unit: some sources
mean a scrum team, some a reporting line, some everyone attached to a product.
State the source's own definition in the summary. Two sources using the word
differently are not corroboration, and the report's evidence ledger must not
treat them as such.

**"Pod" has two referents and they are easy to confuse.** It can mean a company's
own internal delivery unit — Instagram's pods of four to six generalists in
`2026-08-07-01` are this — or a team bought from a supplier as a packaged unit.
When a leader says "we work in pods", establish which before treating it as
evidence about team shape: an organisation that buys a four-person pod from an
agency has made a procurement decision, not restructured its delivery units. The
same ambiguity attaches to "squad", which additionally carries a Spotify-model
inheritance that predates AI by more than a decade.

---

## Search window

**Twelve months** — items whose underlying activity falls in the last year.

Judge by when the reorganisation, survey fieldwork or observation happened, not
by publication date. Beyond that, one exception: a **baseline** measurement of
median team size from before the window is worth having, because a claim about
shrinking needs a before to shrink from. Mark it as baseline per the shared
instructions.

## Source mix

- **Engineering-org benchmarks and operating-model surveys are the priority
  here**, and are the only source type that can settle this claim at population
  level. Chase them deliberately: DORA / State of DevOps, engineering-management
  platforms reporting on their own customer base (Jellyfish, LinearB, Swarmia and
  similar), consultancy operating-model studies, developer-experience benchmarks.
  Record `sampleSize`, `fieldworkPeriod` and `sponsor` every time.
- **Organisational-change and team-dynamics reporting is in scope and wanted** —
  reorganisations, operating-model changes, new team charters, span-of-control
  changes, the disappearance or merging of specialist functions into delivery
  teams. This is the beat where the construct actually surfaces.
- **Practitioner accounts are first-class**, provided they carry numbers. A named
  engineer or lead describing the shape of their team now versus a year ago is
  exactly the leading signal that a benchmark will confirm eighteen months later.
- **Academic work: at most 1 item per run, and only if it measured the construct
  directly.** Software-engineering and organisation research moves far too slowly
  to react to a change happening this year, and its team-size data is usually
  incidental to some other question. It is not excluded — a paper with real
  team-composition data is welcome — but it is not where to spend the run.
- **Vendor and investor content: cap at 2 items, and never as the sole context.**
  The one source currently supporting this claim is an investor writing about its
  own portfolio, and a run that returns three more of the same has not broadened
  the evidence base — it has thickened one context. Where you do include such an
  item, name the portfolio or customer base in the evidence ledger's "independent
  of" column.
- **Comment threads are primary sources, not just leads.** A thread in which
  twenty engineers state their current team sizes is a real, if self-selected,
  distribution. Cite the thread, quote the specific numbers, count the voices.
- **Never** use aggregators, reposts or AI-generated recap blogs as the sole
  source. Always include a working `sourceUrl` and verify it resolves.

## Where to hunt

There is no candidate pool for this run, so the venue list is part of the method.
Work through these deliberately rather than issuing one broad search:

- **Engineering-org benchmarks** — DORA, State of DevOps, engineering-analytics
  vendors publishing aggregate customer data, developer-productivity benchmark
  reports, IT operating-model studies from the large consultancies.
- **Organisational-change journalism** — trade and business press covering
  engineering reorgs, operating-model changes and flattening. Read for the
  numbers, not the narrative.
- **Engineering leadership writing** — CTO and VP Eng blogs, engineering-manager
  newsletters and Substacks, LeadDev and similar conference talks. Leaders
  describe their own org charts here in a detail that journalism never carries.
- **Company engineering blogs** — teams describing how they are structured now,
  especially posts announcing a new operating model or platform-team split.
- **Practitioner forums** — r/ExperiencedDevs, r/engineeringmanagers, Hacker News
  threads about reorgs and team structure, Blind. Threads where people state
  their team size are gold; general grumbling is not.
- **Social** — LinkedIn posts from named engineering leaders describing a reorg.
  Poorly indexed; search deliberately.
- **Flattening and span-of-control coverage** — the middle-management-reduction
  story is adjacent to this claim and sometimes carries real ratio data. Take the
  ratios; leave the layoff framing.

---

## Filtering

Output an item only if it bears on the size or composition of a software delivery
unit AND at least one of:

- it states a team size, team count or span of control, for a named organisation
  or across a sample
- it reports a before-and-after of delivery-unit shape
- it quantifies role mix inside delivery teams, or the movement of a specialist
  function into or out of them
- it credibly refutes the claim by showing team shape unchanged under AI adoption

Reject items that are:

- any near neighbour from the table above, however well reported
- reorg or operating-model announcements with no numbers
- "do more with less" executive commentary
- future-of-work punditry about team size with no organisation behind it
- vendor content selling an AI engineering platform, absent original data on its
  customers' team shapes
- anything whose only quantity is a headcount change

**One statistic to recognise on sight and reject.** "Twelve-person functionally
siloed teams replaced with four-person cross-functional pods, 35% reduction in
cycle time, 25% fewer production incidents, nine months later." As of the
2026-08-10 vocabulary pass this figure appeared across at least five sites and is
the most-repeated pod statistic in circulation. Every instance traces back to one
content publisher already in the seen-ledger as rejected, or copies it without
attribution. There is no named organisation, no method and no date of
measurement behind it. Reject under `not-primary-source` without re-investigating,
and be suspicious of any variant — the same 12-to-4 shape recurs with the
percentages changed and the industry swapped.

## Ranking — prefer in this order

1. Population-level measurement of delivery-unit size, from a context independent
   of the currently cited investor report
2. Credible refutation: team size measured and found steady, or growing
3. Before-and-after accounts of a real reorganisation, with numbers
4. Practitioner accounts stating current and prior team size, where several
   independent voices converge
5. Baseline measurements from before the window that a current figure can be
   compared against

Aim for **4–8 items per run**, and a run that returns two solid measurements and
six honest `wrong-construct` rejections is a better result than six items that
each circle the question.

---

## Claim notes on the shared instructions

- **Expect `field-report` to dominate** a healthy run, with
  `practitioner-account` second. A run that is mostly `market-event` has drifted
  into the near-neighbour table — that is the exact failure this claim run was
  written to correct.
- **Category.** `Org & Leadership` will usually be the primary `category`.
- **Independence is the scarce resource here, not volume.** The phenomenon's
  evidence profile currently stands at one independent context. The single most
  useful thing this run can do is take it to two.
- **The already-published check matters on this claim.** Six signals are cited
  under this phenomenon today and five of them measure the wrong thing; there may
  equally be published signals elsewhere on the site that *do* measure team shape
  and were never cited. Search `public/content/ai-signals/index.json` for them
  and name them in the proposed evidence block by their existing ids.
- **The removals section is expected to be long.** Of the six current items, the
  two `counter` entries (`2026-04-13-08`, `2026-06-29-05`) argue against
  AI-driven job loss, not against team size, and the two `contextual`
  `market-event` items (`2026-04-06-05`, `2026-04-13-07`) are layoff data. Assess
  each against the construct test on its own evidence and propose accordingly —
  but do not assume the current stances are right just because they are there.
