import { createServer } from "http";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, join, extname } from "path";
import puppeteer from "puppeteer";

const DIST_DIR = resolve("dist");
const ROUTE = "/FoSW/";
const PORT = 4173;
const SITE_URL = "https://futuresofsoftwarework.github.io/FoSW"; // must match src/config.ts
const PRERENDER_SIGNALS = true; // toggle AI-signal pages (Task 7)

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function startServer() {
  return new Promise((resolvePromise) => {
    const server = createServer((req, res) => {
      // Strip the /FoSW/ base path and query string so files resolve from dist/
      const urlPath = req.url.replace(/^\/FoSW/, "").split("?")[0] || "/";
      const rawPath = urlPath === "/" ? "index.html" : urlPath;
      const wasExtensionless = !extname(rawPath);
      let filePath = join(DIST_DIR, rawPath);
      if (wasExtensionless) {
        filePath = join(filePath, "index.html");
      }

      try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
        res.end(content);
      } catch {
        // SPA fallback: extensionless routes that don't exist yet (e.g. /insights/<id>)
        // should serve the app shell so the client can open the right drawer.
        if (wasExtensionless) {
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
    });

    server.listen(PORT, () => {
      console.log(`Pre-render server running on http://localhost:${PORT}`);
      resolvePromise(server);
    });
  });
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

async function prerender() {
  // 1. Start a local server to serve the built files
  const server = await startServer();

  try {
    // 2. Launch browser and navigate to the page
    const browser = await puppeteer.launch({
      headless: true,
      args: process.env.CI ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
    });
    const page = await browser.newPage();

    const url = `http://localhost:${PORT}${ROUTE}`;
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

    // Prerender one physical page per published insight.
    const insightItems = readPublishedIndex("expert-insights");
    const insightUrls = [];
    for (const item of insightItems) {
      const url = await prerenderItem(page, "insights", item.id);
      insightUrls.push({ url, lastmod: item.date });
      console.log(`Pre-rendered insight: ${item.id}`);
    }

    verifyItemPages("insights", insightItems, "expert-insights");
    refreshSitemap(insightUrls);

    await browser.close();
  } finally {
    server.close();
  }
}

prerender().catch((err) => {
  console.error("Pre-render failed:", err);
  process.exit(1);
});
