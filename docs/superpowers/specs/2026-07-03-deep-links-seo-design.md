# Deep Links & Per-Article SEO — Design

**Date:** 2026-07-03
**Status:** Approved (pending spec review)

## Problem

The site is a single-page app served from GitHub Pages at `/FoSW/`. Expert
insights open in an in-memory **drawer overlay** (`setDrawerContent`) — the URL
never changes, so there is no way to link directly to a specific article. You
can only share the homepage and tell people to find the post.

Consequences:

- **No shareable article links.** Visitors cannot copy a link to a post.
- **Weak SEO.** Only the homepage exists as a real URL, so the site is found
  almost entirely by the project name. Individual articles are not indexed as
  their own pages.
- **Generic link previews.** Any shared link shows the homepage Open Graph card,
  never the article's own title/description/image.

## Goal

Give every published expert insight (and, optionally, every AI signal) a real,
crawlable, shareable URL with per-article metadata, while reusing the existing
drawer UI and prerender tooling. Primary driver is **SEO**; shareable in-app
links are a close second.

## Non-Goals

- No React Router (the app is one page + an overlay).
- No `404.html` SPA-redirect trick (prerendered pages are real files).
- No auto-generated social card images.
- No forced per-post images (optional field only).
- AI signals are an **optional, isolated add-on**, not first-class scope.

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Landing experience for a shared link | **Homepage with the article drawer auto-opened** (reuse existing drawer) |
| Social preview image | **Optional `image` field on the item; fall back to `hero-bg.png`** |
| How visitors get the link | **Address-bar sync (`pushState`) + a "Copy link" button in the drawer** |
| AI signals scope | **Insights are core; signals are a separate toggleable block in the same work** |
| URL resolution on GitHub Pages | **Prerender a real `index.html` folder per item** (no 404 hack) |
| App routing mechanism | **Plain History API** (`location.pathname` + `pushState`/`popstate`), no router lib |

## URL Scheme

- Insight: `https://futuresofsoftwarework.github.io/FoSW/insights/<id>/`
- Signal (optional): `https://futuresofsoftwarework.github.io/FoSW/signals/<id>/`

`<id>` is the existing item `id`, which is already a clean kebab-case slug
(e.g. `productivity-systems-lens`). Each URL corresponds to a physical
`dist/insights/<id>/index.html` (or `dist/signals/<id>/index.html`) produced at
build time, so GitHub Pages serves it directly. A request for an unknown id
returns GitHub's normal 404 — acceptable, not designed around.

Path parsing must accept both trailing-slash and no-slash forms
(`/insights/<id>` and `/insights/<id>/`).

## Architecture

Three concerns, each isolated:

1. **URL ↔ drawer synchronisation** (runtime, client) — `useDeepLink`.
2. **Per-article document metadata** (runtime + prerender, one source of truth) —
   `useArticleMeta`.
3. **Static generation + discovery** (build) — `scripts/prerender.mjs`.

### 1. `useDeepLink` hook (new: `src/hooks/useDeepLink.ts`)

Single responsibility: keep the open-drawer state and the browser URL in sync.

- **Path → item matching** is a pure, exported function:
  `matchPath(pathname, baseUrl) -> { type: "insight" | "signal", id } | null`.
  Testable in isolation.
- **On load** (after `useContent` has finished; guard on `isLoading`): if the
  current path matches an item that exists in the loaded content, open that
  drawer.
- **On drawer open via user click:** `history.pushState({}, "", <item path>)`.
- **On drawer close:** `history.pushState({}, "", <base>)` (`/FoSW/`).
- **On `popstate`:** re-derive drawer state from the new path (open/close), so
  browser back/forward behave naturally.

The hook is wired into `ContentStream`, which already owns the `drawerContent`
state and the click handlers. No new global state is introduced.

Interface: `useDeepLink({ insights, signals, isLoading, drawerContent, setDrawerContent })`.

### 2. `useArticleMeta` hook (new: `src/hooks/useArticleMeta.ts`)

Single responsibility: reflect the currently open drawer item into the document
`<head>`, so the app is the **single source of truth** for metadata — the
prerender step simply captures whatever the app rendered.

This hook is called in **`ContentStream`** (which owns `drawerContent` and is
always mounted), not inside `ContentDrawer` — so its close/reset cleanup runs
reliably even though the drawer component mounts/unmounts.

When a drawer is open, set:

- `document.title` — `"<article title> — Alternative Futures of Software Work"`.
- `<meta name="description">` — the item's excerpt/summary.
- `<link rel="canonical">` — the absolute article URL.
- `og:title`, `og:description`, `og:type=article`, `og:url`, `og:image`.
- `twitter:title`, `twitter:description`, `twitter:image`.
- An **Article** JSON-LD `<script>` (headline, author, datePublished, image, url).

On close (or unmount), restore the homepage defaults.

**Absolute URLs** (`canonical`, `og:url`, `og:image`) are built from a fixed
`SITE_URL` constant, **not** `window.location.origin`. At prerender time the app
runs on `http://localhost:4173`; using the origin would bake `localhost` into the
generated files. `og:image` = the item's `image` field if present, else
`${SITE_URL}/hero-bg.png`.

Implementation detail: the hook queries existing `<meta>`/`<link>` nodes by
selector and updates their `content`/`href`, creating nodes only when missing.
No metadata library (e.g. react-helmet) is added.

### 3. `SITE_URL` constant (new: `src/config.ts`)

```ts
export const SITE_URL = "https://futuresofsoftwarework.github.io/FoSW";
```

Used by `useArticleMeta`. Note the prerender script (`scripts/prerender.mjs`) is
plain Node ESM and cannot import this TS module; it keeps its own matching
literal for the sitemap base (as `refreshSitemap()` already does today). The
constant is the single source of truth for the **app**; the two must be kept
consistent (both point at the production origin).

### 4. Copy-link button (`src/components/ContentDrawer.tsx`)

A button rendered in the open drawer that copies the current article URL
(`window.location.href`, which `useDeepLink` has already set) via
`navigator.clipboard.writeText`, showing a transient "Copied!" state. Styled to
match the drawer's existing controls.

### 5. Prerender changes (`scripts/prerender.mjs`)

Currently prerenders only the homepage to `dist/index.html` and writes a
homepage-only sitemap. Changes:

**a. SPA fallback in the local server.** Today unknown paths 404. Change the
handler so a request with **no file extension** that does not resolve to an
existing file serves the root `dist/index.html` (so Puppeteer can load the SPA
at `/FoSW/insights/<id>`). Requests with an extension (`.js`, `.json`, `.png`,
…) keep current behaviour (served if present, else 404).

**b. Per-article prerender loop.** After the homepage:

1. Read `dist/content/expert-insights/index.json`; take `status === "published"`.
2. For each item: navigate to `http://localhost:4173/FoSW/insights/<id>`, wait
   for the drawer content to render (reuse the existing networkidle + delay
   pattern; optionally wait for a drawer selector), capture `page.content()`,
   write to `dist/insights/<id>/index.html` (create the folder).

**c. Signals (optional, isolated block).** Same loop over the signals index →
`dist/signals/<id>/index.html`. Implemented behind a single toggle
(`const PRERENDER_SIGNALS = true`) so it can be enabled/disabled or dropped
without touching the insight path.

**d. Sitemap expansion.** `refreshSitemap()` emits one `<url>` per prerendered
page: homepage + every insight (and signal, if enabled), each with
`lastmod` = the item's `date`. This is the core SEO deliverable — how Google
discovers each article.

**e. Build-time verification.** After generation, assert each published insight
produced a `dist/insights/<id>/index.html` whose contents include the article
title in `<title>` and `og:title`. If any is missing/wrong, exit non-zero so a
broken build fails visibly. (Lightweight substitute for a test runner, which the
repo does not have.)

## Schema Change

Add an optional field to `src/types/content.ts`:

- `ExpertInsight.image?: string` — relative path (e.g. `custom-card.png`) or
  absolute URL for the social card. Absent → `hero-bg.png` fallback.
- If signals are enabled: `AISignal.image?: string` with the same semantics.

No existing content files need to change; absent `image` uses the fallback.

## Data Flow

**Build:**

1. `vite build` → `dist/` (SPA + content JSON).
2. `prerender.mjs`:
   a. Start local server (SPA fallback for extensionless unknown paths).
   b. Prerender homepage → `dist/index.html`.
   c. For each published insight → navigate, app opens drawer + sets meta,
      capture → `dist/insights/<id>/index.html`.
   d. (optional) same for signals.
   e. Write `sitemap.xml` (homepage + all article URLs).
   f. Verify generated pages; fail build on mismatch.

**Runtime — shared link:**

1. Browser requests `/FoSW/insights/<id>/` → GitHub serves the prerendered
   `index.html` (correct meta already baked in; content visible without JS).
2. SPA hydrates; `useDeepLink` confirms/keeps the drawer open for that path.

**Runtime — browsing the site:**

1. Click article → drawer opens, `pushState` to article URL, `useArticleMeta`
   updates title/meta, tab title changes.
2. Copy-link button copies the current URL.
3. Close drawer → `pushState` back to `/FoSW/`, meta reset.
4. Back/forward → `popstate` opens/closes the drawer accordingly.

## Error Handling & Edge Cases

- **Unknown/typo/deleted id in URL:** SPA loads, `matchPath` finds no item →
  homepage with no drawer. (For prerendered ids this cannot happen; arbitrary
  missing files 404 at GitHub.)
- **Content fetch fails** (falls back to `defaultContent.ts`): deep link may not
  match → homepage. Graceful degradation.
- **Trailing slash vs none:** `matchPath` handles both.
- **`pushState` base path:** built from `import.meta.env.BASE_URL` so it always
  includes `/FoSW/`.
- **Absolute meta URLs at prerender time:** solved by `SITE_URL` constant (never
  `window.location.origin`).

## Testing

- **Unit:** pure `matchPath` function — verify insight/signal/none, trailing
  slash, base-path stripping. (Written as a small standalone assertion; no test
  framework is added.)
- **Build verification:** step (e) above fails the build if any published
  insight page is missing or lacks correct `<title>`/`og:title`.
- **Manual:** `npm run preview`; open an article URL → drawer opens; view-source
  shows per-article meta + JSON-LD; copy-link works; back/forward behave;
  homepage meta restored on close.

## Files Touched

| File | Change |
| --- | --- |
| `src/types/content.ts` | Add optional `image` to `ExpertInsight` (+ `AISignal` if signals) |
| `src/config.ts` | **New.** `SITE_URL` constant |
| `src/hooks/useDeepLink.ts` | **New.** URL ↔ drawer sync + pure `matchPath` |
| `src/hooks/useArticleMeta.ts` | **New.** Document title/meta/JSON-LD from open drawer |
| `src/components/ContentStream.tsx` | Wire `useDeepLink` + `useArticleMeta` into existing `drawerContent` state |
| `src/components/ContentDrawer.tsx` | Copy-link button |
| `scripts/prerender.mjs` | SPA server fallback, per-article loop, sitemap expansion, verification |

## Rollout

Ship insights first. Signals ride behind the `PRERENDER_SIGNALS` toggle in the
same change; can be enabled in the same PR or a follow-up without rework.
