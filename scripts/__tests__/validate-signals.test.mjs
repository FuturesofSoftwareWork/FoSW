import test from "node:test";
import assert from "node:assert/strict";
import { SIGNAL_TYPES } from "../validate-signals.mjs";

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

test("the retired genre names are gone", () => {
  assert.ok(!SIGNAL_TYPES.includes("weak-signal"));
  assert.ok(!SIGNAL_TYPES.includes("regulatory"));
});
