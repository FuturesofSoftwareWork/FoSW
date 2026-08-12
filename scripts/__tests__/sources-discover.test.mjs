/**
 * Tests for enriching a nomination with a verified feed.
 *
 * All of it runs against a stub fetcher: no network in tests, and the point of
 * the step is that a reviewer decides with a real feed status in front of them.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { discover } from "../sources-discover.mjs";

const NOMS = "data/source-nominations";

const FEED_XML = `<rss><channel>
  <item><title>A post</title><link>https://x.dev/a</link><pubDate>Mon, 10 Aug 2026 09:00:00 GMT</pubDate></item>
</channel></rss>`;

/** A fetcher over a fixed url -> body map. Anything unlisted 404s. */
function stubFetcher(pages) {
  return async (url) => {
    if (!(url in pages)) return { ok: false, status: 404, text: async () => "" };
    return { ok: true, status: 200, text: async () => pages[url] };
  };
}

const nom = (over = {}) => ({
  name: "Jono Herrington",
  profile: "p",
  foundAt: "https://x.dev/posts/one",
  why: "firsthand account",
  ...over,
});

function rootWith(nominations, profiles = {}) {
  const root = mkdtempSync(join(tmpdir(), "noms-"));
  mkdirSync(join(root, NOMS, "accepted"), { recursive: true });
  mkdirSync(join(root, NOMS, "rejected"), { recursive: true });
  mkdirSync(join(root, "config/sources"), { recursive: true });
  nominations.forEach((n, i) =>
    writeFileSync(join(root, NOMS, `n${i}.json`), JSON.stringify(n, null, 2), "utf8"),
  );
  for (const [name, body] of Object.entries(profiles)) {
    writeFileSync(join(root, "config/sources", `${name}.json`), JSON.stringify(body), "utf8");
  }
  return root;
}

const readNoms = (root) =>
  readdirSync(join(root, NOMS))
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(root, NOMS, f), "utf8")));

test("a page advertising a feed resolves it", async () => {
  const root = rootWith([nom()]);
  const fetcher = stubFetcher({
    "https://x.dev/posts/one": `<link rel="alternate" type="application/rss+xml" href="/rss.xml">`,
    "https://x.dev/rss.xml": FEED_XML,
  });

  const result = await discover({ root, fetcher });

  assert.equal(result.resolved, 1);
  const [n] = readNoms(root);
  assert.equal(n.feed, "https://x.dev/rss.xml");
  assert.match(n.feedStatus, /^ok/);
  assert.match(n.feedStatus, /1 entr/);
  assert.ok(n.discoveredAt, "the run stamps when it looked");
});

// jacob.gold advertises no feed but serves /index.xml, so this path is not
// hypothetical.
test("a site advertising nothing is resolved by a fallback path", async () => {
  const root = rootWith([nom()]);
  const fetcher = stubFetcher({
    "https://x.dev/posts/one": "<html><body>no link tags here</body></html>",
    "https://x.dev/feed": FEED_XML,
  });

  const result = await discover({ root, fetcher });

  assert.equal(result.resolved, 1);
  assert.equal(readNoms(root)[0].feed, "https://x.dev/feed");
});

// "This person has no feed" is a reason to reject them, not an error.
test("no feed anywhere is recorded, not thrown", async () => {
  const root = rootWith([nom()]);
  const fetcher = stubFetcher({ "https://x.dev/posts/one": "<html></html>" });

  const result = await discover({ root, fetcher });

  assert.equal(result.unresolved, 1);
  const [n] = readNoms(root);
  assert.equal(n.feed, undefined);
  assert.match(n.feedStatus, /no feed found/);
});

test("a page that cannot be fetched is recorded, not thrown", async () => {
  const root = rootWith([nom()]);

  const result = await discover({ root, fetcher: stubFetcher({}) });

  assert.equal(result.unresolved, 1);
  assert.match(readNoms(root)[0].feedStatus, /could not fetch/);
});

// A URL that returns 200 but is not a feed must not be accepted: the collector
// would then carry a source it cannot read.
test("a candidate that fetches but parses to nothing is rejected", async () => {
  const root = rootWith([nom()]);
  const fetcher = stubFetcher({
    "https://x.dev/posts/one": `<link rel="alternate" type="application/rss+xml" href="/rss.xml">`,
    "https://x.dev/rss.xml": "<html>not a feed</html>",
  });

  const result = await discover({ root, fetcher });

  assert.equal(result.unresolved, 1);
  assert.equal(readNoms(root)[0].feed, undefined);
});

test("an already-resolved nomination is skipped, and --force re-runs it", async () => {
  const root = rootWith([nom({ feed: "https://x.dev/old.xml", feedStatus: "ok — 3 entries" })]);
  const fetcher = stubFetcher({
    "https://x.dev/posts/one": `<link rel="alternate" type="application/rss+xml" href="/rss.xml">`,
    "https://x.dev/rss.xml": FEED_XML,
  });

  assert.equal((await discover({ root, fetcher })).skipped, 1);
  assert.equal(readNoms(root)[0].feed, "https://x.dev/old.xml");

  await discover({ root, fetcher, force: true });
  assert.equal(readNoms(root)[0].feed, "https://x.dev/rss.xml");
});

// Scheme and trailing slash must not hide an existing entry from the reviewer.
test("a feed already in the target profile is flagged", async () => {
  const root = rootWith([nom()], {
    p: { profile: "p", feeds: [{ name: "Someone", url: "http://x.dev/rss.xml/" }] },
  });
  const fetcher = stubFetcher({
    "https://x.dev/posts/one": `<link rel="alternate" type="application/rss+xml" href="/rss.xml">`,
    "https://x.dev/rss.xml": FEED_XML,
  });

  await discover({ root, fetcher });

  assert.equal(readNoms(root)[0].alreadyInProfile, true);
});

test("a feed not in the profile is not flagged", async () => {
  const root = rootWith([nom()], { p: { profile: "p", feeds: [] } });
  const fetcher = stubFetcher({
    "https://x.dev/posts/one": `<link rel="alternate" type="application/rss+xml" href="/rss.xml">`,
    "https://x.dev/rss.xml": FEED_XML,
  });

  await discover({ root, fetcher });

  assert.equal(readNoms(root)[0].alreadyInProfile, false);
});

test("accepted and rejected folders are not touched", async () => {
  const root = rootWith([]);
  writeFileSync(join(root, NOMS, "accepted", "x.json"), JSON.stringify(nom({ name: "X" })), "utf8");
  const before = readFileSync(join(root, NOMS, "accepted", "x.json"), "utf8");

  const result = await discover({ root, fetcher: stubFetcher({}) });

  assert.equal(result.checked, 0);
  assert.equal(readFileSync(join(root, NOMS, "accepted", "x.json"), "utf8"), before);
});

test("a missing queue directory is not an error", async () => {
  const root = mkdtempSync(join(tmpdir(), "noms-empty-"));
  const result = await discover({ root, fetcher: stubFetcher({}) });
  assert.deepEqual(result, { checked: 0, resolved: 0, unresolved: 0, skipped: 0 });
});
