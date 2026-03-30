import { createServer } from "http";
import { readFileSync, writeFileSync } from "fs";
import { resolve, join, extname } from "path";
import puppeteer from "puppeteer";

const DIST_DIR = resolve("dist");
const ROUTE = "/FoSW/";
const PORT = 4173;

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
      // Strip the /FoSW/ base path so files resolve from dist/
      const urlPath = req.url.replace(/^\/FoSW/, "") || "/";
      let filePath = join(DIST_DIR, urlPath === "/" ? "index.html" : urlPath);
      if (!extname(filePath)) {
        filePath = join(filePath, "index.html");
      }

      try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
        res.end(content);
      } catch {
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

async function prerender() {
  // 1. Start a local server to serve the built files
  const server = await startServer();

  try {
    // 2. Launch browser and navigate to the page
    const browser = await puppeteer.launch({ headless: true });
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

    await browser.close();
  } finally {
    server.close();
  }
}

prerender().catch((err) => {
  console.error("Pre-render failed:", err);
  process.exit(1);
});
