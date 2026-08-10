import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { apply } from "../radar-apply.mjs";
import { validatePhenomenon } from "../validate-phenomena.mjs";
import { sig, phen, makeRoot, read, index, PHENOMENA } from "./helpers/radar-fixtures.mjs";

/** The same context validate-phenomena builds for the real corpus. */
const ctxOf = (signalList, root) => ({
  signalsById: new Map(signalList.map((s) => [s.id, s])),
  phenomenonIds: new Set(index(root).items.map((i) => i.id)),
});

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
  // The hostile keys sit where a bypass would actually live: inside the attachment
  // entry that radar:apply reads field by field, and inside a newPhenomena entry
  // whose slug collides with the existing id — the one path that could reach an
  // existing file with a whole record built from model output.
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: {
      attachments: [
        {
          phenomenonId: "p1",
          signalId: "s1",
          stance: "supports",
          primary: true,
          thesis: "rewritten",
          observedReach: "field-level-shift",
          construct: "redefined",
          status: "published",
        },
      ],
      newPhenomena: [
        {
          ...newPhen({ label: "P1" }),
          thesis: "rewritten",
          observedReach: "field-level-shift",
        },
      ],
      suggestions: [],
    },
  });
  assert.ok(
    result.errors.some((e) => e.includes("refusing to overwrite")),
    "a colliding slug must never reach an existing file",
  );
  const after = read(root, "p1");
  for (const k of ["thesis", "construct", "observedReach", "reachRationale", "reachReviewedAt", "label", "title", "status"]) {
    assert.deepEqual(after[k], before[k], `${k} must not move`);
  }
});

test("a hostile attachment entry contributes only the four evidence keys", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1")] });
  const before = read(root, "p1");
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: {
      attachments: [
        {
          phenomenonId: "p1",
          signalId: "s1",
          stance: "supports",
          primary: true,
          note: "n",
          thesis: "rewritten",
          observedReach: "field-level-shift",
        },
      ],
    },
  });
  assert.deepEqual(result.errors, []);
  const after = read(root, "p1");
  assert.deepEqual(after.evidence, [{ signalId: "s1", stance: "supports", primary: true, note: "n" }]);
  for (const k of ["thesis", "construct", "observedReach", "reachRationale", "label", "title", "status"]) {
    assert.deepEqual(after[k], before[k], `${k} must not move`);
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

test("a detachment's reason reaches the apply report", () => {
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
      detachments: [
        { phenomenonId: "p1", signalId: "s2", reason: "wrong-construct: measures hiring, not team size" },
        // not cited, so nothing is removed and nothing should be reported as one
        { phenomenonId: "p1", signalId: "s9", reason: "never attached" },
      ],
    },
  });
  assert.deepEqual(result.errors, []);
  const report = readFileSync(join(root, "data/_radar-apply-report.md"), "utf8");
  assert.match(report, /## Detachments/);
  assert.match(report, /wrong-construct: measures hiring, not team size/);
  assert.doesNotMatch(report, /never attached/, "a no-op detachment is not a removal");
});

test("a new phenomenon whose implication carries pathIds aborts and writes nothing", () => {
  const root = makeRoot({ signals: [sig("s1")] });
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: {
      newPhenomena: [
        newPhen({
          implications: [
            { dimension: "organisation-and-leadership", statement: "A thing.", pathIds: ["x"] },
          ],
        }),
      ],
    },
  });
  assert.ok(result.errors.some((e) => e.includes("pathIds")));
  assert.deepEqual(result.created, []);
  assert.equal(existsSync(join(root, PHENOMENA, "teams-get-smaller.json")), false);
  assert.equal(index(root).items.length, 0, "the index must not gain an entry either");
});

test("an empty pathIds array is accepted", () => {
  const root = makeRoot({ signals: [sig("s1")] });
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: {
      newPhenomena: [
        newPhen({ implications: [{ dimension: "organisation-and-leadership", statement: "A thing.", pathIds: [] }] }),
      ],
    },
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.created, ["teams-get-smaller"]);
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

test("detaching the last evidence item still leaves a file the validator accepts", () => {
  const signals = [sig("s1")];
  const root = makeRoot({
    signals,
    phenomena: [
      phen("p1", [{ signalId: "s1", stance: "supports", primary: true }], {
        evidenceProfile: { independentContexts: 1, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false },
        firstObserved: "2026-08-01",
        latestEvidenceDate: "2026-08-01",
      }),
    ],
  });
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: { detachments: [{ phenomenonId: "p1", signalId: "s1", reason: "wrong-construct" }] },
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    validatePhenomenon(read(root, "p1"), ctxOf(signals, root)),
    [],
    "apply must never write a file its own validator rejects",
  );
});

test("a reach candidate names the signals that changed, not the survivors", () => {
  const root = makeRoot({
    signals: [sig("s1"), sig("s2")],
    phenomena: [
      phen(
        "p1",
        [
          { signalId: "s1", stance: "supports", primary: true },
          { signalId: "s2", stance: "supports", primary: true },
        ],
        { evidenceProfile: { independentContexts: 2, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false } },
      ),
    ],
  });
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: { detachments: [{ phenomenonId: "p1", signalId: "s2", reason: "wrong-construct" }] },
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(read(root, "p1").possibleReachChange.signalIds, ["s2"]);
});

test("an attachment that would write an out-of-enum stance is refused before any write", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1")] });
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: { attachments: [{ phenomenonId: "p1", signalId: "s1", stance: "suports" }] },
  });
  assert.ok(result.errors.some((e) => e.includes("stance")), result.errors.join("; "));
  assert.ok(result.errors.some((e) => e.includes("primary")), result.errors.join("; "));
  assert.ok(result.errors.every((e) => e.startsWith("p1:")), "each message names the phenomenon");
  assert.deepEqual(read(root, "p1").evidence, [], "an existing phenomenon must not be touched");
});

test("a new phenomenon that violates the schema is refused, with no file and no index entry", () => {
  const root = makeRoot({ signals: [sig("s1")] });
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: {
      newPhenomena: [
        newPhen({
          label: "Teams get smaller and also flatter",
          title: "A claim.",
          thesis: "A claim.",
          observedReach: "widespread",
          primaryDimension: "vibes-and-mood",
          potentialImpact: "enormous",
          implications: [{ dimension: "organisation-and-leadership", statement: "A thing.", actors: ["wizard"] }],
        }),
      ],
    },
  });
  for (const expected of ["observedReach", "primaryDimension", "potentialImpact", "label", "title and thesis", "actors"]) {
    assert.ok(result.errors.some((e) => e.includes(expected)), `expected a ${expected} error, got: ${result.errors.join("; ")}`);
  }
  assert.deepEqual(result.created, []);
  assert.equal(existsSync(join(root, PHENOMENA, "teams-get-smaller-and-also-flatter.json")), false);
  assert.equal(index(root).items.length, 0, "the index must not gain an entry either");
});

test("a detachment with no reason is refused — removing evidence is a decision too", () => {
  const root = makeRoot({
    signals: [sig("s1")],
    phenomena: [phen("p1", [{ signalId: "s1", stance: "supports", primary: true }])],
  });
  const result = apply({
    root,
    today: "2026-08-10",
    proposal: { detachments: [{ phenomenonId: "p1", signalId: "s1", reason: "   " }] },
  });
  assert.ok(result.errors.some((e) => e.includes("reason")), result.errors.join("; "));
  assert.equal(read(root, "p1").evidence.length, 1, "nothing is removed");
  assert.equal(existsSync(join(root, "data/_radar-apply-report.md")), false, "and no report claims otherwise");
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
