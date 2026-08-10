/**
 * The static server that serves a built `dist/` over HTTP.
 *
 * Two callers need it and they must agree: `prerender.mjs` serves the bundle to
 * Puppeteer at build time, and `preview-radar.mjs` serves the same bundle to a
 * person and to `verify-radar.mjs`. The SPA fallback below is the part that
 * would drift if this were copied — an extensionless route that does not exist
 * on disk must return the shell, or every deep link 404s in one caller and
 * resolves in the other.
 *
 * The base path is not a parameter with a default. It is read off the built
 * bundle by `detectBase`, for the reason stated in `prerender-base.mjs`: two
 * places that must agree eventually disagree.
 */
import { createServer } from "http";
import { readFileSync } from "fs";
import { join, extname } from "path";

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
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".ico": "image/x-icon",
};

/**
 * The address both the server binds and the callers build URLs from.
 *
 * Not `localhost`. On Windows `localhost` resolves to `::1` before `127.0.0.1`,
 * and a stale server bound to `::1` alone does not collide with one binding
 * `0.0.0.0` — both listen on the same port and every client silently reaches the
 * stale one. That is not hypothetical: it made `npm run build` prerender Vite's
 * "the server is configured with a public base URL of …" error page into
 * `dist/index.html`, and the visible symptom was a timeout waiting for a dialog
 * selector, several steps away from the cause.
 *
 * Binding 127.0.0.1 explicitly makes the conflict loud (EADDRINUSE) instead of
 * silent, and addressing 127.0.0.1 means no name resolution can route a request
 * to somebody else's listener.
 */
export const LOOPBACK = "127.0.0.1";

/**
 * Serve `distDir` at `port`, stripping `route` — the base the bundle was built
 * with — from every request. Resolves with the http.Server once listening.
 */
export function startStaticServer({ distDir, route, port }) {
  return new Promise((resolvePromise, reject) => {
    const server = createServer((req, res) => {
      // Strip the build's own base path and query string so files resolve from
      // distDir. `route` is whatever the bundle was built with, not a literal.
      const withoutBase = req.url.startsWith(route)
        ? `/${req.url.slice(route.length)}`
        : req.url;
      const urlPath = withoutBase.split("?")[0] || "/";
      const rawPath = urlPath === "/" ? "index.html" : urlPath;
      const wasExtensionless = !extname(rawPath);
      let filePath = join(distDir, rawPath);
      if (wasExtensionless) {
        filePath = join(filePath, "index.html");
      }

      try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
        res.end(content);
      } catch {
        // SPA fallback: extensionless routes that don't exist yet (e.g.
        // /insights/<id>) should serve the app shell so the client can open the
        // right drawer.
        if (wasExtensionless) {
          try {
            const shell = readFileSync(join(distDir, "index.html"));
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

    server.on("error", reject);
    server.listen(port, LOOPBACK, () => resolvePromise(server));
  });
}
