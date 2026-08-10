import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { resolve, join } from "path";
import puppeteer from "puppeteer";
import { detectBase } from "./lib/prerender-base.mjs";
import { startStaticServer, LOOPBACK } from "./lib/static-server.mjs";

const DIST_DIR = resolve("dist");
const PORT = 4173;
const SITE_URL = "https://futuresofsoftwarework.github.io/FoSW"; // must match src/config.ts
const PRERENDER_SIGNALS = false; // toggle AI-signal pages (Task 7)

// Read back off the built bundle, so the server strips exactly the prefix the
// bundle asks for: `/FoSW/` in a production build, `/FoSW/preview/` in a
// preview one. Hardcoding it made the preview build request every asset from a
// path that did not exist, so nothing rendered and waitForSelector timed out.
// See scripts/lib/prerender-base.mjs.
const ROUTE = detectBase(readFileSync(join(DIST_DIR, "index.html"), "utf-8"));
const IS_PREVIEW = ROUTE.includes("/preview/");

async function startServer() {
  // Shared with preview-radar.mjs — see scripts/lib/static-server.mjs.
  const server = await startStaticServer({ distDir: DIST_DIR, route: ROUTE, port: PORT });
  console.log(`Pre-render server running on http://${LOOPBACK}:${PORT}`);
  return server;
}

function readPublishedIndex(contentPath) {
  const indexPath = join(DIST_DIR, "content", contentPath, "index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf-8"));
  return index.items.filter((item) => item.status === "published");
}

function readItemTitle(contentPath, file) {
  const filePath = join(DIST_DIR, "content", contentPath, file);
  return JSON.parse(readFileSync(filePath, "utf-8")).title;
}

async function prerenderItem(page, kind, id) {
  const url = `http://${LOOPBACK}:${PORT}${ROUTE}${kind}/${id}`;
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

/**
 * GitHub Pages has no SPA rewrite. Without a 404 page, `/FoSW/phenomena/<id>/`
 * — the URL the drawer's Copy-link button produces — is a hard 404 for whoever
 * receives it. Pages serves 404.html *without redirecting*, so a copy of the
 * prerendered shell boots the app with the requested path still in the address
 * bar and `useDeepLink` opens the right drawer.
 *
 * Production additionally forwards preview paths. If Pages answers a miss under
 * /FoSW/preview/ with the root 404 page rather than the preview folder's own,
 * the production bundle would boot at a preview URL, fail to match the path
 * against its own base, and quietly show the home page instead of the
 * phenomenon someone was sent. The forwarder stashes the intended path and
 * bounces to the preview shell, which restores it — see the snippet in
 * index.html.
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

/**
 * Preview builds advertise nothing. Note that this file is largely symbolic:
 * crawlers fetch robots.txt from the domain root only, and this site lives at
 * /FoSW/, so neither this file nor the existing production one is ever read.
 * The control that actually works is the `noindex, nofollow` meta applied by
 * the previewNoindex plugin in vite.config.ts. This is written anyway because
 * it states the intent where a human looking at the deployment will see it.
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

async function prerender() {
  // 1. Start a local server to serve the built files
  const server = await startServer();

  try {
    // 2. Launch browser and navigate to the page
    const browser = await puppeteer.launch({
      headless: true,
      args: process.env.CI ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
    });
    let page = await browser.newPage();

    const url = `http://${LOOPBACK}:${PORT}${ROUTE}`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

    // 3. Wait a bit extra for any animations/delayed renders
    await new Promise((r) => setTimeout(r, 2000));

    // 4. Get the fully rendered HTML
    const html = await page.content();

    // 5. Write it back to the index.html
    const outputPath = join(DIST_DIR, "index.html");
    writeFileSync(outputPath, html, "utf-8");
    console.log(`Pre-rendered HTML written to ${outputPath}`);

    // 5b. …and as the SPA fallback, so shared item URLs resolve.
    writeFallbackPage(html);

    // Prerender one physical page per published insight.
    const insightItems = readPublishedIndex("expert-insights");
    const insightUrls = [];
    for (const item of insightItems) {
      const url = await prerenderItem(page, "insights", item.id);
      insightUrls.push({ url, lastmod: item.date });
      console.log(`Pre-rendered insight: ${item.id}`);
    }

    // Optional: prerender one page per published AI signal.
    let signalItems = [];
    let signalUrls = [];
    if (PRERENDER_SIGNALS) {
      const allSignalItems = readPublishedIndex("ai-signals");
      // Filter out entries whose JSON files are missing or whose in-file id
      // doesn't match the index id (those can't be opened via their URL path).
      signalItems = allSignalItems.filter((item) => {
        const filePath = join(DIST_DIR, "content", "ai-signals", item.file);
        if (!existsSync(filePath)) {
          console.warn(`  Skipping signal ${item.id}: file not found (${item.file})`);
          return false;
        }
        try {
          const data = JSON.parse(readFileSync(filePath, "utf-8"));
          if (data.id !== item.id) {
            console.warn(`  Skipping signal ${item.id}: id mismatch (file has "${data.id}")`);
            return false;
          }
          return true;
        } catch {
          console.warn(`  Skipping signal ${item.id}: unreadable JSON (${item.file})`);
          return false;
        }
      });
      const skipped = allSignalItems.length - signalItems.length;
      if (skipped > 0) {
        console.warn(`Skipped ${skipped} signal(s) with missing/mismatched content (see above).`);
      }
      // Use a fresh page every 20 signals to avoid browser memory/performance
      // degradation when processing large signal sets.
      const SIGNALS_PER_PAGE = 20;
      for (let i = 0; i < signalItems.length; i++) {
        const item = signalItems[i];
        // Refresh the page object every SIGNALS_PER_PAGE items.
        if (i > 0 && i % SIGNALS_PER_PAGE === 0) {
          await page.close();
          page = await browser.newPage();
        }
        const url = await prerenderItem(page, "signals", item.id);
        signalUrls.push({ url, lastmod: item.date });
        console.log(`Pre-rendered signal: ${item.id}`);
      }
    }

    verifyItemPages("insights", insightItems, "expert-insights");
    if (PRERENDER_SIGNALS) {
      verifyItemPages("signals", signalItems, "ai-signals");
    }
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

    await browser.close();
  } finally {
    server.close();
  }
}

prerender().catch((err) => {
  console.error("Pre-render failed:", err);
  process.exit(1);
});
