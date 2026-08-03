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
- `npm run lint` — ESLint (zero warnings allowed)
- `npm run preview` — preview production build

## Project Structure

```
src/
  components/       # React components
    WhatIf/         # Carousel sub-components
  data/             # Static fallback content
  hooks/            # Custom React hooks (useContent, useCarouselAutoplay)
  types/            # TypeScript interfaces and types
  App.tsx           # Main app layout
public/
  content/
    ai-signals/     # JSON signal files + index.json
    expert-insights/# JSON insight files + index.json
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

## Content Schema

**AI Signal** (`public/content/ai-signals/*.json`):
- Required: `id`, `title`, `summary`, `source`, `detectedAt`, `date`, `status`
- Optional: `sourceUrl`, `tags`, `category`, `whyItMatters`, `recommendedActions`, `risksAndCaveats`, `decisionHorizon`, `sourceType`
- `category`: choose 1 primary plus up to 2 secondary (max 3) from the 13 real values: AI Agents, AI Tools, Productivity, SDLC Change, Quality & Testing, Security & Risk, Org & Leadership, Skills & Learning, Work Wellbeing, Ethics & Policy, Business Impact, Costs & Economics, Other
- `decisionHorizon` must be one of: "now", "0,5 - 2 years", "2+ years" (keep the comma in "0,5 - 2 years" — it renders verbatim on the site)
- `sourceType` must be one of (lowercase): academic, article, social, video, discussion, release
- `status` must be "published" or "draft" (only published items are fetched)

Optional signal-typing / radar-provenance fields (all optional; render conditionally so untyped legacy signals are unaffected):
- `signalType`: one of `weak-signal`, `field-report`, `study`, `regulatory`, `tool-shift`
- `signalStrength`: one of `weak`, `emerging`, `established`
- `signalStage`: one of `leading`, `concurrent`, `lagging`
- `leadTimeEstimate`: human-readable string, e.g. `"~6-12 months"`
- `corroboration`: array of supporting source URLs
- `observer`: who reported it and why credible (expected for `signalType: weak-signal`)
- `sampleSize`, `fieldworkPeriod`, `sponsor`: expected for `signalType: field-report`
- `dataCollectedPeriod`, `replicated`: expected for `signalType: study`
- `effectiveDate`, `jurisdiction`: expected for `signalType: regulatory`
- `version`, `availability` (`GA` | `preview` | `announced`): expected for `signalType: tool-shift`

Only include a type-specific field when its value is actually stated in the source — never invent a sample size, fieldwork window, or data-collection period to fill the schema.

**Expert Insight** (`public/content/expert-insights/*.json`):
- Required: `id`, `title`, `author`, `authorRole`, `excerpt`, `paragraphs`, `date`, `status`
- Optional: `tags`

## Verification

Always run `npm run build` after changes to catch TypeScript errors before considering work complete. `npm run signals:validate` checks AI-signal content against the schema above (enum values, required fields, id/index consistency); it now runs automatically as the first step of `npm run build`.
