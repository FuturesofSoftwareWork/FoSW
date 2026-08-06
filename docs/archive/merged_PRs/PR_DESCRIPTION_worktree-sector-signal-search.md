# Radar sector-specific signal search — MVP

Adds a **sector run**: a targeted news-finder pass aimed at a single radar work
dimension. Documentation only — no code, no schema change, nothing in
`public/`.

## Why

The radar renders at ten published phenomena and has six. Two of its seven
sectors have **no** phenomenon at all: `worker-experience-identity-and-wellbeing`
and `ethics-responsibility-and-society`.

That is a sampling problem, not a world problem. The one generic finder is tuned
for SDLC and tooling signal — `collect-candidates.mjs` searches HN for
`coding agent` / `Copilot` / `Cursor editor`, pulls Dev.to `ai`/`devops`, reads
r/devops and r/LocalLLaMA, watches GitHub releases — and the prompt caps
security/governance at one item per run and academic work at two. None of that
samples wellbeing or ethics. The empty sectors stay empty and it looks like
nothing is happening in them.

## What this adds

- `docs/sector-prompts/worker-experience-identity-and-wellbeing.md` — the MVP.
  A standalone finder prompt for one sector.
- `docs/superpowers/specs/2026-08-06-radar-sector-signal-search-design.md` —
  design and decision record.
- `docs/superpowers/HANDOVER-sector-signal-search.md` — pick-up-cold handover.
- `docs/ai-signals-pipeline.md` — new "Sector runs" section.

## Design decisions

1. **Sector is a run-time lens only.** No `workDimensions` field on signals.
   Published JSON, the validator and legacy content untouched. Cost: the sector
   link does not outlive the run. Accepted to keep this cheap and reversible.
2. **Standalone prompt per sector**, not base-plus-overrides.
3. **Sector prompts replace the base quotas entirely.** This is what makes (2)
   honest — the parts that differ per sector are exactly the parts that would
   otherwise need overriding.
4. **Manual launch, one job per sector**, while the method is unproven.

## How the wellbeing prompt differs from the generic one

- **Altitude test replaced.** The generic test filters material that is too
  technical; this sector's failure mode is material that is too vague. New test:
  is this a specific, situated account of experiential change with a mechanism
  tied to AI adoption?
- **Sector boundary table.** Layoffs → careers; reskilling → skills; org design →
  organisation. A labour-market item is about the job; a wellbeing item is about
  the person doing it.
- **Quotas rewritten.** Security cap dropped, academic raised to 4 and not
  treated as lagging (HCI and occupational-health work is often the only rigorous
  evidence here), surveys promoted to first-class, comment threads made primary
  sources. Counterweight: **≥50% of items must carry a named individual
  describing their own experience.**
- **Distress-selection hazard section, mandatory.** Forums over-represent
  distress — people post when something is wrong. Unaddressed, this sector yields
  a systematically bleak picture that looks rigorous. Requires named
  selection-bias caveats on forum-sourced items and active hunting for
  disconfirming accounts.
- **Freshness window widened** to 14–30 days: experiential shifts surface more
  slowly than tool releases.

## The experiment embedded in the MVP

There is deliberately **no `signals:collect` step**. The open question is whether
a sector run needs a sector-aware collector or whether web search suffices.

Prediction on record: web search will find the surveys, HCI research and
journalism (retrievable, mostly lagging) and under-find the forum threads and
personal posts (hard to retrieve, most valuable). Unverified.

So the prompt requires a third output file,
`data/_finder-report-<dimension-id>.md`, recording queries actually run, venue
breakdown of selected items, the named-individual count, venues that could not be
reached, and a specific verdict on whether a collector would have helped. That
report decides whether the `--dimension` flag and
`scripts/lib/radar-sectors.mjs` get built at all.

## Verification

No code changed, so there is nothing to unit-test. `npm run build` and
`npm test` behaviour is unaffected. Validation is empirical: run the prompt and
read the retrieval report.

**Not yet run.** The first run is the next action, and the two failure modes to
watch both look like success: boundary leakage (careers items wearing a
wellbeing headline) and uniform bleakness.

## Not in scope

`--dimension` on the collector, `scripts/lib/radar-sectors.mjs`, the other six
sector prompts, cron rotation, automatic thinnest-sector detection, any schema
change.
