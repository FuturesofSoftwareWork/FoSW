# Deep Links & Per-Article SEO

## Goal

Give every published **expert insight** its own real, crawlable, shareable URL with per-article metadata — so articles are found in search by their own title/topic (not only by the project name) and shared links preview correctly. Reuses the existing drawer UI and Puppeteer prerender.

## What changed

### Shareable URLs + deep linking
- New URL scheme: `https://futuresofsoftwarework.github.io/FoSW/insights/<id>/` (the existing kebab-case `id`).
- `useDeepLink` (`src/hooks/useDeepLink.ts`) keeps the drawer overlay and the browser URL in sync via the History API — no router library:
  - Opening a shared article URL auto-opens that article's drawer.
  - Clicking an article updates the address bar (`pushState`); closing returns to `/FoSW/`.
  - Browser back/forward open/close the drawer as expected.
- Pure URL↔item helpers in `src/hooks/deepLinkPath.ts` (`matchPath`, `itemPath`).
- **Copy-link button** in the drawer (`ContentDrawer.tsx`) copies the current article URL.

### Per-article SEO metadata
- `useArticleMeta` (`src/hooks/useArticleMeta.ts`) reflects the open article into `document.head`: `<title>`, description, canonical, Open Graph, Twitter, and an **Article JSON-LD** block — then restores homepage defaults on close.
- The app is the single source of truth for metadata; the prerender just captures what the app rendered.
- Absolute URLs come from a `SITE_URL` constant (`src/config.ts`), **never** `window.location.origin`, so prerendered pages never bake in `localhost`.
- Optional `image?` field added to `ExpertInsight`/`AISignal`; falls back to `hero-bg.png`. To give a post a custom social card later, add `"image": "file.png"` (in `public/`) to its JSON — no code change.

### Static generation (`scripts/prerender.mjs`)
- Prerenders a real `dist/insights/<id>/index.html` per published insight (drawer open, correct meta baked in) — served directly by GitHub Pages, no 404 hacks.
- Expanded `sitemap.xml`: homepage + one entry per insight (`lastmod` = article date). **This is the core SEO delivery** — how Google discovers each article.
- **Build-time verification** fails the build if any insight page is missing its `og:url` or title.
- Two latent bugs in the local prerender server were fixed along the way: the SPA-fallback extension check ran after the path was mutated (always false), and the server didn't strip `?t=` cache-buster query strings (content 404'd → stub data). Both fixed.

### AI signals — built but OFF by default
- The same machinery works for AI signals behind a `PRERENDER_SIGNALS` toggle (`scripts/prerender.mjs`), **defaulted to `false`**.
- Why off: prerendering all ~77 signals adds **~1m45s to every deploy** (and grows ~1.3s per new signal), and 6 signal entries have broken data (2 missing files, 4 index/file `id` mismatches). Insights are the priority and stay cheap (~25s build).
- Flip `PRERENDER_SIGNALS = true` to enable once the signal corpus data is cleaned up. When enabled, the build logs each skipped signal's id + reason.

## Verification
- `npm run build` passes (tsc strict + vite + prerender), ~27s, generates 6 insight pages + a 7-URL sitemap.
- Confirmed a prerendered page carries the article `<title>`, `og:title`/`og:type=article`/`og:url` (production URL, no localhost), `og:image`, and Article JSON-LD.

## Follow-ups (not in this PR)
- Clean the 6 broken AI-signal index entries, then consider enabling `PRERENDER_SIGNALS` (a data-fix task was flagged).
- `npm run lint` can't run — `eslint` is referenced by the script but not a declared dependency (pre-existing; deploy uses `build`, not `lint`).

## Maintenance note
Keep `SITE_URL` identical in `src/config.ts` and `scripts/prerender.mjs`.
