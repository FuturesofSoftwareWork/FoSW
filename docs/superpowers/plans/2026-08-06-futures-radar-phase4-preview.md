# Futures Radar Phase 4 — Preview Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the futures radar to `futuresofsoftwarework.github.io/FoSW/preview/` — the same site, same repo, with drafts visible and the launch gate open — so VTT and University of Helsinki colleagues can review phenomena by URL before anything is public.

**Architecture:** The preview is a second folder in the same GitHub Pages deployment, built from the same commit with `--base=/FoSW/preview/` and `VITE_RADAR_PREVIEW=1`. Three things currently make that impossible and this plan fixes them in order: `scripts/prerender.mjs` hardcodes the base path and would fail the build; there is no SPA fallback so `/phenomena/<id>/` deep links hard-404 for the reviewer who receives them; and nothing marks the preview `noindex`. It then closes the three Phase 3 carry-forwards that only matter once colleagues are actually looking: drafts must be visually distinct from published, blips must not overlap, and the harness must be wired into the preview workflow.

**Tech Stack:** Vite 5 (build + `transformIndexHtml` plugin), Puppeteer 24 (prerender + verification harness), GitHub Actions with `JamesIves/github-pages-deploy-action@v4`, `node --test` for script unit tests.

## Global Constraints

- **Node 20.** CI pins `node-version: 20`. Do not use `--experimental-strip-types`, `node --test` glob arguments, or any other Node 22-only feature. A previous phase shipped a test command that worked on 22 and failed on 20.
- **No new dependencies.** Everything here is buildable with what is already in `package.json`. In particular do **not** add `cross-env`; environment variables are supplied by the GitHub Actions `env:` block, which is cross-platform.
- **`npm run build` must stay green on `main`.** Every change to `prerender.mjs`, `vite.config.ts` and `index.html` is exercised by the production build too. Production behaviour must be byte-for-byte unchanged except for the new `404.html`.
- **`SITE_URL` stays production in every build.** `src/config.ts` and the matching literal in `scripts/prerender.mjs` keep `https://futuresofsoftwarework.github.io/FoSW`. The preview is a `noindex` mirror; its canonical URLs should point at the real site, and `prerender.mjs:verifyItemPages` asserts `og:url` against this constant.
- **`observedReach` is a human judgement.** Nothing in this plan may compute, infer or default it.
- **Tailwind:** never interpolate class names. Full static class strings only.
- **One `ContentDrawer`, owned by `App`.** Nothing in this plan adds a second one or a second `window.history` writer, other than the single `history.replaceState` in the 404 restore snippet (Task 3), which runs once before React mounts.

## Assumptions (stated because the spec predates the Phase 3 merge)

| # | Assumption | Why |
| --- | --- | --- |
| A1 | The preview deploys from **`main`** on push, plus `workflow_dispatch`. | The spec says "triggered on the radar branch". PR #18 is merged and `feat-radar-ui` is gone, so the radar *is* main. Building the preview from anything else would break the spec's own guarantee that reviewers see byte-for-byte what ships. |
| A2 | Phase 4 includes the three Phase 3 carry-forwards (draft marking, collision nudging, harness wiring). | The handover lists them under "Also owed", and draft marking in particular is meaningless outside a preview that reviewers read. |
| A3 | Phenomenon pages are **not** prerendered. | Deep links are served by the `404.html` shim instead. Prerendering would mint static pages with Open Graph cards for unreviewed research claims — exactly what the `noindex` requirement exists to prevent — and those files would outlive the draft. |
| A4 | The preview URL is unlisted, not access-controlled. | Spec, *Preview and Review*: the repository is public, so nothing here is secret. |

## File Structure

| File | Change | Responsibility |
| --- | --- | --- |
| `scripts/lib/prerender-base.mjs` | Create | Pure `detectBase(html)` — reads the built shell's own asset paths to learn the base the bundle was built with. Separate from `prerender.mjs` so it can be unit-tested without launching Chrome. |
| `scripts/__tests__/prerender-base.test.mjs` | Create | `node --test` coverage for `detectBase`. |
| `scripts/prerender.mjs` | Modify | Stop hardcoding `/FoSW/`; serve, navigate and emit `404.html` at the detected base; suppress the sitemap and write a disallow `robots.txt` in preview builds. |
| `vite.config.ts` | Modify | Add the `previewNoindex` plugin: flips the `robots` meta and drops the production `canonical` when the resolved base is a preview base. |
| `index.html` | Modify | Add the deep-link restore snippet that the production `404.html` forwarder hands off to. |
| `src/lib/phenomenon.ts` | Modify | `isPreviewContext()` also returns true when `BASE_URL` contains `/preview/`, so a preview deployment cannot silently behave as production. |
| `package.json` | Modify | Add `build:preview`. |
| `.github/workflows/deploy-preview.yml` | Create | Build and deploy the preview into `preview/`. |
| `.github/workflows/deploy.yml` | Modify | `clean-exclude: preview`, a shared `concurrency` group, and a `pull_request` trigger that runs test+lint without deploying. |
| `src/config/radarGeometry.ts` | Modify | Add `placeBlips` — seeds from `placeBlip`, then nudges overlapping blips apart without letting any leave its own ring-and-sector cell. |
| `src/components/Radar/RadarBlips.tsx` | Modify | Use `placeBlips`; render drafts distinctly. |
| `src/components/Radar/RadarLegend.tsx` | Modify | Explain the draft mark. |
| `scripts/verify-radar.mjs` | Modify | Add checks 12 (no two blips overlap) and 13 (every draft blip carries the draft mark). |
| `docs/superpowers/specs/2026-08-04-futures-radar-design.md` | Modify | Record the Phase 4 divergences in *As Built*. |
| `docs/superpowers/HANDOVER-futures-radar.md` | Modify | Phase 4 → done; retire the two "start here" items. |
| `CLAUDE.md`, `AGENTS.md` | Modify | Document `build:preview`, the preview base switch and the 404 shim. |
| `PR_DESCRIPTION_radar-phase4-preview.md` | Create | Per the repo convention. |

---

### Task 1: Teach the prerenderer its own base path

`scripts/prerender.mjs` hardcodes `ROUTE = "/FoSW/"` and strips `^/FoSW` from request paths. Under `--base=/FoSW/preview/` the bundle asks for `/FoSW/preview/assets/index-abc.js`, the stripper turns that into `/preview/assets/index-abc.js`, `dist/preview/assets/…` does not exist, the SPA fallback serves the shell as JavaScript, nothing renders, and `waitForSelector` times out 15 seconds later. This is the item the handover says will fail first.

The base is *derived from the built shell rather than passed in*, so it cannot desynchronise from the bundle it is serving. There is nothing to remember to set.

**Files:**
- Create: `scripts/lib/prerender-base.mjs`
- Create: `scripts/__tests__/prerender-base.test.mjs`
- Modify: `scripts/prerender.mjs:6-10` (constants), `:24-64` (`startServer`), `:77-88` (`prerenderItem`), `:132-150` (`prerender`)

**Interfaces:**
- Produces: `detectBase(html: string): string` — always returns a path with leading and trailing slashes. Task 4 consumes it to decide whether a build is a preview.

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/prerender-base.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { detectBase } from "../lib/prerender-base.mjs";

test("reads the production base from a module script tag", () => {
  const html = `<!doctype html><html><head>
    <script type="module" crossorigin src="/FoSW/assets/index-D4tK9.js"></script>
    <link rel="stylesheet" crossorigin href="/FoSW/assets/index-B2xQ1.css">
  </head><body></body></html>`;
  assert.equal(detectBase(html), "/FoSW/");
});

test("reads a nested preview base", () => {
  const html = `<script type="module" crossorigin src="/FoSW/preview/assets/index-D4tK9.js"></script>`;
  assert.equal(detectBase(html), "/FoSW/preview/");
});

test("reads the base from a stylesheet when no module script is present", () => {
  const html = `<link rel="stylesheet" crossorigin href="/FoSW/preview/assets/index-B2xQ1.css">`;
  assert.equal(detectBase(html), "/FoSW/preview/");
});

test("handles a root base", () => {
  assert.equal(detectBase(`<script src="/assets/index-D4tK9.js"></script>`), "/");
});

test("throws rather than guessing when no asset reference exists", () => {
  assert.throws(
    () => detectBase("<!doctype html><html><head></head><body></body></html>"),
    /could not determine the base path/i,
  );
});

test("ignores absolute URLs to other origins", () => {
  const html = `<meta property="og:image" content="https://example.com/assets/x.png">
    <script type="module" crossorigin src="/FoSW/assets/index-D4tK9.js"></script>`;
  assert.equal(detectBase(html), "/FoSW/");
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test scripts/__tests__/prerender-base.test.mjs`
Expected: FAIL — `Cannot find module '../lib/prerender-base.mjs'`.

- [ ] **Step 3: Write `scripts/lib/prerender-base.mjs`**

```js
/**
 * The base path a `dist/` bundle was built with, read back off the bundle
 * itself.
 *
 * The preview deployment is the same code built with `--base=/FoSW/preview/`,
 * so the prerenderer cannot assume `/FoSW/`. It could take the base as an
 * argument, but then two places would have to agree and one of them would
 * eventually be wrong. The built shell already states the answer in every
 * asset URL Vite rewrote, so read it from there: a mismatch is impossible by
 * construction.
 */
const ASSET_REF = /(?:src|href)="(\/[^"]*\/assets\/[^"]+)"/;

export function detectBase(html) {
  const match = ASSET_REF.exec(html);
  if (!match) {
    throw new Error(
      "prerender: could not determine the base path — no /…/assets/ reference " +
        "found in dist/index.html. Did `vite build` run?",
    );
  }
  const base = match[1].slice(0, match[1].lastIndexOf("/assets/") + 1);
  return base.startsWith("/") ? base : `/${base}`;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `node --test scripts/__tests__/prerender-base.test.mjs`
Expected: PASS, 6/6.

- [ ] **Step 5: Consume it in `prerender.mjs`**

Replace the constant block at the top (`scripts/prerender.mjs:6-10`):

```js
import { createServer } from "http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, join, extname } from "path";
import puppeteer from "puppeteer";
import { detectBase } from "./lib/prerender-base.mjs";

const DIST_DIR = resolve("dist");
const PORT = 4173;
const SITE_URL = "https://futuresofsoftwarework.github.io/FoSW"; // must match src/config.ts
const PRERENDER_SIGNALS = false; // toggle AI-signal pages (Task 7)

// Read back off the built bundle, so the server strips exactly the prefix the
// bundle asks for. `/FoSW/` in a production build, `/FoSW/preview/` in a
// preview one. See scripts/lib/prerender-base.mjs.
const ROUTE = detectBase(readFileSync(join(DIST_DIR, "index.html"), "utf-8"));
const IS_PREVIEW = ROUTE.includes("/preview/");
```

- [ ] **Step 6: Make the server strip the detected base**

In `startServer` (`scripts/prerender.mjs:26-33`), replace the hardcoded strip:

```js
    const server = createServer((req, res) => {
      // Strip the build's own base path and query string so files resolve from
      // dist/. ROUTE is whatever the bundle was built with, not a literal.
      const withoutBase = req.url.startsWith(ROUTE)
        ? `/${req.url.slice(ROUTE.length)}`
        : req.url;
      const urlPath = withoutBase.split("?")[0] || "/";
      const rawPath = urlPath === "/" ? "index.html" : urlPath;
```

Leave the rest of `startServer` — including the extensionless SPA fallback — untouched.

- [ ] **Step 7: Verify the production build is unchanged**

Run: `npm run build`
Expected: completes; the log shows `Pre-rendered HTML written to …/dist/index.html`, `Pre-rendered insight: …` for each published insight, `Verified N insights page(s).` and `Sitemap refreshed with N URLs`. No timeout.

Then confirm the detected base was the production one:

Run: `node -e "import('./scripts/lib/prerender-base.mjs').then(m=>console.log(m.detectBase(require('fs').readFileSync('dist/index.html','utf8'))))"`
Expected: `/FoSW/`

- [ ] **Step 8: Verify the preview path resolves too**

Run:
```bash
npx vite build --base=/FoSW/preview/ && node scripts/prerender.mjs
```
Expected: the same successful output. Before this task it timed out at `waitForSelector`.

Then restore a production `dist/` so later tasks start clean: `npm run build`.

- [ ] **Step 9: Commit**

```bash
git add scripts/lib/prerender-base.mjs scripts/__tests__/prerender-base.test.mjs scripts/prerender.mjs
git commit -m "fix: derive the prerender base path from the built bundle

The preview deployment builds with --base=/FoSW/preview/, which the
hardcoded /FoSW/ strip turned into a 404 for every asset, so the
prerenderer's waitForSelector timed out and failed the build. Read the
base back off dist/index.html instead: nothing to keep in sync."
```

---

### Task 2: A preview build that is a production build

Two switches, per the spec: the radar is always visible and drafts are fetched. Both already hang off `isPreviewContext()`. This task adds the build script, makes the preview `noindex`, and adds a second, independent way for `isPreviewContext()` to be true so that a build deployed under `/preview/` cannot silently behave as production if someone forgets the environment variable.

**Files:**
- Modify: `package.json:6-19` (scripts)
- Modify: `vite.config.ts`
- Modify: `src/lib/phenomenon.ts:10-12`

**Interfaces:**
- Consumes: `detectBase` semantics from Task 1 — "a preview build is one whose base contains `/preview/`". Task 4 and Task 5 rely on the same rule.
- Produces: `npm run build:preview`; `isPreviewContext()` unchanged in signature.

- [ ] **Step 1: Add the build script**

In `package.json`, after the `build` line:

```json
    "build": "npm run validate && tsc && vite build && node scripts/prerender.mjs",
    "build:preview": "npm run validate && tsc && vite build --base=/FoSW/preview/ && node scripts/prerender.mjs",
```

No environment variable is set here on purpose. `VITE_RADAR_PREVIEW=1` is supplied by the workflow's `env:` block (Task 5), which works identically on every platform; putting `VAR=1` in front of an npm script does not work on Windows and adding `cross-env` would be a new dependency for one line.

- [ ] **Step 2: Add the noindex plugin to `vite.config.ts`**

```ts
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * A preview build is a `noindex` mirror of the site. An unfinished research
 * radar surfacing in search results under a VTT / University of Helsinki
 * byline is a credibility risk, and it costs two attribute rewrites to
 * prevent.
 *
 * The trigger is the base path rather than an environment variable: the thing
 * that makes a build a preview is where it is deployed, and that is already
 * encoded in `base`.
 *
 * The canonical link is removed rather than repointed. Left pointing at the
 * production URL it would tell a crawler that this page and the real home page
 * are the same document — which is true today and will stop being true the
 * moment the preview carries drafts the live site does not.
 */
function previewNoindex(): Plugin {
  let isPreview = false
  return {
    name: 'preview-noindex',
    configResolved(config) {
      isPreview = config.base.includes('/preview/')
    },
    transformIndexHtml(html) {
      if (!isPreview) return html
      const needle = '<meta name="robots" content="index, follow" />'
      if (!html.includes(needle)) {
        throw new Error(
          `preview-noindex: expected ${needle} in index.html and did not find it. ` +
            'The preview build would have shipped indexable — failing instead.',
        )
      }
      return html
        .replace(needle, '<meta name="robots" content="noindex, nofollow" />')
        .replace(/\n\s*<link rel="canonical"[^>]*>/, '')
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), previewNoindex()],
  base: '/FoSW/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

The `throw` matters: if someone reformats `index.html` and the needle stops matching, a silent no-op would ship an indexable preview. Failing the build is the only safe direction for this particular check.

- [ ] **Step 3: Make the preview flag impossible to forget**

In `src/lib/phenomenon.ts`, replace `isPreviewContext`:

```ts
/**
 * True in dev and in preview builds. The single source of truth for "should
 * unpublished research be visible here?" — both draft fetching and the radar's
 * launch gate must answer this the same way, or one will silently disagree
 * with the other.
 *
 * Two independent signals, deliberately OR'd. `VITE_RADAR_PREVIEW` is the
 * documented switch and the one CI sets. `BASE_URL` containing `/preview/` is
 * the backstop: a build deployed to the preview folder without the flag would
 * otherwise render as production — an empty page where the radar should be,
 * with no error anywhere to explain it.
 */
export function isPreviewContext(): boolean {
  return (
    import.meta.env.DEV ||
    import.meta.env.VITE_RADAR_PREVIEW === "1" ||
    import.meta.env.BASE_URL.includes("/preview/")
  );
}
```

- [ ] **Step 4: Verify production is unaffected**

Run: `npm run build`
Expected: succeeds.

Run: `node -e "const h=require('fs').readFileSync('dist/index.html','utf8'); console.log(/content=\"index, follow\"/.test(h) ? 'INDEXABLE (correct for production)' : 'MISSING'); console.log(/rel=\"canonical\"/.test(h) ? 'canonical present (correct)' : 'canonical missing')"`
Expected: `INDEXABLE (correct for production)` and `canonical present (correct)`.

Run: `node -e "const h=require('fs').readFileSync('dist/index.html','utf8'); console.log(/futures-radar/.test(h) ? 'RADAR PRESENT (wrong)' : 'no radar (correct: 0 of 10 published)')"`
Expected: `no radar (correct: 0 of 10 published)`.

- [ ] **Step 5: Verify the preview build**

Run (PowerShell): `$env:VITE_RADAR_PREVIEW="1"; npm run build:preview; Remove-Item Env:\VITE_RADAR_PREVIEW`
Run (bash): `VITE_RADAR_PREVIEW=1 npm run build:preview`
Expected: succeeds.

Run: `node -e "const h=require('fs').readFileSync('dist/index.html','utf8'); console.log(/content=\"noindex, nofollow\"/.test(h)?'NOINDEX ok':'STILL INDEXABLE — fail'); console.log(/rel=\"canonical\"/.test(h)?'canonical still present — fail':'canonical removed ok'); console.log(/futures-radar/.test(h)?'radar prerendered ok':'no radar — fail')"`
Expected: `NOINDEX ok`, `canonical removed ok`, `radar prerendered ok`.

- [ ] **Step 6: Confirm the backstop works without the flag**

Run: `npm run build:preview` (no environment variable at all)

Run: `node -e "const h=require('fs').readFileSync('dist/index.html','utf8'); console.log(/futures-radar/.test(h)?'radar present via BASE_URL backstop ok':'no radar — backstop failed')"`
Expected: `radar present via BASE_URL backstop ok`.

- [ ] **Step 7: Commit**

```bash
git add package.json vite.config.ts src/lib/phenomenon.ts
git commit -m "feat: add a noindex preview build at /FoSW/preview/

build:preview is the production build with a different base. The robots
meta flips and the canonical is dropped when the base is a preview base,
and isPreviewContext() now also reads the base, so a build deployed to
the preview folder cannot render as production if the flag is missed."
```

---

### Task 3: Make shared deep links work

`dist/` contains `index.html`, `insights/<id>/index.html` and nothing else. `/FoSW/phenomena/<id>/` — the URL the drawer's Copy-link button hands out — is a hard 404 on GitHub Pages. Phase 4 is what puts those links in front of reviewers who will paste them into email, so it has to work.

GitHub Pages serves `404.html` **without redirecting**, leaving the requested URL in the address bar. `useDeepLink` reads `window.location.pathname` on mount. So a `404.html` that is a copy of the app shell resolves the deep link with no client-side routing changes at all.

One wrinkle: whether Pages serves a *nested* `404.html` (`/FoSW/preview/404.html`) for misses under `/FoSW/preview/` is not something this plan can verify without deploying. So the production `404.html` also carries a forwarder for preview paths, and `index.html` carries the matching restore. Both routes end in the right place; whichever one Pages takes, the reviewer sees the phenomenon.

**Files:**
- Modify: `index.html:33-36` (restore snippet in `<body>`, before the module script)
- Modify: `scripts/prerender.mjs` (emit `404.html`)

**Interfaces:**
- Consumes: `ROUTE` and `IS_PREVIEW` from Task 1.
- Produces: `dist/404.html` in every build. The `sessionStorage` key is `radarDeepLink`; the forwarder writes it, `index.html` reads and clears it.

- [ ] **Step 1: Add the restore snippet to `index.html`**

Replace the `<body>` block:

```html
  <body>
    <div id="root"></div>
    <script>
      // Paired with the forwarder injected into 404.html by
      // scripts/prerender.mjs. GitHub Pages serves 404.html for unknown paths
      // without redirecting, so a deep link usually arrives with its own URL
      // intact and this does nothing. The exception is a /preview/ deep link
      // that Pages answers with the *root* 404 page: that one has to bounce
      // through the preview shell, and the path it was aiming at comes with it
      // here. Runs before the module script, so useDeepLink still sees the
      // right pathname on its first read.
      (function () {
        try {
          var target = sessionStorage.getItem("radarDeepLink");
          if (target) {
            sessionStorage.removeItem("radarDeepLink");
            if (target !== location.pathname + location.search) {
              history.replaceState({}, "", target);
            }
          }
        } catch (e) {
          /* sessionStorage unavailable — the deep link degrades to the home page */
        }
      })();
    </script>
    <script type="module" src="/src/main.tsx"></script>
  </body>
```

- [ ] **Step 2: Emit `404.html` from the prerenderer**

Add this function to `scripts/prerender.mjs`, above `async function prerender()`:

```js
/**
 * GitHub Pages has no SPA rewrite. Without a 404 page, `/FoSW/phenomena/<id>/`
 * — the URL the drawer's Copy-link button produces — is a hard 404 for whoever
 * receives it. Pages serves 404.html *without redirecting*, so a copy of the
 * prerendered shell boots the app with the requested path still in the address
 * bar and `useDeepLink` opens the right drawer.
 *
 * Production additionally forwards preview paths. If Pages answers a miss under
 * /FoSW/preview/ with the root 404 page rather than the preview's own, the
 * production bundle would boot at a preview URL, fail to match the path against
 * its own base, and quietly show the home page. The forwarder stashes the
 * intended path and bounces to the preview shell, which restores it (see the
 * snippet in index.html).
 */
function writeFallbackPage(shellHtml) {
  let html = shellHtml;
  if (!IS_PREVIEW) {
    const forwarder = `<script>(function(){var p=location.pathname;var pre=${JSON.stringify(
      `${ROUTE}preview/`,
    )};if(p.indexOf(pre)===0&&p!==pre){try{sessionStorage.setItem("radarDeepLink",p+location.search);}catch(e){}location.replace(pre);}})();</script>`;
    if (!html.includes("<body>")) {
      throw new Error("prerender: no <body> in the shell — cannot inject the 404 forwarder");
    }
    html = html.replace("<body>", `<body>${forwarder}`);
  }
  const outPath = join(DIST_DIR, "404.html");
  writeFileSync(outPath, html, "utf-8");
  console.log(`SPA fallback written to ${outPath}`);
}
```

- [ ] **Step 3: Call it**

In `prerender()`, immediately after the block that writes `dist/index.html` (`scripts/prerender.mjs:154-157`):

```js
    // 5. Write it back to the index.html
    const outputPath = join(DIST_DIR, "index.html");
    writeFileSync(outputPath, html, "utf-8");
    console.log(`Pre-rendered HTML written to ${outputPath}`);

    // 5b. …and as the SPA fallback, so shared item URLs resolve.
    writeFallbackPage(html);
```

- [ ] **Step 4: Build and check the artefacts**

Run: `npm run build`
Expected: the log now includes `SPA fallback written to …/dist/404.html`.

Run: `node -e "const h=require('fs').readFileSync('dist/404.html','utf8'); console.log(/radarDeepLink/.test(h)?'forwarder present ok':'forwarder missing — fail'); console.log(/FoSW\/preview\//.test(h)?'preview prefix ok':'preview prefix missing — fail'); console.log(/id=\"root\"/.test(h)?'shell ok':'shell missing — fail')"`
Expected: three `ok` lines.

- [ ] **Step 5: Prove a deep link actually resolves**

Serve `dist/` with the same fallback semantics Pages has, and open a phenomenon URL:

```bash
node -e "
const http=require('http'),fs=require('fs'),path=require('path');
const D=path.resolve('dist');
http.createServer((req,res)=>{
  const p=req.url.replace(/^\/FoSW/,'').split('?')[0]||'/';
  let f=path.join(D,p==='/'?'index.html':p);
  if(!path.extname(f))f=path.join(f,'index.html');
  fs.readFile(f,(e,c)=>{
    if(e){fs.readFile(path.join(D,'404.html'),(e2,c2)=>{res.writeHead(404,{'Content-Type':'text/html'});res.end(c2||'nope');});return;}
    const t={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':t});res.end(c);
  });
}).listen(4180,()=>console.log('http://localhost:4180/FoSW/'));
" &
```

Then, against a **preview** build (`VITE_RADAR_PREVIEW=1 npm run build:preview` first, and adjust the strip prefix in the snippet above to `/FoSW/preview`), open `http://localhost:4180/FoSW/preview/phenomena/<id>/` where `<id>` is any id from `public/content/phenomena/index.json`, and confirm the phenomenon drawer opens with the URL unchanged.

Expected: drawer open, `[role="dialog"]` present, address bar still showing the phenomenon path.

Kill the server when done.

- [ ] **Step 6: Commit**

```bash
git add index.html scripts/prerender.mjs
git commit -m "fix: serve shared item URLs instead of 404ing on them

GitHub Pages has no SPA rewrite, so /FoSW/phenomena/<id>/ — the URL the
drawer hands out — hard-404s for the recipient. Emit the prerendered
shell as 404.html; Pages serves it without redirecting, so useDeepLink
still sees the requested path. The production copy also forwards
/preview/ paths, in case Pages answers those with the root 404 page."
```

---

### Task 4: Keep the preview out of the index and out of the sitemap

`prerender.mjs` rewrites `dist/sitemap.xml` unconditionally with production URLs, and `public/robots.txt` is copied into every build. A preview build should advertise nothing.

Be honest about what this buys: crawlers read `robots.txt` only from the **domain root**, and this site is published under `/FoSW/`, so `/FoSW/preview/robots.txt` — like the existing `/FoSW/robots.txt` — is never actually fetched. The `noindex` meta from Task 2 is the control that works. The file is still written because it costs one line, it is what the spec asks for, and it documents intent for anyone reading the deployment.

**Files:**
- Modify: `scripts/prerender.mjs` (`refreshSitemap` call site, plus a new `writePreviewRobots`)

**Interfaces:**
- Consumes: `IS_PREVIEW` from Task 1.

- [ ] **Step 1: Add the robots writer**

Above `async function prerender()` in `scripts/prerender.mjs`:

```js
/**
 * Preview builds advertise nothing. Note that this file is largely symbolic:
 * crawlers fetch robots.txt from the domain root only, and this site lives at
 * /FoSW/, so neither this file nor the existing production one is ever read.
 * The control that actually works is the `noindex, nofollow` meta tag applied
 * by the previewNoindex plugin in vite.config.ts. This is written anyway
 * because it states the intent where a human looking at the deployment will
 * see it.
 */
function writePreviewRobots() {
  const outPath = join(DIST_DIR, "robots.txt");
  writeFileSync(
    outPath,
    `# Preview build — unreviewed research drafts. Not for indexing.\n` +
      `# The effective control is the noindex meta tag; see vite.config.ts.\n` +
      `User-agent: *\nDisallow: /\n`,
    "utf-8",
  );
  console.log(`Preview robots.txt written to ${outPath}`);
}
```

- [ ] **Step 2: Branch the sitemap step**

Replace the `refreshSitemap([...insightUrls, ...signalUrls]);` call (`scripts/prerender.mjs:217`):

```js
    if (IS_PREVIEW) {
      // A sitemap of production URLs served from the preview folder is at best
      // noise and at worst an invitation to index it. Remove the copy Vite made
      // from public/ rather than rewriting it.
      const staleSitemap = join(DIST_DIR, "sitemap.xml");
      if (existsSync(staleSitemap)) {
        rmSync(staleSitemap);
        console.log("Preview build: removed sitemap.xml");
      }
      writePreviewRobots();
    } else {
      refreshSitemap([...insightUrls, ...signalUrls]);
    }
```

Add `rmSync` to the `fs` import at the top of the file:

```js
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
```

- [ ] **Step 3: Verify the preview build**

Run: `VITE_RADAR_PREVIEW=1 npm run build:preview` (PowerShell: `$env:VITE_RADAR_PREVIEW="1"; npm run build:preview`)

Run: `node -e "const fs=require('fs');console.log(fs.existsSync('dist/sitemap.xml')?'sitemap present — fail':'sitemap absent ok');console.log(/Disallow: \//.test(fs.readFileSync('dist/robots.txt','utf8'))?'robots disallow ok':'robots wrong — fail')"`
Expected: `sitemap absent ok`, `robots disallow ok`.

- [ ] **Step 4: Verify production still emits both**

Run: `npm run build`

Run: `node -e "const fs=require('fs');console.log(fs.existsSync('dist/sitemap.xml')?'sitemap ok':'sitemap missing — fail');console.log(/Allow: \//.test(fs.readFileSync('dist/robots.txt','utf8'))?'robots allow ok':'robots wrong — fail')"`
Expected: `sitemap ok`, `robots allow ok`.

- [ ] **Step 5: Commit**

```bash
git add scripts/prerender.mjs
git commit -m "feat: preview builds ship a disallow robots.txt and no sitemap

A sitemap of production URLs served from the preview folder is noise at
best. Noted in the code that robots.txt under /FoSW/ is never actually
fetched — the noindex meta is what does the work."
```

---

### Task 5: Deploy it, and stop deploying untested PRs

Three changes to CI. The preview workflow is new. `deploy.yml` gains `clean-exclude: preview` so a production deploy does not wipe the preview folder, and a shared `concurrency` group so the two workflows — both triggered by a push to `main`, both committing to `gh-pages` — cannot race each other. And, because the handover flags it and this is the file being edited anyway, `deploy.yml` gains a `pull_request` trigger: today nothing runs on a PR, so `npm test` and `npm run lint` only execute *after* a merge.

> **Push permissions.** Pushing changes under `.github/workflows/` needs a token with `workflow` scope, which the credential in this environment lacks. If the push is rejected, commit the files anyway and hand their full contents to the human to paste through GitHub's web editor — that is how the last workflow change was applied here.

**Files:**
- Create: `.github/workflows/deploy-preview.yml`
- Modify: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `npm run build:preview` (Task 2), `VITE_RADAR_PREVIEW` (Task 2), `npm run verify:radar` (existing).

- [ ] **Step 1: Write `.github/workflows/deploy-preview.yml`**

```yaml
name: Deploy Radar Preview

# The preview is the same commit as production, built with a different base and
# with drafts visible, published into the preview/ folder of the same Pages
# deployment. It tracks main so that what reviewers see is what will ship: going
# live is publishing the tenth phenomenon, not migrating anything.
on:
  push:
    branches: [main]
  workflow_dispatch:

# Both this workflow and deploy.yml commit to gh-pages on a push to main.
# Without a shared group they interleave and one loses.
concurrency:
  group: github-pages-deploy
  cancel-in-progress: false

jobs:
  build-and-deploy-preview:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install Dependencies
        run: npm ci

      - name: Install Puppeteer system dependencies
        run: npx puppeteer browsers install chrome

      - name: Build preview
        env:
          VITE_RADAR_PREVIEW: "1"
        run: npm run build:preview

      # The radar is verified against the artefact that is about to be
      # deployed, not against a dev server. Thirteen checks, four of which
      # exist because screenshots caught defects the DOM checks had missed.
      - name: Verify the radar
        run: |
          npx vite preview --base=/FoSW/preview/ --port 5199 --outDir dist &
          npx wait-on http://localhost:5199/FoSW/preview/ --timeout 60000 || sleep 10
          npm run verify:radar http://localhost:5199/FoSW/preview/

      - name: Deploy preview
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: dist
          target-folder: preview
```

> `wait-on` is not a dependency of this project; the `|| sleep 10` is the actual
> wait and the `npx wait-on` call is a best-effort fast path. If `npx` prompting
> for an install turns out to hang in CI, delete that line and keep the `sleep`.
> Do **not** add `wait-on` to `package.json` — a devDependency for one CI line is
> not worth it.

- [ ] **Step 2: Update `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  # Nothing used to run on a pull request, so test and lint only ever executed
  # after a merge — no PR was ever checked. The deploy step below is guarded so
  # this trigger validates without publishing.
  pull_request:
    branches: [main]

# Shared with deploy-preview.yml: both commit to gh-pages on a push to main.
concurrency:
  group: github-pages-deploy
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install Dependencies
        run: npm ci

      - name: Test
        run: npm test

      - name: Lint
        run: npm run lint

      - name: Install Puppeteer system dependencies
        run: npx puppeteer browsers install chrome

      - name: Build
        run: npm run build

      - name: Deploy
        if: github.event_name == 'push'
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: dist
          # A production deploy must not wipe the preview folder that
          # deploy-preview.yml publishes into the same branch.
          clean-exclude: preview
```

- [ ] **Step 3: Validate the YAML parses**

Run:
```bash
node -e "
const fs=require('fs');
for (const f of ['.github/workflows/deploy.yml','.github/workflows/deploy-preview.yml']) {
  const t=fs.readFileSync(f,'utf8');
  if(/\t/.test(t)) throw new Error(f+': tabs in YAML');
  console.log(f, t.split('\n').length, 'lines, no tabs');
}
"
```
Expected: both files listed, no throw.

- [ ] **Step 4: Confirm the local equivalent of the CI run passes**

Run: `npm test && npm run lint && npm run build`
Expected: all green. Note the test count — it was 63 before this plan and should now be 69 with Task 1's six new tests.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy.yml .github/workflows/deploy-preview.yml
git commit -m "ci: deploy the radar preview, and check PRs before merging

deploy-preview.yml builds main with --base=/FoSW/preview/ and drafts on,
verifies it with the radar harness, and publishes to the preview folder.
deploy.yml gets clean-exclude so production does not wipe it, a shared
concurrency group so the two do not race for gh-pages, and a
pull_request trigger — until now nothing ran before a merge."
```

---

### Task 6: Show reviewers which phenomena are drafts

On the preview radar a `draft` and a `published` phenomenon render as identical blips. The banner says "N of 10 published" but nothing says *which*. A reviewer commenting on a phenomenon cannot tell whether they are looking at something already settled or something still being drafted — which changes what their comment is for.

**Files:**
- Modify: `src/components/Radar/RadarBlips.tsx:61`
- Modify: `src/components/Radar/RadarLegend.tsx`

**Interfaces:**
- Consumes: `Phenomenon["status"]`, already `"published" | "draft"`.
- Produces: draft blips carry `data-status="draft"` and a dashed stroke; Task 7's harness check 13 asserts on that attribute.

- [ ] **Step 1: Render drafts as hollow, dashed blips**

In `src/components/Radar/RadarBlips.tsx`, replace the single blip circle (line 61):

```tsx
            {/* Drafts read as outlines: same position, same colour, visibly
                provisional. A reviewer needs to know whether they are looking
                at a settled claim or one still being written, and the "N of 10
                published" banner does not say which is which. */}
            <circle
              cx={x}
              cy={y}
              r={r}
              fill={colour}
              fillOpacity={isDraft ? 0.15 : 1}
              stroke={isDraft ? colour : "none"}
              strokeWidth={isDraft ? 1.5 : 0}
              strokeDasharray={isDraft ? "3 2" : undefined}
            />
```

and add the flag just after `const r = …` (line 27):

```tsx
        const isDraft = p.status === "draft";
```

Add the attribute and extend the accessible name on the wrapping `<g>` (lines 35-41):

```tsx
          <g
            key={p.id}
            data-status={p.status}
            opacity={dimmed ? 0.18 : 1}
            className="cursor-pointer focus:outline-none"
            role="button"
            tabIndex={dimmed ? -1 : 0}
            aria-hidden={dimmed || undefined}
            aria-label={`${p.label} — ${RING_LABEL[p.observedReach]}${isDraft ? " — draft" : ""}`}
```

The contested bolt (line 63) keeps `fill="#030711"`, which is nearly invisible against a 15%-opacity fill. Change it so a contested draft still reads:

```tsx
            {p.contested && (
              <path
                d={BOLT}
                fill={isDraft ? colour : "#030711"}
                transform={`translate(${x} ${y}) scale(${r / 7})`}
              />
            )}
```

Also extend the hover card's second line (line 107-109) so the state is legible with labels off:

```tsx
                  {RING_LABEL[p.observedReach]}
                  {p.contested ? " · contested" : ""}
                  {isDraft ? " · draft" : ""}
```

- [ ] **Step 2: Explain the mark in the legend**

Read `src/components/Radar/RadarLegend.tsx` first and follow its existing markup for the freshness/contested keys. Add one entry alongside them, using the same wrapper elements and class strings the neighbouring keys use — do not invent a new layout:

```tsx
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" aria-hidden="true">
            <circle
              cx="7"
              cy="7"
              r="5"
              fill="#94a3b8"
              fillOpacity="0.15"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          </svg>
          draft — not yet published
        </span>
```

- [ ] **Step 3: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: both clean. `noUnusedLocals` is on, so an unused `isDraft` would fail here.

- [ ] **Step 4: Look at it**

Run: `npm run dev`, open `http://localhost:5173/FoSW/#futures-radar`.
All six phenomena are currently `draft`, so **every** blip should be a dashed outline. Confirm: the outlines are legible against the dark canvas at both label states, the contested bolt is still visible on the phenomena that carry it, and the legend entry matches the blips.

Take a screenshot. The harness reported 9/9 while the radar was visibly broken once already; automated checks confirm structure, not appearance.

- [ ] **Step 5: Commit**

```bash
git add src/components/Radar/RadarBlips.tsx src/components/Radar/RadarLegend.tsx
git commit -m "feat: draw draft phenomena as dashed outlines on the radar

Drafts and published phenomena were identical blips, so a reviewer could
not tell whether the claim they were commenting on was settled or still
being written."
```

---

### Task 7: Stop blips from overlapping

`placeBlip` is a pure hash of the phenomenon id, with no awareness of any other blip. The angular inset was widened from 12% to 22% in Phase 3 as a partial mitigation, but two ids that hash close together in the same ring-and-sector cell still land on top of each other. Invisible at six blips; near-certain at the 30–40 the spec targets.

The fix keeps determinism — same input, same output, no randomness — and never moves a blip out of its own cell, because the cell *is* the data. A crowded cell that stays crowded is honest; a blip nudged into the neighbouring ring is a lie about how far the change has reached.

**Files:**
- Modify: `src/config/radarGeometry.ts`
- Modify: `src/components/Radar/RadarBlips.tsx:23-26`

**Interfaces:**
- Consumes: `placeBlip(p, dimensionIndex, dimensionCount)` — unchanged, still exported, still the seed.
- Produces: `placeBlips(entries: BlipInput[], dimensionCount: number): { x: number; y: number }[]`, positions returned in input order, where `BlipInput = { p: Phenomenon; dimensionIndex: number; radius: number }`.

**On testing:** this project has no frontend test runner — the 69 `node --test` tests cover `scripts/` only, and the geometry is TypeScript that `node --test` on Node 20 cannot import. So this is the one task in the plan whose verification is not a unit test. It is verified two ways instead: a new harness check that no two blips overlap, and a **forced-collision run** against twenty synthetic phenomena, because with six blips the check would otherwise pass without ever exercising the code. Do not skip Step 5.

- [ ] **Step 1: Add `placeBlips` to `src/config/radarGeometry.ts`**

Append to the file:

```ts
/** How much clear space to leave between two blip edges, in viewBox units. */
const BLIP_GAP = 4;
/** Enough passes to settle a realistic cell; bounded so a full cell cannot spin. */
const NUDGE_PASSES = 24;

export interface BlipInput {
  p: Phenomenon;
  dimensionIndex: number;
  radius: number;
}

/** The polar box a blip may occupy: its own ring band and its own sector wedge,
 *  inset off both borders exactly as placeBlip insets its seed. */
function cellBounds(p: Phenomenon, dimensionIndex: number, dimensionCount: number) {
  const foundRing = RINGS.indexOf(p.observedReach);
  const ringIndex = foundRing === -1 ? RINGS.length - 1 : foundRing;
  const inner = RING_EDGES[ringIndex] * VIEWBOX.r;
  const outer = RING_EDGES[ringIndex + 1] * VIEWBOX.r;
  const radialInset = (outer - inner) * 0.18;

  const safeIndex = Math.min(Math.max(0, dimensionIndex), dimensionCount - 1);
  const { start, end } = sectorAngles(dimensionCount)[safeIndex];
  const angularInset = (end - start) * 0.22;

  return {
    minRadius: inner + radialInset,
    maxRadius: outer - radialInset,
    minDeg: start + angularInset,
    maxDeg: end - angularInset,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/**
 * Place every blip, then push overlapping pairs apart.
 *
 * `placeBlip` hashes the id and knows nothing about its neighbours, so two ids
 * that hash close together in the same ring-and-sector cell land on top of each
 * other. Invisible at six phenomena, near-certain at the thirty-plus this is
 * built for.
 *
 * Two properties matter more than perfect separation:
 *
 *   - **Deterministic.** Pairs are visited in a fixed order and nothing is
 *     random, so a blip never moves between renders or reloads.
 *   - **Never leaves its cell.** Every nudge is clamped back into the blip's own
 *     ring band and sector wedge. Position *is* the claim being made; a blip
 *     nudged into the next ring out would misstate how far that change has
 *     reached. A cell that stays crowded is the honest outcome.
 */
export function placeBlips(
  entries: BlipInput[],
  dimensionCount: number,
): { x: number; y: number }[] {
  const bounds = entries.map((e) => cellBounds(e.p, e.dimensionIndex, dimensionCount));

  // Work in polar coordinates so clamping to a cell is trivial.
  const polar = entries.map((e, i) => {
    const { x, y } = placeBlip(e.p, e.dimensionIndex, dimensionCount);
    const dx = x - VIEWBOX.cx;
    const dy = y - VIEWBOX.cy;
    const b = bounds[i];
    return {
      radius: clamp(Math.hypot(dx, dy), b.minRadius, b.maxRadius),
      deg: clamp((Math.atan2(dy, dx) * 180) / Math.PI + 90, b.minDeg, b.maxDeg),
    };
  });

  const toXY = (q: { radius: number; deg: number }) => {
    const rad = ((q.deg - 90) * Math.PI) / 180;
    return { x: VIEWBOX.cx + q.radius * Math.cos(rad), y: VIEWBOX.cy + q.radius * Math.sin(rad) };
  };

  for (let pass = 0; pass < NUDGE_PASSES; pass++) {
    let moved = false;
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = toXY(polar[i]);
        const b = toXY(polar[j]);
        const need = entries[i].radius + entries[j].radius + BLIP_GAP;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist >= need) continue;

        // Exactly coincident: separate along the sector's tangent rather than
        // dividing by zero.
        const ux = dist === 0 ? 1 : dx / dist;
        const uy = dist === 0 ? 0 : dy / dist;
        const push = (need - dist) / 2 + 0.01;

        for (const [k, sign] of [
          [i, -1],
          [j, 1],
        ] as const) {
          const cur = toXY(polar[k]);
          const nx = cur.x + ux * push * sign;
          const ny = cur.y + uy * push * sign;
          const ndx = nx - VIEWBOX.cx;
          const ndy = ny - VIEWBOX.cy;
          const bk = bounds[k];
          polar[k] = {
            radius: clamp(Math.hypot(ndx, ndy), bk.minRadius, bk.maxRadius),
            deg: clamp((Math.atan2(ndy, ndx) * 180) / Math.PI + 90, bk.minDeg, bk.maxDeg),
          };
        }
        moved = true;
      }
    }
    if (!moved) break;
  }

  return polar.map(toXY);
}
```

- [ ] **Step 2: Use it in `RadarBlips`**

Replace the import (line 5) and the per-blip `placeBlip` call. `RadarBlips.tsx` currently computes `index`, `colour` and `r` inside the `.map`; the positions have to be computed for the whole set first:

```tsx
import { useMemo, useState } from "react";
…
import { BLIP_RADIUS, RING_LABEL, VIEWBOX, placeBlips } from "@/config/radarGeometry";
```

Inside the component, before the `return`:

```tsx
  // Positions depend on the whole set, not one blip, because overlapping pairs
  // get nudged apart. Memoised so that hovering does not re-run the relaxation.
  const positions = useMemo(
    () =>
      placeBlips(
        phenomena.map((p) => ({
          p,
          dimensionIndex: WORK_DIMENSIONS.findIndex((d) => d.id === p.primaryDimension),
          radius: BLIP_RADIUS[freshnessOf(p)],
        })),
        WORK_DIMENSIONS.length,
      ),
    [phenomena],
  );
```

and in the `.map`, replace `const { x, y } = placeBlip(p, index, WORK_DIMENSIONS.length);` with:

```tsx
        const { x, y } = positions[arrayIndex];
```

changing the map signature to `{phenomena.map((p, arrayIndex) => {`.

- [ ] **Step 3: Add the overlap check to the harness**

In `scripts/verify-radar.mjs`, before the final results loop, add:

```js
// Check 12 — no two blips may overlap. placeBlip hashes ids independently, so
// two ids in the same ring-and-sector cell could land on top of each other;
// placeBlips nudges them apart. At six phenomena this rarely fires, which is
// exactly why the forced-collision run in the plan exists.
try {
  const overlaps = await page.evaluate(() => {
    const svg = document.querySelector('svg[aria-label^="Futures radar"]');
    const circles = [...svg.querySelectorAll('g[data-status] > circle')];
    const out = [];
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const a = circles[i], b = circles[j];
        const ax = +a.getAttribute('cx'), ay = +a.getAttribute('cy'), ar = +a.getAttribute('r');
        const bx = +b.getAttribute('cx'), by = +b.getAttribute('cy'), br = +b.getAttribute('r');
        const d = Math.hypot(bx - ax, by - ay);
        if (d < ar + br) out.push(`${d.toFixed(1)} < ${(ar + br).toFixed(1)}`);
      }
    }
    return out;
  });
  check(
    "no two blips overlap",
    overlaps.length === 0,
    overlaps.length === 0 ? "all pairs clear" : overlaps.join("; "),
  );
} catch (e) {
  check("no two blips overlap", false, e.message);
}

// Check 13 — every draft phenomenon is drawn as a draft. Reviewers need to see
// which claims are still being written; identical blips would hide that.
try {
  const draftMarks = await page.evaluate(() => {
    const svg = document.querySelector('svg[aria-label^="Futures radar"]');
    const drafts = [...svg.querySelectorAll('g[data-status="draft"]')];
    return {
      count: drafts.length,
      unmarked: drafts.filter(
        (g) => g.querySelector('circle')?.getAttribute('stroke-dasharray') !== '3 2',
      ).length,
    };
  });
  check(
    "every draft blip carries the dashed draft mark",
    draftMarks.count > 0 && draftMarks.unmarked === 0,
    `${draftMarks.count} draft(s), ${draftMarks.unmarked} unmarked`,
  );
} catch (e) {
  check("every draft blip carries the dashed draft mark", false, e.message);
}
```

Update the header comment's check list (`scripts/verify-radar.mjs:22-38`) to describe 12 and 13 in the same style as the existing entries.

- [ ] **Step 4: Run the harness against dev**

Run `npm run dev` in one shell, then:

Run: `npm run verify:radar http://localhost:5173/FoSW/`
Expected: `13/13 passed`.

- [ ] **Step 5: Force a collision and confirm the nudging actually runs**

Six blips across seven sectors will not collide, so the check above proves nothing yet. Create synthetic phenomena in a scratch copy, run the harness against them, then throw them away.

> **Corrected during execution.** This step originally called for twenty synthetic phenomena in one cell. One cell is about 64 × 48 viewBox units and a blip needs ~380 sq units at the required spacing, so a cell holds roughly **five** blips — twenty is four times over capacity and no algorithm that respects cell boundaries can separate them. Use **five**, which is the realistic worst case for 30–40 phenomena spread over 21 cells. Five was verified: three genuine seed collisions, none after nudging.

```bash
node -e "
const fs=require('fs'), path='public/content/phenomena/';
const idx=JSON.parse(fs.readFileSync(path+'index.json','utf8'));
fs.copyFileSync(path+'index.json', path+'index.json.bak');
const seed=JSON.parse(fs.readFileSync(path+idx.items[0].file,'utf8'));
for(let i=0;i<5;i++){
  const id='zz-synthetic-'+i;
  const p={...seed,id,label:'SYN'+i,title:'Synthetic '+i,status:'draft'};
  fs.writeFileSync(path+id+'.json', JSON.stringify(p,null,2));
  idx.items.push({id,file:id+'.json',status:'draft'});
}
fs.writeFileSync(path+'index.json', JSON.stringify(idx,null,2));
console.log('added 5 synthetic phenomena');
"
```

All five share one `primaryDimension` and one `observedReach` — a single cell holding five blips — the realistic worst case for 30-40 phenomena across 21 cells, and about what a cell physically holds.

With `npm run dev` running, run: `npm run verify:radar http://localhost:5173/FoSW/`

Expected: `no two blips overlap` **passes**. Open the page and screenshot it: the cell should be visibly packed but readable, with no blip outside its ring band or sector wedge. If the check fails, the relaxation is not converging — raise `NUDGE_PASSES` or accept clamped residual overlap only if the screenshot shows blips are still distinguishable, and record whichever you chose in the spec's *As Built*.

Then restore:

```bash
node -e "
const fs=require('fs'), path='public/content/phenomena/';
fs.readdirSync(path).filter(f=>f.startsWith('zz-synthetic-')).forEach(f=>fs.rmSync(path+f));
fs.renameSync(path+'index.json.bak', path+'index.json');
console.log('synthetic phenomena removed');
"
```

Run: `git status --short public/content/phenomena/`
Expected: **empty**. Nothing synthetic may be committed.

- [ ] **Step 6: Full verification**

Run: `npm run validate && npm test && npm run lint && npm run build`
Expected: all green, 69 tests.

- [ ] **Step 7: Commit**

```bash
git add src/config/radarGeometry.ts src/components/Radar/RadarBlips.tsx scripts/verify-radar.mjs
git commit -m "feat: nudge overlapping blips apart without moving them out of cell

placeBlip hashes each id independently, so two ids in the same
ring-and-sector cell can land on top of each other — invisible at six
phenomena, near-certain at thirty. placeBlips relaxes overlapping pairs
apart, clamped to each blip's own ring band and sector wedge: position
is the claim being made, so a crowded cell stays crowded rather than
lying about reach. Harness checks 12 and 13 added."
```

---

### Task 8: Documentation and PR

The handover exists because this work changes hands. Leave it true.

**Files:**
- Modify: `CLAUDE.md` (Commands, Verification, and the radar-visibility convention)
- Modify: `AGENTS.md` (kept in sync with CLAUDE.md by an explicit coupling — read its header before editing)
- Modify: `docs/superpowers/specs/2026-08-04-futures-radar-design.md` (*As Built*)
- Modify: `docs/superpowers/HANDOVER-futures-radar.md`
- Create: `PR_DESCRIPTION_radar-phase4-preview.md`

- [ ] **Step 1: Update `CLAUDE.md`**

Under **Commands**, add:

```markdown
- `npm run build:preview` — production build based at `/FoSW/preview/`; set `VITE_RADAR_PREVIEW=1` alongside it to force drafts and the radar on
- `npm run verify:radar <baseUrl>` — 13 headless checks against a running server; needs `npm run dev` or a preview build, since the radar is hidden in an ordinary production build
```

Under **Design System → Radar visibility**, extend the existing bullet:

```markdown
- **Radar visibility:** the radar section renders only when at least 10 phenomena are `published`, except in dev and in preview builds. `isPreviewContext()` in `src/lib/phenomenon.ts` is the single predicate for both the draft fetch and the gate; it is true in dev, when `VITE_RADAR_PREVIEW=1`, **or when `BASE_URL` contains `/preview/`** — the last so a build deployed to the preview folder cannot silently render as production. Drafts are fetched in exactly those cases and never otherwise.
- **Preview deployment:** `/FoSW/preview/` is the same commit as `/FoSW/`, built by `deploy-preview.yml` with a different base and drafts on. It is `noindex, nofollow` (applied by the `previewNoindex` plugin in `vite.config.ts`) and ships no sitemap. `deploy.yml` carries `clean-exclude: preview`; both workflows share the `github-pages-deploy` concurrency group so they cannot race for `gh-pages`.
- **SPA fallback:** every build emits `dist/404.html` — the prerendered shell, which GitHub Pages serves without redirecting, so `/FoSW/<kind>/<id>/` deep links resolve. The production copy also forwards `/preview/` paths through `sessionStorage["radarDeepLink"]`, restored by the inline snippet in `index.html`.
```

Under **Verification**, note that `npm run build` now also emits `404.html`, and that the preview build additionally replaces `robots.txt` and removes `sitemap.xml`.

- [ ] **Step 2: Mirror into `AGENTS.md`**

Read `AGENTS.md` first — the previous commit (`e07ab1c`) made the coupling to `CLAUDE.md` explicit. Apply the same additions in whatever form that file uses.

- [ ] **Step 3: Add the Phase 4 divergences to the spec's *As Built***

Append rows to the existing table in the same voice — spec said X, code does Y, why:

| Spec | As built | Why |
| --- | --- | --- |
| Preview built "on the radar branch" | Built from `main` | PR #18 merged; the radar *is* main, and building the preview from anywhere else breaks the spec's own byte-for-byte guarantee. |
| Preview keyed on `VITE_RADAR_PREVIEW=1` | That, **or** a base containing `/preview/` | A missed environment variable would deploy a preview that renders as production — an empty page with nothing to explain it. |
| Preview-only `robots.txt` with a `Disallow` | Written, and noted as symbolic | Crawlers read `robots.txt` from the domain root only; this site is under `/FoSW/`, so neither the preview file nor the existing production one is ever fetched. The `noindex` meta is the control that works. |
| — | `dist/404.html` in every build | Not in the spec at all. Without it the deep links the spec's review loop depends on hard-404 for the reviewer who receives them. |
| Phenomenon pages prerendered | Not prerendered | Static pages with Open Graph cards for unreviewed research claims are what `noindex` exists to prevent, and the files would outlive the drafts. The 404 shim serves the links instead. |

Also update the "Not yet built at all" paragraph: Phase 4 is done; Phase 2's pipeline is what remains.

- [ ] **Step 4: Update the handover**

- Phase table: **4 — Preview deployment** → done, with the PR number.
- Delete the two "Start here for Phase 4" items — both are fixed. Replace the section with "Start here for Phase 2", pointing at the pipeline.
- Update the harness section: 13 checks, not 13-in-name-only — say what 12 and 13 catch, and that the harness now runs in `deploy-preview.yml` against the artefact being deployed.
- Remove the "CI gap worth closing" section; the `pull_request` trigger closes it. Keep the note that pushing workflow files needs a token with `workflow` scope.
- Add the preview URL and how to reach it.

- [ ] **Step 5: Write `PR_DESCRIPTION_radar-phase4-preview.md`**

Cover: what Phase 4 delivers and the URL it produces; that the preview is the same commit as production with two switches, so going live is publishing the tenth phenomenon rather than migrating anything; the prerender base fix and why it was blocking; the `404.html` shim and why shared links needed it; `noindex` and the honest limit of `robots.txt` under `/FoSW/`; draft marking and blip nudging as the Phase 3 carry-forwards this closes; the `pull_request` CI trigger; and that the workflow files may need to be applied through GitHub's web editor if the push is rejected for missing `workflow` scope.

- [ ] **Step 6: Final verification**

Run: `npm run validate && npm test && npm run lint && npm run build`
Expected: green, 69 tests.

Run `npm run dev`, then `npm run verify:radar http://localhost:5173/FoSW/`
Expected: `13/13 passed`.

Take a screenshot of the radar and look at it.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md AGENTS.md docs/superpowers PR_DESCRIPTION_radar-phase4-preview.md
git commit -m "docs: record Phase 4 as built and refresh the handover"
```

---

## What Phase 4 Deliberately Does Not Do

- **No pipeline.** `radar:prepare` / `apply` / `accept` / `derive`, the clustering prompt, editions and `reachHistory` are Phase 2 and remain unbuilt. Phenomena are still hand-authored.
- **No access control on the preview.** Unlisted, `noindex`, and public — per the spec, since the repository is public anyway.
- **No prerendered phenomenon pages.** See A3. Deep links work through `404.html`; they return HTTP 404 with a correct page body, which browsers render and crawlers ignore — the right outcome for a `noindex` preview and an acceptable one for signals in production.
- **No comment collection.** Still a shared document keyed by phenomenon `id`; a backend is a Non-Goal.

## Carry-Forward

- **Nested `404.html` behaviour on GitHub Pages is unverified.** The forwarder makes both outcomes work, but which one actually fires is only observable after the first deploy. Check it, and if Pages does serve `/FoSW/preview/404.html` directly, the forwarder becomes dead code that can be deleted.
- **`prerender.mjs` still keeps its own copy of `SITE_URL`.** It cannot import `src/config.ts`, and the comment says so, but the two can still drift. A `node --test` that reads both files and compares the literals would close it — the pattern already exists in `scripts/__tests__/config.test.mjs`.
- **The preview deploys on every push to `main`**, including documentation-only commits. If that becomes noisy, add a `paths-ignore` for `docs/**` and `*.md`.
- **Blip nudging is unverified above 20 blips in one cell.** Step 5 of Task 7 covers the realistic worst case; a genuinely full cell at 40 phenomena may need the radial inset revisited rather than more passes.
