/**
 * Tests for the candidate collector's pure logic.
 *
 * The collector runs unattended, so its failure behaviour is the part that has
 * to be right: `perItem` decides whether one rate-limited search term costs a
 * whole source, and `parseFeed` is a hand-rolled string parse over feeds this
 * repo does not control. Neither is exercised by running the collector, because
 * a live run's output depends on what the feeds published that day.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { parseFeed, perItem, withinWindow, collectorsFor } from "../collect-candidates.mjs";

/** Silence the collector's per-request warnings for one call. */
async function quietly(fn) {
  const warn = console.warn;
  console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.warn = warn;
  }
}

const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

// ---------- parseFeed ----------

test("an RSS item yields title, link and date", () => {
  const xml = `<rss><channel>
    <item><title>Managing agents</title><link>https://leaddev.com/a</link>
    <pubDate>Mon, 10 Aug 2026 09:00:00 GMT</pubDate></item>
  </channel></rss>`;
  assert.deepEqual(parseFeed(xml), [
    { title: "Managing agents", link: "https://leaddev.com/a", date: "2026-08-10" },
  ]);
});

// Atom puts the URL in an attribute of a self-closing tag, so the <link>text</link>
// read returns nothing and the href branch has to pick it up.
test("an Atom entry takes its link from the href attribute", () => {
  const xml = `<feed><entry><title>Refactoring</title>
    <link href="https://martinfowler.com/b"/><updated>2026-08-09T12:00:00Z</updated></entry></feed>`;
  assert.deepEqual(parseFeed(xml), [
    { title: "Refactoring", link: "https://martinfowler.com/b", date: "2026-08-09" },
  ]);
});

test("CDATA and character entities are decoded in titles", () => {
  const xml = `<rss><item><title><![CDATA[Ship &amp; iterate]]></title><link>https://x.dev/1</link></item>
    <item><title>It&#39;s here &#x2014; now</title><link>https://x.dev/2</link></item></rss>`;
  assert.deepEqual(
    parseFeed(xml).map((e) => e.title),
    ["Ship & iterate", "It's here — now"],
  );
});

// &amp; is decoded last on purpose: decoding it first would turn "&amp;#39;"
// into "&#39;" and then into an apostrophe, silently corrupting a literal.
test("an escaped entity is not double-decoded", () => {
  const xml = `<rss><item><title>&amp;#39; stays literal</title><link>https://x.dev/1</link></item></rss>`;
  assert.equal(parseFeed(xml)[0].title, "&#39; stays literal");
});

// Stack Overflow pads titles with zero-width characters as a scraping
// fingerprint. They survive a JSON round-trip and make titles look corrupted.
// Written as escapes for the same reason the collector writes them that way:
// invisible bytes in source are unreviewable, and ESLint rejects them.
test("invisible scraping-fingerprint characters are stripped", () => {
  const padded = "Zero\u200Bwidth\uFEFF title";
  const xml = `<rss><item><title>${padded}</title><link>https://x.dev/1</link></item></rss>`;
  assert.equal(parseFeed(xml)[0].title, "Zerowidth title");
});

test("an entry missing a title or a link is dropped", () => {
  const xml = `<rss>
    <item><title>No link</title></item>
    <item><link>https://x.dev/no-title</link></item>
    <item><title>Keeper</title><link>https://x.dev/ok</link></item>
  </rss>`;
  assert.deepEqual(
    parseFeed(xml).map((e) => e.title),
    ["Keeper"],
  );
});

test("an unparseable date becomes an empty string rather than Invalid Date", () => {
  const xml = `<rss><item><title>T</title><link>https://x.dev/1</link><pubDate>not a date</pubDate></item></rss>`;
  assert.equal(parseFeed(xml)[0].date, "");
});

test("a document with no entries yields no candidates", () => {
  assert.deepEqual(parseFeed("<html><body>rate limited</body></html>"), []);
  assert.deepEqual(parseFeed(""), []);
});

// ---------- perItem ----------

test("results from every request are concatenated", async () => {
  const out = await perItem("Src", ["a", "b"], async (x) => [x, x + x]);
  assert.deepEqual(out, ["a", "aa", "b", "bb"]);
});

// Reddit 403s routinely and GitHub rate-limits at 60/hr. Before failures were
// isolated per request, one blocked subreddit discarded every result from the
// whole source, including requests that had already succeeded.
test("one failing request does not discard the requests that succeeded", async () => {
  const out = await quietly(() =>
    perItem("Src", ["ok", "bad", "ok2"], async (x) => {
      if (x === "bad") throw new Error("403");
      return [x];
    }),
  );
  assert.deepEqual(out, ["ok", "ok2"]);
});

test("a source whose every request failed is reported as failed", async () => {
  await assert.rejects(
    () => quietly(() => perItem("Src", ["a", "b"], async () => {
      throw new Error("403");
    })),
    /all 2 requests failed/,
  );
});

// An empty source list is a configuration state, not a failure: `failed === list.length`
// is trivially true at zero and must not be read as "everything broke".
test("an empty source list yields nothing and does not throw", async () => {
  assert.deepEqual(await perItem("Src", [], async () => ["never"]), []);
});

// ---------- withinWindow ----------

test("a recent date is inside the window and an old one is not", () => {
  assert.equal(withinWindow(iso(1)), true);
  assert.equal(withinWindow(iso(60)), false);
});

test("an undated item is kept rather than silently dropped", () => {
  assert.equal(withinWindow(""), true);
  assert.equal(withinWindow(undefined), true);
});

test("an unparseable date is kept rather than compared against NaN", () => {
  assert.equal(withinWindow("not-a-date"), true);
});

// ---------- collectorsFor ----------

const emptyProfile = {
  hackerNewsTerms: [],
  devtoTags: [],
  subreddits: [],
  githubRepos: [],
  feeds: [],
  substacks: [],
};

// Nothing is inherited, so a profile that omits a key must run no collector for
// it. Asserted on names only: building the list makes no network call.
test("a profile activates only the collectors it declares", () => {
  const names = collectorsFor({
    ...emptyProfile,
    hackerNewsTerms: ["a"],
    feeds: [{ name: "F", url: "https://f.dev/feed" }],
  }).map(([name]) => name);
  assert.deepEqual(names, ["Hacker News", "Leadership feeds"]);
});

test("a profile declaring every source activates all six collectors", () => {
  const names = collectorsFor({
    hackerNewsTerms: ["a"],
    devtoTags: ["ai"],
    subreddits: ["devops"],
    githubRepos: ["o/r"],
    feeds: [{ name: "F", url: "https://f.dev/feed" }],
    substacks: [{ name: "S", host: "s.dev" }],
  }).map(([name]) => name);
  assert.deepEqual(names, [
    "Hacker News",
    "Dev.to",
    "Reddit",
    "GitHub releases",
    "Leadership feeds",
    "Substack",
  ]);
});

// The all-sources-failed check counts against this list, so an empty profile
// must not make that comparison trivially true.
test("a profile with no sources activates nothing", () => {
  assert.deepEqual(collectorsFor(emptyProfile), []);
});
