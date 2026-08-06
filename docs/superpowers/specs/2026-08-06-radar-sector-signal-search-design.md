# Radar sector-specific signal search — design

**Date:** 2026-08-06
**Status:** MVP scoped and written. One sector prompt shipped; nothing else built.

## Problem

The futures radar has seven work dimensions. Six phenomena exist, and the radar
does not render until ten are published. Coverage by `primaryDimension` today:

| Dimension | Phenomena |
| --- | --- |
| `nature-and-division-of-work` | 2 |
| `organisation-and-leadership` | 1 |
| `skills-knowledge-and-learning` | 1 |
| `careers-occupations-and-labour-markets` | 1 |
| `economics-productivity-and-value` | 1 |
| `worker-experience-identity-and-wellbeing` | **0** |
| `ethics-responsibility-and-society` | **0** |

Two sectors are empty. Not because nothing is happening in them, but because the
signal supply is one generic news-finder tuned for SDLC, tooling and productivity
material. Its search terms, its feeds, and its quotas all point away from the
empty sectors:

- `collect-candidates.mjs` searches Hacker News for `coding agent`, `Copilot`,
  `Cursor editor`, `agentic coding`; pulls Dev.to `ai`/`devops`/`programming`;
  reads r/ExperiencedDevs, r/devops, r/programming, r/LocalLLaMA; and watches
  GitHub releases. None of that samples wellbeing, identity or ethics.
- The finder prompt caps security/governance at 1 item per run — which is
  precisely the material an ethics sector run needs — and requires ≥60%
  practitioner sources and ≤2 academic items, which strains a sector whose
  rigorous evidence is survey- and study-shaped.

So the empty sectors stay empty, and the gap looks like an absence of phenomena
in the world rather than an absence of sampling.

## Approach

Add **sector-specific finder runs**: a targeted search aimed at one work
dimension, run when a sector looks thin.

Four decisions fix the shape:

1. **Targeting bites at both retrieval and scoring** — eventually. A sector needs
   both its own search vocabulary and its own editorial lens. (MVP defers the
   retrieval half; see *MVP scope*.)
2. **The sector is a run-time lens only.** No `workDimensions` field is added to
   the AI Signal schema. Published signal JSON is untouched, the validator is
   untouched, and legacy signals stay valid. The cost is that the sector link
   does not survive the run — accepted deliberately to keep the change cheap and
   reversible.
3. **Each sector gets a standalone full prompt**, not a shared base plus
   overrides. This duplicates the base prompt's structure per sector, which would
   normally invite drift — but see decision 4, which makes the duplication carry
   real weight.
4. **Sector prompts replace the base quotas entirely** rather than overriding
   named ones. Each sector defines its own source mix from scratch. Given that,
   the parts of the prompt that differ per sector *are* the parts that would have
   needed overriding, so a standalone file is the honest representation.

**Invocation:** each sector is launched by hand as its own job from Claude Code
desktop while the approach is still being tuned. That keeps token cost visible
and avoids building scheduling machinery around a method nobody has validated
yet. Automation comes after the method is proven.

## MVP scope

**Sector:** `worker-experience-identity-and-wellbeing`.

**Deliverable:** one file —
`docs/sector-prompts/worker-experience-identity-and-wellbeing.md`.

**Not built:** the `--dimension` flag on `collect-candidates.mjs`, the
`scripts/lib/radar-sectors.mjs` vocabulary config, the other six sector prompts,
any cron wiring. No code changes at all.

### Why no collector, and the question it leaves open

The candidate collector exists for a documented reason, recorded in its own file
header: a generic web search "never surfaces fresh practitioner/social posts
well, which is why the finder only ever returned published articles + arXiv."

That is a *ranking* problem, not a capability one. Search engines rank by
relevance and authority, favouring older, well-linked, mainstream material —
exactly the "do not mistake retrievability for importance" bias the base prompt
warns against. The collector defeats it by pulling raw feeds with
recency-and-threshold filters (`search_by_date` with `points>30`, Reddit
top-of-week, Dev.to top-by-tag) that no search engine exposes.

For this sector the bias splits:

- **Web search will reach** the large developer surveys, HCI/CSCW and
  occupational-psychology research, and journalism. Retrievable, citable, mostly
  lagging indicators.
- **Web search will likely miss** the r/ExperiencedDevs and r/cscareerquestions
  threads, personal blog posts and LinkedIn material where someone describes what
  agent-mediated work did to their sense of craft. Which is the leading
  practitioner evidence this publication values most.

The prediction is therefore that a prompt-only run returns items but skews
survey-and-study-heavy. **Nobody knows if that is true**, and building a
sector-aware collector on an unvalidated hunch is the expensive mistake here.

So the MVP is instrumented to answer the question rather than assume it. The
prompt requires a third output file,
`data/_finder-report-worker-experience-identity-and-wellbeing.md`, recording the
queries actually run, a venue breakdown of selected items, the named-individual
count against the prompt's ≥50% floor, the venues the run could not reach, and a
specific verdict on whether a collector would have helped and which feeds it
would need.

That report is the input to the build-or-not decision. A thin run is a valid
result provided the report distinguishes "no signal exists" from "I could not
reach the signal."

## What the sector prompt does differently

Departures from `docs/ai-signals-finder-prompt.md`, each with its reason:

| Departure | Reason |
| --- | --- |
| **Altitude test replaced.** "Could a VP act on this without opening a terminal?" → "Is this a specific, situated account of experiential change with a mechanism tied to AI adoption?" | The generic test filters material that is too technical. This sector's failure mode is material that is too vague — AI-anxiety think-pieces, wellness advice with no AI mechanism. |
| **Explicit sector boundary table.** Layoffs → careers; reskilling → skills; org design → organisation; and so on. | Wellbeing headlines are worn by items belonging to four other sectors. Boundary test: a labour-market item is about the job, a wellbeing item is about the person doing it. |
| **Freshness window widened** to 14–30 days from 7–14. | Experiential shifts surface more slowly than tool releases. A thread describing six months of accumulating strain is current signal even at three weeks old. |
| **Quotas rewritten.** Security cap dropped; academic raised to 4 and explicitly not treated as lagging; surveys and field reports promoted to first-class; comment threads made primary sources. | HCI and occupational-health research is often the only rigorous evidence on cognitive load and trust, and it frequently leads practitioner discourse here rather than trailing it. |
| **New floor: ≥50% of items must carry a named or identifiable individual describing their own experience.** | Counterweight to the loosened academic cap. A run of four well-sourced surveys and no human voice is a failed sector run, not a cautious one. |
| **Venue list added.** Forums, personal blogs, social, surveys, research venues, journalism. | Stands in for the missing candidate pool. Without it "search the web" collapses to whatever ranks. |
| **Prompt does its own ledger dedupe.** | No collector means nothing is pre-filtered; already-seen URLs return looking new. |
| **Distress-selection hazard section, mandatory.** | Forums over-represent distress: people post when something is wrong. Unaddressed, this sector yields a systematically bleak picture that looks rigorous. Requires named selection-bias caveats on forum-sourced items and active hunting for disconfirming accounts. |
| **Retrieval report required.** | The experiment, described above. |
| **Commercial-intent discount retained and re-aimed** at developer-wellbeing and DevEx vendors. | Same failure mode as the base prompt's AI-security vendors — high-volume SEO content about precisely this sector. |

The output schema is unchanged, per the run-time-lens decision.

## Run order

```bash
npm run signals:prepare
# run docs/sector-prompts/worker-experience-identity-and-wellbeing.md
npm run signals:reconcile -- data/_finder-output-worker-experience-identity-and-wellbeing.json \
  --rejected data/_finder-rejected-worker-experience-identity-and-wellbeing.json
```

`signals:collect` is skipped. Output filenames are sector-suffixed so a sector
run can never overwrite a generic weekly run's output. `reconcile` already takes
a path argument, so no script change is needed.

## Testing

Nothing to unit-test: the MVP adds no code. Validation is empirical — run the
prompt, read the retrieval report, judge whether the items are in-sector and
whether they could support a phenomenon.

Two failure modes to watch on the first run, because both look like success:

- **Boundary leakage** — items that are really careers or skills signals wearing
  a wellbeing headline. Check each selected item against the boundary table.
- **Uniform bleakness** — every item negative, every source a forum. Check the
  named-individual count and whether disconfirming evidence was genuinely hunted.

## Next steps, in order

1. Run the wellbeing sector prompt. Read the retrieval report.
2. Decide from that report whether to build the sector-aware collector. If yes,
   the shape is already scoped: a `--dimension <id>` flag on
   `collect-candidates.mjs` swapping in per-sector vocabulary from a new
   `scripts/lib/radar-sectors.mjs`, keyed by the seven ids in
   `src/config/radarDimensions.ts` and mirror-tested against them exactly as
   `WORK_DIMENSION_IDS` in `scripts/lib/phenomenon-schema.mjs` already is
   (`scripts/__tests__/config.test.mjs`). Output to `data/_candidates-<id>.json`
   so a sector pool never overwrites the generic one; unknown id exits with the
   valid list.
3. Write the `ethics-responsibility-and-society` prompt second — the other empty
   sector, and the one the base prompt's security cap suppresses hardest.
4. Only once several sectors have produced usable signal, consider automating
   the rotation.

## Deliberately not done

- **No schema change.** No `workDimensions` on signals. Revisit only if
  "which signals back sector X" becomes a question worth paying for.
- **No auto gap detection.** A script picking the thinnest sector can only see
  phenomena, not signal coverage, given the no-schema-change decision — so it
  would be guessing with machinery.
- **No cron rotation.** Manual launch while the method is unproven.
- **Six sector prompts unwritten.** Writing seven prompts before validating one
  multiplies an unvalidated method by seven.
