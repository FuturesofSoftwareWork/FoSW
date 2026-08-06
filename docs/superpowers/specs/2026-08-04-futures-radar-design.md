# Futures Radar — Design Spec

**Date:** 2026-08-04
**Status:** Approved (pending spec review)
**Supersedes:** `docs/superpowers/specs/2026-03-30-futures-dashboard-design.md` (radar portion only)

A foresight radar on the main site, showing **phenomena** — interpretive claims about
how software work may be changing — positioned by how far each change has reached
beyond isolated experiments and forerunner organisations, and backed by the
AI-signal corpus this project already collects.

The analytical chain a reader follows is:

> current pressure → emerging transformation → observed reach → possible
> development paths → implications for software work

Counts in this spec are over the **89 published signals** referenced by
`public/content/ai-signals/index.json` on `main`, verified 2026-08-04.

## Problem

A radar was specced in March 2026 and partially built in a separate repo
(`vttfinland/futureOfSW`). Three things have since made that design unbuildable as
written, and a fourth makes the whole framing wrong.

**1. The radius axis is degenerate.** The March spec, and the follow-up
`2026-08-03-signal-types-radar-design.md`, put `decisionHorizon` on the radius with
rings `now` → `0,5 - 2 years` → `2+ years`. Actual distribution:

| value | count |
| --- | --- |
| `now` | 69 (78%) |
| `0,5 - 2 years` | 16 (18%) |
| `2+ years` | **0** |
| absent | 4 |

Four-fifths of every blip lands in the bullseye and the outer ring is empty. The
axis meant to carry the radar's primary meaning carries almost none. The earlier
spec's motivating example — "EU AI Act phase-2 obligations in 2029 are highly
certain but distant" — has no instances in the corpus.

**2. The marker encodings have nothing to encode.** `signalType` and
`signalStrength` are present on **5 of 89** signals. A radar built on them today
renders 84 identical featureless dots.

**3. Sector-by-category is broken for most of the corpus.** Only 25 of 89 signals
carry a single category; 41 carry two and 19 carry three. Placing by `category[0]`
works but discards real information for 60 signals, and 13 categories makes for
unreadably thin sectors.

**4. The corpus is news, not signals.** This is the root problem. The 89 items are
individual dated news observations. A radar blip should be a *phenomenon* — a
forward-looking claim about a transformation, supported by many observations.
Clustering the corpus by hand finds roughly 8–12 clusters. Three of the clearest:

- **review** — ~10 items (`Opsera: 4.6x longer review waits`, `LinearB: AI PRs
  accepted 32.7% vs 84.4%`, `Cloudflare: 131,000 reviews`, `Faros: throughput is no
  longer the bottleneck`, …)
- **agent capability** — ~7 items (`Only the harness changed`, `Anthropic's
  three-agent harness`, `ETH Zurich: AGENTS.md often hinders`, …)
- **organisational readiness** — ~10 items (`DX: plateau at 10%`, `DORA: AI
  amplifies existing quality`, `Stanford AI Index: readiness is the bottleneck`, …)

A cluster is not yet a phenomenon. "Review is the binding constraint" summarises
what the first cluster observes; the phenomenon it points to is *assurance shifting
from reading code to verifying evidence* — see *Two tests every phenomenon must
pass*. The clustering step finds the groupings; naming the transformation each one
implies is the interpretive work.

Publishing at ~15 news items per month, a one-blip-per-item radar reaches 240+
blips within a year. A phenomenon radar grows to a bounded 30–40 and then mostly
deepens: a year of further collection makes it *better evidenced* rather than more
crowded.

## Goal

A radar of phenomena where:

- every blip names a **transformation that may be underway**, not a diagnosis of the
  present,
- every blip states **what actually changes about software work**, not merely which
  aspect of it is affected,
- position states **how far the change has reached** beyond forerunners, with a
  written rationale a reader can argue with — never a number derived from how many
  articles happened to be collected,
- the evidence behind a claim is shown as an auditable profile, separately from
  where the claim sits,
- disagreement in the evidence is expressible as a finding rather than hidden,
- new signals attach to existing phenomena through the same automated-propose /
  human-accept gate already used for signals,
- the whole thing lives in this repo, reading the same JSON the site already
  fetches.

## Non-Goals

- **Supabase.** Nothing in the radar needs it. Signals stay as JSON in this repo,
  which they must anyway — the site fetches them at runtime and prerenders from
  them. This removes the public-repo key concern entirely for this feature.
- **The `futureOfSW` repo.** This supersedes its `FuturesRadar` component. Its
  trends/metrics/Eurostat work is real and independent; its disposition is a
  separate decision. (Note for whenever it resumes: `supabase/migrations/001`
  grants the `authenticated` role full insert/update/delete on every table, and
  any self-registered user holds that role.)
- **Indicator timeseries.** Modelled here, not built. See *Indicators*.
- **Any admin UI, auth, or on-page commenting.** The accept gate is PR review; the
  colleague review loop is a preview URL plus a shared document. See *Preview and
  Review*.
- **Changing the 13 `AISignalCategory` values** or anything about how the existing
  ContentStream renders.
- **Backfilling `signalType` across the 84 untyped signals** as a prerequisite. The
  bootstrap clustering pass types the items it uses as evidence; the rest can stay
  untyped indefinitely.

## Decisions

| Question | Decision |
| --- | --- |
| Where does the radar live? | In this repo, as a section on the main site |
| Source of truth | JSON files in `public/content/`, unchanged |
| Radar blip | A **phenomenon**, not a news item |
| Radius | `observedReach` — field-level shift at centre, early manifestations at rim |
| How reach is set | Human judgment with a written rationale; never computed |
| Evidence | An auditable **profile** in the drawer; does not determine position |
| Contestation | Separate marker; does not affect the ring |
| `potentialImpact` | Kept as a drawer field; the alternate radius mode is deferred to v2 |
| Sectors | Work dimensions, config-driven, `360/N`, **7 as built** (9 as first specced) |
| Taxonomy | One work-dimension vocabulary: primary = sector, rest = derived tags |
| What changes | `implications[]` — statements, not just dimension tags |
| Blip size | Freshness (how recently reinforced) |
| Contested marker | Lightning bolt inside the blip, no ring |
| Evidence profile | Independent contexts × evidence types × quarters, never a raw count |
| Contested | Independent flag; set editorially |
| Time horizon | **Rejected** — see below |
| Review gate | PR review of proposed draft JSON |
| Reviewer model | Single reviewer now; nothing precludes more later |
| Editions | Live current state + quarterly snapshots in `reachHistory` |
| Scale | ≥10 phenomena at launch, 30–40 at maturity |
| Naming | `label` (blip) + `title` (headline) + `thesis` (precise claim) |

### Why radius represents reach of change

The rings describe how far a phenomenon has moved beyond isolated manifestations.

| Ring | Meaning |
| --- | --- |
| **Early manifestations** (rim) | Concrete examples are visible in forerunner organisations, experiments or localised practices. |
| **Gaining traction** (middle) | The phenomenon is being replicated across independent organisations or contexts, and is beginning to influence investment, tooling or mainstream choices. |
| **Field-level shift** (centre) | It is changing common expectations, operating models, professional practices, institutions or competitive conditions across the software field. |

The rings do **not** describe certainty, desirability or potential impact. A
controversial phenomenon can be gaining traction or producing a field-level shift.
Contestation and the evidence basis are therefore shown separately.

Field-level shift does **not** require universal adoption. A small number of dark
software factories could constitute a field-level shift if they materially change
delivery expectations, vendor strategies, organisational structures or ideas about
what a software engineering role is.

### Why not evidence strength

Earlier drafts put evidence strength on the radius. It was replaced for three
reasons, and the third is the decisive one.

**It answered the wrong question.** Ring position asked *how confident are we in our
claim?* — a fact about our epistemics. Reach asks *how far has this spread?* — a
fact about the world. The second is what a reader came for.

**It was structurally rim-heavy.** Only evidence that a *transformation* is underway
could score (see *Pressure is not transformation*), and such evidence is thin by
construction for early change. Most phenomena would have sat at the rim regardless
of how different they actually are. Reach distributes across all three rings from
the current corpus: organisational readiness and the junior pipeline are field-level,
review-to-verification and machine-configuration are gaining traction, dark software
factories are early manifestations.

**Reach cannot be computed, and computing it would produce wrong answers, not merely
imprecise ones.** Ten articles about one dark factory do not demonstrate traction;
one good labour-market study can demonstrate a field-level shift. A formula over
signal counts would systematically mistake coverage for spread. This is the same
reasoning already applied to `contested`: where a judgment is genuinely a judgment,
the spec makes it visible rather than dressing it as arithmetic. A written, reviewed
`reachRationale` is more defensible in a paper than a derived number that encodes the
wrong thing.

The evidence rubric survives — as descriptive statistics in the drawer rather than as
a classifier. See *Evidence profile*.

### Why there is no time horizon field

A dated horizon is the one field on a foresight radar guaranteed to be wrong and
permanently checkable — `2027–2028` ages into an embarrassment in a way `gaining
traction` never does. Reasonable experts also disagree sharply about pace, so the
field invites argument about the least defensible thing on the page. The corpus
confirms it: time-to-impact collapses to `now` in practice (69/89), because the
finder surfaces present-tense news and everything in AI feels immediate.

Thoughtworks' *Adopt / Trial / Assess / Hold* is not an alternative either: it is an
adoption recommendation for tools a team chooses, and one does not "adopt" the junior
hiring cliff.

`potentialImpact` is kept as a drawer field — non-temporal, and orthogonal to reach.
The alternate radius mode that would have displayed it is **deferred to v2**: one
radius meaning is enough for a first version, and because the field is already
carried, adding the mode later needs no data migration. The combination it exists to
surface — **early manifestations × transformative impact**, the frontier quadrant —
remains readable in the drawer and via filters until then.

## Conceptual Model

Six entities. The indicator is modelled but not built.

| Entity | What it is | Built? |
| --- | --- | --- |
| **Signal** | A dated observation with a source. The existing `AISignal`. | exists |
| **Phenomenon** | An interpretive claim about change, supported by signals. The radar blip. | **new** |
| **Work dimension** | An aspect of software work. Primary value = the radar sector; all values = filter tags. | **new (config)** |
| **Implication** | What a phenomenon changes about a given work dimension. | **new** |
| **Development path** | One possible direction a phenomenon could evolve in. | **new (optional field)** |
| **Indicator** | A measure tracked over time to monitor a phenomenon. | modelled only |

The editorial rule, which should be quoted in the clustering prompt verbatim:

> Signals describe what has been observed. A phenomenon interprets what may be
> changing. Development paths express where that change could lead. Implications
> state what it changes about software work.

A phenomenon is therefore **not** a summary of the evidence. The evidence shows
review queues lengthening; the phenomenon claims that assurance is shifting from
reading code to verifying evidence. The first is a diagnosis, the second is a
transformation — and only the second belongs on a foresight radar. Where a
diagnosis is needed to explain the pressure driving a transformation, it goes in
`currentPressure`.

## Scale and the launch gate

**30–40 phenomena at maturity. Ten is a launch gate, not a production quota.**

The radar section renders publicly only when there are **≥10 published
phenomena**. Below that it renders in dev and preview builds only, so the work is
visible and reviewable while remaining a proof of concept rather than a published
research claim. The gate is mechanical — a length check next to the existing
fetch-failure guard — so the radar launches itself when the content is ready and
nobody has to remember to flip anything.

This is deliberately *not* an instruction to the bootstrap pass to produce ten.
Requiring a count creates pressure to over-split clusters, which manufactures blips
and drifts straight back toward phenomena being news items with better titles — the
exact failure the two-level model exists to prevent. Hand-clustering the 89 signals
found 8–12 genuine candidates; if a careful pass yields eight, the answer is that
the radar is not launched yet, not that two more should be invented.

The upper end arrives as the corpus grows and as `primary-research` (interviews,
workshops) starts contributing signals the news finder cannot see. Growth should
come from evidence forcing a split, never from a target number.

Design consequences of 30–40, all already accommodated:

- Labels default **off** above 15 blips, so the mature radar is hover-driven and
  the launch radar is directly labelled.
- Sector count is config-driven, so seven dimensions at ~5 blips each stays legible.
- Placement uses deterministic hashing with collision nudging rather than manual
  angles, so no per-blip layout work accrues as the count rises.
- The dimension legend doubles as a filter, which is what makes 40 blips navigable.

## Data Model

### New content type: `public/content/phenomena/`

Same shape as the other content types — an `index.json` plus one file per
phenomenon, fetched at runtime.

```jsonc
{
  "id": "review-shifts-to-verification",
  "label": "Review becomes verification",
  "title": "From reading code to verifying evidence",
  "thesis": "As AI-generated changes exceed the capacity for line-by-line human review, software assurance shifts from inspecting code towards verifying intended behaviour, test evidence, security properties and architectural constraints. Automated systems take over routine checking, while human attention concentrates on intent, high-risk decisions, exceptions and accountability.",
  "currentPressure": "Generation capacity is growing faster than review capacity, producing longer queues and lower acceptance rates for AI-authored changes.",
  "status": "published",

  "primaryDimension": "nature-and-division-of-work",
  "potentialImpact": "high",

  "implications": [
    {
      "dimension": "nature-and-division-of-work",
      "statement": "Reviewing shifts from reading diffs to judging whether the evidence accompanying a change is sufficient.",
      "actors": ["developer", "reviewer", "technical-lead"],
      "pathIds": []
    },
    {
      "dimension": "skills-knowledge-and-learning",
      "statement": "Specifying acceptance criteria and interpreting verification output become more valuable than close reading of code.",
      "actors": ["developer", "new-entrant"],
      "pathIds": ["verification-first-assurance"]
    },
    {
      "dimension": "organisation-and-leadership",
      "statement": "Accountability for defects moves from the author of a change toward whoever accepted the evidence for it.",
      "actors": ["technical-lead", "engineering-manager"],
      "pathIds": []
    }
  ],

  "evidence": [
    { "signalId": "2026-01-29-02", "stance": "contextual", "primary": true,  "note": "4.6x longer review waits — establishes the pressure, not the shift" },
    { "signalId": "2026-05-25-03", "stance": "contextual", "primary": true,  "note": "AI PRs accepted 32.7% vs 84.4% — same, pressure only" },
    { "signalId": "2026-03-09-01", "stance": "supports",   "primary": true,  "note": "Anthropic ships multi-agent review — routine checking automated ahead of humans" },
    { "signalId": "2026-04-20-01", "stance": "supports",   "primary": true,  "note": "Cloudflare gates 5,169 repos, 131,000 reviews at $1.19 each" },
    { "signalId": "2026-04-03-01", "stance": "counter",    "primary": true,  "note": "review agents without humans: 45% vs 68% merge rate, most feedback noise" }
  ],

  "observedReach": "gaining-traction",
  "reachRationale": "Automated first-pass review is running in production at several unrelated organisations, and tooling vendors are building for it — but assurance practice outside those forerunners is still diff-centric.",
  "reachReviewedAt": "2026-08-05",

  "evidenceProfile": {
    "independentContexts": 2,
    "evidenceTypes": 2,
    "quartersSpanned": 2,
    "counterEvidence": true
  },

  "contested": false,
  "contestedNote": null,

  "firstObserved": "2026-01-29",
  "latestEvidenceDate": "2026-06-15",
  "lastReviewed": "2026-08-04",

  "reachHistory": [
    { "edition": "2026-Q1", "observedReach": "early-manifestations", "rationale": "Concrete forerunner cases identified." },
    { "edition": "2026-Q3", "observedReach": "gaining-traction",     "rationale": "Replicated at unrelated organisations; vendor tooling appearing." }
  ],

  "whatWouldChangeThis": [
    "Review practice stays diff-centric through 2027 despite sustained volume growth",
    "Automated reviewers are rolled back after escaped-defect rates rise"
  ],

  "developmentPaths": [
    { "id": "verification-first-assurance", "title": "Verification-first assurance", "description": "Machine-generated evidence and behavioural checks displace most routine line-by-line review." },
    { "id": "ai-reviews-ai",                "title": "AI reviews AI",                "description": "Reviewing is delegated to separate models, with humans supervising exceptions." },
    { "id": "persistent-review-wall",       "title": "The review wall persists",     "description": "Output continues to exceed validation capacity, producing queues, fatigue and escaped defects." },
    { "id": "constrained-generation",       "title": "Generation is constrained",    "description": "Organisations cap AI-authored change because verification stays too costly to trust." },
    { "id": "risk-tiered-review",           "title": "Risk-tiered review",           "description": "Routine changes verified automatically; critical paths receive intensified human scrutiny." }
  ],
  "related": [],
  "indicators": []
}
```

Field notes:

| Field | Notes |
| --- | --- |
| `label` | 2–4 words. The radar blip label. Must be legible at a glance beside a dot. |
| `title` | The headline, shown in the drawer and legend. Written to make a reader want the description. |
| `thesis` | 2–4 sentences. The **forward-looking** transformation claim, stated so it could be wrong. |
| `currentPressure` | Optional, 1 sentence. The observable present-day pressure driving the transformation. Well evidenced where the thesis is not — see *Pressure is not transformation*. |
| `primaryDimension` | One work dimension. Drives sector placement. Must also appear in `implications`. |
| `potentialImpact` | `low` \| `moderate` \| `high` \| `transformative`. Alternate radius. |
| `implications[]` | What actually changes, per dimension. See *Implications*. |
| `evidence[].stance` | `supports` (shows the **transformation** happening) \| `counter` (shows it is not, or is going elsewhere) \| `contextual` (establishes the **pressure** without showing direction). Only `supports` and `counter` score. |
| `evidence[].primary` | `false` when the item is commentary on another source rather than its own observation. Drives the independence count. |
| `observedReach` | `early-manifestations` \| `gaining-traction` \| `field-level-shift`. Drives ring placement. **Human judgment**, never computed. |
| `reachRationale` | One or two sentences justifying the reach. Required, non-empty. The thing a reader or reviewer argues with. |
| `reachReviewedAt` | When the reach judgment was last confirmed by a person. |
| `evidenceProfile` | Derived descriptive statistics, rendered as a sentence. Does not determine position. See *Evidence profile*. |
| `contested` | Independent of `observedReach` — a phenomenon may be field-level and contested. Suggested by `radar:derive`, confirmed editorially. Renders the lightning bolt. |
| `contestedNote` | Why it is contested, in one sentence. Required when `contested` is true. |
| `firstObserved` | Earliest evidence date. Derived. |
| `latestEvidenceDate` | **Newest evidence publication date.** Derived. Drives blip size. |
| `lastReviewed` | When a human last accepted changes. Set by `radar:accept`, **never** by `radar:apply` — see *Who writes what*. |
| `reachHistory` | Appended by `radar:snapshot` from the reviewed reach at snapshot time. |
| `whatWouldChangeThis` | Falsifiability. Also a guard against over-abstraction — a phenomenon nobody can falsify is too vague for an evidence-based radar. |
| `developmentPaths` | Optional. See below. |
| `related` | Optional. See below. |
| `indicators` | Reference IDs only; nothing behind them yet. |

`status` follows the existing convention: only `published` items are fetched.
Retired phenomena use `status: "retired"` plus `retiredAt` and `retiredReason` —
they leave the radar but stay reachable, because "we thought this was happening and
it wasn't" is a research finding, not something to quietly delete.

### Naming: label, title, thesis

Three fields, three jobs. A neutral restatement of the thesis makes a poor blip —
nobody clicks "AI coding assistants affect code review workloads".

| | Job | Example |
| --- | --- | --- |
| `label` | Fits beside a dot | *Review becomes verification* |
| `title` | Makes a reader want the description | *From reading code to verifying evidence* |
| `thesis` | Precise enough to be wrong | *…assurance shifts from inspecting code towards verifying intended behaviour, test evidence…* |

More worked examples for the clustering prompt:

| `label` | `title` |
| --- | --- |
| Configuring the machine | *The scarce skill stops being writing and starts being specifying* |
| Assurance moves to runtime | *If nobody read it, the system has to prove itself* |
| The vanishing apprenticeship | *If AI does the junior work, where do seniors come from?* |
| Compute becomes a budget line | *Engineering teams start managing spend the way they manage headcount* |

### Two tests every phenomenon must pass

The naming rules exist because a phenomenon can fail in two opposite directions,
and satisfying one test alone produces a bad blip.

**Test 1 — future orientation.** *Does this identify what may be changing next, or
only diagnose what is already happening?* Earlier drafts of this spec failed it:
"The review wall", "Token Jevons" and "AI as amplifier" are memorable diagnoses of
the present. They belong in `currentPressure`, as the pressure driving a
transformation, or as one development path in which nothing adapts — not as the
phenomenon. A radar of present-tense diagnoses is a news summary in a circle.

**Test 2 — falsifiability.** *Could this be wrong, and can you say how?* This pulls
against Test 1, because the further forward a claim reaches, the vaguer it gets.
"The economics of machine work are being redefined" passes Test 1 and fails Test 2 —
nothing could contradict it. `whatWouldChangeThis` is the forcing function: if
nobody can state what would change their mind, the phenomenon is too abstract for
an evidence-based radar.

A good phenomenon names a **specific transformation that has started but could
still fail**. That is also why `developmentPaths` stay optional rather than
required: the title-confidence rule already prevents a weakly-evidenced
transformation from being asserted as inevitable, since a `weak` phenomenon must be
phrased as a question or tension rather than a claim.

**The editorial constraint that keeps this honest: a title's confidence must match
its ring.** A `weak` phenomenon asserted as bold fact contradicts its own position
on the radar, and on a VTT / University of Helsinki site that is a credibility
cost, not a growth tactic. Weak and contested phenomena are therefore phrased as
questions or tensions — *"If AI does the junior work, where do seniors come from?"*
— while established ones may assert. Vivid is fine; overclaiming is not. The
validator cannot check this, so it belongs in the clustering prompt and in review.

### Development paths

Optional, populated selectively rather than for every blip.

```jsonc
"developmentPaths": [
  { "id": "compute-abundance",  "title": "Compute abundance",  "description": "…" },
  { "id": "two-tier-access",    "title": "Two-tier access",    "description": "…" }
]
```

Competing directions belong as paths under one phenomenon when they arise from the
same underlying uncertainty. They become separate phenomena only when they are
independently observable with substantially different consequences for work.

Paths are drawer content; they are not rendered on the radar. They are the
connective tissue to the site's existing `WhatIf` scenario section.

### Related phenomena

Optional, with a deliberately reduced vocabulary: `reinforces`, `constrains`,
`depends-on`.

```jsonc
"related": [ { "id": "harness-over-model", "relation": "depends-on" } ]
```

Rendered as links in the drawer. **No graph visualisation** — a radar cannot draw
edges, and a network view is a separate project.

### Implications

**What actually changes** — the field that makes this a radar of software work
rather than of AI tooling. A dimension tag says *which* aspect of work is touched;
an implication says *what happens to it*.

```jsonc
{
  "dimension": "nature-and-division-of-work",
  "statement": "Developers spend less time generating code and more time reviewing, validating and integrating machine-generated changes.",
  "actors": ["developer", "technical-lead"],
  "pathIds": []
}
```

| Field | Notes |
| --- | --- |
| `dimension` | One work dimension. Required. |
| `statement` | One sentence, present or near-future tense, concrete enough to disagree with. Required. |
| `actors` | Optional. Who this lands on, from `src/config/radarActors.ts`: `developer`, `reviewer`, `technical-lead`, `engineering-manager`, `executive`, `new-entrant`, `organisation`. |
| `pathIds` | Optional. Empty means the implication holds across all development paths; otherwise it is specific to the listed ones. |

Two implications minimum per published phenomenon, three to five typical. This is
the largest editorial addition in the spec — at 30–40 phenomena it means roughly
60–160 authored statements — and it is also the project's actual research output,
so the cost is the deliverable rather than overhead.

**`impacts` is derived, never stored:** the unique set of `implications[].dimension`.
Filtering works from the derived set. Storing both would let a tag list drift out of
sync with the statements it summarises.

### Work dimensions config

`src/config/radarDimensions.ts` — one taxonomy, used for three things at once: the
radar sector (via `primaryDimension`), the `dimension` on each implication, and the
derived filter tags. Sector angles are `360 / N` computed from its length, so adding
or renaming a dimension is an edit to this file and nothing else. Colours are hex,
applied as SVG `fill` / `stroke` attributes and **not** as Tailwind class names, so
`CLAUDE.md`'s no-dynamic-class rule is not violated.

| id | label | colour |
| --- | --- | --- |
| `nature-and-division-of-work` | Nature & division of work | `#0EA5E9` |
| `organisation-and-leadership` | Organisation & leadership | `#4ade80` |
| `skills-knowledge-and-learning` | Skills, knowledge & learning | `#a855f7` |
| `careers-occupations-and-labour-markets` | Careers, occupations & labour markets | `#f472b6` |
| `worker-experience-identity-and-wellbeing` | Worker experience, identity & wellbeing | `#fb7185` |
| `economics-productivity-and-value` | Economics, productivity & value distribution | `#F59E0B` |
| `ethics-responsibility-and-society` | Ethics, responsibility & society | `#94a3b8` |

The two senses of *responsibility* are kept apart on purpose, and each dimension
names only one of them. `leadership-governance-and-performance` covers
accountability **inside** an organisation — who answers for a defect, how
performance is measured when authorship is shared with a machine.
`ethics-responsibility-and-society` covers obligation **outward** — to users,
regulators and the public. An earlier draft had "responsibility" in both labels,
which made the boundary unreadable.

**Why one taxonomy rather than two.** An earlier draft had technology-oriented
domains as sectors (Agents & Autonomy, Tooling & Interfaces, Engineering Practice,
Security & Trust) plus a separate list of work-impact dimensions as tags. Four of
seven sectors began from technology, which reproduced the bias of the news corpus —
Hacker News, Dev.to, GitHub releases and arXiv — in the most visible structure on
the page, for a project whose scope is explicitly socio-technical.

Replacing them with work-centred sectors made the two lists near-identical, which
would have recreated exactly the conflation that made the 13 `AISignalCategory`
values ungroupable (`AI Agents` is a topic; `Work Wellbeing` is an impact). Unifying
resolves both problems: one authored vocabulary, with a primary value driving
placement and the rest secondary — the same primary/secondary shape `category[0]`
already has for signals.

It also disciplines the content. A technical phenomenon has no sector until it is
restated in work terms: *"the harness, not the model, determines agent capability"*
has no home, while *"configuring the machine becomes a core engineering skill"* sits
in `skills-knowledge-and-learning`. Technology still appears — through its
transformation of work, which is what the project is about.

What is lost: you can no longer see "all the agent phenomena" grouped in one sector.
That becomes a tag filter, and the ContentStream already provides the
technology-oriented view over the signal corpus.

Categories on news items are untouched; this taxonomy applies to phenomena only.

### Indicators (modelled, not built)

`public/content/indicators/` is defined here so adding it later is additive:

```jsonc
{
  "id": "eu-software-employment",
  "name": "Software employment, EU",
  "unit": "persons",
  "sourceAdapter": "eurostat",
  "sourceConfig": {},
  "observations": [ { "date": "2026-01-01", "value": 1234567 } ]
}
```

No fetching, no charts, no scheduled collection in this spec. When it is built, the
existing `futureOfSW` Eurostat adapter is the obvious starting point, and that is
where Supabase genuinely earns its place.

## Changes to `AISignal`

### Genre rename and additions

`signalType` currently has five values. Reviewing all 89 titles against them found
two structural defects.

**`weak-signal` is a category error.** It is the only genre named for *how sure we
are* rather than *what the thing is* — the other four say what it is. It now
also collides with `signalStrength` on the signal itself: "a `weak-signal` that is
`established`" is sayable and meaningless. The ~14 items in that bucket share a real
form: a named practitioner reporting from their own work.

**Two genres are missing.** Market events (`Oracle cuts 30,000 jobs`, `OpenAI
acquires Astral`, `hiring rebounds: 67,000+ positions`) are neither studies nor
reports on engineering practice nor tools. And forecasts (both Gartner items) are
*not evidence of the present* — in the same bucket as a measured study they inflate
the triangulation score of any phenomenon they touch.

Revised set of eight:

| Genre | ~n | Type-specific fields |
| --- | --- | --- |
| `practitioner-account` *(renamed from `weak-signal`)* | 14 | `observer` |
| `field-report` | 33 | `sampleSize`, `fieldworkPeriod`, `sponsor` |
| `study` | 24 | `dataCollectedPeriod`, `replicated` |
| `tool-shift` | 8 | `version`, `availability` |
| `regulation-standard` *(widened from `regulatory`)* | 6 | `effectiveDate`, `jurisdiction`, `issuer` |
| `market-event` *(new)* | 6 | `organisation`, `magnitude` |
| `forecast` *(new)* | 2 | `forecaster`, `horizonDate` |
| `primary-research` *(new)* | 0 | `method` (`interview` \| `workshop` \| `other`), `participants`, `fieldworkPeriod` |

The `~n` column is an indicative hand pass over all 89 titles — it is what each
genre *should* hold once evidence is typed, **not** what is tagged today. Only 5
signals currently carry `signalType` at all (one each of `study`, `field-report`,
`weak-signal`, `regulatory`, `tool-shift`). The migration therefore renames two
files, not fourteen.

`regulatory` widens to `regulation-standard` because two instances (both the EU AI
Act) is too thin to survive, while `OWASP 2026 Framework`, `OWASP agentic security`
and `Linux Foundation Tokenomics` are the same kind of thing — an authority
publishing a norm — without being law.

`primary-research` covers the project's own interviews and workshops. It is one
genre with a `method` field rather than separate `interview` and `workshop` genres,
so further first-party methods (diary studies, own surveys) don't each need a new
enum value. **Flagged for review:** this differs slightly from the brainstorm,
which discussed them as two genres.

### Consequences for the evidence profile

- `forecast` is **excluded** from `independentContexts` and `evidenceTypes`. It may
  be attached to a phenomenon for context and shown in the drawer, but a prediction
  is not an observation and never counts as one.
- `field-report` items sharing a `sponsor` collapse to **one** independent source.
  Five vendor surveys by five vendors selling engineering analytics are not five
  independent observations. This matters: `field-report` is the largest genre at
  ~33, and it contains both `DORA` / `Stanford AI Index` and
  `Jellyfish` / `Harness` / `LinearB` / `Faros`.
- `primary-research` **does** count — it is independent first-party evidence.

## Observed Reach

The ring. **Set by a person, with a written rationale, and changed only by a
person.** No formula produces it, for the reasons in *Why radius represents reach of
change*.

```jsonc
"observedReach": "gaining-traction",
"reachRationale": "Automated first-pass review is running in production at several unrelated organisations, and tooling vendors are building for it — but assurance practice outside those forerunners is still diff-centric.",
"reachReviewedAt": "2026-08-05"
```

The rationale is the accountable part. It states *why* this is not merely a
forerunner case, or *why* it has not yet reached the field, in terms a reader can
disagree with. A reach judgment without one is unreviewable, so the validator
requires it non-empty.

### How reach changes

1. The clustering pass proposes `observedReach` and a one-sentence rationale when a
   phenomenon is created.
2. A person confirms or rewrites both before the phenomenon is published.
3. **Routine evidence updates never move a phenomenon.** Attaching signals changes
   the evidence profile and the dates; the ring stays where a person put it.
4. When new evidence suggests replication across unrelated contexts or field-level
   effects, `radar:derive` records `possibleReachChange` with what prompted it.
5. A person approves every ring movement, updating `reachRationale` and
   `reachReviewedAt` together.

This adds exactly one recurring review question: *is this still an isolated
manifestation, is it gaining traction, or is it already influencing the wider field?*

**The cost, stated plainly:** attaching a signal no longer moves a blip by itself.
An earlier draft treated automatic movement as the payoff for running the pipeline.
That payoff is now weaker and deliberately so — automatic movement would mean
inferring spread from coverage, which is the error this axis exists to avoid. The
pipeline's job becomes surfacing *candidates* for movement, which a person then
judges.

## Evidence

Evidence no longer determines position. It is presented, in the drawer, as an
auditable profile — and the pressure/transformation distinction below is what keeps
that profile honest.

### Pressure is not transformation

A phenomenon claims a **transformation**: assurance moves from reading code to
verifying evidence. Its `currentPressure` states an observable **present**:
generation outruns review capacity. These are evidenced very differently.

Present-day pressure is abundantly evidenced — `4.6x longer review waits`,
`AI PRs accepted 32.7% vs 84.4%`, `review time up 91%`. The transformation is
thinly evidenced, because it is only starting — `Anthropic ships multi-agent
review`, `Cloudflare gates 5,169 repositories`.

Counting them together would let a phenomenon's profile claim it was "observed in
three independent contexts" when those observations were of the *pressure*, not the
transformation. The profile would look rigorous and describe the wrong thing.

The stance vocabulary carries the distinction, so no extra field is needed:

| Stance | Means | Effect |
| --- | --- | --- |
| `supports` | The transformation is observably happening | counts in the evidence profile |
| `counter` | It is not happening, or is going elsewhere | suggests `contested`; shown beside the supporting evidence |
| `contextual` | The pressure is real, but the item shows no direction | shown under `currentPressure` |

**Only `supports` counts in the profile.** Contextual evidence is displayed under
the `currentPressure` heading, where it belongs and is genuinely informative.
Counter-evidence is displayed alongside the supporting evidence, so a reader sees
the disagreement rather than a diluted number.

The clustering prompt must apply this test per evidence item: *does this show the
change happening, or only that the conditions for it exist?* Most news items answer
the second. That is the correct and expected outcome.

### Evidence profile

Three descriptive statistics, computed by `radar:derive` over supporting evidence
only, and rendered as a sentence rather than a grade:

| Statistic | Question | Computed from |
| --- | --- | --- |
| `independentContexts` | How many distinct primary sources? | count of `evidence[]` with `stance: "supports"` and `primary: true`, excluding `forecast`, collapsing same-`sponsor` field reports |
| `evidenceTypes` | How many of the eight genres back it? | distinct `signalType` among supporting primary evidence, excluding `forecast` |
| `quartersSpanned` | Does it recur, or was it one burst? | distinct quarters spanned by supporting evidence dates |
| `counterEvidence` | Is anything pointing the other way? | any `counter` evidence with `primary: true` |

Rendered in the drawer as:

> Observed in **3 independent organisational contexts** across **2 evidence types**
> over **3 quarters**. Counter-evidence present.

This says more than a label like "well evidenced" and cannot be mistaken for a
verdict on the phenomenon's spread. Deliberately **not** shown: a raw signal count,
which measures collection effort rather than the world.

All four are fully computable. The human judgments sit one level down, on each
evidence item: `primary` (*is this its own observation, or commentary on someone
else's?*) and `stance` (*does this show the change happening, or only the pressure
for it?*). The second is the harder one and the more consequential.

There are no thresholds and no grade. The profile is reported, not classified — a
reader who wants to weigh it can, and nothing about it moves a blip.

### Contested

An independent flag. It does not affect the ring, and a phenomenon may be at
`field-level-shift` **and** contested — widely reaching, and genuinely disputed.

Strong supporting evidence and strong counter-evidence routinely coexist, and their
coexistence is a finding rather than an absence of one. The junior-developer cluster
is the live case: `67% drop in entry-level postings` and `Harvard: 7.7% junior
employment decline` against `hiring rebounds: 67,000+ positions` and `SignalFire:
engineering most resilient`. Being able to say *"we have strong evidence in both
directions"* is the honest reading, and most radars cannot express it at all.

**Set editorially, not by formula.** `radar:derive` *suggests* it whenever any
`counter` evidence with `primary: true` exists; a reviewer confirms or clears it and
records why in `contestedNote`. *"Is this disagreement substantive, or one dissenting
voice against ten studies?"* is not a countable question, and a numeric rule
(`>= 2 counter-signals`, `counter >= a third of supporting`) would be arbitrary,
harder to defend in a paper than a stated judgment, and wrong in both directions.

## Freshness

`freshness = today − latestEvidenceDate`, bucketed into four steps driving blip
radius:

| bucket | age of `latestEvidenceDate` | blip radius |
| --- | --- | --- |
| `current` | within the current quarter | 9 |
| `recent` | 3–6 months | 7.5 |
| `ageing` | 6–12 months | 6 |
| `stale` | over 12 months | 4.5 |

Orthogonal to reach, and it answers a question the ring cannot: *is this still
moving, or did we last see evidence a year ago?* Silent staleness is a real failure
mode for a foresight instrument, and it matters more now that the ring only moves
when a person moves it — a phenomenon can sit at `gaining-traction` indefinitely
while the world goes quiet around it. Freshness makes that visible, and gives the
pipeline a job.

### Three dates, three meanings

An earlier draft had a single `lastReinforced`, which silently meant two different
things: the publication date of the newest evidence, and when the record was last
touched. Those diverge — attaching a six-month-old paper today makes the record
freshly maintained while the world's signal is stale.

| Field | Means | Derived? |
| --- | --- | --- |
| `firstObserved` | Publication date of the **earliest** evidence | yes, from `evidence[]` |
| `latestEvidenceDate` | Publication date of the **newest** evidence | yes, from `evidence[]` |
| `lastReviewed` | When a human last accepted changes | no, stamped by `radar:accept` |

Blip size uses `latestEvidenceDate` — the world's activity, not ours. All three
appear in the drawer, because they answer different questions, and `lastReviewed`
supports a warning the others cannot: *this claim has not been re-examined in nine
months*, which is distinct from *no new evidence has appeared*.

The naming is deliberate: `lastEvidenceUpdate` was considered and rejected because
it reads as a record-update timestamp, reintroducing the ambiguity being fixed.

## Radar Visualisation

New component tree under `src/components/Radar/`:

```
FuturesRadar.tsx      section wrapper, header controls, data loading
RadarCanvas.tsx       SVG: rings, sector borders, gradient, labels
RadarBlips.tsx        blip rendering + hover
useRadarLayout.ts     phenomenon -> (x, y) placement
radarFreshness.ts     today - latestEvidenceDate -> bucket
```

The client computes **freshness only**. `observedReach`, `evidenceProfile` and
`contested` are read straight from the JSON — there is no second implementation to
keep in sync. Freshness is client-side purely because it depends on today's date.

### Geometry

- **Full circle.** Rings from a light centre fading to a dark rim. Under reach
  semantics this reads correctly — the lit centre is the mainstream field, the dark
  rim is the unlit frontier. (It was suggested that the gradient implies epistemic
  certainty and should be softened. That was true when the axis was evidence
  strength; with reach it is not, so the gradient is kept.)
- **Three rings**, labelled on the vertical spine with a dark backing so they stay
  readable over the gradient: **`FIELD-LEVEL SHIFT` / `GAINING TRACTION` /
  `EARLY MANIFESTATIONS`**. Always visible, not hidden behind the labels toggle.
- **Sector borders** drawn as radial lines at `360/N`, with work-dimension labels
  around the rim in the dimension colour.
- **Placement** within a sector×ring cell by deterministic hash of the phenomenon
  `id`, so a blip does not jump between renders, with simple collision nudging.

### Encodings

Three things to learn, and no more:

| Channel | Meaning |
| --- | --- |
| Ring | `observedReach` |
| Sector + colour | `primaryDimension` |
| Size | recent evidence activity (freshness) |
| Lightning bolt inside the blip | `contested` |

Reach is deliberately **not** repeated in fill, opacity, or glow — position already
carries it. The bolt is the only modifier and carries no ring around it, which would
both duplicate it and fight the dimension colour.

### Header controls

- **Labels** — on/off. Direct labels beside each blip; default off above 15 blips,
  on below. With labels off, hover or keyboard focus shows: phenomenon name ·
  observed reach · primary dimension · counter-evidence status. Deliberately **not**
  a raw evidence count.
- **Work-dimension legend**, doubling as filters, following the existing
  `SignalControls` pattern. Filtering matches on the derived `impacts` set, not only
  `primaryDimension`, so filtering by *worker experience* surfaces every phenomenon
  with an implication there — not just the ones sectored into it.

### Responsive

Below the mobile breakpoint: labels forced off, tap replaces hover, and the
component falls back to a legend list beneath the circle so nothing is
unreachable.

## Interaction

Extend `DrawerContent` with `{ type: "phenomenon"; data: Phenomenon }`. No new
drawer component — `ContentDrawer` already handles signals and insights and already
renders type badges and evidence lines.

The phenomenon view shows, in order: title and thesis · `currentPressure` ·
**observed reach with its `reachRationale`** · primary dimension ·
**implications, grouped by dimension and labelled with their actors** ·
`potentialImpact` · the evidence profile sentence · the three dates · evidence
grouped by stance, with `contextual` items under the `currentPressure` heading
rather than mixed in with supporting evidence · development paths · related
phenomena · `whatWouldChangeThis` · `reachHistory`.

`reachRationale` sits directly beneath the ring position it explains. A reader who
disagrees with where a blip sits should find the argument for it immediately, not
have to infer it from the evidence list.

Implications sit high in that order deliberately. They are what the reader came
for — a dimension tag says a phenomenon touches coordination; only the statement
says the queue moved from writing to approving.

**Drawer stack.** Clicking a piece of evidence pushes the news item's drawer over
the phenomenon's, with a back control returning to it. Reading a phenomenon,
dipping into three of its sources, and coming back out is the core reading motion
of this radar. State is a small history array in the drawer.

Signals reached from the ContentStream gain a **"Part of: ⟨phenomenon⟩"** link,
derived at load time by inverting the evidence arrays. The backlink is never stored
on the signal — the relationship lives on the phenomenon side only, so there is one
place to edit and nothing to keep in sync.

## Site Integration

A `<FuturesRadar />` section in `App.tsx` between `WhatIfSection` and
`ContentStream`. The page then reads: scenarios → radar (synthesis) → the evidence
itself → about.

Data loading follows the existing `useContent` pattern (`index.json`, then per-item
files, `BASE_URL`-prefixed, cache-busted).

**The launch gate lives here.** The section returns `null` in production when fewer
than 10 phenomena are published, and renders regardless in dev and preview builds
so work in progress stays reviewable. Two guards, same place:

```
if (fetchFailed) return null                              // stale claims are worse than none
if (published.length < 10 && import.meta.env.PROD) return null   // not launched yet
```

**One deliberate departure:** `useContent` falls back to `defaultContent` on fetch
failure. The radar instead **hides its section entirely**. A stale hardcoded
research claim presented as current is worse than no radar.

## Preview and Review

Colleagues at VTT and the University of Helsinki review the radar before it is
public. The preview is **not a separate site** — it is this site, from this repo,
with two switches flipped by `VITE_RADAR_PREVIEW=1`:

| | Production | Preview |
| --- | --- | --- |
| Radar section | hidden until 10 phenomena published | always visible |
| `status: "draft"` phenomena | not fetched | fetched and shown |

Everything else is identical, so what reviewers see is byte-for-byte what ships.
Going live is not a migration: it is publishing the tenth phenomenon, after which
the launch gate opens on its own. A design where the preview must later be *moved*
to the main page would drift from it and the move would keep being deferred.

### Deployment

The site is a static SPA on GitHub Pages, built from `main` by
`.github/workflows/deploy.yml` with `base: '/FoSW/'`. Pages serves folders, so the
preview is a second folder in the same deployment:

| URL | Build |
| --- | --- |
| `futuresofsoftwarework.fi/FoSW/` | production, unchanged |
| `futuresofsoftwarework.fi/FoSW/preview/` | `vite build --base=/FoSW/preview/` with `VITE_RADAR_PREVIEW=1` |

- A new `deploy-preview.yml` triggered on the radar branch, deploying with
  `target-folder: preview`.
- `deploy.yml` gains `clean-exclude: preview` so a production deploy does not wipe
  it.
- No new host, no new accounts, and the review link is on the project's own domain —
  which matters when asking named researchers to review something.

**Preview builds must not be indexed.** A `robots` meta tag of `noindex, nofollow`
and a `Disallow` in a preview-only `robots.txt`. An unfinished research radar
appearing in search results under the VTT domain is a real credibility risk and
costs three lines to prevent. The URL is unlisted rather than access-controlled; the
repository is public, so nothing here is secret.

### The comment loop

Nothing on the page collects comments — that needs a backend, which *Non-Goals*
rules out. Instead:

- Each blip is deep-linkable as `/phenomena/<id>/` (**path-based as built**; this spec
  originally said `?phenomenon=<id>`, before the site's existing convention was
  checked), reusing the existing deep-link
  handling. This is what makes asynchronous review workable: a reviewer links to the
  exact phenomenon they disagree with rather than describing which one they mean.
- Comments are collected in a shared document keyed by phenomenon `id`, and
  accepted feedback is transcribed into the JSON through the normal PR gate.
- GitHub PR review is deliberately **not** the mechanism for non-technical
  reviewers. It would be more traceable and it will not happen.

A structured review session is itself a `primary-research` signal (`method:
workshop`). Colleague observations about their own work are not only QA on the
radar — some of them are evidence for it, and the schema already has somewhere to
put them.

## Pipeline

Follows the principle already in `docs/ai-signals-pipeline.md` — *retrieve broadly
in code, score editorially in the LLM* — with one addition: **numbers are computed
in code, meaning is judged by the LLM, and all writes are deterministic.** The model
never edits a phenomenon file, exactly as it never writes the ledger.

### Bootstrap (once)

```bash
npm run radar:prepare                              # digest published signals -> data/_radar-input.json
#                                                    LLM pass, docs/radar-clustering-prompt.md
#                                                    -> data/_radar-proposal.json
npm run radar:apply -- data/_radar-proposal.json   # write draft phenomena, score, update index
```

Review the PR diff, then `npm run radar:accept -- <ids>` to publish what you accept
and stamp `lastReviewed`. Merge. That is the accept gate.

Review happens on the **diff of the real content files**, not on an abstract
proposal document. That is deliberate: you see exactly what will exist rather than a
description of it, edits are made in place while reviewing, and it matches the
accept gate the signals pipeline already uses. `radar:apply` writes everything as
`status: "draft"`, so nothing is published by the act of applying — the gate is
`radar:accept`, not `radar:apply`.

The bootstrap has **no phenomenon quota.** It should find the clusters the corpus
actually supports and stop. If that is eight, the radar stays behind the launch gate
until further collection supports two more — inventing blips to reach a number is
the failure the two-level model exists to prevent.

The clustering prompt must also author `implications` for each proposed phenomenon,
and this is where a proposal most needs review: an LLM will happily generate a
plausible-sounding implication that no evidence supports. Every implication should
be traceable to something in the phenomenon's evidence, and reviewing that is the
main work of accepting a bootstrap batch.

### Ongoing (each finder run)

After `signals:reconcile`, `radar:prepare --since <date>` digests only new items.
The LLM proposes either *attach to existing phenomenon* (with `stance` and
`primary`) or *propose new phenomenon*. `radar:apply` merges, rescores and
recomputes `latestEvidenceDate`, touching **only machine-owned fields** on
phenomena that already exist. Review the diff, then `radar:accept`.

The LLM's job is narrow and well-suited to it: *does this item support, counter, or
contextualise this claim, and is it a primary source or commentary on one?*

### Who writes what

Once a phenomenon exists, its wording is **research output**. A routine weekly run
attaching one new signal must never be able to rewrite a thesis that took an hour to
get right, and without an explicit rule it silently would.

| Machine-owned — `radar:apply` may write | Human-owned — `radar:apply` must never touch |
| --- | --- |
| `evidence[]` | `label`, `title`, `thesis`, `currentPressure` |
| `evidenceProfile` | **`observedReach`, `reachRationale`, `reachReviewedAt`** |
| `firstObserved`, `latestEvidenceDate` | `implications[]`, `developmentPaths[]` |
| `possibleReachChange` | `whatWouldChangeThis`, `related[]` |
| `reachHistory[]`, `index.json` | `primaryDimension`, `potentialImpact` |
| | `contested`, `contestedNote`, `lastReviewed`, `status` |

`observedReach` is the most important entry in the right-hand column. It is the
whole radar's meaning, and nothing automatic may move it.

On a **new** phenomenon every field is written once, because there is nothing to
overwrite. On an **existing** one, only the left column moves. Where the model
believes human-owned content should change — a thesis outgrown by its evidence, an
implication now contradicted — it emits a **suggestion** into the run log and the PR
body. It does not edit the file. Suggestions are read by a person, and acted on by a
person.

The validator enforces this: `radar:apply` writes a manifest of the fields it
touched, and a run that touched a human-owned field on an existing phenomenon fails.

### Scripts

| Script | Role |
| --- | --- |
| `scripts/radar-prepare.mjs` | Build the digest fed to the clustering prompt |
| `scripts/radar-apply.mjs` | Apply a proposal; the only writer of machine-owned fields |
| `scripts/radar-accept.mjs` | Flip `status` to `published`, stamp `lastReviewed` — run by the reviewer at accept time |
| `scripts/radar-derive.mjs` | Mechanical work only: evidence dates, freshness, evidence profile, counter-evidence flag, `possibleReachChange`, reference validation |
| `scripts/radar-snapshot.mjs` | `-- 2026-Q4` — append `reachHistory` entries |

`radar-derive` replaces the earlier `radar-score`. The rename is not cosmetic: the
old script *decided ring placement*, the new one only computes facts and flags
candidates. Nothing it produces determines where a blip sits.

Splitting `accept` out of `apply` is what makes `lastReviewed` honest. An earlier
draft had `radar:apply` stamp it — but `apply` runs *before* anyone has looked, so
the field would have claimed a review that had not happened, on precisely the
phenomena where staleness matters most.

`docs/radar-clustering-prompt.md` is the prompt, alongside the existing finder
prompt.

### Editions

The radar shows **current state** — the reach a person last confirmed. Editions are
the historical record: `radar:snapshot` appends a `reachHistory` entry to every
published phenomenon, carrying the reach and rationale as reviewed at that moment.
`public/content/phenomena/editions.json` holds `{ id, label, publishedAt, notes }`.

Comparing consecutive entries yields five readings:

| Reading | Meaning |
| --- | --- |
| **new manifestation** | first appearance on the radar |
| **gaining traction** | moved inward one ring |
| **reaching the field level** | moved to the centre |
| **stable** | unchanged since the last edition |
| **receding** | moved outward — the change did not propagate as expected |

`receding` matters as much as the inward moves. A phenomenon that looked like it was
spreading and then stopped is a finding, and a radar that can only move blips inward
is a hype instrument.

**Movement is drawer content, not a radar marker** — deliberately not drawn as
arrows or hollow blips, which would add a fourth visual vocabulary to a design kept
to three channels on purpose.

Because every reach change is human-reviewed, `reachHistory` is a record of
*judgments*, not of automatic recalculation. Entries are only written after review.
History will be thin at launch and gets genuinely interesting after a year.

## Validation

The project has no test runner, so `scripts/validate-signals.mjs` **is** the test
suite, and it already runs as the first step of `npm run build`. Extend it to:

1. Every `evidence[].signalId` resolves to a real **published** signal. A dangling
   reference **fails the build** — the most likely error and the least visible.
2. All new enums valid: `observedReach` one of the three values; `primaryDimension`
   and every `implications[].dimension` in `radarDimensions`; every `actors` value
   in `radarActors`; plus `stance`, `potentialImpact`, `signalType` (eight values),
   `status`.
3. `index.json` ↔ file consistency and `id` ↔ filename agreement, as for signals.
   Plus `label` present and ≤ 4 words (it has to fit beside a dot), and `title`
   and `thesis` both present and distinct from each other.
4. **`reachRationale` present and non-empty**, and `reachReviewedAt` set. A ring
   position without a stated reason is unreviewable.
5. `evidenceProfile`, `firstObserved` and `latestEvidenceDate` match the evidence
   they are derived from — catching hand-edited derived values.
6. **A `reachHistory` entry exists for every change in `observedReach`**, so ring
   movement is always auditable after the fact.
7. **At least two `implications`** on every published phenomenon, and
   `primaryDimension` present among them. A phenomenon that says nothing about
   software work does not belong on this radar.
8. **At least one `supports` evidence item** on every published phenomenon. Zero
   transformation evidence and only `contextual` items means the entry is a
   diagnosis of the present, not a claim about a transformation — it belongs in
   some phenomenon's `currentPressure`, not on the radar as a blip.
9. Every `implications[].pathIds` entry resolves to a real `developmentPaths[].id`.
10. Every `related[].id` resolves to a real phenomenon.
11. `contestedNote` present whenever `contested` is true.
12. The `radar:apply` manifest touched no human-owned field on a pre-existing
    phenomenon — see *Who writes what*.
13. A coverage report — e.g. `62 of 89 signals map to a phenomenon` (illustrative
   figure, not a target). Not an error; uncovered news items are expected and fine.
   Printed so drift is visible. Alongside it, the published-phenomenon count and
   whether the launch gate is open.

The validator checks **form, not judgment**. It verifies that a reach call has a
rationale, a review date and a history entry — never whether the call is
substantively right. That question belongs to review, and no script should pretend
otherwise.

Manual verification, per the existing convention:

- `npm run build` passes (validator + `tsc` + vite + prerender).
- `npm run lint` — zero warnings.
- Radar renders with labels on and off, with a dimension filter active, and at
  mobile width.
- Blips appear in all three rings from the first published batch — if everything
  lands in `gaining-traction`, the axis has degenerated and the rationales need
  rewriting before launch.
- With fewer than 10 published phenomena, the section is absent from a production
  build and present in a dev build.
- A contested phenomenon renders the bolt; a phenomenon with no optional fields
  renders without gaps.
- Drawer stack: phenomenon → evidence → back returns to the phenomenon.
- An untyped legacy signal renders exactly as before.

## Migration

1. **Rename `weak-signal` → `practitioner-account`** in `src/types/content.ts`,
   the 1 signal file using it, `docs/ai-signals-finder-prompt.md`,
   `scripts/validate-signals.mjs`, and `CLAUDE.md`.
2. **Rename `regulatory` → `regulation-standard`**, same set, 1 file affected.
3. **Add** `market-event`, `forecast`, `primary-research` and their fields to the
   type, prompt, validator, and `CLAUDE.md`.
4. **No backfill** of `signalType` across the 84 untyped signals is required. The
   bootstrap pass types the items it uses as evidence.
5. New content directory, configs, components, scripts, and prompt as above.

Nothing in `public/content/ai-signals/*.json` changes except the two renamed enum
values in two files. All existing rendering is unaffected.

## Relationship to the Parallel Conceptual Model

A conceptual model developed in a separate session was reviewed against this design.
It independently arrived at the same two-level structure (dated signals vs.
interpretive phenomena), the same three-way stance vocabulary, many-to-many signal
attachment, and 6–8 domains — which is meaningful convergence.

**Adopted from it:** development paths; work-centred classification; structured
implications; interview and workshop findings as evidence; "counter-signal" and
"contextual" as stance names; its confirmation that investments belong as their own
genre.

**Adopted as stubs:** indicators (modelled, not built); related phenomena (reduced
from six relation types to three, no graph view).

**Adopted with a lower bound:** its scale target, adjusted to **30–40 at maturity
with 10 as a launch gate** (see *Scale and the launch gate*). Its 30–50 figure was
not taken as a production target because across 89 signals that is ~2 signals per
phenomenon — barely a cluster, and a drift back toward phenomena being news items
with better titles.

**Adopted in substance but not in form — its work-centred domain list.** A later
review proposed replacing the technology-leaning sectors with eight work-centred
domains. The diagnosis was right; the proposed list was not taken verbatim because
seven of its eight values duplicated the impact dimensions already in this spec,
which would have produced two near-identical taxonomies — the very conflation that
made the 13 `AISignalCategory` values ungroupable. Unifying into a single
work-dimension vocabulary achieves the same goal with one list instead of three.
Its `human-ai-collaboration-and-agency` was added as a dimension in its own right,
and then **merged back into `nature-and-division-of-work` during Phase 3** — the
division of labour between human and machine turned out to be what the nature of
work now means, so the boundary was not carrying weight. See *As built*.

**Retained over it:** the evidence rubric (now a drawer profile rather than a
score), the eight genres with type-specific fields, the primary-vs-commentary
distinction, freshness, and the whole pipeline. That model specifies "maturity"
without saying how one would defend it; this spec answers that with
`reachRationale`.

**Adopted from a later review round — the pressure/transformation split.** A review
of this spec's own worked example found that it described the present rather than
an emerging change, and that the evidence rubric would therefore have credited a
transformation claim with evidence that only established its premise. Both the
`currentPressure` field and the `supports` / `contextual` split come from that
critique. The error it identified would have been invisible in the output: the
numbers would have looked rigorous while overstating every forward-looking claim.
The split still does that work, now protecting the evidence profile rather than a
position.

**Adopted from a further review round — reach as the radial axis.** The final
structural change replaced evidence strength on the radius with `observedReach`.
See *Why not evidence strength*. The rubric survives as descriptive statistics; what
was removed is its authority over placement.

**Tension to watch — abstraction level.** Its example phenomena are broad and
thematic ("the economics and allocation of machine work are being redefined"); the
ones clustered from this corpus are narrower and empirical. Broad phenomena branch
into development paths naturally but resist falsification, and they also resist a
defensible reach call — it is much harder to say how far "the economics of machine
work are being redefined" has spread than how far automated first-pass review has.
`whatWouldChangeThis` and `reachRationale` are both forcing functions here: if
nobody can say what would change their mind, or where the change has actually
reached, the phenomenon is too abstract for this radar.

## Implementation Phasing

This spec is larger than one sitting. It is expected to become a plan in three
phases, each independently verifiable by `npm run build`:

1. **Schema and validation** — types, the two enum renames, three new genres, the
   work-dimension and actor configs, the extended validator. No UI. Verifiable on
   its own because the validator runs in the build.
2. **Bootstrap pipeline** — `radar:prepare` / `radar:apply` / `radar:accept` /
   `radar:derive`, the clustering prompt, and the first reviewed batch of phenomena
   committed as content. Produces real data for phase 3 to render.

   Three things in this phase are load-bearing and must not be trimmed for
   expedience: the `supports` / `contextual` stance test in the clustering prompt;
   the machine-owned / human-owned field split in `radar:apply`; and `observedReach`
   being writable only by a person. Dropping the first makes every evidence profile
   overstate, the second lets a routine run destroy authored research, and the third
   turns the radar's only axis back into a count of collected articles. All three
   are cheap to build now and expensive to retrofit.
3. **Radar UI** — components, drawer extension, drawer stack, site placement,
   `/phenomena/<id>/` deep links. `radar:snapshot` and editions come last, since
   there is nothing to snapshot until phenomena exist.
4. **Preview deployment** — `VITE_RADAR_PREVIEW`, `deploy-preview.yml`,
   `clean-exclude` on the production workflow, `noindex` on preview builds. Small,
   and it is what turns phases 1–3 into something colleagues can actually react to.

Phase 1 is a prerequisite for 2, and 2 for 3. Nothing in 3 blocks the site as it
stands today, since the radar is an added section, and nothing is publicly visible
until ten phenomena are published regardless of what has been merged.

## Open Questions

None blocking. Three items flagged for spec review:

1. `primary-research` as one genre with a `method` field, rather than separate
   `interview` and `workshop` genres.
2. ~~The nine work dimensions are a starting proposal~~ **Resolved: reduced to seven
   during Phase 3 (see *As built*).** They live in config specifically
   so they are cheap to change. `ethics-responsibility-and-society` is the least
   certain of them — it may prove to be a lens over the other eight rather than a
   dimension of work in its own right, in which case dropping it to eight sectors
   is a config edit.
3. The `actors` vocabulary is a first pass. It is optional per implication, so an
   incomplete list costs little, but it will need revisiting once the project's own
   interview and workshop material starts arriving and shows who the research
   actually distinguishes between.

---

## As Built — divergences from this spec

This spec was written before implementation. Where the code and this document
disagree, **the code is correct** and the reasons are recorded here. Phases 1 and 3
are merged or in review; Phases 2 and 4 are not started.

| This spec says | As built | Why |
| --- | --- | --- |
| Nine work dimensions | **Seven.** `human-ai-collaboration-and-agency` merged into `nature-and-division-of-work`; `organisation-and-coordination` + `leadership-governance-and-performance` merged into `organisation-and-leadership` | Reviewed against the rendered radar. Both boundaries split ideas that phenomena crossed constantly, and nine sectors squeezed rim labels until they lost meaning. |
| Deep links as `?phenomenon=<id>` | **`/phenomena/<id>/`** | The site already used paths for signals and insights. Consistency won. |
| `DrawerContent` extended in Phase 1 | **Deferred to Phase 3** | It breaks `tsc` until all five consumers are narrowed, which is not a types-only task. |
| `radar:score` | **`radar-derive.mjs`** | Not cosmetic: the old name implied it decided ring placement. It computes facts only. |
| `separate interview / workshop genres` | **One `primary-research` genre with a `method` field** | Extensible to further first-party methods without a new enum value each time. |
| Placement uses "deterministic hashing **with collision nudging**" | **Hashing only.** Angular inset raised 12% → 22% as a partial mitigation | Real nudging is still owed; recorded as a carry-forward in the Phase 3 plan. Invisible at six blips, near-certain to matter at 30–40. |

**Not yet built at all:** Phase 2's pipeline (`radar:prepare` / `apply` / `accept` /
`derive`, the clustering prompt, editions and `reachHistory` rendering) and Phase 4's
preview deployment. The six phenomena currently in `public/content/phenomena/` were
authored by hand, which is why Phase 2 is not on the critical path to seeing the
radar.

## Risks

| Risk | Mitigation |
| --- | --- |
| **Implications are fabricated.** An LLM will produce fluent implications that no evidence supports, and they are the least checkable part of a proposal. | Every implication traceable to the phenomenon's evidence; this is the main focus of accepting a batch. The validator cannot catch it — review must. |
| **Transformation claims are fabricated.** Asking the model to infer *where this is heading* from present-tense news is a far larger inferential leap than asking what items have in common. It will confidently name transformations that nothing supports. | The `supports` vs `contextual` split makes the leap visible rather than hidden: a phenomenon whose evidence is all contextual scores `weak` and sits at the rim, which is the honest answer. Review the stance assignments, not just the prose. |
| **Present-tense diagnoses slip through as phenomena.** They are easier to write, better evidenced, and read as more authoritative — so both the model and a tired reviewer will drift toward them. | Test 1 in *Two tests every phenomenon must pass*, quoted in the clustering prompt. `currentPressure` gives the diagnosis a legitimate home so it need not masquerade as the claim. |
| **Editorial load exceeds one reviewer.** 30–40 phenomena × 2–5 implications, plus theses, paths and titles, all falling on one person. | Launch gate means quality sets the pace, not a schedule. Nothing precludes adding reviewers later; the accept gate is PR review, which already supports more than one. |
| **Phenomena drift back into news.** Pressure to fill sectors or reach a count produces over-split, thin phenomena. | No bootstrap quota; `whatWouldChangeThis` and the two-implication minimum both resist thin entries. |
| **Corpus bias persists despite work-centred sectors.** The news finder still returns technology-heavy material, so some dimensions may stay empty. | Empty sectors are visible and informative — they show where the project needs its own primary research rather than more news. |
| **Reach is mistaken for certainty or impact.** A blip near the centre will read as "we are sure of this" or "this matters most". | Rings labelled `FIELD-LEVEL SHIFT` / `GAINING TRACTION` / `EARLY MANIFESTATIONS`; the evidence profile and `potentialImpact` shown separately in the drawer; `reachRationale` sits directly under the ring position. |
| **Traction inferred from article volume.** Ten pieces about one dark factory look like spread and are not. | Reach is never computed. The rationale must name *independent contexts* or *field effects*, not signal counts; raw counts are excluded from the drawer summary and the hover card. |
| **Forerunner cases prematurely called field-level.** The most interesting phenomena are the most tempting to overcall. | A short human-reviewed `reachRationale` is mandatory, and field-level requires a stated effect on expectations, operating models, institutions or competitive conditions — not merely impressive examples. |
| **Ring positions drift too easily.** Weekly runs nudging blips would make the axis meaningless. | Routine evidence linking cannot change `observedReach` at all; `radar:apply` is barred from the field and the validator enforces it. Movement requires a person and a `reachHistory` entry. |
| **Ring positions never change.** The opposite failure: with no automatic movement, a radar can silently freeze. | `radar:derive` raises `possibleReachChange` when evidence suggests replication or field effects; freshness shrinks blips that have gone quiet; the quarterly snapshot forces a look at every phenomenon. |
