# Futures Radar — Phase 3: Radar UI

## What this delivers

A "futures radar": a circle of seven sectors (dimensions of software work) and
three rings (how far a change has reached — early manifestations, gaining
traction, field-level shift), where each blip is a *phenomenon* — a claim
about how software work may be changing, backed by dated news signals as
evidence. Clicking a blip opens the phenomenon in the existing content
drawer; clicking one of its evidence items pushes the underlying signal on
top, with a Back control to return. Signals that are evidence for a
phenomenon now show an "Evidence for …" backlink, derived by inverting the
evidence arrays rather than stored.

Six phenomena exist today, hand-authored, all `status: "draft"`.

## The radar is invisible in production right now

The section renders only when **at least 10 phenomena are `published`**,
except in `npm run dev` and in preview builds (`VITE_RADAR_PREVIEW=1`).
Drafts are fetched in those same two cases and never in production
(`src/lib/phenomenon.ts:includeDrafts`, gated again in
`src/components/Radar/FuturesRadar.tsx`). With six drafts and a threshold of
ten, `npm run preview` today shows **no radar section at all** — confirmed
by checking the built output contains no `#futures-radar`. This is
deliberate and is documented in `CLAUDE.md` under **Radar visibility** so it
is not mistaken for a bug or quietly removed by someone who doesn't know why
it's there.

Signals and insights are unaffected by any of this — same content, same
drawer behaviour, same URLs as before this branch.

## `ContentStream` → `App`: drawer ownership refactor

Before this branch, `ContentStream` owned content fetching, the drawer,
deep links and article meta. A radar section rendered beside it had no way
to open that drawer — and a second `ContentDrawer` would fight the first
one over `window.history` for deep links. Ownership moves up to `App`,
which now:

- fetches signals, insights and phenomena (`useContent`)
- holds the drawer state as a **stack** (open replaces the stack; opening
  evidence or a related phenomenon from inside a drawer pushes; Back pops)
- resolves deep links and article `<meta>` for whichever content type is on
  top
- renders `ContentDrawer` exactly once, last, so its fixed overlay sits
  outside every section's stacking context

`ContentStream` and the new `FuturesRadar` section are now both just
props-in, `onOpen`-callback-out. This is documented in `CLAUDE.md` under
**Drawer ownership**: don't add a second `ContentDrawer`.

## `ContentDrawer` split

`ContentDrawer.tsx` was 812 lines holding the drawer chrome plus the full
signal and insight body renderers. Phase 3 adds a third content type
(phenomenon) and stack/back-control state, so it was split first:

- `src/components/drawer/SignalContent.tsx` — moved verbatim
- `src/components/drawer/InsightContent.tsx` — moved verbatim
- `src/components/drawer/PhenomenonContent.tsx` — new: thesis, reach and
  its rationale, contested-note callout, implications by work dimension,
  the evidence-profile sentence, evidence grouped by stance
  (supports/counter/contextual), related phenomena, development paths,
  "what would change our mind", and the three distinct dates (first
  observed, latest evidence, reach reviewed)
- `src/components/ContentDrawer.tsx` — now chrome and the back control
  only, delegating each body to its module (812 → 260/307/340/236 lines
  across the four files)

## Deep links are path-based, not query-string

Phenomena are reachable at `/phenomena/<id>/`, matching the existing
`/signals/<id>/` and `/insights/<id>/` convention. The original design spec
suggested `?phenomenon=<id>`, written before this project's URL convention
was checked against the shipped site; path-based wins for consistency with
what's already live.

## What this phase deliberately does not do

- No preview deployment — colleagues cannot see any of this yet. That's
  Phase 4 (`VITE_RADAR_PREVIEW`, `deploy-preview.yml`, `clean-exclude`,
  `noindex`), and it's what makes this reviewable by people other than
  whoever runs `npm run dev` locally.
- No pipeline — phenomena are hand-authored; `radar:prepare` / `apply` /
  `accept` / `derive` are Phase 2.
- No editions or movement — `reachHistory` renders nowhere yet;
  `radar:snapshot` is Phase 2.
- No by-impact radius mode — deferred to v2 per the spec; `potentialImpact`
  is carried in the data and shown in the drawer only.
- No frontend test runner — verification is build, lint, and named visual
  checks, consistent with the rest of the frontend. The pure functions in
  `src/lib/phenomenon.ts` and `src/config/radarGeometry.ts` have no React
  imports so a future test runner can reach them unchanged.

## Verification

MCP browser tools were unavailable for this work, both for implementation
and for review. Verification used a headless Puppeteer harness built on the
project's own `puppeteer` devDependency instead:
`.superpowers/verify-radar.mjs`, running 11 checks (ring/sector geometry,
click-through to drawer, evidence push/back, deep-link resolution, and two
checks added after screenshots caught what the DOM checks missed — no SVG
`<text>` may fall outside the viewBox, after rim/blip labels were found
clipped; and no two `<text>` elements may overlap, after ring labels turned
up struck through by blip labels). **`.superpowers/` is gitignored, so this
harness is not part of this PR** — it's disclosed here for a reviewer's
context, not offered as something they can run.

```
npm test         # 63/63
npm run build    # tsc + vite build + prerender, exit 0
npm run lint     # zero warnings
```

## Files touched

```
src/App.tsx
src/components/ContentDrawer.tsx
src/components/ContentStream.tsx
src/components/Radar/FuturesRadar.tsx
src/components/Radar/RadarBlips.tsx
src/components/Radar/RadarCanvas.tsx
src/components/Radar/RadarLegend.tsx
src/components/drawer/InsightContent.tsx
src/components/drawer/PhenomenonContent.tsx
src/components/drawer/SignalContent.tsx
src/config/radarDimensions.ts
src/config/radarGeometry.ts
src/hooks/deepLinkPath.ts
src/hooks/useArticleMeta.ts
src/hooks/useContent.ts
src/hooks/useDeepLink.ts
src/lib/phenomenon.ts
src/types/content.ts
CLAUDE.md
.gitignore
```

## Late change: nine sectors became seven

After reviewing the rendered radar, the owner judged the sectors too fine-grained
and two boundaries as not carrying weight:

- **`organisation-and-coordination` + `leadership-governance-and-performance` →
  `organisation-and-leadership`.** They split "how work is arranged" from "who
  directs it", and phenomena touching one almost always touched the other.
- **`human-ai-collaboration-and-agency` → `nature-and-division-of-work`.** The
  division of labour between human and machine now largely *is* what the nature of
  work means. `Review becomes verification` and `Configuring the machine` are now
  neighbours, which reads better than the split did.

Fewer sectors also fixed a second complaint. At 40° each the rim labels had to be
abbreviated until they lost meaning — "Economics/value" dropped *productivity*,
"Wellbeing" dropped *worker experience, identity*. At 51° most of the full wording
fits again.

All six phenomena were migrated (`primaryDimension` and every
`implications[].dimension`); the validator resolves each against the config, so a
missed reference would have failed the build.

The angular inset in `placeBlip` was raised from 12% to 22% at the same time, to
stop blips in adjacent sectors converging on their shared boundary and running
their labels together. Every blip is provably in the same ring as before: 21.5 /
122.6 / 134.1 / 141.8 / 211.9 / 215.5 px against bands of 0–90, 90–165, 165–250.
