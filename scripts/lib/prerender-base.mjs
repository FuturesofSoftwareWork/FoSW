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
// The path segment between the leading slash and `assets/` is optional, so a
// root-based build (`/assets/index-xxx.js`) is matched as readily as a nested
// one. Only same-origin absolute paths qualify — a `https://…/assets/…` in an
// og:image never starts with `/`.
const ASSET_REF = /(?:src|href)="(\/(?:[^"]*\/)?assets\/[^"]+)"/;

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
