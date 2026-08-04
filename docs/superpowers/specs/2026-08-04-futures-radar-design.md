# Futures Radar — Design Spec

**Date:** 2026-08-04
**Status:** Approved (pending spec review)
**Supersedes:** `docs/superpowers/specs/2026-03-30-futures-dashboard-design.md` (radar portion only)

A foresight radar on the main site, showing **phenomena** — interpretive claims about
how AI is changing software work — positioned by how well the evidence supports them
and backed by the AI-signal corpus this project already collects.

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
coherent claim about change, supported by many observations. Clustering the corpus
by hand finds roughly 8–12 phenomena. Examples:

- *Review, not generation, is the binding constraint* — ~10 items (`Opsera: 4.6x
  longer review waits`, `LinearB: AI PRs accepted 32.7% vs 84.4%`, `Cloudflare:
  131,000 reviews`, `Faros: throughput is no longer the bottleneck`, …)
- *The harness, not the model, determines agent capability* — ~7 items
- *AI is an amplifier; the org, not the tool, is the bottleneck* — ~10 items

Publishing at ~15 news items per month, a one-blip-per-item radar reaches 240+
blips within a year. A phenomenon radar grows to a bounded 30–40 and then mostly
deepens: a year of further collection makes it *better evidenced* rather than more
crowded.

## Goal

A radar of phenomena where:

- position is derived from **auditable properties of the evidence**, not from a
  count of how many items happened to be collected,
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
- **Any admin UI, auth, or hosted review tool.** The accept gate is PR review.
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
| Radius (default) | `strength` — established at centre, weak at rim |
| Radius (alternate) | `potentialImpact`, via a header toggle |
| Sectors | Domains, config-driven, `360/N`, initially 7 |
| Blip size | Freshness (how recently reinforced) |
| Contested marker | Lightning bolt inside the blip, no ring |
| Strength basis | A four-criterion rubric, never a raw count |
| Time horizon | **Rejected** — see below |
| Review gate | PR review of proposed draft JSON |
| Reviewer model | Single reviewer now; nothing precludes more later |
| Editions | Live current state + quarterly snapshots for movement |
| Scale | ≥10 phenomena at launch, 30–40 at maturity |
| Naming | `label` (blip) + `title` (headline) + `thesis` (precise claim) |

### Why radius is certainty, not time

Certainty and timing co-vary but diverge on real cases. Encoding time would place a
distant-but-certain regulation at the centre and read as urgent. More decisively,
the data shows time-to-impact collapses to `now` in practice (69/89), because the
finder surfaces present-tense news and everything in AI feels immediate.

Established at the centre also matches foresight theory: weak signals sit at the
**periphery of perception**. The rim is where you are least certain and looking
hardest, reinforced visually by a light centre fading to a dark rim.

### Why there is no time horizon field

A dated horizon is the one field on a foresight radar guaranteed to be wrong and
permanently checkable — `2027–2028` ages into an embarrassment in a way `emerging`
never does. Reasonable experts also disagree sharply about pace, so the field
invites argument about the least defensible thing on the page.

Thoughtworks' *Adopt / Trial / Assess / Hold* is not an alternative here: it is an
adoption recommendation for tools a team chooses, and one does not "adopt" the
junior hiring cliff. `weak / emerging / established` **is** the standard foresight
maturity vocabulary, so `strength` already fills that slot; a second undated
ordinal beside it would be two three-point scales meaning nearly the same thing.

`potentialImpact` is added instead. It is non-temporal, orthogonal to strength, and
completes the canonical foresight matrix — **high impact × weak evidence** is the
quadrant weak-signal scanning exists to surface, and the radar could not express it
otherwise.

## Conceptual Model

Five entities. Only the first two are built now.

| Entity | What it is | Built? |
| --- | --- | --- |
| **Signal** | A dated observation with a source. The existing `AISignal`. | exists |
| **Phenomenon** | An interpretive claim about change, supported by signals. The radar blip. | **new** |
| **Domain** | Thematic classification of phenomena. The radar sector. | **new (config)** |
| **Development path** | One possible direction a phenomenon could evolve in. | **new (optional field)** |
| **Indicator** | A measure tracked over time to monitor a phenomenon. | modelled only |

The editorial rule, which should be quoted in the clustering prompt verbatim:

> Signals describe what has been observed. A phenomenon interprets what may be
> changing. Development paths express where that change could lead.

## Scale

**At least 10 phenomena at launch; 30–40 as the mature radar.**

The lower bound is a real requirement on the bootstrap pass: fewer than 10 blips
does not read as a radar, it reads as a list drawn in a circle. Hand-clustering the
89 signals found 8–12 candidates, so 10 is reachable from the current corpus but
not comfortably — the bootstrap should be prepared to split broader clusters, and
some launch phenomena will legitimately sit at `weak` with two or three sources.
That is honest, and the rim is where they belong.

The upper end arrives as the corpus grows and as `primary-research` (interviews,
workshops) starts contributing signals the news finder cannot see. Growth should
come from evidence forcing a split, never from a target number.

Design consequences of 30–40, all already accommodated:

- Labels default **off** above 15 blips, so the mature radar is hover-driven and
  the launch radar is directly labelled.
- Sector count is config-driven, so seven domains at ~5 blips each stays legible.
- Placement uses deterministic hashing with collision nudging rather than manual
  angles, so no per-blip layout work accrues as the count rises.
- The domain legend doubles as a filter, which is what makes 40 blips navigable.

## Data Model

### New content type: `public/content/radar-signals/`

Same shape as the other content types — an `index.json` plus one file per
phenomenon, fetched at runtime.

```jsonc
{
  "id": "review-is-the-binding-constraint",
  "label": "The review wall",
  "title": "Writing code got cheap. Reading it didn't.",
  "thesis": "Generation capacity has outrun the human capacity to review it. Teams adopting AI coding see throughput rise and merge rates fall, and the queue moves from writing code to approving it.",
  "status": "published",

  "domain": "engineering-practice",
  "impacts": ["nature-and-division-of-work", "organisation-and-coordination"],
  "potentialImpact": "high",

  "evidence": [
    { "signalId": "2026-01-29-02", "stance": "supports",    "primary": true,  "note": "4.6x longer review waits" },
    { "signalId": "2026-05-25-03", "stance": "supports",    "primary": true,  "note": "AI PRs accepted 32.7% vs 84.4%" },
    { "signalId": "2026-06-15-01", "stance": "supports",    "primary": false, "note": "practitioner synthesis of the above" },
    { "signalId": "2026-04-20-01", "stance": "contextual",  "primary": true,  "note": "Cloudflare shows it is automatable at scale" }
  ],

  "strength": "established",
  "strengthBasis": {
    "independence": 3,
    "triangulation": 3,
    "persistence": 3,
    "consistency": "consistent"
  },
  "strengthOverride": null,
  "contested": false,

  "firstObserved": "2026-01-29",
  "lastReinforced": "2026-06-15",

  "movement": [
    { "edition": "2026-Q1", "strength": "emerging" },
    { "edition": "2026-Q3", "strength": "established" }
  ],

  "whatWouldChangeThis": [
    "Merge-rate parity between AI and human PRs sustained over two quarters"
  ],

  "developmentPaths": [],
  "related": [],
  "indicators": []
}
```

Field notes:

| Field | Notes |
| --- | --- |
| `label` | 2–4 words. The radar blip label. Must be legible at a glance beside a dot. |
| `title` | The headline, shown in the drawer and legend. Written to make a reader want the description. |
| `thesis` | 2–4 sentences. The interpretive claim, stated so it could be wrong. |
| `domain` | One value from the domains config. Drives sector placement. |
| `impacts` | Zero or more work dimensions. Not rendered on the radar; drawer + filter. |
| `potentialImpact` | `low` \| `moderate` \| `high` \| `transformative`. Alternate radius. |
| `evidence[].stance` | `supports` \| `counter` \| `contextual`. |
| `evidence[].primary` | `false` when the item is commentary on another source rather than its own observation. Drives the independence count. |
| `strength` | Written by `radar:score`, never hand-edited. |
| `strengthBasis` | The four rubric inputs, stored so the ring position is auditable. |
| `strengthOverride` | Editorial override when the rule is wrong. Non-null wins. |
| `contested` | Derived from `consistency`. Renders the lightning bolt. |
| `lastReinforced` | Max evidence date. Drives freshness. |
| `movement` | Appended by `radar:snapshot`, never hand-edited. |
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
| `label` | Fits beside a dot | *The review wall* |
| `title` | Makes a reader want the description | *Writing code got cheap. Reading it didn't.* |
| `thesis` | Precise enough to be wrong | *Generation capacity has outrun the human capacity to review it…* |

More worked examples for the clustering prompt:

| `label` | `title` |
| --- | --- |
| Harness over model | *The model isn't the product. The harness is.* |
| AI as amplifier | *AI doesn't fix your organisation. It magnifies it.* |
| The missing rung | *If AI does the junior work, where do seniors come from?* |
| Token Jevons | *Prices fell 60%. The bill went up 18x.* |

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

### Domains config

`src/config/radarDomains.ts` — a plain array. Sector angles are `360 / N`, computed
from its length, so adding or renaming a domain is an edit to this file and nothing
else. Colours are supplied as hex and applied as SVG `fill` / `stroke` attributes,
**not** as Tailwind class names, so `CLAUDE.md`'s no-dynamic-class rule is not
violated.

Initial seven:

| id | label | colour |
| --- | --- | --- |
| `agents-and-autonomy` | Agents & Autonomy | `#22d3ee` |
| `tooling-and-interfaces` | Tooling & Interfaces | `#a855f7` |
| `engineering-practice` | Engineering Practice | `#0EA5E9` |
| `security-and-trust` | Security & Trust | `#ef4444` |
| `economics-and-markets` | Economics & Markets | `#F59E0B` |
| `organisation-and-governance` | Organisation & Governance | `#4ade80` |
| `people-and-capability` | People & Capability | `#f472b6` |

### Impact dimensions

`src/config/radarImpacts.ts`, from the project's own framing:

`nature-and-division-of-work` · `organisation-and-coordination` ·
`leadership-governance-and-performance` · `skills-and-learning` ·
`careers-and-labour-markets` · `worker-autonomy-identity-and-motivation` ·
`workload-wellbeing-and-social-relations` · `economics-and-distribution-of-value`

Domains classify *what the phenomenon is about*; impacts describe *what part of
work it changes*. The existing 13 `AISignalCategory` values conflate these two —
`AI Agents` is a topic, `Work Wellbeing` is an impact — which is why they never
grouped cleanly into sectors. Categories on news items are left alone; the split
applies to phenomena only.

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
collides directly with `signalStrength`, which is the radar's radius: "a
`weak-signal` that is `established`" is sayable and meaningless. The ~14 items in
that bucket share a real form: a named practitioner reporting from their own work.

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

### Scoring consequences

- `forecast` is **excluded** from independence and triangulation. It may be
  attached to a phenomenon for context and shown in the drawer, but it never
  strengthens a claim.
- `field-report` items sharing a `sponsor` collapse to **one** independent source.
  Five vendor surveys by five vendors selling engineering analytics are not five
  independent observations. This matters: `field-report` is the largest genre at
  ~33, and it contains both `DORA` / `Stanford AI Index` and
  `Jellyfish` / `Harness` / `LinearB` / `Faros`.
- `primary-research` **does** count — it is independent first-party evidence.

## Strength

Derived, never a raw count. Counting collected items measures collection effort,
not the world: sources skew to certain topics, recent months are more densely
collected, and ten items can all re-report one underlying survey.

### The four criteria

| Criterion | Question | Computed from |
| --- | --- | --- |
| `independence` | How many distinct primary sources? | count of `evidence[]` with `primary: true`, excluding `forecast`, collapsing same-`sponsor` field reports |
| `triangulation` | How many of the eight genres back it? | distinct `signalType` among primary evidence, excluding `forecast` |
| `persistence` | Does it recur, or was it one burst? | distinct quarters spanned by evidence dates |
| `consistency` | Do sources agree on direction? | mix of `stance` values |

Three of the four are fully computable. `primary` is the single human judgment
required per evidence item, and it is an easy one: *is this its own observation, or
commentary on someone else's?*

### Thresholds

```
established   independence >= 3
        AND   triangulation >= 2, including at least one of study | field-report | primary-research
        AND   persistence >= 2 quarters
        AND   consistency = consistent

emerging      ( independence >= 2  OR  >= 1 primary study )
        AND   consistency != contested

weak          anything below

contested     >= 2 counter-signals  OR  counter >= one third of supporting
```

"A primary study" means one `evidence[]` entry with `signalType: "study"` and
`primary: true` — the parenthesisation matters, so it is written explicitly above.

`contested` is orthogonal to strength — a phenomenon can be well evidenced *and*
contested. The junior-developer cluster is the live example: `67% drop in
entry-level postings` and `Harvard: 7.7% junior employment decline` against
`hiring rebounds: 67,000+ positions` and `SignalFire: engineering most resilient`.
Being able to say "we have strong evidence in both directions" is more honest than
picking a side, and most radars cannot express it.

Thresholds are tunable constants in `scripts/radar-score.mjs`.

## Freshness

`freshness = today − lastReinforced`, bucketed into four steps driving blip radius:

| bucket | age of `lastReinforced` | blip radius |
| --- | --- | --- |
| `current` | within the current quarter | 9 |
| `recent` | 3–6 months | 7.5 |
| `ageing` | 6–12 months | 6 |
| `stale` | over 12 months | 4.5 |

Orthogonal to strength, and it
answers a question the ring cannot: *is this still moving, or did we last see
evidence a year ago?* Silent staleness is a real failure mode for a foresight
instrument. It also gives the pipeline a job — flag phenomena that have gone quiet.

## Radar Visualisation

New component tree under `src/components/Radar/`:

```
FuturesRadar.tsx      section wrapper, header controls, data loading
RadarCanvas.tsx       SVG: rings, sector borders, gradient, labels
RadarBlips.tsx        blip rendering + hover
useRadarLayout.ts     phenomenon -> (x, y) placement
radarFreshness.ts     today - lastReinforced -> bucket
```

The client computes **freshness only**. `strength` and `contested` are read
straight from the JSON, where `radar-score.mjs` already wrote them — there is no
second scoring implementation to keep in sync. Freshness is client-side purely
because it depends on today's date.

### Geometry

- **Full circle.** Rings from a light centre fading to a dark rim, reinforcing
  established-at-centre.
- **Three rings**, labelled on the vertical spine with a dark backing so they stay
  readable over the gradient: `ESTABLISHED` / `EMERGING` / `WEAK`. Always visible,
  not hidden behind the labels toggle.
- **Sector borders** drawn as radial lines at `360/N`, with domain labels around
  the rim in the domain colour.
- **Placement** within a sector×ring cell by deterministic hash of the phenomenon
  `id`, so a blip does not jump between renders, with simple collision nudging.

### Encodings

Three things to learn, and no more:

| Channel | Meaning |
| --- | --- |
| Ring | `strength` (or `potentialImpact` in the alternate mode) |
| Colour | `domain` |
| Size | freshness |
| Lightning bolt inside the blip | `contested` |

Strength is deliberately **not** repeated in fill, opacity, or glow — position
already carries it. The bolt is the only modifier and carries no ring around it,
which would both duplicate it and fight the domain colour.

### Header controls

- **Radius mode** — `by evidence` (default) / `by impact`. Same layout algorithm,
  rings relabelled `low` → `transformative`. Lets a reader find what is potentially
  transformative but still thinly evidenced. The default view must stand alone,
  since a first-time visitor may not notice the toggle.
- **Labels** — on/off. Direct labels beside each blip; default off above 15 blips,
  on below. With labels off, hover shows name, evidence count, and strength.
- **Domain legend**, doubling as filters, following the existing `SignalControls`
  pattern.

### Responsive

Below the mobile breakpoint: labels forced off, tap replaces hover, and the
component falls back to a legend list beneath the circle so nothing is
unreachable.

## Interaction

Extend `DrawerContent` with `{ type: "phenomenon"; data: RadarSignal }`. No new
drawer component — `ContentDrawer` already handles signals and insights and already
renders type badges and evidence lines.

The phenomenon view shows: thesis · domain and impacts · strength with
`strengthBasis` visible · freshness · evidence grouped by stance · development
paths · related phenomena · `whatWouldChangeThis` · movement history.

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

**One deliberate departure:** `useContent` falls back to `defaultContent` on fetch
failure. The radar instead **hides its section entirely**. A stale hardcoded
research claim presented as current is worse than no radar.

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

Review the PR diff, flip `status` to `published`, merge. That is the accept gate.

The bootstrap must yield **at least 10 publishable phenomena**. If a first pass
returns fewer, the fix is to split over-broad clusters rather than to lower the
bar — a phenomenon that only reaches `weak` is a legitimate blip, and the rim is
where it belongs.

### Ongoing (each finder run)

After `signals:reconcile`, `radar:prepare --since <date>` digests only new items.
The LLM proposes either *attach to existing phenomenon* (with `stance` and
`primary`) or *propose new phenomenon*. `radar:apply` merges, rescores, and updates
`lastReinforced`. Review the diff.

The LLM's job is narrow and well-suited to it: *does this item support, counter, or
contextualise this claim, and is it a primary source or commentary on one?*

### Scripts

| Script | Role |
| --- | --- |
| `scripts/radar-prepare.mjs` | Build the digest fed to the clustering prompt |
| `scripts/radar-apply.mjs` | Apply a proposal to phenomenon JSON; the only writer |
| `scripts/radar-score.mjs` | Pure rubric → strength/contested/freshness |
| `scripts/radar-snapshot.mjs` | `-- 2026-Q4` — append `movement` entries |

`docs/radar-clustering-prompt.md` is the prompt, alongside the existing finder
prompt.

### Editions

The radar shows **current state**, not the last frozen edition — attaching evidence
moves a blip immediately, which is the payoff for running the pipeline at all.
Editions are the historical record: `radar:snapshot` appends a `movement` entry to
every published phenomenon. `public/content/radar-signals/editions.json` holds
`{ id, label, publishedAt, notes }`.

**Movement is drawer content, not a radar marker.** Comparing current strength
against the last snapshot yields new / strengthened / weakened / stable, and that is
shown in the phenomenon drawer as movement history. It is deliberately *not* drawn
as arrows or hollow blips on the radar, which would add a fourth visual vocabulary
to a design kept to three channels on purpose.

Movement will be thin at launch — the corpus starts January 2026, giving roughly
three backfillable quarters — and gets genuinely interesting after a year.

## Validation

The project has no test runner, so `scripts/validate-signals.mjs` **is** the test
suite, and it already runs as the first step of `npm run build`. Extend it to:

1. Every `evidence[].signalId` resolves to a real **published** signal. A dangling
   reference **fails the build** — the most likely error and the least visible.
2. All new enums valid: `domain` in the config, `impacts` in the config, `stance`,
   `potentialImpact`, `signalType` (eight values), `status`.
3. `index.json` ↔ file consistency and `id` ↔ filename agreement, as for signals.
   Plus `label` present and ≤ 4 words (it has to fit beside a dot), and `title`
   and `thesis` both present and distinct from each other.
4. `strength` matches what `radar-score` computes, unless `strengthOverride` is set
   — catching hand-edited strengths.
5. A coverage report — e.g. `62 of 89 signals map to a phenomenon` (illustrative
   figure, not a target). Not an error; uncovered news items are expected and fine.
   Printed so drift is visible.

Manual verification, per the existing convention:

- `npm run build` passes (validator + `tsc` + vite + prerender).
- `npm run lint` — zero warnings.
- Radar renders with labels on and off, in both radius modes, with a domain filter
  active, and at mobile width.
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

**Adopted from it:** development paths; the domain/impact split; interview and
workshop findings as evidence; "counter-signal" and "contextual" as stance names;
its confirmation that investments belong as their own genre.

**Adopted as stubs:** indicators (modelled, not built); related phenomena (reduced
from six relation types to three, no graph view).

**Adopted with a lower bound:** its scale target, adjusted to **30–40 eventually,
at least 10 at launch** (see *Scale*). Its 30–50 figure was not taken as-is because
across 89 signals that is ~2 signals per phenomenon — barely a cluster, and a drift
back toward phenomena being news items with better titles.

**Retained over it:** the strength rubric, the eight genres with type-specific
fields, the primary-vs-commentary distinction, freshness, derived and auditable
scoring, and the whole pipeline. That model specifies "maturity" without saying how
one would defend it.

**Tension to watch — abstraction level.** Its example phenomena are broad and
thematic ("the economics and allocation of machine work are being redefined"); the
ones clustered from this corpus are narrower and empirical ("review is the binding
constraint"). Broad phenomena branch into development paths naturally but resist
strength scoring and falsification. `whatWouldChangeThis` is the forcing function:
if nobody can say what would change their mind, the phenomenon is too abstract for
an evidence-based radar.

## Implementation Phasing

This spec is larger than one sitting. It is expected to become a plan in three
phases, each independently verifiable by `npm run build`:

1. **Schema and validation** — types, the two enum renames, three new genres, the
   domain and impact configs, the extended validator. No UI. Verifiable on its own
   because the validator runs in the build.
2. **Bootstrap pipeline** — `radar:prepare` / `radar:apply` / `radar:score`, the
   clustering prompt, and the first reviewed batch of phenomena committed as
   content. Produces real data for phase 3 to render.
3. **Radar UI** — components, drawer extension, drawer stack, site placement.
   `radar:snapshot` and editions come last, since there is nothing to snapshot
   until phenomena exist.

Phase 1 is a prerequisite for 2, and 2 for 3. Nothing in 3 blocks the site as it
stands today, since the radar is an added section.

## Open Questions

None blocking. Two items flagged for spec review:

1. `primary-research` as one genre with a `method` field, rather than separate
   `interview` and `workshop` genres.
2. The initial seven domains are a starting proposal. They live in config
   specifically so they are cheap to change, and some overlap with the impact
   dimensions (`organisation-and-governance` vs `organisation-and-coordination`) is
   expected and acceptable — domains classify the phenomenon, impacts describe its
   consequences.
