import test from "node:test";
import assert from "node:assert/strict";
import { accept } from "../radar-accept.mjs";
import { sig, phen, makeRoot, read, index } from "./helpers/radar-fixtures.mjs";

/** A draft that is ready in every respect: reviewed reach, construct, minimums. */
const ready = (id, over = {}) => phen(id, [{ signalId: "s1", stance: "supports", primary: true }], {
  reachReviewedAt: "2026-08-09",
  implications: [
    { dimension: "organisation-and-leadership", statement: "One." },
    { dimension: "organisation-and-leadership", statement: "Two." },
  ],
  ...over,
});

test("a reviewed draft is published and lastReviewed stamped", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [ready("p1")] });
  const result = accept({ root, ids: ["p1"], today: "2026-08-10" });
  assert.deepEqual(result.errors, []);
  assert.equal(read(root, "p1").status, "published");
  assert.equal(read(root, "p1").lastReviewed, "2026-08-10");
  assert.equal(index(root).items.find((i) => i.id === "p1").status, "published");
});

test("reachReviewedAt is not touched — it is the human's", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [ready("p1")] });
  accept({ root, ids: ["p1"], today: "2026-08-10" });
  assert.equal(read(root, "p1").reachReviewedAt, "2026-08-09");
});

test("a draft with no reachReviewedAt is refused", () => {
  const p = ready("p1"); delete p.reachReviewedAt;
  const root = makeRoot({ signals: [sig("s1")], phenomena: [p] });
  const result = accept({ root, ids: ["p1"], today: "2026-08-10" });
  assert.ok(result.errors.some((e) => e.includes("reachReviewedAt")));
  assert.equal(read(root, "p1").status, "draft");
});

test("a draft with no construct is refused", () => {
  const p = ready("p1"); delete p.construct;
  const root = makeRoot({ signals: [sig("s1")], phenomena: [p] });
  assert.ok(accept({ root, ids: ["p1"], today: "2026-08-10" }).errors.some((e) => e.includes("construct")));
});

test("failing the published minimums is refused before anything is written", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [ready("p1", { implications: [] })] });
  const result = accept({ root, ids: ["p1"], today: "2026-08-10" });
  assert.ok(result.errors.some((e) => e.includes("implications")));
  assert.equal(read(root, "p1").status, "draft");
});

test("one bad id refuses the whole batch", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [ready("p1"), ready("p2", { implications: [] })] });
  const result = accept({ root, ids: ["p1", "p2"], today: "2026-08-10" });
  assert.ok(result.errors.length);
  assert.equal(read(root, "p1").status, "draft", "all-or-nothing");
});

test("an unknown id is refused", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [ready("p1")] });
  assert.ok(accept({ root, ids: ["ghost"], today: "2026-08-10" }).errors.length);
});

test("an already published phenomenon is refused", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [ready("p1", { status: "published" })] });
  assert.ok(accept({ root, ids: ["p1"], today: "2026-08-10" }).errors.some((e) => e.includes("draft")));
});

test("reach judged before the newest evidence warns but proceeds", () => {
  const root = makeRoot({
    signals: [sig("s1", { date: "2026-08-20" })],
    phenomena: [ready("p1", { latestEvidenceDate: "2026-08-20" })],
  });
  const result = accept({ root, ids: ["p1"], today: "2026-08-21" });
  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.some((w) => w.includes("p1")));
  assert.equal(read(root, "p1").status, "published");
});
