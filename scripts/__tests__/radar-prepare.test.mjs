import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { prepare } from "../radar-prepare.mjs";

const SIGNALS = "public/content/ai-signals";
const PHENOMENA = "public/content/phenomena";

const signal = (id, over = {}) => ({
  id, title: `Title ${id}`, summary: "A summary.", source: "Blog",
  detectedAt: "2026-08-01", date: "2026-08-01", status: "published",
  signalType: "study", whyItMatters: "Because.", ...over,
});

const phenomenon = (id, evidence = [], over = {}) => ({
  id, label: "A label", title: `T ${id}`, thesis: "A thesis.",
  status: "draft", primaryDimension: "organisation-and-leadership",
  implications: [], evidence, observedReach: "early-manifestations",
  reachRationale: "Because.", reachReviewedAt: "2026-08-01", ...over,
});

function makeRoot({ signals = [], phenomena = [], rejected = "" } = {}) {
  const root = mkdtempSync(join(tmpdir(), "radar-prepare-"));
  mkdirSync(join(root, SIGNALS), { recursive: true });
  mkdirSync(join(root, PHENOMENA), { recursive: true });
  mkdirSync(join(root, "data"), { recursive: true });
  const write = (dir, items) => {
    for (const it of items) {
      writeFileSync(join(root, dir, `${it.id}.json`), JSON.stringify(it, null, 2));
    }
    writeFileSync(
      join(root, dir, "index.json"),
      JSON.stringify({ lastUpdated: "2026-01-01T00:00:00Z",
        items: items.map((i) => ({ id: i.id, file: `${i.id}.json`, date: i.date || "2026-08-01", status: i.status })) }, null, 2),
    );
  };
  write(SIGNALS, signals);
  write(PHENOMENA, phenomena);
  if (rejected) writeFileSync(join(root, "data/_radar-rejected.jsonl"), rejected);
  return root;
}

const ids = (r) => r.digest.signals.map((s) => s.id);

test("an uncovered published signal is selected", () => {
  const root = makeRoot({ signals: [signal("s1")] });
  const result = prepare({ root });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(ids(result), ["s1"]);
});

test("a signal cited by a phenomenon is not selected", () => {
  const root = makeRoot({
    signals: [signal("s1"), signal("s2")],
    phenomena: [phenomenon("p1", [{ signalId: "s1", stance: "supports", primary: true }])],
  });
  assert.deepEqual(ids(prepare({ root })), ["s2"]);
});

test("a DRAFT phenomenon's citations count as covered", () => {
  const root = makeRoot({
    signals: [signal("s1")],
    phenomena: [phenomenon("p1", [{ signalId: "s1", stance: "supports", primary: true }], { status: "draft" })],
  });
  assert.deepEqual(ids(prepare({ root })), []);
});

test("--all re-digests covered signals", () => {
  const root = makeRoot({
    signals: [signal("s1")],
    phenomena: [phenomenon("p1", [{ signalId: "s1", stance: "supports", primary: true }])],
  });
  assert.deepEqual(ids(prepare({ root, all: true })), ["s1"]);
});

test("--since narrows by signal date", () => {
  const root = makeRoot({ signals: [signal("old", { date: "2026-01-01" }), signal("new", { date: "2026-08-01" })] });
  assert.deepEqual(ids(prepare({ root, since: "2026-06-01" })), ["new"]);
});

test("an unpublished signal is never selected", () => {
  const root = makeRoot({ signals: [signal("s1", { status: "draft" })] });
  assert.deepEqual(ids(prepare({ root })), []);
});

test("the digest carries the existing phenomena with their cited ids", () => {
  const root = makeRoot({
    signals: [signal("s1"), signal("s2")],
    phenomena: [phenomenon("p1", [{ signalId: "s1", stance: "supports", primary: true }])],
  });
  const { digest } = prepare({ root });
  assert.equal(digest.phenomena.length, 1);
  assert.deepEqual(digest.phenomena[0].citedSignalIds, ["s1"]);
  assert.equal(digest.phenomena[0].thesis, "A thesis.");
});

test("the coverage table is reported but never put in the digest", () => {
  const root = makeRoot({ signals: [signal("s1")], phenomena: [phenomenon("p1")] });
  const result = prepare({ root });
  assert.equal(result.coverage["organisation-and-leadership"], 1);
  assert.equal(result.coverage["ethics-responsibility-and-society"], 0);
  assert.equal("coverage" in result.digest, false, "the model must not be handed the gap");
});

test("rejected clusters are carried so they are not re-proposed", () => {
  const line = JSON.stringify({ id: "p9", label: "Old", thesis: "Declined.", signalIds: ["s1"], reason: "thin", at: "2026-08-09" });
  const root = makeRoot({ signals: [signal("s1")], rejected: line + "\n" });
  const { digest } = prepare({ root });
  assert.equal(digest.rejectedClusters.length, 1);
  assert.equal(digest.rejectedClusters[0].thesis, "Declined.");
});

test("undecided drafts are counted so the queue cannot rot silently", () => {
  const root = makeRoot({ signals: [signal("s1")], phenomena: [phenomenon("p1", [], { status: "draft" })] });
  assert.equal(prepare({ root }).undecided, 1);
});

test("nothing to cluster is not an error", () => {
  const root = makeRoot({ signals: [] });
  const result = prepare({ root });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(ids(result), []);
});

test("the digest is written to the out path", () => {
  const root = makeRoot({ signals: [signal("s1")] });
  prepare({ root, out: "data/_radar-input.json" });
  const written = JSON.parse(readFileSync(join(root, "data/_radar-input.json"), "utf8"));
  assert.deepEqual(written.signals.map((s) => s.id), ["s1"]);
});
