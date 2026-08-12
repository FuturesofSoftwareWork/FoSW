/**
 * Tests for the seen-ledger's key derivation and append path.
 *
 * `normalizeUrl` is the highest-leverage pure function in the signals pipeline:
 * too aggressive and every genuinely new item is suppressed as already-seen;
 * too lax and the ledger stops being memory at all. Neither failure is visible
 * in a run log — a suppressed item simply never appears. The query-string case
 * below is not hypothetical: dropping it once collapsed every Hacker News
 * discussion onto a single key, because HN puts the item identity in `?id=`.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { normalizeUrl, normalizeText, keyFor, readLedger, appendRecords, recordFromSignal } from "../ledger.mjs";

const tmpLedger = () => join(mkdtempSync(join(tmpdir(), "ledger-test-")), "_seen-ledger.jsonl");

// ---------- normalizeUrl ----------

test("the query string is preserved, because some sites put identity there", () => {
  const a = normalizeUrl("https://news.ycombinator.com/item?id=49104747");
  const b = normalizeUrl("https://news.ycombinator.com/item?id=48139148");
  assert.notEqual(a, b);
  assert.match(a, /id=49104747/);
});

test("protocol, www, trailing slash and hash are all stripped", () => {
  const canonical = normalizeUrl("https://leaddev.com/a/b");
  for (const variant of [
    "http://leaddev.com/a/b",
    "https://www.leaddev.com/a/b",
    "https://leaddev.com/a/b/",
    "https://leaddev.com/a/b#section",
    "  https://LeadDev.com/a/b  ",
  ]) {
    assert.equal(normalizeUrl(variant), canonical, variant);
  }
});

test("tracking parameters are dropped but real ones are kept", () => {
  assert.equal(
    normalizeUrl("https://leaddev.com/a?utm_source=x&utm_medium=y&fbclid=z&id=7"),
    normalizeUrl("https://leaddev.com/a?id=7"),
  );
});

test("cosmetic parameter reordering still dedupes", () => {
  assert.equal(normalizeUrl("https://x.dev/a?b=2&a=1"), normalizeUrl("https://x.dev/a?a=1&b=2"));
});

test("an unparseable url falls back to text normalisation rather than throwing", () => {
  assert.equal(normalizeUrl("www.Leaddev.com/a/#frag"), "leaddev.com/a");
});

test("an absent or non-string url is the empty key", () => {
  assert.equal(normalizeUrl(undefined), "");
  assert.equal(normalizeUrl(null), "");
  assert.equal(normalizeUrl(42), "");
  assert.equal(normalizeUrl(""), "");
});

// ---------- normalizeText / keyFor ----------

test("claim text normalises past punctuation and spacing", () => {
  assert.equal(normalizeText("  AI Agents: the 2026 Report!  "), "ai agents the 2026 report");
});

test("a url wins over a claim, and a claim is the fallback", () => {
  assert.equal(keyFor({ url: "https://x.dev/a", claim: "Some claim" }), "url:x.dev/a");
  assert.equal(keyFor({ url: "", claim: "Some claim" }), "claim:some claim");
  assert.equal(keyFor({ url: "", claim: "" }), "");
});

// ---------- appendRecords ----------

test("appendRecords writes new keys and reports them", () => {
  const file = tmpLedger();
  const result = appendRecords([{ key: "url:a.dev/1" }, { key: "url:a.dev/2" }], file);
  assert.deepEqual(result, { added: 2, skipped: 0 });
  assert.equal(readLedger(file).length, 2);
});

// Re-running promote must be a no-op. The records are rebuilt from the folders
// every time, so without key-dedup a second run would double every line.
test("appendRecords skips keys already present, so a re-run is a no-op", () => {
  const file = tmpLedger();
  appendRecords([{ key: "url:a.dev/1" }], file);
  const second = appendRecords([{ key: "url:a.dev/1" }, { key: "url:a.dev/2" }], file);
  assert.deepEqual(second, { added: 1, skipped: 1 });
  assert.equal(readLedger(file).length, 2);
});

test("a record with no key is ignored rather than written", () => {
  const file = tmpLedger();
  assert.deepEqual(appendRecords([{ key: "" }, { claim: "no key at all" }], file), { added: 0, skipped: 0 });
  assert.equal(readLedger(file).length, 0);
});

test("duplicates inside one batch are collapsed", () => {
  const file = tmpLedger();
  assert.deepEqual(appendRecords([{ key: "url:a.dev/1" }, { key: "url:a.dev/1" }], file), { added: 1, skipped: 1 });
});

// ---------- readLedger ----------

test("a malformed line is skipped without losing the rest of the file", () => {
  const file = tmpLedger();
  writeFileSync(file, '{"key":"url:a.dev/1"}\nnot json at all\n{"key":"url:a.dev/2"}\n', "utf8");
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.deepEqual(
      readLedger(file).map((r) => r.key),
      ["url:a.dev/1", "url:a.dev/2"],
    );
  } finally {
    console.warn = warn;
  }
});

test("a missing ledger file reads as empty rather than throwing", () => {
  assert.deepEqual(readLedger(join(tmpdir(), "definitely-not-a-ledger-9f2c.jsonl")), []);
});

// ---------- recordFromSignal ----------

test("a signal becomes a published record keyed on its source url", () => {
  const rec = recordFromSignal({
    id: "2026-08-10-01",
    title: "A title",
    sourceUrl: "https://www.leaddev.com/a/",
    detectedAt: "2026-08-10",
    date: "2026-08-09",
  });
  assert.equal(rec.key, "url:leaddev.com/a");
  assert.equal(rec.status, "published");
  assert.equal(rec.id, "2026-08-10-01");
  assert.equal(rec.claim, "A title");
});

// index.json and the older signal files carry second-precision timestamps in
// detectedAt; the ledger compares dates as plain strings, so a timestamp that
// survived would never match a date and the record would look perpetually new.
test("a timestamped detectedAt is trimmed to a plain date", () => {
  const rec = recordFromSignal({ id: "x", title: "T", sourceUrl: "https://x.dev/a", detectedAt: "2026-02-06T00:42:15Z" });
  assert.equal(rec.firstSeen, "2026-02-06");
  assert.equal(rec.lastSeen, "2026-02-06");
});

test("a signal with no url is keyed on its claim instead", () => {
  const rec = recordFromSignal({ id: "x", title: "A landmark study", detectedAt: "2026-08-10" });
  assert.equal(rec.key, "claim:a landmark study");
});

test("the ledger file is created with a trailing newline per record", () => {
  const file = tmpLedger();
  appendRecords([{ key: "url:a.dev/1" }, { key: "url:a.dev/2" }], file);
  assert.equal(readFileSync(file, "utf8").split("\n").filter(Boolean).length, 2);
  assert.ok(readFileSync(file, "utf8").endsWith("\n"));
});
