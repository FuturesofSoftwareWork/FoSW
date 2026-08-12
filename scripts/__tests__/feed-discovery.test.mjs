/**
 * Tests for finding a writer's feed from a page they published on.
 *
 * The failure mode being prevented is a plausible 404: a feed URL that looks
 * right, is never fetched, and quietly contributes nothing to every future run.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { slugify, findFeedUrls, fallbackFeedUrls } from "../lib/feed-discovery.mjs";

test("slugify makes a filename stem from a person's name", () => {
  assert.equal(slugify("Jono Herrington"), "jono-herrington");
  assert.equal(slugify("InfoQ Culture & Methods"), "infoq-culture-methods");
  assert.equal(slugify("  spaced  out  "), "spaced-out");
});

// Publishers order link attributes however they like, so matching must not
// assume rel comes before type.
test("a feed link is found with attributes in either order", () => {
  const relFirst = `<link rel="alternate" type="application/rss+xml" href="https://x.dev/rss.xml">`;
  const typeFirst = `<link type="application/rss+xml" rel="alternate" href="https://x.dev/rss.xml">`;
  assert.deepEqual(findFeedUrls(relFirst, "https://x.dev/p/1"), ["https://x.dev/rss.xml"]);
  assert.deepEqual(findFeedUrls(typeFirst, "https://x.dev/p/1"), ["https://x.dev/rss.xml"]);
});

test("Atom links are found as well as RSS", () => {
  const html = `<link rel="alternate" type="application/atom+xml" href="/atom.xml"/>`;
  assert.deepEqual(findFeedUrls(html, "https://x.dev/p/1"), ["https://x.dev/atom.xml"]);
});

test("relative and protocol-relative hrefs resolve against the page URL", () => {
  const html = `
    <link rel="alternate" type="application/rss+xml" href="/feed/">
    <link rel='alternate' type='application/atom+xml' href='//cdn.x.dev/atom.xml'>`;
  assert.deepEqual(findFeedUrls(html, "https://x.dev/posts/one"), [
    "https://x.dev/feed/",
    "https://cdn.x.dev/atom.xml",
  ]);
});

test("several feeds keep document order and are deduped", () => {
  const html = `
    <link rel="alternate" type="application/rss+xml" href="https://x.dev/a.xml">
    <link rel="alternate" type="application/atom+xml" href="https://x.dev/b.xml">
    <link rel="alternate" type="application/rss+xml" href="https://x.dev/a.xml">`;
  assert.deepEqual(findFeedUrls(html, "https://x.dev/"), ["https://x.dev/a.xml", "https://x.dev/b.xml"]);
});

// A stylesheet or icon link must not be mistaken for a feed.
test("non-feed link tags are ignored", () => {
  const html = `
    <link rel="stylesheet" href="/style.css">
    <link rel="icon" type="image/png" href="/favicon.png">
    <link rel="alternate" type="text/html" href="/amp">`;
  assert.deepEqual(findFeedUrls(html, "https://x.dev/"), []);
});

test("a page with no links yields none rather than throwing", () => {
  assert.deepEqual(findFeedUrls("<html><body>hi</body></html>", "https://x.dev/"), []);
  assert.deepEqual(findFeedUrls("", "https://x.dev/"), []);
  assert.deepEqual(findFeedUrls(undefined, "https://x.dev/"), []);
});

test("an unparseable base URL yields no candidates rather than throwing", () => {
  assert.deepEqual(findFeedUrls(`<link rel="alternate" type="application/rss+xml" href="/f">`, "not a url"), []);
  assert.deepEqual(fallbackFeedUrls("not a url"), []);
});

// Every feed in the first hand-built profile was found this way, because none
// of those five sites advertised one in a link tag.
test("fallback paths are built against the origin, discarding the path", () => {
  const urls = fallbackFeedUrls("https://x.dev/posts/one?a=1");
  assert.ok(urls.includes("https://x.dev/rss.xml"));
  assert.ok(urls.includes("https://x.dev/feed"));
  assert.ok(urls.every((u) => u.startsWith("https://x.dev/")));
});
