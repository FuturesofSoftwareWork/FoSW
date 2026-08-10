import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { reject } from "../radar-reject.mjs";
import { sig, phen, makeRoot, index } from "./helpers/radar-fixtures.mjs";

const PHENOMENA = "public/content/phenomena";
const store = (root) =>
  readFileSync(join(root, "data/_radar-rejected.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);

test("the file and its index entry are removed together", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1", [{ signalId: "s1", stance: "supports", primary: true }])] });
  const result = reject({ root, ids: ["p1"], reason: "thin", today: "2026-08-10" });
  assert.deepEqual(result.errors, []);
  assert.ok(!existsSync(join(root, PHENOMENA, "p1.json")), "file must be gone");
  assert.equal(index(root).items.find((i) => i.id === "p1"), undefined, "index entry must be gone");
});

test("the store keeps label, thesis and the cited signal ids", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1", [{ signalId: "s1", stance: "supports", primary: true }])] });
  reject({ root, ids: ["p1"], reason: "not measuring the construct", today: "2026-08-10" });
  const [line] = store(root);
  assert.equal(line.id, "p1");
  assert.equal(line.thesis, "A thesis.");
  assert.deepEqual(line.signalIds, ["s1"]);
  assert.equal(line.reason, "not measuring the construct");
  assert.equal(line.at, "2026-08-10");
});

test("the released signals are reported", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1", [{ signalId: "s1", stance: "supports", primary: true }])] });
  assert.deepEqual(reject({ root, ids: ["p1"], reason: "thin", today: "2026-08-10" }).released, ["s1"]);
});

test("a published phenomenon is refused — that is retirement, a different act", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1", [], { status: "published" })] });
  const result = reject({ root, ids: ["p1"], reason: "thin", today: "2026-08-10" });
  assert.ok(result.errors.some((e) => e.includes("draft")));
  assert.ok(existsSync(join(root, PHENOMENA, "p1.json")));
});

test("a missing reason is refused", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1")] });
  assert.ok(reject({ root, ids: ["p1"], reason: "", today: "2026-08-10" }).errors.some((e) => e.includes("reason")));
});

test("one bad id refuses the whole batch", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1")] });
  const result = reject({ root, ids: ["p1", "ghost"], reason: "thin", today: "2026-08-10" });
  assert.ok(result.errors.length);
  assert.ok(existsSync(join(root, PHENOMENA, "p1.json")), "nothing moves when the batch fails");
});

test("re-rejecting an already rejected id is a no-op, not an error", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1")] });
  reject({ root, ids: ["p1"], reason: "thin", today: "2026-08-10" });
  const again = reject({ root, ids: ["p1"], reason: "thin", today: "2026-08-11" });
  assert.deepEqual(again.errors, []);
  assert.deepEqual(again.rejected, []);
  assert.equal(store(root).length, 1, "the store must not gain a duplicate");
});

test("the store is append-only across runs", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1"), phen("p2")] });
  reject({ root, ids: ["p1"], reason: "one", today: "2026-08-10" });
  reject({ root, ids: ["p2"], reason: "two", today: "2026-08-11" });
  assert.deepEqual(store(root).map((r) => r.id), ["p1", "p2"]);
});
