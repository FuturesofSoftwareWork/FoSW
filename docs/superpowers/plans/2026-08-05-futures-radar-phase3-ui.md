# Futures Radar — Phase 3: Radar UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the six drafted phenomena as an interactive radar on the site, readable in the existing drawer, visible locally and in preview builds but hidden from the public until ten phenomena are published.

**Architecture:** Ownership of the drawer, deep links, article meta and content fetching moves from `ContentStream` up to `App`, so a sibling radar section can open the same drawer instead of fighting it for the URL. `ContentDrawer` (815 lines) is split so each content type has its own module. The radar itself is presentational SVG driven by a pure layout function, with geometry derived from the nine-value work-dimension config rather than hardcoded.

**Tech Stack:** React 18 + TypeScript strict, Vite 5, Tailwind 3, Framer Motion 11, Lucide icons. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-04-futures-radar-design.md`
**Phase 1 plan (schema, merged):** `docs/superpowers/plans/2026-08-05-futures-radar-phase1-schema.md`

## Global Constraints

- Branch: create `feat-radar-ui` from `main`. Per `CLAUDE.md` it needs a `PR_DESCRIPTION_feat-radar-ui.md` at the project root (Task 9).
- `npm run build` must pass (`validate` → `tsc` → `vite build` → `prerender`). `npm run lint` must report **zero** warnings; it runs with `--report-unused-disable-directives`.
- `npm test` must stay green (63 tests). This phase adds no `node:test` coverage — see *Verification* below.
- TypeScript strict, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`. Path alias `@/` → `src/`.
- **Tailwind: never interpolate class names.** Per-dimension colour comes from config as hex and is applied as SVG `fill`/`stroke` **attributes**, never as a `className`. Any per-variant Tailwind styling uses an explicit lookup map of complete class strings, as `SIGNAL_TYPE_META` in `ContentDrawer.tsx` already does.
- CI runs Node 20; local dev Node 22.
- Content is runtime-fetched and never type-checked — do not assume a field exists because the type says it may.
- No new npm dependencies.

## Verification approach

The project has **no frontend test runner** and no React tests today; adding one (vitest) is a separate decision and is out of scope. Every task is therefore verified by `npm run build`, `npm run lint`, and **named visual checks with stated expected outcomes**. Where logic is genuinely pure and worth locking down — placement, freshness, derived impacts — it is written as pure functions with no React imports so a future test runner can reach them without refactoring.

`npm run dev` serves at `http://localhost:5173/FoSW/`. Note the `/FoSW/` base path; the bare root 404s.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | **Modify.** Owns content fetching, drawer stack, deep links, article meta; renders `ContentDrawer` once. |
| `src/components/ContentStream.tsx` | **Modify.** Becomes a props-driven section; loses its `useContent`, drawer state and `ContentDrawer` render. |
| `src/hooks/useContent.ts` | **Modify.** Also fetches phenomena; includes drafts in dev/preview. |
| `src/lib/phenomenon.ts` | **Create.** Pure helpers: `deriveImpacts`, `freshnessOf`, `isPublished`. No React. |
| `src/types/content.ts` | **Modify.** `DrawerContent` gains the phenomenon variant. |
| `src/hooks/deepLinkPath.ts` | **Modify.** Recognise and build `/phenomena/<id>/`. |
| `src/hooks/useDeepLink.ts` | **Modify.** Resolve phenomenon URLs. |
| `src/hooks/useArticleMeta.ts` | **Modify.** Narrow safely for a third variant; describe phenomena. |
| `src/components/drawer/SignalContent.tsx` | **Create (move).** Extracted verbatim from `ContentDrawer.tsx`. |
| `src/components/drawer/InsightContent.tsx` | **Create (move).** Extracted verbatim. |
| `src/components/drawer/PhenomenonContent.tsx` | **Create.** The phenomenon drawer body. |
| `src/components/ContentDrawer.tsx` | **Modify.** Chrome + back control only; delegates bodies. |
| `src/config/radarGeometry.ts` | **Create.** Rings, sector maths, deterministic placement. Pure. |
| `src/components/Radar/RadarCanvas.tsx` | **Create.** SVG rings, sector borders, gradient, labels. |
| `src/components/Radar/RadarBlips.tsx` | **Create.** Blips, contested bolt, hover card. |
| `src/components/Radar/RadarLegend.tsx` | **Create.** Dimension legend doubling as filter. |
| `src/components/Radar/FuturesRadar.tsx` | **Create.** Section wrapper, controls, launch gate. |
| `PR_DESCRIPTION_feat-radar-ui.md` | **Create.** |

`src/lib/` is new. It is for pure logic shared by components and hooks, distinct from `src/hooks/` (React) and `src/config/` (data).

---

## Task 1: Lift drawer and content ownership to App

Pure refactor. No user-visible change — that is the acceptance criterion.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ContentStream.tsx:31-60` and `:253`

**Interfaces:**
- Consumes: `useContent`, `useDeepLink`, `useArticleMeta`, `ContentDrawer` — all unchanged in this task.
- Produces: `ContentStreamProps`:
  ```ts
  interface ContentStreamProps {
    signals: AISignal[];
    insights: ExpertInsight[];
    isLoading: boolean;
    onOpen: (content: DrawerContent) => void;
  }
  ```

- [ ] **Step 1: Move the state up into `App.tsx`**

Replace `src/App.tsx` with:

```tsx
import { useCallback, useState } from "react";
import Hero from "./components/Hero";
import ContentStream from "./components/ContentStream";
import ContentDrawer from "./components/ContentDrawer";
import AboutProject from "./components/AboutProject";
import WhatIfSection from "./components/WhatIf/WhatIfSection";
import { useContent } from "@/hooks/useContent";
import { useDeepLink } from "@/hooks/useDeepLink";
import { useArticleMeta } from "@/hooks/useArticleMeta";
import type { DrawerContent } from "@/types/content";

function App() {
  const { signals, insights, isLoading } = useContent({
    maxInsights: Infinity,
  });

  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(
    null,
  );
  const closeDrawer = useCallback(() => setDrawerContent(null), []);
  const openDrawer = useCallback(
    (content: DrawerContent) => setDrawerContent(content),
    [],
  );

  useDeepLink({
    insights,
    signals,
    isLoading,
    drawerContent,
    setDrawerContent,
  });

  useArticleMeta(drawerContent);

  return (
    <div className="bg-midnight min-h-screen text-white font-sans selection:bg-electric-blue selection:text-white">
      <Hero />
      <WhatIfSection />
      <ContentStream
        signals={signals}
        insights={insights}
        isLoading={isLoading}
        onOpen={openDrawer}
      />
      <AboutProject />

      <footer className="bg-black py-12 text-center text-gray-500 text-sm">
        <p>© 2026 Alternative Futures of Software Work Project. </p>
        <p className="mt-2">
          A collaboration between VTT, University of Helsinki, and Business
          Finland.
        </p>
      </footer>

      <ContentDrawer content={drawerContent} onClose={closeDrawer} />
    </div>
  );
}

export default App;
```

`ContentDrawer` renders last, outside the sections, so its fixed overlay is not affected by any section's stacking context.

- [ ] **Step 2: Make `ContentStream` props-driven**

In `src/components/ContentStream.tsx`:

1. Delete the imports of `useContent`, `useDeepLink`, `useArticleMeta` and `ContentDrawer`, and the `useState`/`useCallback` imports if they become unused — **check**, `useState` is still needed for the filter, search, sort and paging state.
2. Replace the component signature and the four removed hook calls:

```tsx
interface ContentStreamProps {
  signals: AISignal[];
  insights: ExpertInsight[];
  isLoading: boolean;
  onOpen: (content: DrawerContent) => void;
}

const ContentStream = ({
  signals,
  insights,
  isLoading,
  onOpen,
}: ContentStreamProps) => {
```

3. Replace both `setDrawerContent({ ... })` call sites (around lines 161 and 219) with `onOpen({ ... })` — the object literals are unchanged.
4. Delete the `<ContentDrawer ... />` render at the end (around line 253).
5. Add `DrawerContent`, `AISignal` and `ExpertInsight` to the existing `@/types/content` type import if not already present.

- [ ] **Step 3: Verify nothing changed for a user**

Run: `npm run build && npm run lint`
Expected: both exit 0.

Run: `npm run dev`, open `http://localhost:5173/FoSW/`, and confirm each of these behaves exactly as before the change:

- The signal list renders; clicking a signal card opens the drawer with that signal.
- Clicking an insight opens the drawer with that insight.
- The URL changes to `/FoSW/signals/<id>/` when a signal drawer opens, and back to `/FoSW/` when closed.
- Browser Back closes the drawer rather than leaving the page.
- Loading a `/FoSW/signals/<id>/` URL directly opens that signal's drawer once content loads.
- The category filter, search box and sort controls still work.

Any difference here is a regression — this task is only correct if it is invisible.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/ContentStream.tsx
git commit -m "refactor: lift drawer and content ownership from ContentStream to App"
```

---

## Task 2: Fetch phenomena, with drafts in dev and preview

**Files:**
- Modify: `src/hooks/useContent.ts`
- Create: `src/lib/phenomenon.ts`

**Interfaces:**
- Consumes: `Phenomenon`, `PhenomenonIndexEntry` from `@/types/phenomenon` (Phase 1).
- Produces:
  - `useContent()` also returns `phenomena: Phenomenon[]`.
  - `src/lib/phenomenon.ts` exports:
    ```ts
    export function includeDrafts(): boolean
    export function deriveImpacts(p: Phenomenon): WorkDimensionId[]
    export function freshnessOf(p: Phenomenon, now?: Date): "current" | "recent" | "ageing" | "stale"
    ```

- [ ] **Step 1: Write the pure helpers**

Create `src/lib/phenomenon.ts`:

```ts
import type { Phenomenon } from "@/types/phenomenon";
import type { WorkDimensionId } from "@/config/radarDimensions";

/**
 * Drafts are shown in dev and in preview builds so work in progress stays
 * reviewable, and hidden in production so an unfinished research claim is never
 * published. `import.meta.env.DEV` covers `npm run dev`; the explicit flag covers
 * the preview deployment, which is a production build.
 */
export function includeDrafts(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_RADAR_PREVIEW === "1";
}

/**
 * The spec requires `impacts` be derived from the implications and never stored,
 * so that a tag list cannot drift from the statements it summarises.
 */
export function deriveImpacts(p: Phenomenon): WorkDimensionId[] {
  const seen = new Set<WorkDimensionId>();
  for (const im of p.implications ?? []) {
    if (im?.dimension) seen.add(im.dimension);
  }
  return [...seen];
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * How recently the world produced evidence — deliberately not how recently we
 * touched the record. Drives blip size.
 */
export function freshnessOf(
  p: Phenomenon,
  now: Date = new Date(),
): "current" | "recent" | "ageing" | "stale" {
  if (!p.latestEvidenceDate) return "stale";
  const age = (now.getTime() - new Date(p.latestEvidenceDate).getTime()) / DAY;
  if (age <= 92) return "current";
  if (age <= 183) return "recent";
  if (age <= 365) return "ageing";
  return "stale";
}
```

- [ ] **Step 2: Fetch phenomena in `useContent`**

In `src/hooks/useContent.ts`:

1. Add to the imports:

```ts
import type { Phenomenon, PhenomenonIndexEntry } from "@/types/phenomenon";
import { includeDrafts } from "@/lib/phenomenon";
```

2. Add `phenomena: Phenomenon[];` to `UseContentReturn`, and `const [phenomena, setPhenomena] = useState<Phenomenon[]>([]);` alongside the other state.

3. `fetchContentItems` currently filters `entry.status === "published"`. Phenomena need drafts in dev/preview, so add a parameter rather than duplicating the function — change its signature and the filter line:

```ts
    async <
      TIndex extends { file: string; status: string; date: string },
      TItem,
    >(
      contentPath: string,
      maxItems: number,
      statuses: readonly string[] = ["published"],
    ): Promise<TItem[]> => {
```

```ts
      const published = index.items
        .filter((entry) => statuses.includes(entry.status))
        .slice(0, maxItems);
```

The existing two call sites are unaffected — they take the default.

4. Add a third entry to the `Promise.allSettled` array:

```ts
        fetchContentItems<PhenomenonIndexEntry, Phenomenon>(
          "phenomena",
          Infinity,
          includeDrafts() ? ["published", "draft"] : ["published"],
        ),
```

and destructure it as `phenomenonResult`.

5. Resolve it. **Phenomena have no fallback content by design** — a stale hardcoded research claim presented as current is worse than no radar:

```ts
      const fetchedPhenomena =
        phenomenonResult.status === "fulfilled" ? phenomenonResult.value : [];
```

Do **not** add `phenomenonResult.status === "rejected"` to the condition that sets the "showing cached content" error — that message is about fallback content, and phenomena have none. A failed phenomenon fetch simply yields an empty radar, which the launch gate then hides.

6. `setPhenomena(fetchedPhenomena);` and add `phenomena` to the returned object.

- [ ] **Step 3: Verify the fetch**

Run: `npm run build && npm run lint`
Expected: both exit 0.

Run: `npm run dev`, then in the browser console on `http://localhost:5173/FoSW/`:

```js
await (await fetch("/FoSW/content/phenomena/index.json")).json()
```

Expected: an object whose `items` array has 6 entries, all `"status": "draft"`.

The data is not rendered yet — that is Task 8. This step only proves it loads.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useContent.ts src/lib/phenomenon.ts
git commit -m "feat: fetch phenomena, including drafts in dev and preview builds"
```

---

## Task 3: Extend `DrawerContent` and narrow its five consumers

This is the Phase 1 carry-forward. It was deferred precisely because it breaks `tsc` until every consumer is narrowed.

**Files:**
- Modify: `src/types/content.ts` (the `DrawerContent` union)
- Modify: `src/components/ContentDrawer.tsx:185-190` (the two-way ternary)
- Modify: `src/hooks/useArticleMeta.ts:52-58, 80`
- Modify: `src/hooks/deepLinkPath.ts`
- Modify: `src/hooks/useDeepLink.ts`

**Interfaces:**
- Produces: `DrawerContent` gains `| { type: "phenomenon"; data: Phenomenon }`; `PathMatch` gains `"phenomenon"`.

- [ ] **Step 1: Extend the union**

In `src/types/content.ts`, add the import and the variant:

```ts
import type { Phenomenon } from "@/types/phenomenon";
```

```ts
export type DrawerContent =
  | { type: "signal"; data: AISignal }
  | { type: "insight"; data: ExpertInsight }
  | { type: "phenomenon"; data: Phenomenon };
```

- [ ] **Step 2: Run `tsc` and read the failures**

Run: `npx tsc --noEmit`
Expected: FAIL with four errors — `ContentDrawer.tsx` (a ternary that no longer narrows to `ExpertInsight`) and three in `useArticleMeta.ts` (`.image` and `.date` do not exist on `Phenomenon`).

These four are the whole blast radius. Fix them in the next three steps.

- [ ] **Step 3: Narrow the drawer's ternary**

In `src/components/ContentDrawer.tsx`, replace the body render (around line 185):

```tsx
              {content.type === "signal" && <SignalContent data={content.data} />}
              {content.type === "insight" && <InsightContent data={content.data} />}
```

Two explicit checks instead of a two-way ternary, so a third variant renders nothing rather than failing to compile. `PhenomenonContent` is added in Task 5.

- [ ] **Step 4: Narrow `useArticleMeta`**

In `src/hooks/useArticleMeta.ts`, replace the body of the `useEffect` from `const isInsight` down to the `setArticleJsonLd({...})` call with:

```ts
    const { data } = content;
    const kind =
      content.type === "insight"
        ? "insights"
        : content.type === "phenomenon"
          ? "phenomena"
          : "signals";

    const title = data.title;
    const description =
      content.type === "insight"
        ? content.data.excerpt
        : content.type === "phenomenon"
          ? content.data.thesis
          : content.data.summary;
    const datePublished =
      content.type === "phenomenon"
        ? (content.data.latestEvidenceDate ?? content.data.reachReviewedAt)
        : content.data.date;
    const author = content.type === "insight" ? content.data.author : "VTT";
    const image =
      content.type !== "phenomenon" && content.data.image
        ? absoluteUrl(content.data.image)
        : `${SITE_URL}/hero-bg.png`;

    const url = `${SITE_URL}/${kind}/${data.id}/`;
```

Then in the `setArticleJsonLd` call replace `datePublished: data.date` with `datePublished` and the author expression with `name: author`. Discriminating on `content.type` rather than casting `data` is what makes this type-safe — the existing `as { excerpt: string }` casts were hiding exactly this class of error and should not be reintroduced.

A phenomenon has no `image`, so it uses the site default. It has three dates and none is a publication date; `latestEvidenceDate` is the closest honest answer for `datePublished`, falling back to `reachReviewedAt`.

- [ ] **Step 5: Add phenomena to deep linking**

In `src/hooks/deepLinkPath.ts`:

```ts
export type PathMatch = {
  type: "insight" | "signal" | "phenomenon";
  id: string;
};
```

Add to `matchPath`, beside the existing two:

```ts
  if (kind === "phenomena") return { type: "phenomenon", id };
```

And in `itemPath`, replace the `kind` expression:

```ts
  const kind =
    content.type === "insight"
      ? "insights"
      : content.type === "phenomenon"
        ? "phenomena"
        : "signals";
```

In `src/hooks/useDeepLink.ts`, add `phenomena: Phenomenon[]` to `UseDeepLinkArgs`, accept it, add it to the effect's dependency array, and add a branch in `openFromUrl`:

```ts
      } else if (match.type === "phenomenon") {
        const found = phenomena.find((p) => p.id === match.id);
        setDrawerContent(found ? { type: "phenomenon", data: found } : null);
      } else {
```

Then in `src/App.tsx`, pass `phenomena` into `useDeepLink`.

**URLs are path-based** (`/FoSW/phenomena/<id>/`), matching the existing signal and insight convention. The spec said `?phenomenon=<id>`; that was written before this convention was checked, and consistency with the site wins.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npm run build && npm run lint`
Expected: all exit 0, no errors.

Run: `npm run dev` and confirm signals and insights still open, deep-link, and restore from a pasted URL exactly as in Task 1. A phenomenon URL will resolve to nothing yet — `PhenomenonContent` arrives in Task 5.

- [ ] **Step 7: Commit**

```bash
git add src/types/content.ts src/components/ContentDrawer.tsx src/hooks/
git commit -m "feat: add the phenomenon variant to DrawerContent and narrow its consumers"
```

---

## Task 4: Split `ContentDrawer` into per-type modules

`ContentDrawer.tsx` is 815 lines and holds the drawer chrome plus two full content renderers. Task 5 adds a third and Task 6 adds stack state. Split first, so those land in a file that can be read in one sitting.

**Files:**
- Create: `src/components/drawer/SignalContent.tsx`
- Create: `src/components/drawer/InsightContent.tsx`
- Modify: `src/components/ContentDrawer.tsx`

**Interfaces:**
- Produces: `SignalContent` (default export, props `{ data: AISignal }`), `InsightContent` (default export, props `{ data: ExpertInsight }`), plus whatever helpers each needs, moved with it.

- [ ] **Step 1: Move `SignalContent` verbatim**

Cut the `SignalContent` component from `ContentDrawer.tsx` into `src/components/drawer/SignalContent.tsx`. Move with it **only** the helpers it alone uses — including `SIGNAL_TYPE_META`, `SIGNAL_STRENGTH_META` and any badge/evidence-line helpers — and their imports. Add `export default SignalContent;`.

**Change no logic and no JSX.** This is a move. If you find yourself improving something, stop: it makes the diff unreviewable and this task's whole value is that a reviewer can confirm nothing changed.

- [ ] **Step 2: Move `InsightContent` verbatim**

Same, into `src/components/drawer/InsightContent.tsx`, taking the markdown rendering helpers it alone uses.

- [ ] **Step 3: Import them back**

In `ContentDrawer.tsx`, add:

```tsx
import SignalContent from "@/components/drawer/SignalContent";
import InsightContent from "@/components/drawer/InsightContent";
```

Then delete every import that is now unused. `noUnusedLocals` and the linter will name them — work through the list until both are clean rather than guessing.

- [ ] **Step 4: Verify the move changed nothing**

Run: `npm run build && npm run lint`
Expected: both exit 0.

Run: `npm run dev` and confirm, by eye against the pre-split state:

- A signal drawer renders its badges, evidence line, summary, why-it-matters, recommended actions, risks, tags and source link identically.
- An insight drawer renders its markdown body, images and captions identically, and the gold scroll-progress bar still tracks.
- The copy-link button still copies and shows its confirmation.

Run: `wc -l src/components/ContentDrawer.tsx`
Expected: well under 400 lines.

- [ ] **Step 5: Commit**

```bash
git add src/components/ContentDrawer.tsx src/components/drawer/
git commit -m "refactor: split signal and insight bodies out of ContentDrawer"
```

---

## Task 5: The phenomenon drawer body

**Files:**
- Create: `src/components/drawer/PhenomenonContent.tsx`
- Modify: `src/components/ContentDrawer.tsx`

**Interfaces:**
- Consumes: `Phenomenon` from `@/types/phenomenon`; `WORK_DIMENSIONS` from `@/config/radarDimensions`; `RADAR_ACTORS` from `@/config/radarActors`; `deriveImpacts`, `freshnessOf` from `@/lib/phenomenon`; `AISignal` for resolving evidence.
- Produces: `PhenomenonContent`, props:
  ```ts
  interface PhenomenonContentProps {
    data: Phenomenon;
    signals: AISignal[];
    onOpenSignal: (signal: AISignal) => void;
  }
  ```

- [ ] **Step 1: Write the component**

Create `src/components/drawer/PhenomenonContent.tsx`:

```tsx
import { AlertTriangle, ArrowRight, Calendar, Users } from "lucide-react";
import type { AISignal } from "@/types/content";
import type { Phenomenon, EvidenceStance } from "@/types/phenomenon";
import { WORK_DIMENSIONS } from "@/config/radarDimensions";
import { RADAR_ACTORS } from "@/config/radarActors";
import { deriveImpacts } from "@/lib/phenomenon";

const REACH_LABEL: Record<Phenomenon["observedReach"], string> = {
  "field-level-shift": "Field-level shift",
  "gaining-traction": "Gaining traction",
  "early-manifestations": "Early manifestations",
};

const dimensionLabel = (id: string) =>
  WORK_DIMENSIONS.find((d) => d.id === id)?.label ?? id;
const dimensionColour = (id: string) =>
  WORK_DIMENSIONS.find((d) => d.id === id)?.colour ?? "#94a3b8";
const actorLabel = (id: string) =>
  RADAR_ACTORS.find((a) => a.id === id)?.label ?? id;

const STANCE_ORDER: EvidenceStance[] = ["supports", "counter", "contextual"];
const STANCE_HEADING: Record<EvidenceStance, string> = {
  supports: "Evidence the change is happening",
  counter: "Evidence against, or pointing elsewhere",
  contextual: "Evidence of the pressure driving it",
};

const IMPACT_LABEL: Record<NonNullable<Phenomenon["potentialImpact"]>, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  transformative: "Transformative",
};

interface PhenomenonContentProps {
  data: Phenomenon;
  signals: AISignal[];
  onOpenSignal: (signal: AISignal) => void;
  related: Phenomenon[];
  onOpenPhenomenon: (p: Phenomenon) => void;
}

const PhenomenonContent = ({
  data,
  signals,
  onOpenSignal,
  related,
  onOpenPhenomenon,
}: PhenomenonContentProps) => {
  const impacts = deriveImpacts(data);
  const byId = new Map(signals.map((s) => [s.id, s]));
  const profile = data.evidenceProfile;

  return (
    <div className="space-y-8">
      <p className="font-serif text-lg leading-relaxed text-gray-200">
        {data.thesis}
      </p>

      {data.currentPressure && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="mb-1 font-mono text-xs uppercase tracking-wider text-gray-500">
            What is driving it
          </p>
          <p className="text-sm text-gray-300">{data.currentPressure}</p>
        </div>
      )}

      {/* Reach and its rationale, together — a reader who disagrees with where
          this sits should find the argument immediately. */}
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-hologram-cyan">
          {REACH_LABEL[data.observedReach]}
        </p>
        <p className="text-sm leading-relaxed text-gray-300">
          {data.reachRationale}
        </p>
        {data.contested && data.contestedNote && (
          <div className="mt-3 flex gap-2 rounded-lg border border-white/20 bg-white/5 p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-white" />
            <p className="text-sm text-gray-300">{data.contestedNote}</p>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-serif text-xl text-white">
          What this changes about software work
        </h3>
        <ul className="space-y-4">
          {data.implications.map((im, i) => (
            <li key={i} className="border-l-2 pl-4" style={{ borderColor: dimensionColour(im.dimension) }}>
              <p className="mb-1 font-mono text-xs uppercase tracking-wider" style={{ color: dimensionColour(im.dimension) }}>
                {dimensionLabel(im.dimension)}
              </p>
              <p className="text-sm text-gray-200">{im.statement}</p>
              {im.actors && im.actors.length > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <Users size={12} /> {im.actors.map(actorLabel).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {profile && (
        <p className="text-sm text-gray-400">
          Observed in <strong className="text-gray-200">{profile.independentContexts}</strong>{" "}
          independent {profile.independentContexts === 1 ? "context" : "contexts"} across{" "}
          <strong className="text-gray-200">{profile.evidenceTypes}</strong>{" "}
          evidence {profile.evidenceTypes === 1 ? "type" : "types"} over{" "}
          <strong className="text-gray-200">{profile.quartersSpanned}</strong>{" "}
          {profile.quartersSpanned === 1 ? "quarter" : "quarters"}.
          {profile.counterEvidence && " Counter-evidence present."}
        </p>
      )}

      {STANCE_ORDER.map((stance) => {
        const items = data.evidence.filter((e) => e.stance === stance);
        if (items.length === 0) return null;
        return (
          <div key={stance}>
            <h4 className="mb-2 font-mono text-xs uppercase tracking-wider text-gray-500">
              {STANCE_HEADING[stance]}
            </h4>
            <ul className="space-y-2">
              {items.map((e) => {
                const signal = byId.get(e.signalId);
                if (!signal) return null;
                return (
                  <li key={e.signalId}>
                    <button
                      onClick={() => onOpenSignal(signal)}
                      className="group flex w-full gap-2 rounded-lg border border-white/10 p-3 text-left transition-colors hover:border-electric-blue/40 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-electric-blue/50"
                    >
                      <span className="flex-1">
                        <span className="block text-sm text-gray-200">{signal.title}</span>
                        {e.note && (
                          <span className="mt-0.5 block text-xs text-gray-500">{e.note}</span>
                        )}
                      </span>
                      <ArrowRight size={14} className="mt-1 shrink-0 text-gray-600 group-hover:text-electric-blue" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {data.potentialImpact && (
        <p className="text-sm text-gray-400">
          Potential impact if it plays out:{" "}
          <strong className="text-gray-200">{IMPACT_LABEL[data.potentialImpact]}</strong>.
          Judged separately from reach — a change can be early and still matter enormously.
        </p>
      )}

      {related.length > 0 && (
        <div>
          <h3 className="mb-3 font-serif text-xl text-white">Related phenomena</h3>
          <ul className="space-y-2">
            {related.map((r) => {
              const rel = data.related?.find((x) => x.id === r.id)?.relation;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => onOpenPhenomenon(r)}
                    className="group flex w-full items-center gap-2 rounded-lg border border-white/10 p-3 text-left transition-colors hover:border-hologram-cyan/40 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-hologram-cyan/50"
                  >
                    <span className="flex-1">
                      <span className="block text-sm text-gray-200">{r.title}</span>
                      {rel && (
                        <span className="mt-0.5 block font-mono text-xs text-gray-500">
                          {rel.replace("-", " ")}
                        </span>
                      )}
                    </span>
                    <ArrowRight size={14} className="shrink-0 text-gray-600 group-hover:text-hologram-cyan" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {data.developmentPaths && data.developmentPaths.length > 0 && (
        <div>
          <h3 className="mb-3 font-serif text-xl text-white">Where it could lead</h3>
          <ul className="space-y-3">
            {data.developmentPaths.map((p) => (
              <li key={p.id}>
                <p className="text-sm font-semibold text-gray-200">{p.title}</p>
                <p className="text-sm text-gray-400">{p.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.whatWouldChangeThis && data.whatWouldChangeThis.length > 0 && (
        <div>
          <h3 className="mb-3 font-serif text-xl text-white">What would change our mind</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-300">
            {data.whatWouldChangeThis.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {impacts.map((id) => (
          <span key={id} className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
            {dimensionLabel(id)}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 border-t border-white/10 pt-4 font-mono text-xs text-gray-500">
        {data.firstObserved && (
          <span className="flex items-center gap-1">
            <Calendar size={12} /> First observed {data.firstObserved}
          </span>
        )}
        {data.latestEvidenceDate && <span>Latest evidence {data.latestEvidenceDate}</span>}
        <span>Reach reviewed {data.reachReviewedAt}</span>
      </div>
    </div>
  );
};

export default PhenomenonContent;
```

The three dates appear together and are labelled distinctly, because they answer different questions — an earlier draft of the schema collapsed two of them and the single field silently meant both.

- [ ] **Step 2: Render it from the drawer**

`ContentDrawer` needs `signals` and a way to open one. Add to `ContentDrawerProps`:

```ts
  signals: AISignal[];
  onOpenSignal: (signal: AISignal) => void;
```

Add the render beside the other two:

```tsx
              {content.type === "phenomenon" && (
                <PhenomenonContent
                  data={content.data}
                  signals={signals}
                  onOpenSignal={onOpenSignal}
                />
              )}
```

`ContentDrawer` resolves the related list, since it already holds all phenomena:

```tsx
              {content.type === "phenomenon" && (
                <PhenomenonContent
                  data={content.data}
                  signals={signals}
                  onOpenSignal={onOpenSignal}
                  related={(content.data.related ?? [])
                    .map((r) => phenomena.find((p) => p.id === r.id))
                    .filter((p): p is Phenomenon => p !== undefined)}
                  onOpenPhenomenon={onOpenPhenomenon}
                />
              )}
```

with `phenomena: Phenomenon[]` and `onOpenPhenomenon: (p: Phenomenon) => void` added to `ContentDrawerProps`.

In `src/App.tsx`, pass them:

```tsx
      <ContentDrawer
        content={drawerContent}
        onClose={closeDrawer}
        signals={signals}
        phenomena={phenomena}
        onOpenSignal={(signal) => openDrawer({ type: "signal", data: signal })}
        onOpenPhenomenon={(p) => openDrawer({ type: "phenomenon", data: p })}
      />
```

Clicking evidence *replaces* the drawer content for now. Task 6 makes it a stack with a back control.

- [ ] **Step 2b: Show a signal which phenomena it evidences**

A reader arriving at a signal from the ContentStream should be able to see it is
evidence for something. The backlink is **derived** by inverting the evidence
arrays — never stored on the signal, so there is one place to edit and nothing to
keep in sync.

In `ContentDrawer.tsx`, above the body render:

```tsx
              {content.type === "signal" &&
                (() => {
                  const partOf = phenomena.filter((p) =>
                    p.evidence.some((e) => e.signalId === content.data.id),
                  );
                  if (partOf.length === 0) return null;
                  return (
                    <p className="mb-6 text-sm text-gray-400">
                      Evidence for{" "}
                      {partOf.map((p, i) => (
                        <span key={p.id}>
                          {i > 0 && ", "}
                          <button
                            onClick={() => onOpenPhenomenon(p)}
                            className="text-hologram-cyan underline decoration-dotted underline-offset-2 hover:text-white focus:outline-none focus:ring-2 focus:ring-hologram-cyan/50"
                          >
                            {p.label}
                          </button>
                        </span>
                      ))}
                    </p>
                  );
                })()}
```

- [ ] **Step 3: Verify against a real phenomenon**

Run: `npm run build && npm run lint`
Expected: both exit 0.

Run: `npm run dev` and open `http://localhost:5173/FoSW/phenomena/the-vanishing-apprenticeship/` directly. Confirm:

- Thesis, "What is driving it", reach label and rationale all render.
- The contested note renders with its warning icon — this phenomenon has `contested: true`.
- Three implications render, each with a coloured left border and its actor list.
- The evidence sentence reads `Observed in 4 independent contexts across 2 evidence types over 2 quarters. Counter-evidence present.`
- Evidence appears under three headings, with the two counter items under "Evidence against".
- Clicking an evidence item opens that signal's drawer.
- Development paths, "What would change our mind", dimension tags and the three dates all render.
- The potential-impact line reads `Transformative` for this phenomenon.

Then open `/FoSW/phenomena/teams-get-smaller/` and confirm **Related phenomena** lists *The vanishing apprenticeship* with the relation `reinforces`, and that clicking it opens that phenomenon.

Then open any signal cited as evidence — for example `/FoSW/signals/2026-03-30-04/` — and confirm an "Evidence for **The vanishing apprenticeship**" line appears above the body, and that clicking it opens the phenomenon. Open a signal that is cited by nothing, such as `2026-02-05-01`, and confirm no such line appears.

Then open `http://localhost:5173/FoSW/phenomena/compute-becomes-a-budget-line/` and confirm the singular/plural wording is right — it has `quartersSpanned: 1`, so the sentence must read "over 1 quarter", and it has no counter-evidence, so the final sentence must be absent.

- [ ] **Step 4: Commit**

```bash
git add src/components/drawer/PhenomenonContent.tsx src/components/ContentDrawer.tsx src/App.tsx
git commit -m "feat: render phenomena in the content drawer"
```

---

## Task 6: Drawer stack with a back control

Reading a phenomenon, dipping into three of its sources and coming back out is the core reading motion of this radar.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ContentDrawer.tsx`

**Interfaces:**
- Produces: `ContentDrawerProps` gains `onBack?: () => void`. When present, the drawer shows a back control.

- [ ] **Step 1: Hold a stack in `App`**

Replace the drawer state in `src/App.tsx`:

```tsx
  const [stack, setStack] = useState<DrawerContent[]>([]);
  const drawerContent = stack.length > 0 ? stack[stack.length - 1] : null;

  const closeDrawer = useCallback(() => setStack([]), []);
  const openDrawer = useCallback(
    (content: DrawerContent) => setStack([content]),
    [],
  );
  const pushDrawer = useCallback(
    (content: DrawerContent) => setStack((s) => [...s, content]),
    [],
  );
  const popDrawer = useCallback(() => setStack((s) => s.slice(0, -1)), []);
```

`setDrawerContent` is still required by `useDeepLink`, which sets from the URL. Give it one that resets the stack:

```tsx
  const setDrawerContent = useCallback(
    (content: DrawerContent | null) => setStack(content ? [content] : []),
    [],
  );
```

Pass `onOpenSignal={(signal) => pushDrawer({ type: "signal", data: signal })}` — pushing rather than replacing — and `onBack={stack.length > 1 ? popDrawer : undefined}`.

- [ ] **Step 2: Render the back control**

In `ContentDrawer.tsx`, accept `onBack?: () => void` and render it in the header, before the copy-link button:

```tsx
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 rounded-full px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-electric-blue/50"
                  aria-label="Back to the previous item"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
```

Import `ArrowLeft` from `lucide-react`.

- [ ] **Step 3: Verify the motion**

Run: `npm run build && npm run lint`
Expected: both exit 0.

Run: `npm run dev`, open `/FoSW/phenomena/review-shifts-to-verification/`, then:

- Click an evidence item. The signal opens and a **Back** control appears.
- Click Back. The phenomenon returns, scrolled to the top, and Back disappears.
- Click two evidence items in succession without going back. Back appears once; clicking it twice walks back through both.
- Close the drawer from a stacked state. It closes fully rather than unwinding.
- Open a signal from the ContentStream. **No** Back control appears — the stack has one entry.
- Confirm the URL tracks the top of the stack, so copy-link on a stacked signal copies that signal's URL.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/ContentDrawer.tsx
git commit -m "feat: stack drawer content so evidence can be read and backed out of"
```

---

## Task 7: Radar geometry

Pure functions, no React. Everything the radar's placement depends on lives here so it can be reasoned about — and tested, if a runner is ever added.

**Files:**
- Create: `src/config/radarGeometry.ts`

**Interfaces:**
- Produces:
  ```ts
  export const RINGS: readonly ObservedReach[]           // centre -> rim
  export const RING_LABEL: Record<ObservedReach, string>
  export const BLIP_RADIUS: Record<Freshness, number>
  export function sectorAngles(count: number): { start: number; end: number }[]
  export function placeBlip(p: Phenomenon, dimensionIndex: number, dimensionCount: number): { x: number; y: number }
  export const VIEWBOX: { size: number; cx: number; cy: number; r: number }
  ```

- [ ] **Step 1: Write it**

Create `src/config/radarGeometry.ts`:

```ts
import type { Phenomenon, ObservedReach } from "@/types/phenomenon";

/** Centre outwards. Established practice sits in the lit middle; the frontier is
 *  at the dark rim. */
export const RINGS: readonly ObservedReach[] = [
  "field-level-shift",
  "gaining-traction",
  "early-manifestations",
] as const;

export const RING_LABEL: Record<ObservedReach, string> = {
  "field-level-shift": "FIELD-LEVEL SHIFT",
  "gaining-traction": "GAINING TRACTION",
  "early-manifestations": "EARLY MANIFESTATIONS",
};

export const BLIP_RADIUS = {
  current: 9,
  recent: 7.5,
  ageing: 6,
  stale: 4.5,
} as const;

export const VIEWBOX = { size: 560, cx: 280, cy: 280, r: 250 } as const;

/**
 * Ring boundaries as fractions of the outer radius, centre outwards. Exported
 * because the canvas draws these same boundaries — two copies would drift and
 * put blips outside the rings that are meant to contain them.
 */
export const RING_EDGES = [0, 0.36, 0.66, 1] as const;

/** Sector angular spans in degrees, measured clockwise from 12 o'clock. */
export function sectorAngles(count: number): { start: number; end: number }[] {
  const span = 360 / count;
  return Array.from({ length: count }, (_, i) => ({
    start: i * span,
    end: (i + 1) * span,
  }));
}

/** Deterministic 0..1 from a string, so a blip never moves between renders. */
function hash01(s: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Place a blip inside its sector-and-ring cell. Position is a pure function of
 * the phenomenon id, so blips are stable across renders and reloads; the inset
 * keeps them off the ring and sector borders where they would be ambiguous.
 */
export function placeBlip(
  p: Phenomenon,
  dimensionIndex: number,
  dimensionCount: number,
): { x: number; y: number } {
  const ringIndex = Math.max(0, RINGS.indexOf(p.observedReach));
  const inner = RING_EDGES[ringIndex] * VIEWBOX.r;
  const outer = RING_EDGES[ringIndex + 1] * VIEWBOX.r;

  const radialInset = (outer - inner) * 0.18;
  const radius = inner + radialInset + hash01(p.id, 1) * (outer - inner - radialInset * 2);

  const { start, end } = sectorAngles(dimensionCount)[Math.max(0, dimensionIndex)];
  const angularInset = (end - start) * 0.12;
  const deg = start + angularInset + hash01(p.id, 2) * (end - start - angularInset * 2);

  // -90 so 0 degrees is 12 o'clock rather than 3 o'clock.
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    x: VIEWBOX.cx + radius * Math.cos(rad),
    y: VIEWBOX.cy + radius * Math.sin(rad),
  };
}
```

`RING_EDGES` gives the innermost ring a smaller area than the outer two, which is deliberate: fewer phenomena reach field level, and an equal-area split would leave the centre looking empty.

- [ ] **Step 2: Sanity-check the maths before building anything on it**

Run:

```bash
npx tsx -e "
import { placeBlip, sectorAngles, VIEWBOX } from './src/config/radarGeometry.ts';
const mk = (id, reach) => ({ id, observedReach: reach });
for (const [id, reach, idx] of [['a','field-level-shift',0],['b','gaining-traction',4],['c','early-manifestations',8]]) {
  const { x, y } = placeBlip(mk(id, reach), idx, 9);
  const d = Math.hypot(x - VIEWBOX.cx, y - VIEWBOX.cy);
  console.log(id, reach, 'dist from centre:', d.toFixed(1), '(max', VIEWBOX.r + ')');
}
console.log('9 sectors span:', sectorAngles(9)[0], '...', sectorAngles(9)[8]);
console.log('stable?', JSON.stringify(placeBlip(mk('a','gaining-traction'),0,9)) === JSON.stringify(placeBlip(mk('a','gaining-traction'),0,9)));
"
```

Expected: distances increasing from centre ring to rim ring, all below 250; sectors spanning 0–40 through 320–360; `stable? true`.

`tsx` is already a devDependency — do not install anything.

- [ ] **Step 3: Commit**

```bash
git add src/config/radarGeometry.ts
git commit -m "feat: add radar geometry with deterministic blip placement"
```

---

## Task 8: The radar itself

**Files:**
- Create: `src/components/Radar/RadarCanvas.tsx`
- Create: `src/components/Radar/RadarBlips.tsx`
- Create: `src/components/Radar/RadarLegend.tsx`
- Create: `src/components/Radar/FuturesRadar.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- `FuturesRadar` props: `{ phenomena: Phenomenon[]; onOpen: (p: Phenomenon) => void }`
- `RadarCanvas` props: `{ children: React.ReactNode }` — draws rings, sectors, gradient and labels; blips are passed in so the SVG has one owner.
- `RadarBlips` props: `{ phenomena: Phenomenon[]; showLabels: boolean; activeDimension: WorkDimensionId | null; onOpen: (p: Phenomenon) => void }`
- `RadarLegend` props: `{ active: WorkDimensionId | null; onToggle: (id: WorkDimensionId | null) => void }`

- [ ] **Step 1: The canvas**

Create `src/components/Radar/RadarCanvas.tsx`:

```tsx
import type { ReactNode } from "react";
import { WORK_DIMENSIONS } from "@/config/radarDimensions";
import {
  RINGS,
  RING_EDGES,
  RING_LABEL,
  VIEWBOX,
  sectorAngles,
} from "@/config/radarGeometry";

const pointOnCircle = (deg: number, r: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: VIEWBOX.cx + r * Math.cos(rad), y: VIEWBOX.cy + r * Math.sin(rad) };
};

const RadarCanvas = ({ children }: { children: ReactNode }) => {
  const sectors = sectorAngles(WORK_DIMENSIONS.length);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.size} ${VIEWBOX.size}`}
      className="mx-auto block w-full max-w-2xl"
      role="img"
      aria-label="Futures radar: phenomena positioned by how far each change has reached"
    >
      <defs>
        <radialGradient id="radar-bg">
          <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.22" />
          <stop offset="35%" stopColor="#0EA5E9" stopOpacity="0.09" />
          <stop offset="70%" stopColor="#0b1220" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#030711" stopOpacity="1" />
        </radialGradient>
      </defs>

      <circle cx={VIEWBOX.cx} cy={VIEWBOX.cy} r={VIEWBOX.r} fill="url(#radar-bg)" />

      {RING_EDGES.slice(1).map((e, i) => (
        <circle
          key={e}
          cx={VIEWBOX.cx}
          cy={VIEWBOX.cy}
          r={VIEWBOX.r * e}
          fill="none"
          stroke="#1e293b"
          strokeDasharray={i === RING_EDGES.length - 2 ? undefined : "3 4"}
        />
      ))}

      {sectors.map((s) => {
        const p = pointOnCircle(s.start, VIEWBOX.r);
        return (
          <line
            key={s.start}
            x1={VIEWBOX.cx}
            y1={VIEWBOX.cy}
            x2={p.x}
            y2={p.y}
            stroke="#1e293b"
          />
        );
      })}

      {/* Ring labels on the vertical spine, with a backing so they stay readable
          over the gradient. The wording says evidence has spread, not that we are
          certain — the axis is reach, not confidence. */}
      {RINGS.map((ring, i) => {
        const mid = (VIEWBOX.r * (RING_EDGES[i] + RING_EDGES[i + 1])) / 2;
        const y = VIEWBOX.cy - mid;
        const label = RING_LABEL[ring];
        return (
          <g key={ring}>
            <rect x={VIEWBOX.cx - label.length * 3.1} y={y - 9} width={label.length * 6.2} height={13} fill="#030711" />
            <text x={VIEWBOX.cx} y={y} textAnchor="middle" fontSize="9" fontFamily="monospace" fill={i === 0 ? "#7dd3fc" : "#64748b"}>
              {label}
            </text>
          </g>
        );
      })}

      {WORK_DIMENSIONS.map((d, i) => {
        const s = sectors[i];
        const p = pointOnCircle((s.start + s.end) / 2, VIEWBOX.r + 16);
        return (
          <text
            key={d.id}
            x={p.x}
            y={p.y}
            textAnchor={p.x < VIEWBOX.cx - 4 ? "end" : p.x > VIEWBOX.cx + 4 ? "start" : "middle"}
            fontSize="8"
            fontFamily="monospace"
            fill={d.colour}
            opacity="0.75"
          >
            {d.label}
          </text>
        );
      })}

      {children}
    </svg>
  );
};

export default RadarCanvas;
```

Sector labels sit outside the outer ring, so the `viewBox` needs headroom — if any label clips, raise `VIEWBOX.size` and re-centre `cx`/`cy` rather than shrinking the text below 8px.

- [ ] **Step 2: The blips**

Create `src/components/Radar/RadarBlips.tsx`:

```tsx
import { useState } from "react";
import type { Phenomenon } from "@/types/phenomenon";
import type { WorkDimensionId } from "@/config/radarDimensions";
import { WORK_DIMENSIONS } from "@/config/radarDimensions";
import { BLIP_RADIUS, RING_LABEL, VIEWBOX, placeBlip } from "@/config/radarGeometry";
import { deriveImpacts, freshnessOf } from "@/lib/phenomenon";

interface RadarBlipsProps {
  phenomena: Phenomenon[];
  showLabels: boolean;
  activeDimension: WorkDimensionId | null;
  onOpen: (p: Phenomenon) => void;
}

/** A small lightning bolt, drawn inside a contested blip. */
const BOLT = "M 1.1 -5.6 L -3.0 0.5 L -0.4 0.5 L -1.3 5.6 L 3.2 -0.9 L 0.4 -0.9 Z";

const RadarBlips = ({ phenomena, showLabels, activeDimension, onOpen }: RadarBlipsProps) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <g>
      {phenomena.map((p) => {
        const index = WORK_DIMENSIONS.findIndex((d) => d.id === p.primaryDimension);
        const colour = WORK_DIMENSIONS[index]?.colour ?? "#94a3b8";
        const { x, y } = placeBlip(p, index, WORK_DIMENSIONS.length);
        const r = BLIP_RADIUS[freshnessOf(p)];
        const dimmed =
          activeDimension !== null && !deriveImpacts(p).includes(activeDimension);
        const isHovered = hovered === p.id;

        return (
          <g
            key={p.id}
            opacity={dimmed ? 0.18 : 1}
            className="cursor-pointer focus:outline-none"
            role="button"
            tabIndex={0}
            aria-label={`${p.label} — ${RING_LABEL[p.observedReach]}`}
            onClick={() => onOpen(p)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(p);
              }
            }}
            onMouseEnter={() => setHovered(p.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(p.id)}
            onBlur={() => setHovered(null)}
          >
            {isHovered && (
              <circle cx={x} cy={y} r={r + 5} fill="none" stroke="#7dd3fc" strokeWidth="1.5" opacity="0.8" />
            )}
            <circle cx={x} cy={y} r={r} fill={colour} />
            {p.contested && (
              <path d={BOLT} fill="#030711" transform={`translate(${x} ${y}) scale(${r / 7})`} />
            )}
            {showLabels && !dimmed && (
              <text
                x={x + r + 5}
                y={y + 3.5}
                fontSize="10.5"
                fontFamily="monospace"
                fill="#cbd5e1"
                pointerEvents="none"
              >
                {p.label}
              </text>
            )}
            {isHovered && !showLabels && (
              <g pointerEvents="none">
                <rect x={x + r + 4} y={y - 14} width={190} height={30} rx={3} fill="#0b1220" stroke="#334155" />
                <text x={x + r + 10} y={y - 3} fontSize="8" fontFamily="monospace" fill="#e2e8f0">
                  {p.label}
                </text>
                <text x={x + r + 10} y={y + 8} fontSize="7.5" fontFamily="monospace" fill="#64748b">
                  {RING_LABEL[p.observedReach]}
                  {p.contested ? " · contested" : ""}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};

export default RadarBlips;
```

Do **not** import `VIEWBOX` here — this component positions everything relative to the coordinates `placeBlip` returns and never needs the canvas bounds. `noUnusedLocals` will reject it.

- [ ] **Step 3: The legend**

Create `src/components/Radar/RadarLegend.tsx`:

```tsx
import { WORK_DIMENSIONS } from "@/config/radarDimensions";
import type { WorkDimensionId } from "@/config/radarDimensions";

interface RadarLegendProps {
  active: WorkDimensionId | null;
  onToggle: (id: WorkDimensionId | null) => void;
}

const RadarLegend = ({ active, onToggle }: RadarLegendProps) => (
  <div className="mt-6 flex flex-wrap justify-center gap-2">
    {WORK_DIMENSIONS.map((d) => {
      const isActive = active === d.id;
      return (
        <button
          key={d.id}
          onClick={() => onToggle(isActive ? null : d.id)}
          aria-pressed={isActive}
          className={`flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-electric-blue/50 ${
            isActive
              ? "border-white/40 bg-white/10 text-white"
              : "border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200"
          }`}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: d.colour }}
          />
          {d.label}
        </button>
      );
    })}
  </div>
);

export default RadarLegend;
```

Filtering matches the **derived impacts**, not only `primaryDimension`, so filtering by a dimension surfaces every phenomenon with an implication there rather than only the ones sectored into it.

- [ ] **Step 4: The section, with the launch gate**

Create `src/components/Radar/FuturesRadar.tsx`:

```tsx
import { useState } from "react";
import type { Phenomenon } from "@/types/phenomenon";
import type { WorkDimensionId } from "@/config/radarDimensions";
import RadarCanvas from "./RadarCanvas";
import RadarBlips from "./RadarBlips";
import RadarLegend from "./RadarLegend";

const LAUNCH_THRESHOLD = 10;
const LABELS_OFF_ABOVE = 15;

interface FuturesRadarProps {
  phenomena: Phenomenon[];
  onOpen: (p: Phenomenon) => void;
}

const FuturesRadar = ({ phenomena, onOpen }: FuturesRadarProps) => {
  const publishedCount = phenomena.filter((p) => p.status === "published").length;
  const [activeDimension, setActiveDimension] = useState<WorkDimensionId | null>(null);
  const [showLabels, setShowLabels] = useState(phenomena.length <= LABELS_OFF_ABOVE);

  // A stale research claim presented as current is worse than no radar, and an
  // unfinished one is worse than an absent one. Both guards live here.
  if (phenomena.length === 0) return null;
  if (publishedCount < LAUNCH_THRESHOLD && import.meta.env.PROD && import.meta.env.VITE_RADAR_PREVIEW !== "1") {
    return null;
  }

  return (
    <section className="bg-midnight px-4 py-20" id="futures-radar">
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-center font-mono text-xs uppercase tracking-[0.2em] text-hologram-cyan">
          Futures Radar
        </p>
        <h2 className="mb-3 text-center font-serif text-3xl text-white">
          How far has each change reached?
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-gray-400">
          Each blip is a phenomenon — a claim about how software work may be changing,
          backed by dated evidence. Position shows how far it has spread beyond
          forerunners, not how certain we are.
        </p>

        {publishedCount < LAUNCH_THRESHOLD && (
          <p className="mx-auto mb-6 max-w-2xl rounded-lg border border-neon-gold/30 bg-neon-gold/5 px-4 py-2 text-center font-mono text-xs text-neon-gold">
            Preview — {publishedCount} of {LAUNCH_THRESHOLD} phenomena published. Not visible publicly.
          </p>
        )}

        <div className="mb-4 flex justify-center">
          <button
            onClick={() => setShowLabels((v) => !v)}
            aria-pressed={showLabels}
            className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-gray-400 transition-colors hover:border-white/25 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-electric-blue/50"
          >
            Labels {showLabels ? "on" : "off"}
          </button>
        </div>

        <RadarCanvas>
          <RadarBlips
            phenomena={phenomena}
            showLabels={showLabels}
            activeDimension={activeDimension}
            onOpen={onOpen}
          />
        </RadarCanvas>

        <RadarLegend active={activeDimension} onToggle={setActiveDimension} />
      </div>
    </section>
  );
};

export default FuturesRadar;
```

- [ ] **Step 5: Place it in the page**

In `src/App.tsx`, import `FuturesRadar` and render it between `WhatIfSection` and `ContentStream`:

```tsx
      <FuturesRadar
        phenomena={phenomena}
        onOpen={(p) => openDrawer({ type: "phenomenon", data: p })}
      />
```

Take `phenomena` from the `useContent` destructure. The page then reads scenarios → radar (synthesis) → the evidence itself → about.

- [ ] **Step 6: Look at it**

Run: `npm run build && npm run lint`
Expected: both exit 0.

Run: `npm run dev` and open `http://localhost:5173/FoSW/`. Confirm:

- Six blips appear, spread across three rings and six of the nine sectors.
- `Managing machine spend` is in the innermost ring; `Evals become the spec` and `Teams get smaller` are at the rim.
- `The vanishing apprenticeship` and `Teams get smaller` each show a lightning bolt.
- Ring labels read `FIELD-LEVEL SHIFT` / `GAINING TRACTION` / `EARLY MANIFESTATIONS` and are legible over the gradient.
- All nine sector labels are readable and none is clipped by the viewBox.
- Labels are **on** by default at six blips; the toggle turns them off and hover then shows the name, reach and contested status.
- Clicking a blip opens its phenomenon drawer; the URL becomes `/FoSW/phenomena/<id>/`.
- Clicking a legend entry dims non-matching blips. Filtering by *skills, knowledge & learning* keeps **four** blips bright, not one — three phenomena carry an implication there without being sectored into it. If only one stays bright, the filter is matching `primaryDimension` instead of the derived impacts.
- Reloading the page puts every blip in exactly the same position.
- The amber "Preview — 0 of 10 published" banner appears.
- At a 375px viewport width the radar still fits and is legible.

- [ ] **Step 7: Confirm the launch gate hides it in production**

Run: `npm run build && npm run preview`
Open `http://localhost:4173/FoSW/`.
Expected: **no radar section at all** — zero phenomena are published, so the gate closes. The rest of the page is unchanged.

This is the single most important check in the phase: it is what stops unreviewed research claims reaching the public site.

- [ ] **Step 8: Commit**

```bash
git add src/components/Radar/ src/App.tsx
git commit -m "feat: render the futures radar behind a launch gate"
```

---

## Task 9: Documentation and PR description

**Files:**
- Modify: `CLAUDE.md`
- Create: `PR_DESCRIPTION_feat-radar-ui.md`

- [ ] **Step 1: Update `CLAUDE.md`**

In *Project Structure*, add `src/components/Radar/`, `src/components/drawer/` and `src/lib/` to the tree.

Add to *Key Conventions*:

> **Drawer ownership:** `App` owns content fetching, the drawer stack, deep links and article meta, and renders `ContentDrawer` once. Sections receive data and an `onOpen` callback as props. Do not add a second `ContentDrawer` — two would fight over the URL.

> **Radar visibility:** the radar section renders only when at least 10 phenomena are `published`, except in dev and in preview builds (`VITE_RADAR_PREVIEW=1`). Drafts are fetched in those same two cases and never in production.

- [ ] **Step 2: Write the PR description**

Create `PR_DESCRIPTION_feat-radar-ui.md` covering: what Phase 3 delivers; that the radar is invisible in production until ten phenomena are published; the `ContentStream` → `App` ownership refactor and why it was necessary; the `ContentDrawer` split; that deep links are path-based (`/phenomena/<id>/`) rather than the query-string form the spec suggested, for consistency with the existing convention; and that Phase 4 (the preview deployment) is what makes this reviewable by colleagues.

- [ ] **Step 3: Full verification**

Run: `npm test && npm run build && npm run lint`
Expected: 63/63 tests, both exit 0.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md PR_DESCRIPTION_feat-radar-ui.md
git commit -m "docs: document radar ownership, visibility rules and the phase 3 PR"
```

---

## Phase 3 Done When

- `npm run dev` shows six blips across three rings and six sectors, correctly placed and stable across reloads.
- Clicking a blip opens the phenomenon drawer; clicking its evidence pushes the signal drawer; Back returns.
- `npm run preview` shows **no radar**, because no phenomenon is published.
- Signals and insights behave exactly as they did before this branch.
- `npm test` 63/63, `npm run build` and `npm run lint` both exit 0.

## What Phase 3 Deliberately Does Not Do

- **No preview deployment.** Colleagues cannot see this yet; that is Phase 4 (`VITE_RADAR_PREVIEW`, `deploy-preview.yml`, `clean-exclude`, `noindex`).
- **No pipeline.** Phenomena are hand-authored; `radar:prepare` / `apply` / `accept` / `derive` are Phase 2.
- **No editions or movement.** `reachHistory` is rendered nowhere; `radar:snapshot` is Phase 2.
- **No by-impact radius mode.** Deferred to v2 per the spec; `potentialImpact` is carried in the data and shown in the drawer only.
- **No frontend test runner.** Verification is visual plus build and lint, consistent with the rest of the frontend. The pure functions in `src/lib/phenomenon.ts` and `src/config/radarGeometry.ts` are written with no React imports so a future runner can reach them unchanged.

## Carry-Forward Still Open After Phase 3

From the Phase 1 review, unchanged by this phase: `evidenceProfile` is optional even for published phenomena; `possibleReachChange` does not exist yet; `lastReviewed` is unvalidated; drafts may cite untyped evidence; `data/_finder-output.json` still holds a retired genre value; `AGENTS.md` is stale. See the table at the end of the Phase 1 plan.

This phase closes one of them: **`deriveImpacts` now exists** (`src/lib/phenomenon.ts`), so Phase 2 has a helper to reuse and no author is tempted to store an `impacts` field.
