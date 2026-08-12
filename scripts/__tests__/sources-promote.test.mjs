/**
 * Tests for promoting accepted nominations into a source profile.
 *
 * All-or-nothing, like signals:promote: a half-applied batch would leave the
 * accepted folder partly emptied with no record of which failures were real.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { promoteSources } from "../sources-promote.mjs";

const NOMS = "data/source-nominations";

/** A nomination as sources:discover leaves it. */
const ready = (over = {}) => ({
  name: "Jono Herrington",
  profile: "p",
  foundAt: "https://x.dev/posts/one",
  why: "firsthand account",
  feed: "https://x.dev/rss.xml",
  feedStatus: "ok — 24 entries, newest 2026-08-09",
  ...over,
});

function rootWith({
  accepted = [],
  rejected = [],
  queued = [],
  profiles = { p: { profile: "p", feeds: [] } },
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "srcprom-"));
  mkdirSync(join(root, NOMS, "accepted"), { recursive: true });
  mkdirSync(join(root, NOMS, "rejected"), { recursive: true });
  mkdirSync(join(root, "config/sources"), { recursive: true });
  const put = (dir, items) =>
    items.forEach((n, i) => writeFileSync(join(root, dir, `n${i}.json`), JSON.stringify(n, null, 2), "utf8"));
  put(NOMS, queued);
  put(join(NOMS, "accepted"), accepted);
  put(join(NOMS, "rejected"), rejected);
  for (const [name, body] of Object.entries(profiles)) {
    writeFileSync(join(root, "config/sources", `${name}.json`), JSON.stringify(body, null, 2), "utf8");
  }
  return root;
}

const readProfile = (root, name) =>
  JSON.parse(readFileSync(join(root, "config/sources", `${name}.json`), "utf8"));

test("an accepted nomination is appended to its profile's feeds", () => {
  const root = rootWith({
    accepted: [ready()],
    profiles: {
      p: { profile: "p", description: "keep me", feeds: [{ name: "First", url: "https://a.dev/f" }] },
    },
  });

  const result = promoteSources({ root });

  assert.deepEqual(result.errors, []);
  const p = readProfile(root, "p");
  assert.deepEqual(p.feeds, [
    { name: "First", url: "https://a.dev/f" },
    { name: "Jono Herrington", url: "https://x.dev/rss.xml" },
  ]);
  assert.equal(p.description, "keep me", "other keys must survive");
});

test("nominations route to their own profiles in one run", () => {
  const root = rootWith({
    accepted: [ready(), ready({ name: "Other", profile: "q", feed: "https://y.dev/rss" })],
    profiles: { p: { profile: "p", feeds: [] }, q: { profile: "q", feeds: [] } },
  });

  promoteSources({ root });

  assert.equal(readProfile(root, "p").feeds.length, 1);
  assert.equal(readProfile(root, "q").feeds[0].name, "Other");
});

test("the accepted file is consumed and the rejected one is kept", () => {
  const root = rootWith({ accepted: [ready()], rejected: [ready({ name: "No" })] });

  promoteSources({ root });

  assert.ok(!existsSync(join(root, NOMS, "accepted", "n0.json")), "the profile is now the record");
  assert.ok(
    existsSync(join(root, NOMS, "rejected", "n0.json")),
    "rejections are the memory that stops re-nomination",
  );
});

test("a nomination without a verified feed blocks the batch", () => {
  const root = rootWith({ accepted: [ready({ feed: undefined, feedStatus: "no feed found" })] });

  const result = promoteSources({ root });

  assert.equal(result.promoted.length, 0);
  assert.match(result.errors.join(" "), /feed/);
  assert.deepEqual(readProfile(root, "p").feeds, []);
});

test("a feed whose status is not ok blocks the batch", () => {
  const root = rootWith({ accepted: [ready({ feedStatus: "could not fetch foundAt" })] });

  assert.match(promoteSources({ root }).errors.join(" "), /feedStatus/);
});

test("an unknown profile blocks the batch", () => {
  const root = rootWith({ accepted: [ready({ profile: "nope" })] });

  const result = promoteSources({ root });

  assert.match(result.errors.join(" "), /nope/);
  assert.equal(result.promoted.length, 0);
});

test("a nomination with no profile at all blocks the batch", () => {
  const root = rootWith({ accepted: [ready({ profile: undefined })] });

  assert.match(promoteSources({ root }).errors.join(" "), /profile/);
});

// Two entries for one feed would silently double that source's weight in the pool.
test("a feed already in the profile is refused, ignoring scheme and trailing slash", () => {
  const root = rootWith({
    accepted: [ready()],
    profiles: { p: { profile: "p", feeds: [{ name: "Same", url: "http://x.dev/rss.xml/" }] } },
  });

  const result = promoteSources({ root });

  assert.match(result.errors.join(" "), /already/);
  assert.equal(readProfile(root, "p").feeds.length, 1);
});

test("the same feed twice in one batch is refused", () => {
  const root = rootWith({ accepted: [ready(), ready({ name: "Duplicate" })] });

  assert.match(promoteSources({ root }).errors.join(" "), /already|twice/i);
  assert.deepEqual(readProfile(root, "p").feeds, []);
});

test("one bad nomination blocks a good one in the same batch", () => {
  const root = rootWith({ accepted: [ready(), ready({ name: "Bad", profile: "nope" })] });

  promoteSources({ root });

  assert.deepEqual(readProfile(root, "p").feeds, []);
  assert.ok(existsSync(join(root, NOMS, "accepted", "n0.json")), "nothing is consumed when the batch fails");
});

test("the unreviewed queue is reported and never touched", () => {
  const root = rootWith({ queued: [ready({ name: "Unreviewed" })] });

  const result = promoteSources({ root });

  assert.equal(result.queued, 1);
  assert.equal(result.promoted.length, 0);
  assert.ok(existsSync(join(root, NOMS, "n0.json")));
});

test("a second run with nothing accepted is a no-op", () => {
  const root = rootWith({ accepted: [ready()] });
  promoteSources({ root });
  const after = readProfile(root, "p");

  promoteSources({ root });

  assert.deepEqual(readProfile(root, "p"), after);
});

test("a missing nominations tree is not an error", () => {
  const root = mkdtempSync(join(tmpdir(), "srcprom-empty-"));
  const result = promoteSources({ root });
  assert.deepEqual(result.errors, []);
  assert.equal(result.promoted.length, 0);
});
