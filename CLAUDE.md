# CLAUDE.md

## Project Overview

Alternative Futures of Software Work — a research communication site by VTT, University of Helsinki, and Business Finland. Displays AI news signals and expert insight articles about the future of software development.

## Tech Stack

- **Framework:** React 18 + TypeScript (strict mode)
- **Build:** Vite 5 (`npm run build` runs `tsc && vite build`)
- **Styling:** Tailwind CSS 3 with `@tailwindcss/typography` plugin
- **Animation:** Framer Motion 11
- **Icons:** Lucide React

## Commands

- `npm run dev` — start dev server
- `npm run build` — type-check and build for production
- `npm run build:preview` — the same build based at `/FoSW/preview/`; set `VITE_RADAR_PREVIEW=1` alongside it to force drafts and the radar on
- `npm run lint` — ESLint (zero warnings allowed)
- `npm run preview` — preview production build
- `npm run verify:radar <baseUrl>` — 15 headless Puppeteer checks against a server that is *already running*. Not wired into `build`/`test`/`lint`, since it would fail spuriously without one. Point it at `npm run dev` or a preview build — an ordinary production build has no radar to check.
- `npm run signals:promote` — move reviewed drafts from `data/signal-drafts/accepted/` into `public/content/ai-signals/`, append their `index.json` entries, and record every decision in the seen-ledger. See the pipeline section below.

**On Windows, run the `--base=` builds from PowerShell, or prefix with `MSYS_NO_PATHCONV=1` in Git Bash.** MSYS rewrites `/FoSW/preview/` into a Windows path, and the build then succeeds with a silently wrong base.

## AI-signals pipeline

Full detail in [`docs/ai-signals-pipeline.md`](docs/ai-signals-pipeline.md). What matters when working in this repo:

- **`data/` is never published; `public/` is.** Vite copies `public/` into `dist`, so any working file kept there is served on the live site. `validate-signals.mjs` fails the build on any file under `public/content/ai-signals/` whose name starts with `_`.
- **The finder agent writes its own drafts** to `data/signal-drafts/<id>.json` with `status: "draft"`, and assigns ids by scanning `index.json` plus all three draft folders. It never writes into `public/` or edits `index.json`.
- **Review is a folder move.** `data/signal-drafts/` is the unreviewed queue; you move each file into `accepted/` or `rejected/`. `signals:promote` acts only on those two and never touches the queue, so an interrupted review cannot publish something nobody read.
- **`signals:promote` is the only schema gate** between the agent and the live site. It validates the whole batch and moves nothing if any file fails, and it refuses to overwrite an existing published file.
- The whole `data/signal-drafts/` tree is gitignored: this repo is public, and a draft is by definition unreviewed.

## Project Structure

```
src/
  components/       # React components
    WhatIf/         # Carousel sub-components
    Radar/          # Futures radar: canvas, blips, legend, section wrapper
    drawer/         # Per-content-type drawer bodies (signal, insight, phenomenon)
  config/           # Radar vocabularies (work dimensions, actors)
  lib/              # Pure logic shared by components and hooks (no React)
  data/             # Static fallback content
  hooks/            # Custom React hooks (useContent, useCarouselAutoplay)
  types/            # TypeScript interfaces and types
  App.tsx           # Main app layout
public/
  content/
    ai-signals/     # JSON signal files + index.json
    expert-insights/# JSON insight files + index.json
    phenomena/      # JSON phenomenon files + index.json
scripts/
  lib/              # content loader, phenomenon-schema mirror, derive.mjs
  __tests__/        # node --test suite for the scripts above
```

## Key Conventions

- **Path aliases:** `@/` maps to `src/` (configured in tsconfig.json and vite.config.ts)
- **Strict TypeScript:** `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` all enabled
- **Content is runtime-fetched:** JSON files in `public/content/` are fetched via `useContent` hook, not imported. Fallback to `src/data/defaultContent.ts` on failure.
- **No global state:** React hooks only (`useState`, `useEffect`, `useMemo`, `useCallback`)
- **PR description files:** Every branch gets a `PR_DESCRIPTION_<branchname>.md` file at the project root. This file serves two purposes:
  1. **Before merge:** Acts as an issue/spec file describing what will be built and the scope of changes.
  2. **During PR:** Used as the pull request description body.

  After a PR is successfully merged, the file is moved to `docs/archive/merged_PRs/`.

## Design System

- **Colors:** `midnight` (#050A14), `electric-blue` (#0EA5E9), `neon-gold` (#F59E0B), `hologram-cyan` (#22d3ee) — defined in `tailwind.config.js`
- **Fonts:** Inter (sans, UI/metadata), Merriweather (serif, article body/titles)
- **Style patterns:** Glass-morphism (`backdrop-blur`, `bg-white/5`), dark theme, utility-first Tailwind classes
- **Tailwind note:** Never use dynamic class interpolation (e.g., `` `text-${color}` ``). Always write full static class names so Tailwind can detect them.
- **Drawer ownership:** `App` owns content fetching, the drawer stack, deep links and article meta, and renders `ContentDrawer` once. Sections receive data and an `onOpen` callback as props. Do not add a second `ContentDrawer` — two would fight over the URL.
- **Radar visibility:** the radar section renders only when at least 10 phenomena are `published`, except in dev and in preview builds. `isPreviewContext()` in `src/lib/phenomenon.ts` is the single predicate behind both the draft fetch and the gate; it is true in dev, when `VITE_RADAR_PREVIEW=1`, **or when `BASE_URL` contains `/preview/`** — the last so a build deployed to the preview folder cannot silently render as production. Drafts are fetched in exactly those cases and never otherwise.
- **Preview deployment:** `/FoSW/preview/` is the same commit as `/FoSW/`, built with a different base and drafts on, so going live is publishing the tenth phenomenon rather than migrating anything. It is `noindex, nofollow` (applied by the `previewNoindex` plugin in `vite.config.ts`, keyed on the base) and ships no sitemap. Note that `robots.txt` under `/FoSW/` is never actually fetched — crawlers read it from the domain root only — so the meta tag is the control that works.
- **One workflow, one deploy.** `.github/workflows/deploy.yml` builds production, stashes it, builds the preview, verifies the radar against it, assembles `_site/` with the preview nested at `_site/preview/`, and pushes `gh-pages` **once**. It used to be two workflows pushing separately; each push spawns a GitHub Pages deployment, only one may be in flight, and the two raced — on 2026-08-06 one wedged in `building` and the site served a stale build for two hours while every run showed green. A `concurrency:` group cannot fix that, because it governs the workflows and not the deployments GitHub spawns from their pushes. Do not split this back into two workflows. `verify:radar` now gates production as well as the preview.
- **SPA fallback:** every build emits `dist/404.html`, a copy of the prerendered shell. GitHub Pages serves it *without redirecting*, so `/FoSW/<kind>/<id>/` deep links — the URLs the drawer's Copy-link button hands out — resolve instead of hard-404ing. The production copy also forwards `/preview/` paths via `sessionStorage["radarDeepLink"]`, restored by the inline snippet in `index.html`, for the case where Pages answers a preview miss with the root 404 page.
- **Blip placement:** `placeBlips` in `src/config/radarGeometry.ts` seeds from the per-id hash and then nudges overlapping pairs apart, clamped to each blip's own ring band and sector wedge. A cell holds about five blips at this spacing; beyond that it stays crowded on purpose, because moving a blip out of its cell would misstate how far that change has reached.

## Content Schema

**AI Signal** (`public/content/ai-signals/*.json`):
- Required: `id`, `title`, `summary`, `source`, `detectedAt`, `date`, `status`
- Optional: `sourceUrl`, `tags`, `category`, `whyItMatters`, `recommendedActions`, `risksAndCaveats`, `sourceType`
- `category`: choose 1 primary plus up to 2 secondary (max 3) from the 13 real values: AI Agents, AI Tools, Productivity, SDLC Change, Quality & Testing, Security & Risk, Org & Leadership, Skills & Learning, Work Wellbeing, Ethics & Policy, Business Impact, Costs & Economics, Other
- `decisionHorizon` is **retired**. Do not emit it and do not validate it. 98 published files still carry it and are left alone — nothing renders it, and `signal-schema.mjs` has no unknown-field check for it to trip. It was dropped because the values ran 78 `now` / 19 `0,5 - 2 years` / 1 `2+ years` across 102 signals: a judgement per signal that carried almost no information, expressed in literal year ranges. Certainty is `signalStrength`; how far a change has spread is the phenomenon's `observedReach`.
- `sourceType` must be one of (lowercase): academic, article, social, video, discussion, release
- `status` must be "published" or "draft" (only published items are fetched)

Optional signal-typing / radar-provenance fields (all optional; render conditionally so untyped legacy signals are unaffected):
- `signalType`: one of `practitioner-account`, `field-report`, `study`, `tool-shift`, `regulation-standard`, `market-event`, `forecast`, `primary-research`
- `signalStrength`: one of `weak`, `emerging`, `established`
- `signalStage`: one of `leading`, `concurrent`, `lagging`
- `leadTimeEstimate`: human-readable string, e.g. `"~6-12 months"`
- `corroboration`: array of supporting source URLs
- `observer`: who reported it and why credible (expected for `signalType: practitioner-account`)
- `sampleSize`, `fieldworkPeriod`, `sponsor`: expected for `signalType: field-report`
- `dataCollectedPeriod`, `replicated`: expected for `signalType: study`
- `version`, `availability` (`GA` | `preview` | `announced`): expected for `signalType: tool-shift`
- `effectiveDate`, `jurisdiction`, `issuer`: expected for `signalType: regulation-standard`
- `organisation`, `magnitude`: expected for `signalType: market-event`
- `forecaster`, `horizonDate`: expected for `signalType: forecast`
- `method` (`interview` | `workshop` | `other`), `participants`, `fieldworkPeriod`: expected for `signalType: primary-research`

Only include a type-specific field when its value is actually stated in the source — never invent a sample size, fieldwork window, or data-collection period to fill the schema.

**Expert Insight** (`public/content/expert-insights/*.json`):
- Required: `id`, `title`, `author`, `authorRole`, `excerpt`, `paragraphs`, `date`, `status`
- Optional: `tags`

**Phenomenon** (`public/content/phenomena/*.json`):
- Required (`REQUIRED_FIELDS`): `id`, `label`, `title`, `thesis`, `status`, `primaryDimension`, `implications`, `evidence`, `observedReach`, `reachRationale`, `reachReviewedAt`
- `observedReach` must be one of: `early-manifestations`, `gaining-traction`, `field-level-shift`
- Evidence `stance` must be one of: `supports`, `counter`, `contextual`
- Work dimensions (seven): `nature-and-division-of-work`, `organisation-and-leadership`, `skills-knowledge-and-learning`, `careers-occupations-and-labour-markets`, `worker-experience-identity-and-wellbeing`, `economics-productivity-and-value`, `ethics-responsibility-and-society`

`observedReach` is a human judgment and must never be set by a script. `evidenceProfile`, `firstObserved` and `latestEvidenceDate` are derived and must never be hand-edited — the validator fails the build on either.

## Verification

Always run `npm run build` after changes to catch TypeScript errors before considering work complete. `npm run validate` runs both content validators — `npm run signals:validate` (AI-signal content against the schema above: enum values, required fields, id/index consistency) and `npm run validate:phenomena` (phenomenon content: required fields, enum values, cross-references to published signals, and that `evidenceProfile`/`firstObserved`/`latestEvidenceDate` match what the evidence derives) — and now runs automatically as the first step of `npm run build`. `npm test` runs the script unit tests (content loader, derivation library, config mirrors, base-path detection, signal-schema rules, promote, and validator rules).

The signal schema lives in `scripts/lib/signal-schema.mjs` and has two consumers: `validate-signals.mjs` checks what is already published, `promote-signals.mjs` checks drafts before they can become published. Change the rules there, not in either caller.

**A green deploy run does not mean the site updated.** It means `gh-pages` was written; publishing is a separate GitHub Pages deployment that can fail or wedge afterwards. The check that actually answers it is `gh api repos/FuturesofSoftwareWork/FoSW/pages --jq .status` — anything other than `built`, or `building` for more than a couple of minutes, means the live site is stale. A wedged deployment blocks all later ones and is cleared with `gh api -X POST repos/FuturesofSoftwareWork/FoSW/pages/deployments/<sha>/cancel`.

`npm run build` also emits `dist/404.html`. A preview build additionally replaces `robots.txt` with a disallow-all and removes `sitemap.xml`. The prerenderer derives its base path from the built bundle (`scripts/lib/prerender-base.mjs`) rather than hardcoding one, so there is no second place to keep in sync.
