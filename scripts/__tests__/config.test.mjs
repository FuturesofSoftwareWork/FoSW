import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";

const idsFrom = (path) => [...readFileSync(path, "utf8").matchAll(/id:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);

test("there are nine work dimensions, all kebab-case and unique", () => {
  const ids = idsFrom("src/config/radarDimensions.ts");
  assert.equal(ids.length, 9);
  assert.equal(new Set(ids).size, 9, "dimension ids must be unique");
  for (const id of ids) assert.match(id, /^[a-z][a-z0-9-]*[a-z0-9]$/);
});

test("every dimension has a six-digit hex colour", () => {
  const src = readFileSync("src/config/radarDimensions.ts", "utf8");
  const colours = [...src.matchAll(/colour:\s*"(#[0-9a-fA-F]{6})"/g)].map((m) => m[1]);
  assert.equal(colours.length, 9);
  assert.equal(new Set(colours).size, 9, "dimension colours must be distinguishable");
});

test("responsibility appears in exactly one dimension label", () => {
  const src = readFileSync("src/config/radarDimensions.ts", "utf8");
  const labels = [...src.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  const withResponsibility = labels.filter((l) => /responsibilit/i.test(l));
  assert.equal(withResponsibility.length, 1, `found: ${withResponsibility.join(", ")}`);
});

import { WORK_DIMENSION_IDS, ACTOR_IDS } from "../lib/phenomenon-schema.mjs";

test("the mjs dimension mirror matches the ts config", () => {
  assert.deepEqual(WORK_DIMENSION_IDS, idsFrom("src/config/radarDimensions.ts"));
});

test("the mjs actor mirror matches the ts config", () => {
  assert.deepEqual(ACTOR_IDS, idsFrom("src/config/radarActors.ts"));
});
