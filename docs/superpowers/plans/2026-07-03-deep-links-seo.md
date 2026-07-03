# Deep Links & Per-Article SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every published expert insight (and optionally every AI signal) a real, crawlable, shareable URL with per-article metadata, reusing the existing drawer UI and Puppeteer prerender.

**Architecture:** The React SPA opens the existing drawer overlay from the URL via the History API (no router). A small hook sets per-article `document.head` metadata (title, OG/Twitter, Article JSON-LD) so the app is the single source of truth. The build-time prerender (`scripts/prerender.mjs`) navigates to each item URL, captures the fully-rendered HTML with correct meta, writes a physical `index.html` per item, and expands `sitemap.xml`.

**Tech Stack:** React 18 + TypeScript (strict), Vite 5 (`base: '/FoSW/'`), Puppeteer (existing prerender), GitHub Pages (branch deploy).

## Global Constraints

- Base path is `/FoSW/` — always build in-app paths from `import.meta.env.BASE_URL`.
- Production origin constant: `SITE_URL = "https://futuresofsoftwarework.github.io/FoSW"`. Use for all absolute meta URLs; never `window.location.origin` (prerender runs on `localhost:4173`).
- `prerender.mjs` is plain Node ESM and cannot import TS; it keeps its own literal base URL matching `SITE_URL`.
- Strict TypeScript: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`. Unused imports/vars fail the build.
- ESLint: zero warnings allowed.
- Tailwind: only full static class names — no dynamic interpolation.
- CI uses Node 20 — no Node ≥22-only features (e.g. `--experimental-strip-types`).
- No React Router. No `404.html` SPA redirect. No new test framework. No auto-generated card images.
- AI signals prerendering sits behind a single `PRERENDER_SIGNALS` toggle.
- Verify every task with `npm run build` (runs `tsc && vite build && prerender`). It must exit 0.
- Item `id` values are already clean kebab slugs; use them verbatim in URLs.

---

### Task 1: Foundations — `SITE_URL` config and optional `image` schema

**Files:**
- Create: `src/config.ts`
- Modify: `src/types/content.ts` (add `image?` to `ExpertInsight` and `AISignal`)

**Interfaces:**
- Produces: `SITE_URL: string`, `SITE_DEFAULTS: { title: string; description: string }`, `absoluteUrl(pathOrUrl: string): string` from `@/config`.
- Produces: `ExpertInsight.image?: string`, `AISignal.image?: string`.

- [ ] **Step 1: Create the config module**

Create `src/config.ts`:

```ts
// Single source of truth for the production origin and site-wide meta defaults.
// prerender.mjs keeps a matching literal (it cannot import this TS module).
export const SITE_URL = "https://futuresofsoftwarework.github.io/FoSW";

export const SITE_DEFAULTS = {
  title: "Alternative Futures of Software Work",
  description:
    "How AI is reshaping software work — curated weekly signals, expert insights, and scenario research from VTT, University of Helsinki, and Business Finland.",
} as const;

// Turn a relative asset path or an already-absolute URL into an absolute URL.
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}/${pathOrUrl.replace(/^\//, "")}`;
}
```

- [ ] **Step 2: Add the optional `image` field to both content types**

In `src/types/content.ts`, add `image?: string;` to the `AISignal` interface (after `decisionHorizon?`):

```ts
  decisionHorizon?: DecisionHorizon;
  image?: string;
}
```

And to the `ExpertInsight` interface (after `url?`):

```ts
  url?: string;
  image?: string;
}
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: exits 0 (tsc + vite build + prerender all succeed). The new exports are unused so far; that is fine because they are `export`ed (not locals).

- [ ] **Step 4: Commit**

```bash
git add src/config.ts src/types/content.ts
git commit -m "feat: add SITE_URL config and optional image field to content types"
```

---

### Task 2: Deep-link path helpers

Pure functions that map between a URL pathname and a drawer item. Kept in their own file so they are easy to reason about and are reused by the hook.

**Files:**
- Create: `src/hooks/deepLinkPath.ts`

**Interfaces:**
- Consumes: `DrawerContent` from `@/types/content`.
- Produces:
  - `type PathMatch = { type: "insight" | "signal"; id: string }`
  - `matchPath(pathname: string, baseUrl: string): PathMatch | null`
  - `itemPath(content: DrawerContent | null, baseUrl: string): string`

Behavior contract (verified end-to-end by the prerender build check in Task 6, and manually in Tasks 3/8):
- `matchPath("/FoSW/insights/foo", "/FoSW/")` → `{ type: "insight", id: "foo" }`
- `matchPath("/FoSW/insights/foo/", "/FoSW/")` → `{ type: "insight", id: "foo" }` (trailing slash tolerated)
- `matchPath("/FoSW/signals/bar/", "/FoSW/")` → `{ type: "signal", id: "bar" }`
- `matchPath("/FoSW/", "/FoSW/")` → `null`
- `matchPath("/FoSW/insights/foo/extra", "/FoSW/")` → `null` (no deep sub-paths)
- `itemPath(null, "/FoSW/")` → `"/FoSW/"`
- `itemPath({ type: "insight", data: { id: "foo", ... } }, "/FoSW/")` → `"/FoSW/insights/foo/"`

- [ ] **Step 1: Create the helper file**

Create `src/hooks/deepLinkPath.ts`:

```ts
import type { DrawerContent } from "@/types/content";

export type PathMatch = { type: "insight" | "signal"; id: string };

function normalizeBase(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

// Parse a pathname into an item reference, or null when it is not an item URL.
export function matchPath(pathname: string, baseUrl: string): PathMatch | null {
  const base = normalizeBase(baseUrl);
  let rest = pathname.startsWith(base)
    ? pathname.slice(base.length)
    : pathname.replace(/^\//, "");
  rest = rest.replace(/\/$/, "");
  if (!rest) return null;
  const parts = rest.split("/");
  if (parts.length !== 2) return null;
  const [kind, id] = parts;
  if (!id) return null;
  if (kind === "insights") return { type: "insight", id };
  if (kind === "signals") return { type: "signal", id };
  return null;
}

// Build the in-app path (including base, with trailing slash) for a drawer item.
export function itemPath(
  content: DrawerContent | null,
  baseUrl: string,
): string {
  const base = normalizeBase(baseUrl);
  if (!content) return base;
  const kind = content.type === "insight" ? "insights" : "signals";
  return `${base}${kind}/${content.data.id}/`;
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: exits 0. (Functions are exported, so strict unused checks do not flag them.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/deepLinkPath.ts
git commit -m "feat: add pure URL<->drawer path helpers for deep linking"
```

---

### Task 3: `useDeepLink` hook and wiring into ContentStream

Keeps drawer state and the browser URL in sync (load, click, close, back/forward).

**Files:**
- Create: `src/hooks/useDeepLink.ts`
- Modify: `src/components/ContentStream.tsx`

**Interfaces:**
- Consumes: `matchPath`, `itemPath` from `./deepLinkPath`; `AISignal`, `ExpertInsight`, `DrawerContent` from `@/types/content`.
- Produces: `useDeepLink(args: UseDeepLinkArgs): void` where
  `UseDeepLinkArgs = { insights: ExpertInsight[]; signals: AISignal[]; isLoading: boolean; drawerContent: DrawerContent | null; setDrawerContent: (c: DrawerContent | null) => void }`.

- [ ] **Step 1: Create the hook**

Create `src/hooks/useDeepLink.ts`:

```ts
import { useEffect, useRef } from "react";
import type { AISignal, ExpertInsight, DrawerContent } from "@/types/content";
import { matchPath, itemPath } from "./deepLinkPath";

interface UseDeepLinkArgs {
  insights: ExpertInsight[];
  signals: AISignal[];
  isLoading: boolean;
  drawerContent: DrawerContent | null;
  setDrawerContent: (c: DrawerContent | null) => void;
}

export function useDeepLink({
  insights,
  signals,
  isLoading,
  drawerContent,
  setDrawerContent,
}: UseDeepLinkArgs): void {
  const baseUrl = import.meta.env.BASE_URL;
  const initialized = useRef(false);

  // URL -> state: resolve on first load (once content is ready) and on back/forward.
  useEffect(() => {
    if (isLoading) return;

    const openFromUrl = () => {
      const match = matchPath(window.location.pathname, baseUrl);
      if (!match) {
        setDrawerContent(null);
        return;
      }
      if (match.type === "insight") {
        const found = insights.find((i) => i.id === match.id);
        setDrawerContent(found ? { type: "insight", data: found } : null);
      } else {
        const found = signals.find((s) => s.id === match.id);
        setDrawerContent(found ? { type: "signal", data: found } : null);
      }
    };

    openFromUrl();
    initialized.current = true;

    window.addEventListener("popstate", openFromUrl);
    return () => window.removeEventListener("popstate", openFromUrl);
  }, [isLoading, insights, signals, baseUrl, setDrawerContent]);

  // state -> URL: push a new URL when the user opens/closes the drawer.
  // Skipped until the initial URL resolution has run, so a shared article URL
  // is not clobbered before content finishes loading.
  useEffect(() => {
    if (!initialized.current) return;
    const desired = itemPath(drawerContent, baseUrl);
    const current = window.location.pathname;
    if (current.replace(/\/$/, "") !== desired.replace(/\/$/, "")) {
      window.history.pushState({}, "", desired);
    }
  }, [drawerContent, baseUrl]);
}
```

- [ ] **Step 2: Wire the hook into ContentStream**

In `src/components/ContentStream.tsx`, add the import near the other hook imports:

```ts
import { useDeepLink } from "@/hooks/useDeepLink";
```

Then, immediately after the `closeDrawer` declaration (around line 37), add the hook call:

```ts
  const closeDrawer = useCallback(() => setDrawerContent(null), []);

  useDeepLink({
    insights,
    signals,
    isLoading,
    drawerContent,
    setDrawerContent,
  });
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Manual behavior check**

Run: `npm run dev`, open the site.
Expected:
- Clicking an expert insight changes the address bar to `/FoSW/insights/<id>/` and opens the drawer.
- Reloading that URL re-opens the same article's drawer.
- Browser Back closes the drawer and returns to `/FoSW/`; Forward re-opens it.
- Clicking an AI signal changes the URL to `/FoSW/signals/<id>/`.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDeepLink.ts src/components/ContentStream.tsx
git commit -m "feat: sync drawer state with URL via History API deep links"
```

---

### Task 4: `useArticleMeta` hook and wiring into ContentStream

Reflects the open drawer item into `document.head` so runtime and prerender share one meta source.

**Files:**
- Create: `src/hooks/useArticleMeta.ts`
- Modify: `src/components/ContentStream.tsx`

**Interfaces:**
- Consumes: `DrawerContent` from `@/types/content`; `SITE_URL`, `SITE_DEFAULTS`, `absoluteUrl` from `@/config`.
- Produces: `useArticleMeta(content: DrawerContent | null): void`.

The homepage `index.html` already contains these nodes (update in place, do not duplicate): `<title>`, `meta[name="description"]`, `link[rel="canonical"]`, `meta[property="og:title"]`, `meta[property="og:description"]`, `meta[property="og:type"]`, `meta[property="og:url"]`, `meta[property="og:image"]`, `meta[name="twitter:title"]`, `meta[name="twitter:description"]`, `meta[name="twitter:image"]`. The Article JSON-LD is a new `<script id="article-jsonld">` this hook creates and removes.

- [ ] **Step 1: Create the hook**

Create `src/hooks/useArticleMeta.ts`:

```ts
import { useEffect } from "react";
import type { DrawerContent } from "@/types/content";
import { SITE_URL, SITE_DEFAULTS, absoluteUrl } from "@/config";

const ARTICLE_JSONLD_ID = "article-jsonld";

function setAttr(selector: string, attr: "content" | "href", value: string) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

function removeArticleJsonLd() {
  document.getElementById(ARTICLE_JSONLD_ID)?.remove();
}

function setArticleJsonLd(data: Record<string, unknown>) {
  removeArticleJsonLd();
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = ARTICLE_JSONLD_ID;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

function applyDefaults() {
  document.title = SITE_DEFAULTS.title;
  setAttr('meta[name="description"]', "content", SITE_DEFAULTS.description);
  setAttr('link[rel="canonical"]', "href", `${SITE_URL}/`);
  setAttr('meta[property="og:title"]', "content", SITE_DEFAULTS.title);
  setAttr('meta[property="og:description"]', "content", SITE_DEFAULTS.description);
  setAttr('meta[property="og:type"]', "content", "website");
  setAttr('meta[property="og:url"]', "content", `${SITE_URL}/`);
  setAttr('meta[property="og:image"]', "content", `${SITE_URL}/hero-bg.png`);
  setAttr('meta[name="twitter:title"]', "content", SITE_DEFAULTS.title);
  setAttr('meta[name="twitter:description"]', "content", SITE_DEFAULTS.description);
  setAttr('meta[name="twitter:image"]', "content", `${SITE_URL}/hero-bg.png`);
  removeArticleJsonLd();
}

export function useArticleMeta(content: DrawerContent | null): void {
  useEffect(() => {
    if (!content) {
      applyDefaults();
      return;
    }

    const isInsight = content.type === "insight";
    const kind = isInsight ? "insights" : "signals";
    const { data } = content;
    const title = data.title;
    const description = isInsight
      ? (data as { excerpt: string }).excerpt
      : (data as { summary: string }).summary;
    const url = `${SITE_URL}/${kind}/${data.id}/`;
    const image = data.image
      ? absoluteUrl(data.image)
      : `${SITE_URL}/hero-bg.png`;

    document.title = `${title} — ${SITE_DEFAULTS.title}`;
    setAttr('meta[name="description"]', "content", description);
    setAttr('link[rel="canonical"]', "href", url);
    setAttr('meta[property="og:title"]', "content", title);
    setAttr('meta[property="og:description"]', "content", description);
    setAttr('meta[property="og:type"]', "content", "article");
    setAttr('meta[property="og:url"]', "content", url);
    setAttr('meta[property="og:image"]', "content", image);
    setAttr('meta[name="twitter:title"]', "content", title);
    setAttr('meta[name="twitter:description"]', "content", description);
    setAttr('meta[name="twitter:image"]', "content", image);

    setArticleJsonLd({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      author: {
        "@type": "Person",
        name: isInsight ? (data as { author: string }).author : "VTT",
      },
      datePublished: data.date,
      image,
      url,
      inLanguage: "en",
    });

    return () => {
      applyDefaults();
    };
  }, [content]);
}
```

- [ ] **Step 2: Wire the hook into ContentStream**

In `src/components/ContentStream.tsx`, add the import:

```ts
import { useArticleMeta } from "@/hooks/useArticleMeta";
```

Then add the call right after the `useDeepLink(...)` call from Task 3:

```ts
  useArticleMeta(drawerContent);
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Manual behavior check**

Run: `npm run dev`. Open an insight.
Expected: the browser tab title changes to `<article title> — Alternative Futures of Software Work`. Closing the drawer restores the default title. (Full meta is verified after prerender in Task 6/8.)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useArticleMeta.ts src/components/ContentStream.tsx
git commit -m "feat: set per-article document metadata and Article JSON-LD from open drawer"
```

---

### Task 5: Copy-link button in the drawer

**Files:**
- Modify: `src/components/ContentDrawer.tsx`

**Interfaces:**
- Consumes: nothing new (uses `window.location.href`, already set by `useDeepLink`).

- [ ] **Step 1: Add icons and copy state**

In `src/components/ContentDrawer.tsx`, add `Link2` and `Check` to the existing `lucide-react` import:

```ts
import {
  X,
  ExternalLink,
  Sparkles,
  Calendar,
  Tag,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  Clock,
  LayoutGrid,
  BookOpen,
  Link2,
  Check,
} from "lucide-react";
```

Inside the component, after the `scrollProgress` state (around line 28), add copy state and a cleanup ref:

```ts
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    });
  };
```

- [ ] **Step 2: Render the button in the sticky header**

Replace the sticky header opening `<div>` (currently `className="sticky top-0 z-10 flex justify-end p-4 ..."`, around line 109) so it spreads a copy button and the close button:

```tsx
            <div className="sticky top-0 z-10 flex justify-between items-center p-4 bg-midnight/80 backdrop-blur-sm">
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider px-3 py-2 rounded-full transition-all focus:outline-none focus:ring-2 ${
                  isSignal
                    ? "text-hologram-cyan hover:bg-hologram-cyan/20 focus:ring-hologram-cyan/50"
                    : "text-neon-gold hover:bg-neon-gold/20 focus:ring-neon-gold/50"
                }`}
                aria-label="Copy link to this article"
              >
                {copied ? (
                  <>
                    <Check size={14} /> Copied
                  </>
                ) : (
                  <>
                    <Link2 size={14} /> Copy link
                  </>
                )}
              </button>
              <button
                ref={closeButtonRef}
```

(The existing close `<button ref={closeButtonRef} ...>` stays exactly as-is; only the wrapping `<div>` changed and the copy button was inserted before it.)

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Manual behavior check**

Run: `npm run dev`, open an article, click **Copy link**.
Expected: button flips to "Copied" for ~2s; pasting yields `http://localhost:5173/FoSW/insights/<id>/`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ContentDrawer.tsx
git commit -m "feat: add copy-link button to the content drawer"
```

---

### Task 6: Prerender per-insight pages, expand sitemap, verify

Generates a real `dist/insights/<id>/index.html` per published insight, adds them to the sitemap, and fails the build if any page lacks its per-article meta.

**Files:**
- Modify: `scripts/prerender.mjs`

**Interfaces:**
- Consumes at build time: `dist/content/expert-insights/index.json` (`{ items: [{ id, file, date, status }] }`) and each insight JSON for its `title`.

- [ ] **Step 1: Add a shared SITE base literal and SPA server fallback**

Near the top of `scripts/prerender.mjs`, after the existing `const ROUTE = "/FoSW/";` line, add:

```js
const SITE_URL = "https://futuresofsoftwarework.github.io/FoSW"; // must match src/config.ts
const PRERENDER_SIGNALS = true; // toggle AI-signal pages (Task 7)
```

In `startServer()`, change the `catch` block so extensionless paths fall back to the SPA `index.html` (instead of 404), letting Puppeteer load the app at deep paths:

```js
      try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
        res.end(content);
      } catch {
        // SPA fallback: extensionless routes that don't exist yet (e.g. /insights/<id>)
        // should serve the app shell so the client can open the right drawer.
        if (!extname(filePath)) {
          try {
            const shell = readFileSync(join(DIST_DIR, "index.html"));
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(shell);
            return;
          } catch {
            // fall through to 404
          }
        }
        res.writeHead(404);
        res.end("Not found");
      }
```

- [ ] **Step 2: Add a helper that reads a published content index**

Add this helper function above `prerender()`:

```js
function readPublishedIndex(contentPath) {
  const indexPath = join(DIST_DIR, "content", contentPath, "index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf-8"));
  return index.items.filter((item) => item.status === "published");
}

function readItemTitle(contentPath, file) {
  const filePath = join(DIST_DIR, "content", contentPath, file);
  return JSON.parse(readFileSync(filePath, "utf-8")).title;
}
```

- [ ] **Step 3: Add a helper that prerenders one item URL to a folder**

First, add `mkdirSync` to the existing top-of-file `fs` import so it reads:

```js
import { readFileSync, writeFileSync, mkdirSync } from "fs";
```

Then add this helper above `prerender()`:

```js
async function prerenderItem(page, kind, id) {
  const url = `http://localhost:${PORT}${ROUTE}${kind}/${id}`;
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  // Wait for the drawer dialog to render before capturing.
  await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 500));
  const html = await page.content();
  const outDir = join(DIST_DIR, kind, id);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf-8");
  return `${SITE_URL}/${kind}/${id}/`;
}
```

- [ ] **Step 4: Generate insight pages and collect their URLs**

In `prerender()`, after the homepage is written (after the existing `console.log("Pre-rendered HTML written...")`), add:

```js
    // Prerender one physical page per published insight.
    const insightItems = readPublishedIndex("expert-insights");
    const insightUrls = [];
    for (const item of insightItems) {
      const url = await prerenderItem(page, "insights", item.id);
      insightUrls.push({ url, lastmod: item.date });
      console.log(`Pre-rendered insight: ${item.id}`);
    }
```

- [ ] **Step 5: Rewrite `refreshSitemap()` to accept extra URLs**

Replace `refreshSitemap()` so it takes the collected article URLs:

```js
function refreshSitemap(articleUrls) {
  const sitemapPath = join(DIST_DIR, "sitemap.xml");
  const today = new Date().toISOString().slice(0, 10);
  const urlEntry = (loc, lastmod, priority, changefreq) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  const entries = [
    urlEntry(`${SITE_URL}/`, today, "1.0", "weekly"),
    ...articleUrls.map((a) => urlEntry(a.url, a.lastmod, "0.8", "monthly")),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;
  writeFileSync(sitemapPath, sitemap, "utf-8");
  console.log(`Sitemap refreshed with ${entries.length} URLs at ${sitemapPath}`);
}
```

- [ ] **Step 6: Add a build-time verification helper and call the updated flow**

Add above `prerender()`:

```js
function verifyItemPages(kind, items, contentPath) {
  for (const item of items) {
    const file = join(DIST_DIR, kind, item.id, "index.html");
    const html = readFileSync(file, "utf-8");
    const title = readItemTitle(contentPath, item.file);
    const expectedOgUrl = `content="${SITE_URL}/${kind}/${item.id}/"`;
    if (!html.includes(expectedOgUrl)) {
      throw new Error(
        `Verification failed: ${kind}/${item.id} missing og:url ${expectedOgUrl}`,
      );
    }
    if (!html.includes(title)) {
      throw new Error(
        `Verification failed: ${kind}/${item.id} missing title "${title}"`,
      );
    }
  }
  console.log(`Verified ${items.length} ${kind} page(s).`);
}
```

Then, in `prerender()`, replace the old `refreshSitemap();` call with the new flow (place after signals in Task 7; for now insights only):

```js
    verifyItemPages("insights", insightItems, "expert-insights");
    refreshSitemap(insightUrls);
```

- [ ] **Step 7: Run the full build and verify output**

Run: `npm run build`
Expected: exits 0; console shows `Pre-rendered insight: ...` per insight, `Verified N insights page(s).`, and `Sitemap refreshed with N+1 URLs`.

Then confirm the artifacts:

Run: `ls dist/insights` and `cat dist/sitemap.xml`
Expected: a folder per published insight id (each with `index.html`); sitemap lists the homepage plus every insight URL.

- [ ] **Step 8: Spot-check one prerendered page's meta**

Run (Git Bash): `grep -o '<title>[^<]*</title>' dist/insights/productivity-systems-lens/index.html`
Expected: the article title, e.g. `<title>Your Developers Are More Productive... — Alternative Futures of Software Work</title>`.

- [ ] **Step 9: Commit**

```bash
git add scripts/prerender.mjs
git commit -m "feat: prerender per-insight pages with meta and expand sitemap"
```

---

### Task 7: AI-signal pages (optional add-on behind toggle)

Same mechanism for signals, isolated behind the `PRERENDER_SIGNALS` flag added in Task 6.

**Files:**
- Modify: `scripts/prerender.mjs`

- [ ] **Step 1: Generate signal pages when enabled**

In `prerender()`, right after the insight loop, add:

```js
    // Optional: prerender one page per published AI signal.
    let signalItems = [];
    let signalUrls = [];
    if (PRERENDER_SIGNALS) {
      signalItems = readPublishedIndex("ai-signals");
      for (const item of signalItems) {
        const url = await prerenderItem(page, "signals", item.id);
        signalUrls.push({ url, lastmod: item.date });
        console.log(`Pre-rendered signal: ${item.id}`);
      }
    }
```

- [ ] **Step 2: Include signals in verification and sitemap**

Change the Task 6 Step 6 flow lines to include signals:

```js
    verifyItemPages("insights", insightItems, "expert-insights");
    if (PRERENDER_SIGNALS) {
      verifyItemPages("signals", signalItems, "ai-signals");
    }
    refreshSitemap([...insightUrls, ...signalUrls]);
```

- [ ] **Step 3: Run the full build and verify**

Run: `npm run build`
Expected: exits 0; console shows `Pre-rendered signal: ...` lines and `Verified N signals page(s).`

Run: `ls dist/signals`
Expected: a folder per published signal id.

- [ ] **Step 4: Commit**

```bash
git add scripts/prerender.mjs
git commit -m "feat: prerender AI-signal pages behind PRERENDER_SIGNALS toggle"
```

---

### Task 8: Final verification and PR description

**Files:**
- Create: `PR_DESCRIPTION_feat-deep-links-seo.md`

- [ ] **Step 1: Lint and full build**

Run: `npm run lint` then `npm run build`
Expected: both exit 0 (zero ESLint warnings; build + prerender succeed).

- [ ] **Step 2: End-to-end preview check**

Run: `npm run preview`. Visit `http://localhost:4173/FoSW/insights/productivity-systems-lens/` in a browser.
Expected:
- The article drawer is open on load.
- View source shows `<title>` = article title, `og:title`/`og:url`/`og:image` for the article, and an `application/ld+json` Article block.
- "Copy link" copies the article URL.
- Back navigates to the homepage; the tab title resets.

- [ ] **Step 3: Write the PR description file**

Create `PR_DESCRIPTION_feat-deep-links-seo.md` summarizing: the SEO/deep-link goal, the URL scheme, app-owned meta + `SITE_URL`, the prerender/sitemap changes, the `PRERENDER_SIGNALS` toggle, and the optional `image` field. Note that `SITE_URL` in `src/config.ts` and the literal in `scripts/prerender.mjs` must stay in sync.

- [ ] **Step 4: Commit**

```bash
git add PR_DESCRIPTION_feat-deep-links-seo.md
git commit -m "docs: add PR description for deep links & SEO"
```

---

## Notes for the implementer

- **Do not** switch `og:type` handling to a library; the plain `setAttribute` approach is intentional and keeps the shipped bundle lean.
- The homepage's existing WebSite JSON-LD (in `index.html`) is left untouched; the Article JSON-LD is a separate `<script id="article-jsonld">` added/removed at runtime.
- If a future insight needs a custom social image, add `"image": "some-file.png"` (placed in `public/`) to its JSON — no code change needed.
- Keep `SITE_URL` identical in `src/config.ts` and `scripts/prerender.mjs`.
