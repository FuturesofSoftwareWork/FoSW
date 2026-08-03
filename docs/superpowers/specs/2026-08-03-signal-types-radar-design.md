# Signal Types & Radar Metadata — Design

**Date:** 2026-08-03
**Status:** Approved (pending spec review)

## Problem

All 84 published AI signals share one uniform shape. Three concrete problems follow.

**1. The uniform schema biases the news finder toward established signals.**
Every published signal carries `whyItMatters`, `recommendedActions`,
`risksAndCaveats` and `decisionHorizon` (83/84 each). To emit an item the finder
must produce confident leadership implications *and* concrete recommended
actions. A genuine weak signal — one engineer's firsthand blog post — cannot
honestly supply those, so the required fields act as a hidden filter that
squeezes out exactly the early signals the project wants. This is the root cause
of the "only finds mature, already-published items" complaint, and it lives in
the schema rather than in the prompt's ranking rules.

**2. Distinct genres are rendered identically.** `Jellyfish survey of 635
engineering leaders` (industry report), `EU AI Act obligations take effect
August 2` (regulatory deadline), `IssueTrojanBench` (academic benchmark) and
`Addy Osmani: code review is the most leveraged work` (practitioner opinion) all
render with the same fields and the same visual treatment. A reader cannot tell
a validated survey from a single unvalidated observation. For a VTT / University
of Helsinki research site, conflating evidence tiers is a credibility risk.

**3. `source` is overloaded free text.** It already strains to encode structure
the schema lacks, e.g.
`"Practitioner cost leaderboards (SSOJet; morphllm), corroborated by
agent-evaluation research (Holistic Agent Leaderboard / cost-of-pass)"`.

A **signal radar** is planned for the site. It needs structured position and
marker data that the current schema cannot supply.

## Goal

Introduce a `signalType` discriminator plus a small set of radar/provenance
fields, so that:

- weak signals can be published honestly without inventing recommended actions,
- readers can see at a glance what evidence tier an item is,
- the radar can position and mark every signal from structured data,
- data staleness (a fresh paper about old data) is visible rather than implied.

## Non-Goals

- **Building the radar itself.** This spec defines the data model and the drawer
  rendering it depends on. The radar visualisation is a separate project.
- No backfill of the 84 existing signals beyond a safe default (see Migration).
- No change to expert insights, the content-fetch pipeline, or `prerender.mjs`.
- No new content categories — the existing 13 `AISignalCategory` values stay.

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Typed signals? | Yes — 5 types, one shared schema with a `signalType` discriminator |
| Schema shape | Single interface + conditional required fields, **not** a TS discriminated union |
| Radar radius | **Time-to-impact** (`decisionHorizon`) — rings `now` → `0,5 - 2 years` → `2+ years` |
| Radar sector | **Category** (13 values, grouped into ~4 quadrants) |
| Certainty encoding | Marker fill/opacity from `signalStrength` — solid = established, hollow = weak |
| Type encoding | Marker shape/colour from `signalType` |
| `sponsor` on field reports | Keep — makes vendor-funded research visible |
| Practitioner opinion type | Not a separate type; folded into `weak-signal` |
| Convergent-pattern type | Not a type; the `corroboration` array already covers it |

### Why radius is time, not certainty

Certainty and timing usually co-vary (weak signals are both early and
uncertain), but they diverge on real cases the site will publish: EU AI Act
phase-2 obligations in 2029 are *highly certain but distant*, while
agent-driven code review is *uncertain but immediate*. Encoding certainty as
radius would place the 2029 regulation at the centre and read as urgent. Keeping
radius = time and certainty = marker fill lets a reader distinguish "we are
unsure this is real" from "this is real but distant".

## Signal Types

Five types. Each appears in the existing corpus and needs genuinely different
fields.

| Type | Marker | Definition | Type-specific fields (expected where known) | Core relaxation |
| --- | --- | --- | --- | --- |
| `weak-signal` | ◇ hollow | One named practitioner's firsthand, unvalidated observation or synthesis | `observer` (hard-required) | `recommendedActions` **optional** |
| `field-report` | ○ | Industry/vendor survey or benchmark report | `sampleSize`, `fieldworkPeriod`, `sponsor` | — |
| `study` | △ | Academic paper or formal benchmark | `dataCollectedPeriod`, `replicated` | — |
| `regulatory` | ▣ | Law, policy or standard with a real date | `effectiveDate` (hard-required), `jurisdiction` | `decisionHorizon` computed, not judged (see below) |
| `tool-shift` | ▶ | Release or capability change that alters practice | `version`, `availability` | — |

Marker glyphs above are indicative; final visual design belongs to the radar
project.

Except for `observer` on `weak-signal` and `effectiveDate` on `regulatory`
(both hard-required), the type-specific fields above are expected only where
the source states the value — never fabricated to satisfy the schema. This is
a research-communication site; an invented sample size or data-collection
window is a credibility risk, not a schema nicety.

### Field definitions

| Field | Type | Applies to | Meaning |
| --- | --- | --- | --- |
| `signalType` | enum (5 above) | all | Evidence genre; drives marker shape |
| `signalStrength` | `"weak" \| "emerging" \| "established"` | all | Certainty; drives marker fill |
| `signalStage` | `"leading" \| "concurrent" \| "lagging"` | all | Whether the item leads, matches or trails current practice |
| `leadTimeEstimate` | string | all | Human-readable lead time, e.g. `"~6-12 months"` |
| `corroboration` | string[] | all | Supporting source URLs; `[]` when single-source |
| `observer` | string | `weak-signal` | Who reported it and why they are credible |
| `sampleSize` | string | `field-report` | e.g. `"635 engineering leaders"` |
| `fieldworkPeriod` | string | `field-report` | When the data was gathered |
| `sponsor` | string | `field-report` | Funding/publishing organisation; `"independent"` if none |
| `dataCollectedPeriod` | string | `study` | When the study's data was gathered |
| `replicated` | boolean | `study` | Whether independently replicated |
| `effectiveDate` | `YYYY-MM-DD` | `regulatory` | When the obligation takes effect |
| `jurisdiction` | string | `regulatory` | e.g. `"EU"`, `"US-CA"` |
| `version` | string | `tool-shift` | Release identifier |
| `availability` | `"GA" \| "preview" \| "announced"` | `tool-shift` | Maturity of the release |

`dataCollectedPeriod` and `fieldworkPeriod` exist to surface staleness: a paper
published this week about data from early 2025 is visibly a lagging indicator
rather than appearing to be news.

For `regulatory` signals `decisionHorizon` is still written to the JSON (the
radar reads it uniformly for every signal), but it is **computed** from
`effectiveDate` rather than judged editorially: effective within 6 months →
`"now"`, within ~2 years → `"0,5 - 2 years"`, beyond → `"2+ years"`.

## Architecture

Three areas change. No new files in `src/`.

### 1. `src/types/content.ts`

Add the new unions and extend `AISignal`. All new fields are **optional** so the
84 existing signals stay valid.

```ts
export type SignalType =
  | "weak-signal" | "field-report" | "study" | "regulatory" | "tool-shift";
export type SignalStrength = "weak" | "emerging" | "established";
export type SignalStage = "leading" | "concurrent" | "lagging";
```

Two existing types are **stale and must be corrected** (see Correcting Existing
Types below): `DecisionHorizon` and `AISignalSourceType`.

### 2. `src/components/ContentDrawer.tsx`

The badge row (around lines 190–218) currently renders `category` and
`decisionHorizon`. Add:

- a **signal-type badge** — label + icon per `signalType`,
- a **strength badge** — `signalStrength`, visually weighted (solid for
  `established`, outline/faded for `weak`),
- an **evidence line** rendered beneath the date, assembled from whichever
  type-specific fields are present, e.g.
  `Survey · 635 engineering leaders · fieldwork Q1 2026 · sponsor: Jellyfish`
  or `Study · data collected 2025-01–2025-06 · not replicated`.

Each badge renders only when its field is present, matching the existing
`{data.x && ...}` pattern, so untyped legacy signals render exactly as today.

Per `CLAUDE.md`, all Tailwind classes must be written as full static strings —
no dynamic interpolation for per-type colours. Use an explicit lookup map from
`signalType` to a complete class string.

### 3. Finder pipeline

- `docs/ai-signals-finder-prompt.md` — add the five types, their required
  fields, and the rule that `recommendedActions` may be `[]` for `weak-signal`.
- `scripts/ledger.mjs` — no change required; it keys on URL/claim only.
- `scripts/collect-candidates.mjs` — no change required.

## Correcting Existing Types

Two type declarations are already wrong and will mislead implementation if left:

Counts below are over the 84 signals referenced by `index.json`, verified
2026-08-03.

- `DecisionHorizon = "2026" | "2027-2028" | "2029+"` — **zero** published files
  use these values. Actual values in use: `"now"` (59), `"0,5 - 2 years"` (16),
  `"0-6m"` (8), absent (1). Correct the type to
  `"now" | "0,5 - 2 years" | "2+ years"` and normalise the 8 `"0-6m"` files to
  `"now"`. The comma in `"0,5 - 2 years"` is retained deliberately: the value is
  rendered verbatim by `ContentDrawer` (line ~215), and changing it would create
  a fourth inconsistent variant across existing content.
- `AISignalSourceType = "Academic" | "Article" | "Social" | "Video"` —
  capitalised, but the data is predominantly lowercase: `article` (49),
  `academic` (17), `social` (5), plus stray capitalised `Academic` (3) and
  `Article` (2), and absent (8). The field is consumed nowhere in `src/`.
  Correct the type to lowercase, add `"discussion"` and `"release"` (both
  emitted by `collect-candidates.mjs`), and normalise the 5 stray capitalised
  values in content.

These went unnoticed because content is runtime-fetched and never type-checked.
That also means correcting them is safe: no rendering depends on them.

### Orphaned content files

Five signal files exist on disk but are absent from `index.json`, so they are
invisible to the site and to the radar:
`2026-02-05-01`, `2026-02-06-01`, `2026-02-06-02`, `2026-04-20-01`,
`2026-06-08-01`.

Decide per file whether to add it to `index.json` or delete it. The radar will
make the gap conspicuous, so this is resolved in the same pass.

## Migration

- All new fields are optional; the 84 existing signals remain valid and render
  unchanged.
- **No bulk backfill of `signalType`.** Legacy signals show no type badge until
  typed. Optionally backfill later by mapping `sourceType` (`academic` →
  `study`, `social` → `weak-signal`) as a starting point for manual review; not
  required by this spec.
- **Data normalisation is in scope** for this work:
  1. 8 files with `decisionHorizon: "0-6m"` → `"now"`.
  2. 5 files with capitalised `sourceType` (`Academic`, `Article`) → lowercase.
  3. 5 orphan files resolved — added to `index.json` or deleted.
  4. 1 file missing `decisionHorizon` and 8 missing `sourceType` — left as-is
     (both fields are optional and render conditionally).

## Testing

The project has no test runner. Verification is therefore:

1. `npm run build` — must pass (`tsc` + vite + prerender), catching type errors.
2. `npm run lint` — zero warnings.
3. Author one fixture signal per type (5 files, `status: "draft"` so they are
   not fetched) and confirm each renders its badges and evidence line correctly
   in the drawer.
4. Confirm an existing untyped signal (e.g. `2026-07-02-01.json`) renders
   identically to before.
5. Confirm the drawer renders correctly when a typed signal omits every optional
   field.

## Open Questions

None. Marker glyphs and colours are deliberately deferred to the radar project;
this spec fixes only the data model and drawer rendering.
