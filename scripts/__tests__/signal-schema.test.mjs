import test from "node:test";
import assert from "node:assert/strict";
import { validateSignal, SIGNAL_TYPES, CATEGORIES } from "../lib/signal-schema.mjs";

/** A minimal signal that must pass cleanly; each test mutates a copy. */
function valid(overrides = {}) {
  return {
    id: "2026-08-06-01",
    title: "A title",
    summary: "A summary.",
    source: "Practitioner Blog",
    sourceUrl: "https://example.com",
    detectedAt: "2026-08-06",
    date: "2026-08-05",
    status: "draft",
    category: ["Work Wellbeing"],
    sourceType: "article",
    ...overrides,
  };
}

test("a well-formed signal produces no errors", () => {
  assert.deepEqual(validateSignal(valid()), []);
});

test("a missing required field is reported by name", () => {
  const s = valid();
  delete s.summary;
  const errors = validateSignal(s);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /summary/);
});

test("an empty-string required field counts as missing", () => {
  const errors = validateSignal(valid({ title: "" }));
  assert.match(errors.join(" "), /title/);
});

// Replaces the old decisionHorizon exactness test. sourceType is the better
// subject: five published files once carried a capitalised "Academic", so this
// is a failure mode the corpus has actually produced.
test("sourceType must use the exact lowercase strings", () => {
  assert.equal(validateSignal(valid({ sourceType: "Academic" })).length, 1);
  assert.equal(validateSignal(valid({ sourceType: "preprint" })).length, 1);
  assert.deepEqual(validateSignal(valid({ sourceType: "academic" })), []);
});

// decisionHorizon is retired. 98 published files still carry it, so validation
// must ignore it rather than reject it — and a future change that "restores"
// the enum would fail this test rather than silently breaking every promote.
test("decisionHorizon is ignored, whatever its value", () => {
  assert.deepEqual(validateSignal(valid({ decisionHorizon: "0,5 - 2 years" })), []);
  assert.deepEqual(validateSignal(valid({ decisionHorizon: "watch" })), []);
});

test("a field the site maps over must be an array", () => {
  const errors = validateSignal(valid({ whyItMatters: "not an array" }));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /whyItMatters/);
});

test("more than three categories is rejected", () => {
  const four = ["AI Agents", "AI Tools", "Productivity", "SDLC Change"];
  assert.match(validateSignal(valid({ category: four })).join(" "), /category/);
});

test("an unknown category value is rejected", () => {
  assert.match(validateSignal(valid({ category: ["other"] })).join(" "), /category/);
  assert.deepEqual(validateSignal(valid({ category: ["Other"] })), []);
});

test("status must be published or draft", () => {
  assert.deepEqual(validateSignal(valid({ status: "published" })), []);
  assert.equal(validateSignal(valid({ status: "live" })).length, 1);
});

test("practitioner-account requires an observer", () => {
  assert.match(
    validateSignal(valid({ signalType: "practitioner-account" })).join(" "),
    /observer/,
  );
  assert.deepEqual(
    validateSignal(valid({ signalType: "practitioner-account", observer: "A named dev" })),
    [],
  );
});

test("regulation-standard requires an effectiveDate", () => {
  assert.match(
    validateSignal(valid({ signalType: "regulation-standard" })).join(" "),
    /effectiveDate/,
  );
});

test("a non-object is reported rather than crashing the field checks", () => {
  assert.equal(validateSignal(null).length, 1);
  assert.equal(validateSignal([]).length, 1);
  assert.equal(validateSignal("a string").length, 1);
});

test("SIGNAL_TYPES has the eight genres", () => {
  assert.deepEqual([...SIGNAL_TYPES].sort(), [
    "field-report",
    "forecast",
    "market-event",
    "practitioner-account",
    "primary-research",
    "regulation-standard",
    "study",
    "tool-shift",
  ]);
});

test("CATEGORIES matches the thirteen documented values", () => {
  assert.equal(CATEGORIES.length, 13);
  assert.ok(CATEGORIES.includes("Costs & Economics"));
  assert.ok(CATEGORIES.includes("Other"));
  assert.ok(!CATEGORIES.includes("other"));
});
