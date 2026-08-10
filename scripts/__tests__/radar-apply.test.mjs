import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join } from "path";
import { apply } from "../radar-apply.mjs";
import { sig, phen, makeRoot, read, index } from "./helpers/radar-fixtures.mjs";

const newPhen = (over = {}) => ({
  label: "Teams get smaller",
  title: "The unit of delivery shrinks",
  thesis: "A claim.",
  construct: "the size of the delivery unit",
  primaryDimension: "organisation-and-leadership",
  observedReach: "early-manifestations",
  reachRationale: "One report.",
  implications: [{ dimension: "organisation-and-leadership", statement: "A thing." }],
  evidence: [{ signalId: "s1", stance: "supports", primary: true }],
  ...over,
});

test("an attachment is added and the profile recomputed", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1")] });
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: {
      attachments: [{ phenomenonId: "p1", signalId: "s1", stance: "supports", primary: true, note: "n" }],
    },
  });
  assert.deepEqual(result.errors, []);
  const p = read(root, "p1");
  assert.equal(p.evidence.length, 1);
  assert.equal(p.evidenceProfile.independentContexts, 1);
});

test("human-owned fields are byte-identical after a proposal that tries to change them", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1")] });
  const before = read(root, "p1");
  apply({
    root,
    today: "2026-08-10",
    proposal: {
      attachments: [{ phenomenonId: "p1", signalId: "s1", stance: "supports", primary: true }],
      newPhenomena: [],
      suggestions: [],
      // a hostile proposal: these must be ignored entirely
      thesis: "rewritten",
      observedReach: "field-level-shift",
    },
  });
  const after = read(root, "p1");
  for (const k of ["thesis", "construct", "observedReach", "reachRationale", "reachReviewedAt", "label", "title"]) {
    assert.equal(after[k], before[k], `${k} must not move`);
  }
});

test("a detachment removes the item and recomputes", () => {
  const root = makeRoot({
    signals: [sig("s1"), sig("s2")],
    phenomena: [
      phen("p1", [
        { signalId: "s1", stance: "supports", primary: true },
        { signalId: "s2", stance: "counter", primary: true },
      ]),
    ],
  });
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: {
      detachments: [{ phenomenonId: "p1", signalId: "s2", reason: "wrong-construct" }],
    },
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    read(root, "p1").evidence.map((e) => e.signalId),
    ["s1"],
  );
  assert.equal(read(root, "p1").evidenceProfile.counterEvidence, false);
});

test("detaching the last supports item warns and proceeds", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1", [{ signalId: "s1", stance: "supports", primary: true }])] });
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: {
      detachments: [{ phenomenonId: "p1", signalId: "s1", reason: "wrong-construct" }],
    },
  });
  assert.deepEqual(result.errors, []);
  assert.equal(read(root, "p1").evidence.length, 0);
  assert.ok(
    result.warnings.some((w) => w.includes("p1")),
    "a claim nobody measures is a finding",
  );
});

test("a duplicate attachment and an absent detachment are both no-ops", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1", [{ signalId: "s1", stance: "supports", primary: true }])] });
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: {
      attachments: [{ phenomenonId: "p1", signalId: "s1", stance: "supports", primary: true }],
      detachments: [{ phenomenonId: "p1", signalId: "s9", reason: "x" }],
    },
  });
  assert.deepEqual(result.errors, []);
  assert.equal(read(root, "p1").evidence.length, 1);
});

test("a new phenomenon is written as a draft with no reachReviewedAt", () => {
  const root = makeRoot({ signals: [sig("s1")] });
  const result = apply({ root, today: "2026-08-10", proposal: { newPhenomena: [newPhen()] } });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.created, ["teams-get-smaller"]);
  const p = read(root, "teams-get-smaller");
  assert.equal(p.status, "draft");
  assert.equal(p.reachReviewedAt, undefined, "no human has judged reach yet");
  assert.equal(p.observedReach, "early-manifestations");
  assert.equal(index(root).items.length, 1);
});

test("an unknown phenomenonId aborts and writes nothing", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1")] });
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: {
      attachments: [{ phenomenonId: "nope", signalId: "s1", stance: "supports", primary: true }],
    },
  });
  assert.ok(result.errors.length);
  assert.equal(read(root, "p1").evidence.length, 0);
});

test("an unpublished signal aborts", () => {
  const root = makeRoot({ signals: [sig("s1", { status: "draft" })], phenomena: [phen("p1")] });
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: {
      attachments: [{ phenomenonId: "p1", signalId: "s1", stance: "supports", primary: true }],
    },
  });
  assert.ok(result.errors.some((e) => e.includes("published")));
});

test("a slug collision aborts rather than overwriting", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("teams-get-smaller")] });
  const result = apply({ root, today: "2026-08-10", proposal: { newPhenomena: [newPhen()] } });
  assert.ok(result.errors.some((e) => e.includes("refusing to overwrite")));
});

test("a new phenomenon without construct aborts", () => {
  const root = makeRoot({ signals: [sig("s1")] });
  const p = newPhen();
  delete p.construct;
  const result = apply({ root, today: "2026-08-10", proposal: { newPhenomena: [p] } });
  assert.ok(result.errors.some((e) => e.includes("construct")));
});

test("a detachment on an unknown phenomenon aborts the whole batch", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1")] });
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: {
      attachments: [{ phenomenonId: "p1", signalId: "s1", stance: "supports", primary: true }],
      detachments: [{ phenomenonId: "ghost", signalId: "s1", reason: "x" }],
    },
  });
  assert.ok(result.errors.length);
  assert.equal(read(root, "p1").evidence.length, 0, "nothing moves when the batch fails");
});

test("the apply report records suggestions without touching any file", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1")] });
  apply({
    root,
    today: "2026-08-10",
    proposal: {
      attachments: [{ phenomenonId: "p1", signalId: "s1", stance: "supports", primary: true }],
      suggestions: [{ phenomenonId: "p1", field: "thesis", observation: "outgrown by its evidence" }],
    },
  });
  const report = readFileSync(join(root, "data/_radar-apply-report.md"), "utf8");
  assert.match(report, /outgrown by its evidence/);
  assert.equal(read(root, "p1").thesis, "A thesis.");
});
