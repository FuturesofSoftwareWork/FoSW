/**
 * Finding a writer's feed from a page they published on.
 *
 * Code's job, not the model's: asking an LLM to guess a feed path produces
 * plausible 404s — a URL that looks right, is never fetched, and quietly
 * contributes nothing to every run afterwards.
 *
 * Both strategies are needed. Measured against the four pages the first sector
 * run found people on: three advertise a feed in a <link> tag (one of them
 * three of them), and jacob.gold advertises none but serves /index.xml. Tag
 * parsing alone would have missed a quarter of them; the fallback list alone
 * would have guessed wrong for any site using a path outside the conventional
 * six.
 *
 * String-based rather than a real HTML parse, matching the collector's
 * zero-dependency feed reader: we need one attribute off one kind of tag.
 */

/** Conventional feed paths, for sites that publish one without advertising it. */
export const FALLBACK_PATHS = ["/rss.xml", "/feed", "/feed.xml", "/index.xml", "/atom.xml", "/rss"];

const FEED_TYPE = /application\/(rss|atom)\+xml/i;

/** Filename stem for a nomination: "Jono Herrington" -> "jono-herrington". */
export function slugify(name) {
  return String(name ?? "")
    // Decompose accents so they become plain letters rather than being dropped.
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Absolute feed URLs advertised by the page, in document order.
 *
 * The tag is matched first and its attributes read individually, rather than in
 * one positional pattern, because attribute order varies between publishers.
 */
export function findFeedUrls(html, baseUrl) {
  const out = [];
  const seen = new Set();

  for (const tag of String(html ?? "").match(/<link\b[^>]*>/gi) ?? []) {
    if (!/\brel\s*=\s*["']?alternate/i.test(tag)) continue;

    const type = tag.match(/\btype\s*=\s*["']([^"']+)["']/i);
    if (!type || !FEED_TYPE.test(type[1])) continue;

    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (!href) continue;

    let absolute;
    try {
      absolute = new URL(href[1], baseUrl).href;
    } catch {
      continue; // an href that will not resolve is not a candidate
    }
    if (seen.has(absolute)) continue;
    seen.add(absolute);
    out.push(absolute);
  }

  return out;
}

/** Conventional paths against the page's origin, for sites advertising nothing. */
export function fallbackFeedUrls(baseUrl) {
  let origin;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return [];
  }
  return FALLBACK_PATHS.map((path) => `${origin}${path}`);
}
