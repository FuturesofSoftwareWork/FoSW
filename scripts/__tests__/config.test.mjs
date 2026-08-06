import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";

const idsFrom = (path) => [...readFileSync(path, "utf8").matchAll(/id:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);

test("there are seven work dimensions, all kebab-case and unique", () => {
  const ids = idsFrom("src/config/radarDimensions.ts");
  assert.equal(ids.length, 7);
  assert.equal(new Set(ids).size, 7, "dimension ids must be unique");
  for (const id of ids) assert.match(id, /^[a-z][a-z0-9-]*[a-z0-9]$/);
});

test("every dimension has a six-digit hex colour", () => {
  const src = readFileSync("src/config/radarDimensions.ts", "utf8");
  const colours = [...src.matchAll(/colour:\s*"(#[0-9a-fA-F]{6})"/g)].map((m) => m[1]);
  assert.equal(colours.length, 7);
  assert.equal(new Set(colours).size, 7, "dimension colours must be distinguishable");
});

test("responsibility appears in exactly one dimension label", () => {
  const src = readFileSync("src/config/radarDimensions.ts", "utf8");
  const labels = [...src.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  const withResponsibility = labels.filter((l) => /responsibilit/i.test(l));
  assert.equal(withResponsibility.length, 1, `found: ${withResponsibility.join(", ")}`);
});

import {
  WORK_DIMENSION_IDS,
  ACTOR_IDS,
  OBSERVED_REACH,
  EVIDENCE_STANCES,
  POTENTIAL_IMPACTS,
  RELATIONS,
  PHENOMENON_STATUSES,
} from "../lib/phenomenon-schema.mjs";

test("the mjs dimension mirror matches the ts config", () => {
  assert.deepEqual(WORK_DIMENSION_IDS, idsFrom("src/config/radarDimensions.ts"));
});

test("the mjs actor mirror matches the ts config", () => {
  assert.deepEqual(ACTOR_IDS, idsFrom("src/config/radarActors.ts"));
});

// --- src/types/phenomenon.ts mirrors ------------------------------------------
//
// Five more vocabularies are duplicated between src/types/phenomenon.ts and
// scripts/lib/phenomenon-schema.mjs, with no tsc backstop (the .mjs side is plain
// JS). These tests parse the quoted string literals out of the union declaration
// or field in the .ts source and compare them, as sets, to the .mjs array.

const PHENOMENON_TYPES = "src/types/phenomenon.ts";
const asSet = (arr) => [...new Set(arr)].sort();

/**
 * Extracts the quoted string literals of a union type from a declaration in a
 * TypeScript source file — either `type Name = "a" | "b";` or an inline union
 * field such as `relation: "a" | "b";`. `anchor` must be unique enough in the
 * file to reach the right declaration; extraction stops at the next `;`.
 */
function unionLiteralsFrom(path, anchor) {
  const src = readFileSync(path, "utf8");
  const idx = src.indexOf(anchor);
  assert.notEqual(idx, -1, `anchor not found in ${path}: ${JSON.stringify(anchor)}`);
  const rest = src.slice(idx);
  const stop = rest.indexOf(";");
  const decl = stop === -1 ? rest : rest.slice(0, stop);
  return [...decl.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

test("the mjs observedReach mirror matches the ObservedReach type", () => {
  assert.deepEqual(asSet(OBSERVED_REACH), asSet(unionLiteralsFrom(PHENOMENON_TYPES, "type ObservedReach =")));
});

test("the mjs evidence-stance mirror matches the EvidenceStance type", () => {
  assert.deepEqual(asSet(EVIDENCE_STANCES), asSet(unionLiteralsFrom(PHENOMENON_TYPES, "type EvidenceStance =")));
});

test("the mjs potentialImpact mirror matches the PotentialImpact type", () => {
  assert.deepEqual(asSet(POTENTIAL_IMPACTS), asSet(unionLiteralsFrom(PHENOMENON_TYPES, "type PotentialImpact =")));
});

test("the mjs relations mirror matches RelatedPhenomenon.relation", () => {
  assert.deepEqual(asSet(RELATIONS), asSet(unionLiteralsFrom(PHENOMENON_TYPES, "relation:")));
});

test("the mjs phenomenon-status mirror matches Phenomenon.status", () => {
  assert.deepEqual(asSet(PHENOMENON_STATUSES), asSet(unionLiteralsFrom(PHENOMENON_TYPES, "status:")));
});
