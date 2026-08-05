# Futures Radar — Phase 1: Schema and Validation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the phenomenon data model, the work-dimension vocabulary, and a validator that enforces both — with no UI and no pipeline, verifiable entirely by `npm run build`.

**Architecture:** Phenomena are a new runtime-fetched JSON content type in `public/content/phenomena/`, mirroring how `ai-signals` already works. Because content is never type-checked by `tsc`, validation scripts are the only enforcement, so this phase builds them first and adds a zero-dependency test runner (`node:test`) so the validator's own logic is tested rather than eyeballed. Derivation logic (evidence profile, dates) lives in a shared lib that Phase 2's `radar:derive` will reuse, so there is exactly one implementation.

**Tech Stack:** Node 20+ (CI pins 20; `node:test` built in, no new dependencies), TypeScript 5 strict, Vite 5, ESM `.mjs` scripts.

**Spec:** `docs/superpowers/specs/2026-08-04-futures-radar-design.md`

## Global Constraints

- Branch: `feat-futures-radar`. Per `CLAUDE.md`, the branch must have a `PR_DESCRIPTION_feat-futures-radar.md` at the project root (Task 8).
- `npm run build` must pass (`validate` → `tsc` → `vite build` → `prerender`). `npm run lint` must report **zero** warnings.
- TypeScript strict mode with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- Path alias `@/` maps to `src/`.
- CI runs **Node 20** (`.github/workflows/deploy.yml`). Do not use APIs newer than Node 20.
- **Never** place pipeline working files under `public/` — Vite copies `public/` into `dist`, publishing them. Working files go in `data/`. The existing validator fails the build on any `public/content/ai-signals/_*` file; preserve that behaviour.
- New content fields are additive and optional where the spec says so; the 89 published signals must keep validating unchanged apart from the two enum renames in Task 2.
- Do not add npm dependencies in this phase.
- Content JSON uses 2-space indent and a trailing newline, matching existing files.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `scripts/lib/content.mjs` | **Create.** Read a content index and its item files. Shared by validators and Phase 2 scripts. |
| `scripts/lib/derive.mjs` | **Create.** Compute evidence profile and derived dates from a phenomenon plus a signal lookup. Single source of truth; Phase 2's `radar-derive.mjs` wraps it. |
| `scripts/lib/phenomenon-schema.mjs` | **Create.** Enum constants and required-field lists for phenomena. |
| `scripts/validate-phenomena.mjs` | **Create.** The phenomenon validator. Exits 1 on any problem. |
| `scripts/validate-signals.mjs` | **Modify.** New genre enum values and renamed required-field rules only. |
| `scripts/__tests__/*.test.mjs` | **Create.** `node:test` coverage for the three libs and the validator's rules. |
| `src/types/content.ts` | **Modify.** `SignalType` renames and additions; new type-specific signal fields. |
| `src/types/phenomenon.ts` | **Create.** `Phenomenon` and its supporting types. |
| `src/config/radarDimensions.ts` | **Create.** The nine work dimensions with ids, labels, colours. |
| `src/config/radarActors.ts` | **Create.** The actor vocabulary. |
| `public/content/phenomena/index.json` | **Create.** Content index, same shape as the signals index. |
| `public/content/phenomena/review-shifts-to-verification.json` | **Create.** One worked draft fixture. |
| `package.json` | **Modify.** `test`, `validate`, `validate:phenomena` scripts; `build` calls `validate`. |
| `CLAUDE.md`, `docs/ai-signals-finder-prompt.md` | **Modify.** New genres; phenomenon schema summary. |

Configs live in `src/config/` rather than `src/types/` because they carry runtime values (colours, labels) that components import, not just compile-time types.

---

## Task 1: Test runner and content loader

**Files:**
- Create: `scripts/lib/content.mjs`
- Create: `scripts/__tests__/content.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `readIndex(dir: string) -> { lastUpdated?: string, items: Array<{id, file, date, status}> }` — throws `Error` with a one-line message if unreadable.
  - `readItems(dir, index) -> { items: Array<{ file: string, data: object }>, errors: string[] }` — skips and records unreadable or non-object files.
  - `indexById(items) -> Map<string, object>` — maps each item's `data.id` to its `data`.

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/content.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readIndex, readItems, indexById } from "../lib/content.mjs";

const SIGNALS = "public/content/ai-signals";

test("readIndex returns the parsed index", () => {
  const index = readIndex(SIGNALS);
  assert.ok(Array.isArray(index.items), "index.items should be an array");
  assert.ok(index.items.length > 0, "index should not be empty");
});

test("readIndex throws a one-line message for a missing directory", () => {
  assert.throws(() => readIndex("public/content/does-not-exist"), /could not read/);
});

test("readItems loads every published signal without errors", () => {
  const index = readIndex(SIGNALS);
  const published = { items: index.items.filter((e) => e.status === "published") };
  const { items, errors } = readItems(SIGNALS, published);
  assert.deepEqual(errors, []);
  assert.equal(items.length, published.items.length);
  assert.ok(items[0].data.id, "each loaded item should carry its id");
});

test("indexById maps ids to data", () => {
  const index = readIndex(SIGNALS);
  const { items } = readItems(SIGNALS, index);
  const byId = indexById(items);
  const first = items[0].data;
  assert.equal(byId.get(first.id), first);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/__tests__/`
Expected: FAIL — `Cannot find module '../lib/content.mjs'`

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/content.mjs`:

```js
/**
 * Shared loading for JSON content directories (ai-signals, phenomena).
 *
 * Content is runtime-fetched and never type-checked, so every consumer needs the
 * same defensive reads. Keeping them here means the validators and the Phase 2
 * pipeline scripts agree on what "loaded" means.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, join, basename } from "path";

/** Read <dir>/index.json. Throws with a single-line message the build can print. */
export function readIndex(dir) {
  const file = join(resolve(dir), "index.json");
  try {
    const index = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(index.items)) throw new Error("index.items is not an array");
    return index;
  } catch (e) {
    throw new Error(`could not read ${file}: ${e.message}`);
  }
}

/**
 * Load every file referenced by `index`. Entries whose file is missing, is not
 * valid JSON, or whose root is not an object are reported in `errors` rather than
 * thrown, so one bad file does not hide the rest.
 */
export function readItems(dir, index) {
  const root = resolve(dir);
  const items = [];
  const errors = [];

  for (const entry of index.items || []) {
    if (typeof entry?.file !== "string" || !entry.file) {
      errors.push(`${JSON.stringify(entry)}: index entry has a missing or non-string 'file'`);
      continue;
    }
    // index.json entries may carry a path prefix; only the basename lives in dir.
    const name = basename(entry.file);
    const path = join(root, name);
    if (!existsSync(path)) {
      errors.push(`${name}: referenced by index.json but missing on disk`);
      continue;
    }
    let data;
    try {
      data = JSON.parse(readFileSync(path, "utf8"));
    } catch (e) {
      errors.push(`${name}: invalid JSON: ${e.message}`);
      continue;
    }
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      errors.push(`${name}: root value is not a JSON object`);
      continue;
    }
    items.push({ file: name, data });
  }

  return { items, errors };
}

/** Map each loaded item's `id` to its data. Later duplicates overwrite earlier ones. */
export function indexById(items) {
  const byId = new Map();
  for (const { data } of items) {
    if (typeof data.id === "string" && data.id) byId.set(data.id, data);
  }
  return byId;
}
```

- [ ] **Step 4: Add the test script**

In `package.json`, add to `scripts` (keep existing entries):

```json
"test": "node --test scripts/__tests__/"
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 4 tests, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/content.mjs scripts/__tests__/content.test.mjs package.json
git commit -m "test: add node:test runner and shared content loader"
```

---

## Task 2: Signal genre migration

Renames `weak-signal` → `practitioner-account` and `regulatory` → `regulation-standard`, and adds `market-event`, `forecast`, `primary-research`. Exactly two content files carry an affected value.

**Files:**
- Modify: `src/types/content.ts:27-32` (the `SignalType` union) and the `AISignal` interface
- Modify: `scripts/validate-signals.mjs:21` (`SIGNAL_TYPES`) and `:116-121` (required-field rules)
- Modify: `public/content/ai-signals/2026-08-03-03.json` (`weak-signal`)
- Modify: `public/content/ai-signals/2026-06-29-15.json` (`regulatory`)
- Modify: `docs/ai-signals-finder-prompt.md`
- Modify: `CLAUDE.md`
- Create: `scripts/__tests__/validate-signals.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `SIGNAL_TYPES` exported from `scripts/validate-signals.mjs` as a named export, for reuse by the phenomenon validator in Task 7:
  `export const SIGNAL_TYPES = ["practitioner-account", "field-report", "study", "tool-shift", "regulation-standard", "market-event", "forecast", "primary-research"]`

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/validate-signals.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `validate-signals.mjs` has no export named `SIGNAL_TYPES`.

Note: importing the validator runs it, and it calls `process.exit(1)` on error. That is acceptable here because content is currently valid — but the import side effect is why Step 3 exports the constant rather than the test hard-coding it.

- [ ] **Step 3: Update the validator**

In `scripts/validate-signals.mjs`, replace line 21:

```js
export const SIGNAL_TYPES = [
  "practitioner-account",
  "field-report",
  "study",
  "tool-shift",
  "regulation-standard",
  "market-event",
  "forecast",
  "primary-research",
];
```

Replace the two required-field rules at lines 116-121:

```js
  if (s.signalType === "regulation-standard" && !s.effectiveDate) {
    err(entry.file, "signalType 'regulation-standard' requires effectiveDate");
  }
  if (s.signalType === "practitioner-account" && !s.observer) {
    err(entry.file, "signalType 'practitioner-account' requires observer");
  }
```

Do **not** add required-field rules for the other genres. `CLAUDE.md` states type-specific fields are included only when the source actually states them; a hard requirement would invite invented values.

- [ ] **Step 4: Update the two content files**

```bash
# 2026-08-03-03.json: "weak-signal" -> "practitioner-account"
# 2026-06-29-15.json: "regulatory"  -> "regulation-standard"
```

Edit each file's `signalType` value directly. Confirm nothing else matches:

Run: `grep -rn '"signalType": "weak-signal"\|"signalType": "regulatory"' public/content/ai-signals/`
Expected: no output.

- [ ] **Step 5: Update the TypeScript types**

In `src/types/content.ts`, replace the `SignalType` union:

```ts
/** Evidence genre. Determines which provenance fields apply. */
export type SignalType =
  | "practitioner-account"
  | "field-report"
  | "study"
  | "tool-shift"
  | "regulation-standard"
  | "market-event"
  | "forecast"
  | "primary-research";

/** How first-party research was gathered. Applies to `primary-research`. */
export type PrimaryResearchMethod = "interview" | "workshop" | "other";
```

In the `AISignal` interface, replace the `// --- regulatory ---` block and append the new genre fields:

```ts
  // --- regulation-standard ---
  /** YYYY-MM-DD when the obligation takes effect. */
  effectiveDate?: string;
  jurisdiction?: string;
  /** The authority publishing the norm, e.g. "EU", "OWASP". */
  issuer?: string;

  // --- market-event ---
  organisation?: string;
  /** Free text, e.g. "30,000 roles", "$50B". */
  magnitude?: string;

  // --- forecast ---
  forecaster?: string;
  /** The year or date the prediction is about. */
  horizonDate?: string;

  // --- primary-research ---
  method?: PrimaryResearchMethod;
  participants?: string;
```

`fieldworkPeriod` already exists on the interface and is reused by `primary-research`; do not redeclare it.

- [ ] **Step 6: Run tests, validator and build**

Run: `npm test && npm run signals:validate && npm run build`
Expected: tests PASS; `validate: OK — 89 signals valid`; build succeeds.

- [ ] **Step 7: Update the finder prompt and CLAUDE.md**

In `docs/ai-signals-finder-prompt.md`, replace the five signal types with the eight
above. For each, copy the one-line definition and the type-specific field list from
the *Genre rename and additions* table in
`docs/superpowers/specs/2026-08-04-futures-radar-design.md` — that table is the
source of truth, so restating it here would create two versions to keep in step.
Add these two rules verbatim:

> A **forecast** is a prediction, not an observation. Emit it only when the prediction itself is the news, and never as evidence that something is already happening.
>
> **primary-research** covers this project's own interviews and workshops. Set `method` to `interview`, `workshop` or `other`.

In `CLAUDE.md`, under *Content Schema*, update the `signalType` bullet to the eight values and add the new optional fields to the type-specific list.

- [ ] **Step 8: Commit**

```bash
git add src/types/content.ts scripts/validate-signals.mjs scripts/__tests__/validate-signals.test.mjs \
        public/content/ai-signals/2026-08-03-03.json public/content/ai-signals/2026-06-29-15.json \
        docs/ai-signals-finder-prompt.md CLAUDE.md
git commit -m "feat: eight evidence genres, renaming weak-signal and regulatory"
```

---

## Task 3: Work-dimension and actor configs

**Files:**
- Create: `src/config/radarDimensions.ts`
- Create: `src/config/radarActors.ts`
- Create: `scripts/__tests__/config.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `WORK_DIMENSIONS: readonly WorkDimension[]` where `WorkDimension = { id: WorkDimensionId; label: string; colour: string }`
  - `WorkDimensionId` — union of the nine ids
  - `RADAR_ACTORS: readonly ActorId[]`, `ActorId` — union of the seven actor ids
  - Both id lists are re-exported to the scripts as plain arrays in Task 6 via `scripts/lib/phenomenon-schema.mjs`. The scripts do **not** import the `.ts` files.

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/config.test.mjs`. The scripts cannot import TypeScript, so this test asserts the `.ts` source and the `.mjs` mirror stay in step by parsing ids out of the source text — cheap, and it catches the drift that would otherwise only surface at runtime.

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `ENOENT: no such file or directory, open 'src/config/radarDimensions.ts'`

- [ ] **Step 3: Write the dimension config**

Create `src/config/radarDimensions.ts`:

```ts
/**
 * The one taxonomy the radar uses. A phenomenon's `primaryDimension` places it in
 * a sector; every dimension named by an implication becomes a filter tag.
 *
 * Sector angles are computed as 360/N from this array's length, so adding or
 * removing a dimension needs no component changes.
 *
 * Colours are consumed as SVG `fill`/`stroke` attribute values, never as Tailwind
 * class names — per CLAUDE.md, dynamic class interpolation would not survive
 * Tailwind's static extraction, but SVG attributes are unaffected.
 */

export type WorkDimensionId =
  | "nature-and-division-of-work"
  | "human-ai-collaboration-and-agency"
  | "organisation-and-coordination"
  | "leadership-governance-and-performance"
  | "skills-knowledge-and-learning"
  | "careers-occupations-and-labour-markets"
  | "worker-experience-identity-and-wellbeing"
  | "economics-productivity-and-value"
  | "ethics-responsibility-and-society";

export interface WorkDimension {
  id: WorkDimensionId;
  label: string;
  colour: string;
}

export const WORK_DIMENSIONS: readonly WorkDimension[] = [
  { id: "nature-and-division-of-work", label: "Nature & division of work", colour: "#0EA5E9" },
  { id: "human-ai-collaboration-and-agency", label: "Human–AI collaboration & agency", colour: "#22d3ee" },
  { id: "organisation-and-coordination", label: "Organisation & coordination", colour: "#4ade80" },
  { id: "leadership-governance-and-performance", label: "Leadership, governance & performance", colour: "#a3e635" },
  { id: "skills-knowledge-and-learning", label: "Skills, knowledge & learning", colour: "#a855f7" },
  { id: "careers-occupations-and-labour-markets", label: "Careers, occupations & labour markets", colour: "#f472b6" },
  { id: "worker-experience-identity-and-wellbeing", label: "Worker experience, identity & wellbeing", colour: "#fb7185" },
  { id: "economics-productivity-and-value", label: "Economics, productivity & value distribution", colour: "#F59E0B" },
  { id: "ethics-responsibility-and-society", label: "Ethics, responsibility & society", colour: "#94a3b8" },
] as const;
```

- [ ] **Step 4: Write the actor config**

Create `src/config/radarActors.ts`:

```ts
/** Who an implication lands on. Optional per implication; a first pass, expected
 *  to be revised once the project's own interview material arrives. */

export type ActorId =
  | "developer"
  | "reviewer"
  | "technical-lead"
  | "engineering-manager"
  | "executive"
  | "new-entrant"
  | "organisation";

export interface RadarActor {
  id: ActorId;
  label: string;
}

export const RADAR_ACTORS: readonly RadarActor[] = [
  { id: "developer", label: "Developer" },
  { id: "reviewer", label: "Reviewer" },
  { id: "technical-lead", label: "Technical lead" },
  { id: "engineering-manager", label: "Engineering manager" },
  { id: "executive", label: "Executive" },
  { id: "new-entrant", label: "New entrant" },
  { id: "organisation", label: "Organisation" },
] as const;
```

- [ ] **Step 5: Run tests and build**

Run: `npm test && npm run build && npm run lint`
Expected: tests PASS; build succeeds; lint reports zero warnings.

If `tsc` reports the configs as unused, that is expected — they are consumed in Task 4 onward. `noUnusedLocals` applies within a file, not across modules, so exported constants do not trigger it.

- [ ] **Step 6: Commit**

```bash
git add src/config/radarDimensions.ts src/config/radarActors.ts scripts/__tests__/config.test.mjs
git commit -m "feat: add work-dimension and actor vocabularies"
```

---

## Task 4: Phenomenon TypeScript types

**Files:**
- Create: `src/types/phenomenon.ts`
- Modify: `src/types/content.ts` (extend `DrawerContent`)

**Interfaces:**
- Consumes: `WorkDimensionId` from `@/config/radarDimensions`, `ActorId` from `@/config/radarActors`.
- Produces: `Phenomenon`, `PhenomenonIndexEntry`, `ObservedReach`, `EvidenceStance`, `PhenomenonEvidence`, `Implication`, `DevelopmentPath`, `RelatedPhenomenon`, `EvidenceProfile`, `ReachHistoryEntry`, `PotentialImpact`.

- [ ] **Step 1: Write the type file**

Create `src/types/phenomenon.ts`:

```ts
import type { WorkDimensionId } from "@/config/radarDimensions";
import type { ActorId } from "@/config/radarActors";

/** Ring placement: how far the change has spread beyond forerunners.
 *  Human judgment, never computed. */
export type ObservedReach = "early-manifestations" | "gaining-traction" | "field-level-shift";

/** How a piece of evidence relates to the transformation the phenomenon claims. */
export type EvidenceStance = "supports" | "counter" | "contextual";

export type PotentialImpact = "low" | "moderate" | "high" | "transformative";

export interface PhenomenonEvidence {
  /** The `id` of an AISignal. */
  signalId: string;
  stance: EvidenceStance;
  /** false when this item is commentary on another source rather than its own
   *  observation. Only primary items count toward independentContexts. */
  primary: boolean;
  /** Why this item was attached, in a few words. */
  note?: string;
}

export interface Implication {
  dimension: WorkDimensionId;
  /** One sentence, concrete enough to disagree with. */
  statement: string;
  actors?: ActorId[];
  /** Empty means the implication holds across all development paths. */
  pathIds?: string[];
}

export interface DevelopmentPath {
  id: string;
  title: string;
  description: string;
}

export interface RelatedPhenomenon {
  id: string;
  relation: "reinforces" | "constrains" | "depends-on";
}

/** Descriptive statistics over supporting evidence. Derived; never hand-edited. */
export interface EvidenceProfile {
  independentContexts: number;
  evidenceTypes: number;
  quartersSpanned: number;
  counterEvidence: boolean;
}

export interface ReachHistoryEntry {
  edition: string;
  observedReach: ObservedReach;
  rationale: string;
}

export interface Phenomenon {
  id: string;
  /** 2–4 words. The radar blip label. */
  label: string;
  /** The headline, written to make a reader want the description. */
  title: string;
  /** The forward-looking transformation claim, stated so it could be wrong. */
  thesis: string;
  /** The observable present-day pressure driving the transformation. */
  currentPressure?: string;
  status: "published" | "draft" | "retired";

  primaryDimension: WorkDimensionId;
  potentialImpact?: PotentialImpact;
  implications: Implication[];

  evidence: PhenomenonEvidence[];

  observedReach: ObservedReach;
  reachRationale: string;
  reachReviewedAt: string;
  evidenceProfile?: EvidenceProfile;

  contested?: boolean;
  contestedNote?: string | null;

  firstObserved?: string;
  latestEvidenceDate?: string;
  lastReviewed?: string;

  reachHistory?: ReachHistoryEntry[];
  whatWouldChangeThis?: string[];
  developmentPaths?: DevelopmentPath[];
  related?: RelatedPhenomenon[];
  /** Reference ids only; the indicator layer is not built. */
  indicators?: string[];

  retiredAt?: string;
  retiredReason?: string;
}

export interface PhenomenonIndexEntry {
  id: string;
  file: string;
  date: string;
  status: "published" | "draft" | "retired";
}
```

- [ ] **Step 2: Extend the drawer union**

In `src/types/content.ts`, add the import at the top and extend `DrawerContent` at the bottom:

```ts
import type { Phenomenon } from "@/types/phenomenon";
```

```ts
export type DrawerContent =
  | { type: "signal"; data: AISignal }
  | { type: "insight"; data: ExpertInsight }
  | { type: "phenomenon"; data: Phenomenon };
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build && npm run lint`
Expected: build succeeds; zero lint warnings.

- [ ] **Step 4: Commit**

```bash
git add src/types/phenomenon.ts src/types/content.ts
git commit -m "feat: add the Phenomenon content type"
```

---

## Task 5: Derivation library

The single implementation of the evidence profile and derived dates. Phase 2's `radar-derive.mjs` wraps this; the validator in Task 7 uses it to detect hand-edited derived values.

**Files:**
- Create: `scripts/lib/derive.mjs`
- Create: `scripts/__tests__/derive.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `quarterOf(date: string) -> string` — `"2026-03-15"` → `"2026-Q1"`
  - `deriveEvidenceProfile(phenomenon, signalsById) -> EvidenceProfile`
  - `deriveDates(phenomenon, signalsById) -> { firstObserved: string | null, latestEvidenceDate: string | null }`

**Rules, from the spec:**
- `independentContexts` — `supports` **and** `primary: true`, excluding `forecast`; `field-report` items sharing a non-empty `sponsor` collapse to one.
- `evidenceTypes` — distinct `signalType` over the same set as `independentContexts`.
- `quartersSpanned` — distinct quarters over **all** `supports` evidence excluding `forecast` (no `primary` requirement).
- `counterEvidence` — any `counter` evidence with `primary: true`.
- Dates use the signal's `date` field and span **all** evidence regardless of stance, because `firstObserved` answers "when did we first see anything here".

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/derive.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { quarterOf, deriveEvidenceProfile, deriveDates } from "../lib/derive.mjs";

const signals = new Map([
  ["s-tool",    { id: "s-tool",    date: "2026-03-09", signalType: "tool-shift" }],
  ["s-cf",      { id: "s-cf",      date: "2026-04-20", signalType: "field-report", sponsor: "Cloudflare" }],
  ["s-vendor1", { id: "s-vendor1", date: "2026-05-01", signalType: "field-report", sponsor: "Acme" }],
  ["s-vendor2", { id: "s-vendor2", date: "2026-05-02", signalType: "field-report", sponsor: "Acme" }],
  ["s-forecast",{ id: "s-forecast",date: "2026-05-03", signalType: "forecast" }],
  ["s-study",   { id: "s-study",   date: "2026-04-03", signalType: "study" }],
  ["s-context", { id: "s-context", date: "2026-01-29", signalType: "field-report", sponsor: "Opsera" }],
]);

const ev = (signalId, stance, primary = true) => ({ signalId, stance, primary });

test("quarterOf maps a date to its calendar quarter", () => {
  assert.equal(quarterOf("2026-01-29"), "2026-Q1");
  assert.equal(quarterOf("2026-03-31"), "2026-Q1");
  assert.equal(quarterOf("2026-04-01"), "2026-Q2");
  assert.equal(quarterOf("2026-12-31"), "2026-Q4");
});

test("independentContexts counts supporting primary sources", () => {
  const p = { evidence: [ev("s-tool", "supports"), ev("s-cf", "supports")] };
  assert.equal(deriveEvidenceProfile(p, signals).independentContexts, 2);
});

test("field reports sharing a sponsor collapse to one context", () => {
  const p = { evidence: [ev("s-vendor1", "supports"), ev("s-vendor2", "supports")] };
  const profile = deriveEvidenceProfile(p, signals);
  assert.equal(profile.independentContexts, 1);
  assert.equal(profile.evidenceTypes, 1);
});

test("forecasts never count as evidence", () => {
  const p = { evidence: [ev("s-tool", "supports"), ev("s-forecast", "supports")] };
  const profile = deriveEvidenceProfile(p, signals);
  assert.equal(profile.independentContexts, 1);
  assert.equal(profile.evidenceTypes, 1);
});

test("commentary does not add an independent context but does add a quarter", () => {
  const p = {
    evidence: [ev("s-tool", "supports"), ev("s-study", "supports", false)],
  };
  const profile = deriveEvidenceProfile(p, signals);
  assert.equal(profile.independentContexts, 1);
  assert.equal(profile.quartersSpanned, 2, "2026-Q1 and 2026-Q2");
});

test("contextual evidence is excluded from the profile entirely", () => {
  const p = { evidence: [ev("s-tool", "supports"), ev("s-context", "contextual")] };
  const profile = deriveEvidenceProfile(p, signals);
  assert.equal(profile.independentContexts, 1);
  assert.equal(profile.quartersSpanned, 1);
});

test("counterEvidence is true only for primary counter items", () => {
  const withCounter = { evidence: [ev("s-tool", "supports"), ev("s-study", "counter")] };
  const withCommentary = { evidence: [ev("s-tool", "supports"), ev("s-study", "counter", false)] };
  assert.equal(deriveEvidenceProfile(withCounter, signals).counterEvidence, true);
  assert.equal(deriveEvidenceProfile(withCommentary, signals).counterEvidence, false);
});

test("an unresolvable signalId is ignored rather than crashing", () => {
  const p = { evidence: [ev("s-tool", "supports"), ev("missing", "supports")] };
  assert.equal(deriveEvidenceProfile(p, signals).independentContexts, 1);
});

test("deriveDates spans all evidence regardless of stance", () => {
  const p = {
    evidence: [ev("s-tool", "supports"), ev("s-context", "contextual"), ev("s-cf", "supports")],
  };
  assert.deepEqual(deriveDates(p, signals), {
    firstObserved: "2026-01-29",
    latestEvidenceDate: "2026-04-20",
  });
});

test("deriveDates returns nulls when nothing resolves", () => {
  assert.deepEqual(deriveDates({ evidence: [] }, signals), {
    firstObserved: null,
    latestEvidenceDate: null,
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/derive.mjs'`

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/derive.mjs`:

```js
/**
 * Derived values for a phenomenon.
 *
 * These are descriptive statistics, not a score: nothing here decides where a blip
 * sits. `observedReach` is a human judgment and no function in this file may
 * influence it.
 *
 * Counting rules follow the spec's *Evidence profile* section. The two that matter:
 * a forecast is a prediction, not an observation, so it never counts; and several
 * field reports from one sponsor are one interested party, not several.
 */

/** "2026-03-15" -> "2026-Q1". Returns null for anything unparseable. */
export function quarterOf(date) {
  if (typeof date !== "string") return null;
  const m = /^(\d{4})-(\d{2})/.exec(date);
  if (!m) return null;
  return `${m[1]}-Q${Math.floor((Number(m[2]) - 1) / 3) + 1}`;
}

const resolve = (evidence, signalsById) =>
  (evidence || [])
    .map((e) => ({ e, s: signalsById.get(e.signalId) }))
    .filter(({ s }) => s !== undefined);

export function deriveEvidenceProfile(phenomenon, signalsById) {
  const scoring = resolve(phenomenon.evidence, signalsById).filter(
    ({ e, s }) => e.stance === "supports" && s.signalType !== "forecast"
  );

  // A sponsor names an interested party. Several reports from one sponsor are one
  // context; anything else is counted per signal.
  const contexts = new Set();
  const types = new Set();
  for (const { e, s } of scoring) {
    if (!e.primary) continue;
    contexts.add(
      s.signalType === "field-report" && s.sponsor ? `sponsor:${s.sponsor}` : `signal:${s.id}`
    );
    if (s.signalType) types.add(s.signalType);
  }

  const quarters = new Set();
  for (const { s } of scoring) {
    const q = quarterOf(s.date);
    if (q) quarters.add(q);
  }

  const counterEvidence = resolve(phenomenon.evidence, signalsById).some(
    ({ e }) => e.stance === "counter" && e.primary
  );

  return {
    independentContexts: contexts.size,
    evidenceTypes: types.size,
    quartersSpanned: quarters.size,
    counterEvidence,
  };
}

/** Earliest and latest evidence dates, over evidence of every stance. */
export function deriveDates(phenomenon, signalsById) {
  const dates = resolve(phenomenon.evidence, signalsById)
    .map(({ s }) => s.date)
    .filter((d) => typeof d === "string" && d)
    .sort();
  return {
    firstObserved: dates[0] ?? null,
    latestEvidenceDate: dates[dates.length - 1] ?? null,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all derive tests green.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/derive.mjs scripts/__tests__/derive.test.mjs
git commit -m "feat: derive evidence profile and dates from phenomenon evidence"
```

---

## Task 6: Phenomenon validator — structure and editorial rules

Spec validation rules 1–4, 7–9, 11. Cross-references and derived values follow in Task 7.

**Files:**
- Create: `scripts/lib/phenomenon-schema.mjs`
- Create: `scripts/validate-phenomena.mjs`
- Create: `scripts/__tests__/validate-phenomena.test.mjs`
- Create: `public/content/phenomena/index.json` (empty — the validator needs somewhere to read)

**Interfaces:**
- Consumes: `readIndex`, `readItems`, `indexById` from `./lib/content.mjs`.
- Produces:
  - `OBSERVED_REACH`, `EVIDENCE_STANCES`, `POTENTIAL_IMPACTS`, `RELATIONS`, `WORK_DIMENSION_IDS`, `ACTOR_IDS`, `PHENOMENON_STATUSES` from `scripts/lib/phenomenon-schema.mjs`
  - `validatePhenomenon(data, ctx) -> string[]` from `scripts/validate-phenomena.mjs`, where `ctx = { signalsById: Map, phenomenonIds: Set<string> }`. Returns one message per problem; empty means valid.

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/validate-phenomena.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validatePhenomenon } from "../validate-phenomena.mjs";

const signals = new Map([
  ["s-a", { id: "s-a", date: "2026-03-09", signalType: "tool-shift", status: "published" }],
  ["s-b", { id: "s-b", date: "2026-04-20", signalType: "field-report", status: "published" }],
]);
const ctx = { signalsById: signals, phenomenonIds: new Set(["other-phenomenon"]) };

/** A minimal phenomenon that passes every rule. Tests mutate a copy. */
const valid = () => ({
  id: "p",
  label: "Review becomes verification",
  title: "From reading code to verifying evidence",
  thesis: "Assurance shifts from inspecting code towards verifying evidence.",
  status: "published",
  primaryDimension: "nature-and-division-of-work",
  implications: [
    { dimension: "nature-and-division-of-work", statement: "Reviewing shifts to judging evidence." },
    { dimension: "skills-knowledge-and-learning", statement: "Specifying acceptance criteria matters more." },
  ],
  evidence: [
    { signalId: "s-a", stance: "supports", primary: true },
    { signalId: "s-b", stance: "contextual", primary: true },
  ],
  observedReach: "gaining-traction",
  reachRationale: "Running in production at several unrelated organisations.",
  reachReviewedAt: "2026-08-05",
});

const withOut = (key) => { const p = valid(); delete p[key]; return p; };

test("a well-formed phenomenon has no errors", () => {
  assert.deepEqual(validatePhenomenon(valid(), ctx), []);
});

test("observedReach must be one of the three values", () => {
  const p = { ...valid(), observedReach: "established" };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /observedReach/);
});

test("reachRationale must be present and non-empty", () => {
  assert.match(validatePhenomenon(withOut("reachRationale"), ctx).join("\n"), /reachRationale/);
  const blank = { ...valid(), reachRationale: "   " };
  assert.match(validatePhenomenon(blank, ctx).join("\n"), /reachRationale/);
});

test("reachReviewedAt must be present", () => {
  assert.match(validatePhenomenon(withOut("reachReviewedAt"), ctx).join("\n"), /reachReviewedAt/);
});

test("label must be four words or fewer", () => {
  const p = { ...valid(), label: "Review slowly becomes a verification activity" };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /label/);
});

test("title and thesis must both exist and differ", () => {
  const same = { ...valid(), thesis: valid().title };
  assert.match(validatePhenomenon(same, ctx).join("\n"), /distinct/);
});

test("a published phenomenon needs at least two implications", () => {
  const p = { ...valid(), implications: [valid().implications[0]] };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /at least two implications/);
});

test("primaryDimension must appear among the implications", () => {
  const p = { ...valid(), primaryDimension: "ethics-responsibility-and-society" };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /primaryDimension/);
});

test("a published phenomenon needs at least one supporting evidence item", () => {
  const p = { ...valid() };
  p.evidence = [{ signalId: "s-b", stance: "contextual", primary: true }];
  assert.match(validatePhenomenon(p, ctx).join("\n"), /at least one 'supports'/);
});

test("draft phenomena are exempt from the editorial minimums", () => {
  const p = { ...valid(), status: "draft", implications: [valid().implications[0]] };
  const errors = validatePhenomenon(p, ctx).join("\n");
  assert.ok(!/at least two implications/.test(errors), errors);
});

test("contestedNote is required when contested is true", () => {
  const p = { ...valid(), contested: true };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /contestedNote/);
});

test("unknown dimensions, stances and actors are rejected", () => {
  const badDim = { ...valid() };
  badDim.implications = [{ dimension: "made-up", statement: "x" }, valid().implications[1]];
  assert.match(validatePhenomenon(badDim, ctx).join("\n"), /dimension/);

  const badStance = { ...valid() };
  badStance.evidence = [{ signalId: "s-a", stance: "maybe", primary: true }];
  assert.match(validatePhenomenon(badStance, ctx).join("\n"), /stance/);

  const badActor = { ...valid() };
  badActor.implications = [{ ...valid().implications[0], actors: ["intern"] }, valid().implications[1]];
  assert.match(validatePhenomenon(badActor, ctx).join("\n"), /actors/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../validate-phenomena.mjs'`

- [ ] **Step 3: Write the schema constants**

Create `scripts/lib/phenomenon-schema.mjs`:

```js
/**
 * Enum values for phenomena.
 *
 * These mirror src/config/radarDimensions.ts and src/config/radarActors.ts, which
 * the scripts cannot import because they are TypeScript. scripts/__tests__/config.test.mjs
 * asserts the two stay in step.
 */

export const OBSERVED_REACH = ["early-manifestations", "gaining-traction", "field-level-shift"];
export const EVIDENCE_STANCES = ["supports", "counter", "contextual"];
export const POTENTIAL_IMPACTS = ["low", "moderate", "high", "transformative"];
export const RELATIONS = ["reinforces", "constrains", "depends-on"];
export const PHENOMENON_STATUSES = ["published", "draft", "retired"];

export const WORK_DIMENSION_IDS = [
  "nature-and-division-of-work",
  "human-ai-collaboration-and-agency",
  "organisation-and-coordination",
  "leadership-governance-and-performance",
  "skills-knowledge-and-learning",
  "careers-occupations-and-labour-markets",
  "worker-experience-identity-and-wellbeing",
  "economics-productivity-and-value",
  "ethics-responsibility-and-society",
];

export const ACTOR_IDS = [
  "developer",
  "reviewer",
  "technical-lead",
  "engineering-manager",
  "executive",
  "new-entrant",
  "organisation",
];

export const REQUIRED_FIELDS = [
  "id",
  "label",
  "title",
  "thesis",
  "status",
  "primaryDimension",
  "implications",
  "evidence",
  "observedReach",
  "reachRationale",
  "reachReviewedAt",
];
```

- [ ] **Step 4: Extend the config test to assert the mirror**

Append to `scripts/__tests__/config.test.mjs`:

```js
import { WORK_DIMENSION_IDS, ACTOR_IDS } from "../lib/phenomenon-schema.mjs";

test("the mjs dimension mirror matches the ts config", () => {
  assert.deepEqual(WORK_DIMENSION_IDS, idsFrom("src/config/radarDimensions.ts"));
});

test("the mjs actor mirror matches the ts config", () => {
  assert.deepEqual(ACTOR_IDS, idsFrom("src/config/radarActors.ts"));
});
```

- [ ] **Step 5: Write the validator**

Create `scripts/validate-phenomena.mjs`:

```js
#!/usr/bin/env node
/**
 * Validates every phenomenon referenced by public/content/phenomena/index.json.
 *
 * Phenomena are runtime-fetched and never type-checked, so this script is the only
 * enforcement of their schema. It checks *form, not judgment*: it verifies that a
 * reach call carries a rationale and a review date, never whether the call is right.
 * That question belongs to review.
 *
 *   node scripts/validate-phenomena.mjs
 *
 * Exits 1 if any phenomenon is invalid.
 */

import { readIndex, readItems, indexById } from "./lib/content.mjs";
import {
  OBSERVED_REACH,
  EVIDENCE_STANCES,
  POTENTIAL_IMPACTS,
  RELATIONS,
  PHENOMENON_STATUSES,
  WORK_DIMENSION_IDS,
  ACTOR_IDS,
  REQUIRED_FIELDS,
} from "./lib/phenomenon-schema.mjs";

const PHENOMENA_DIR = "public/content/phenomena";
const SIGNALS_DIR = "public/content/ai-signals";

const isBlank = (v) => typeof v !== "string" || v.trim() === "";

/**
 * @param {object} p        the phenomenon
 * @param {{signalsById: Map, phenomenonIds: Set<string>}} ctx
 * @returns {string[]} one message per problem
 */
export function validatePhenomenon(p, ctx) {
  const errors = [];
  const e = (msg) => errors.push(msg);
  const published = p.status === "published";

  for (const field of REQUIRED_FIELDS) {
    if (p[field] == null || p[field] === "") e(`missing required field '${field}'`);
  }

  if (!PHENOMENON_STATUSES.includes(p.status)) {
    e(`status ${JSON.stringify(p.status)} must be one of ${PHENOMENON_STATUSES.join(" | ")}`);
  }
  if (p.observedReach !== undefined && !OBSERVED_REACH.includes(p.observedReach)) {
    e(`observedReach ${JSON.stringify(p.observedReach)} is not one of ${OBSERVED_REACH.join(" | ")}`);
  }
  if (p.potentialImpact !== undefined && !POTENTIAL_IMPACTS.includes(p.potentialImpact)) {
    e(`potentialImpact ${JSON.stringify(p.potentialImpact)} is not one of ${POTENTIAL_IMPACTS.join(" | ")}`);
  }
  if (p.primaryDimension !== undefined && !WORK_DIMENSION_IDS.includes(p.primaryDimension)) {
    e(`primaryDimension ${JSON.stringify(p.primaryDimension)} is not a known work dimension`);
  }

  // A ring position without a stated reason is unreviewable.
  if (isBlank(p.reachRationale)) e("reachRationale must be present and non-empty");
  if (isBlank(p.reachReviewedAt)) e("reachReviewedAt must be present");

  // The label sits beside a dot on the radar; anything longer does not fit.
  if (typeof p.label === "string" && p.label.trim().split(/\s+/).length > 4) {
    e(`label has ${p.label.trim().split(/\s+/).length} words (max 4)`);
  }
  if (!isBlank(p.title) && !isBlank(p.thesis) && p.title.trim() === p.thesis.trim()) {
    e("title and thesis must be distinct");
  }

  const implications = Array.isArray(p.implications) ? p.implications : [];
  if (!Array.isArray(p.implications)) e("'implications' must be an array");
  implications.forEach((im, i) => {
    if (!WORK_DIMENSION_IDS.includes(im?.dimension)) {
      e(`implications[${i}].dimension ${JSON.stringify(im?.dimension)} is not a known work dimension`);
    }
    if (isBlank(im?.statement)) e(`implications[${i}].statement must be a non-empty string`);
    for (const a of im?.actors || []) {
      if (!ACTOR_IDS.includes(a)) e(`implications[${i}].actors contains unknown actor ${JSON.stringify(a)}`);
    }
  });

  const evidence = Array.isArray(p.evidence) ? p.evidence : [];
  if (!Array.isArray(p.evidence)) e("'evidence' must be an array");
  evidence.forEach((ev, i) => {
    if (!EVIDENCE_STANCES.includes(ev?.stance)) {
      e(`evidence[${i}].stance ${JSON.stringify(ev?.stance)} is not one of ${EVIDENCE_STANCES.join(" | ")}`);
    }
    if (typeof ev?.primary !== "boolean") e(`evidence[${i}].primary must be true or false`);
  });

  for (const r of p.related || []) {
    if (!RELATIONS.includes(r?.relation)) {
      e(`related relation ${JSON.stringify(r?.relation)} is not one of ${RELATIONS.join(" | ")}`);
    }
  }

  if (p.contested === true && isBlank(p.contestedNote)) {
    e("contestedNote is required when contested is true");
  }

  // Editorial minimums apply to published phenomena only — drafts are work in
  // progress and are visible in preview builds precisely so they can be unfinished.
  if (published) {
    if (implications.length < 2) {
      e("a published phenomenon needs at least two implications — one that says nothing about software work does not belong on this radar");
    }
    if (p.primaryDimension && !implications.some((im) => im?.dimension === p.primaryDimension)) {
      e("primaryDimension must also appear as an implication dimension");
    }
    if (!evidence.some((ev) => ev?.stance === "supports")) {
      e("a published phenomenon needs at least one 'supports' evidence item — with only contextual evidence this is a diagnosis of the present, not a transformation");
    }
  }

  return errors;
}

// --- CLI ---------------------------------------------------------------------

function main() {
  let phenomenaIndex;
  try {
    phenomenaIndex = readIndex(PHENOMENA_DIR);
  } catch (err) {
    console.error(`validate-phenomena: ${err.message}`);
    process.exit(1);
  }

  const signalsIndex = readIndex(SIGNALS_DIR);
  const { items: signalItems } = readItems(SIGNALS_DIR, signalsIndex);
  const signalsById = indexById(signalItems);

  const { items, errors: loadErrors } = readItems(PHENOMENA_DIR, phenomenaIndex);
  const phenomenonIds = new Set(items.map(({ data }) => data.id));
  const problems = [...loadErrors];

  for (const { file, data } of items) {
    for (const msg of validatePhenomenon(data, { signalsById, phenomenonIds })) {
      problems.push(`${file}: ${msg}`);
    }
  }

  if (problems.length) {
    console.error(`validate-phenomena: ${problems.length} problem(s) found\n`);
    problems.forEach((p) => console.error("  " + p));
    process.exit(1);
  }
  console.log(`validate-phenomena: OK — ${items.length} phenomena valid`);
}

// Only run the CLI when invoked directly, so importing this module for tests is safe.
if (process.argv[1] && process.argv[1].endsWith("validate-phenomena.mjs")) main();
```

- [ ] **Step 6: Create the empty content directory**

The CLI needs an index to read. Create `public/content/phenomena/index.json`:

```json
{
  "lastUpdated": "2026-08-05",
  "items": []
}
```

Task 8 adds the fixture entry.

- [ ] **Step 7: Run the tests and the CLI**

Run: `npm test`
Expected: PASS — all `validate-phenomena` and `config` tests green.

Run: `node scripts/validate-phenomena.mjs`
Expected: `validate-phenomena: OK — 0 phenomena valid`

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/phenomenon-schema.mjs scripts/validate-phenomena.mjs \
        scripts/__tests__/validate-phenomena.test.mjs scripts/__tests__/config.test.mjs \
        public/content/phenomena/index.json
git commit -m "feat: validate phenomenon structure and editorial minimums"
```

---

## Task 7: Phenomenon validator — cross-references and derived values

Spec validation rules 5, 6, 10 and 13. This is what makes a dangling evidence reference fail the build.

**Files:**
- Modify: `scripts/validate-phenomena.mjs`
- Modify: `scripts/__tests__/validate-phenomena.test.mjs`

**Interfaces:**
- Consumes: `deriveEvidenceProfile`, `deriveDates` from `./lib/derive.mjs`; `validatePhenomenon(data, ctx)` from Task 6.
- Produces: no new exports; `validatePhenomenon` gains rules.

- [ ] **Step 1: Write the failing test**

Append to `scripts/__tests__/validate-phenomena.test.mjs`:

```js
test("a dangling evidence signalId is an error", () => {
  const p = valid();
  p.evidence = [{ signalId: "does-not-exist", stance: "supports", primary: true }];
  assert.match(validatePhenomenon(p, ctx).join("\n"), /does-not-exist/);
});

test("evidence must reference a published signal", () => {
  const draftSignals = new Map(signals);
  draftSignals.set("s-draft", { id: "s-draft", date: "2026-05-01", signalType: "study", status: "draft" });
  const p = valid();
  p.evidence = [{ signalId: "s-draft", stance: "supports", primary: true }];
  const errors = validatePhenomenon(p, { ...ctx, signalsById: draftSignals }).join("\n");
  assert.match(errors, /not published/);
});

test("a stored evidenceProfile must match what the evidence derives", () => {
  const p = { ...valid(), evidenceProfile: { independentContexts: 9, evidenceTypes: 9, quartersSpanned: 9, counterEvidence: true } };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /evidenceProfile/);
});

test("a correct evidenceProfile passes", () => {
  const p = { ...valid(), evidenceProfile: { independentContexts: 1, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false } };
  assert.deepEqual(validatePhenomenon(p, ctx), []);
});

test("stored dates must match the evidence", () => {
  const p = { ...valid(), firstObserved: "2020-01-01", latestEvidenceDate: "2020-01-01" };
  const errors = validatePhenomenon(p, ctx).join("\n");
  assert.match(errors, /firstObserved/);
  assert.match(errors, /latestEvidenceDate/);
});

test("pathIds must resolve to a declared development path", () => {
  const p = valid();
  p.developmentPaths = [{ id: "real-path", title: "Real", description: "…" }];
  p.implications[0].pathIds = ["ghost-path"];
  assert.match(validatePhenomenon(p, ctx).join("\n"), /ghost-path/);
});

test("related ids must resolve to a known phenomenon", () => {
  const p = { ...valid(), related: [{ id: "no-such-phenomenon", relation: "reinforces" }] };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /no-such-phenomenon/);
});

test("a reach change without a history entry is an error", () => {
  const p = {
    ...valid(),
    observedReach: "field-level-shift",
    reachHistory: [{ edition: "2026-Q1", observedReach: "early-manifestations", rationale: "…" }],
  };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /reachHistory/);
});

test("reach matching the latest history entry is fine", () => {
  const p = {
    ...valid(),
    reachHistory: [
      { edition: "2026-Q1", observedReach: "early-manifestations", rationale: "…" },
      { edition: "2026-Q3", observedReach: "gaining-traction", rationale: "…" },
    ],
  };
  assert.deepEqual(validatePhenomenon(p, ctx), []);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — the new assertions find no matching messages.

- [ ] **Step 3: Add the rules**

In `scripts/validate-phenomena.mjs`, add the import:

```js
import { deriveEvidenceProfile, deriveDates } from "./lib/derive.mjs";
```

Inside `validatePhenomenon`, immediately after the `evidence.forEach(...)` block, add:

```js
  // A dangling reference is the most likely error here and the least visible on the
  // page — the blip simply renders with less evidence than it claims.
  evidence.forEach((ev, i) => {
    const signal = ctx.signalsById.get(ev?.signalId);
    if (!signal) {
      e(`evidence[${i}].signalId ${JSON.stringify(ev?.signalId)} does not resolve to a known signal`);
    } else if (signal.status !== "published") {
      e(`evidence[${i}].signalId ${JSON.stringify(ev?.signalId)} refers to a signal that is not published`);
    }
  });

  const pathIds = new Set((p.developmentPaths || []).map((d) => d?.id));
  implications.forEach((im, i) => {
    for (const pid of im?.pathIds || []) {
      if (!pathIds.has(pid)) e(`implications[${i}].pathIds contains ${JSON.stringify(pid)}, which is not a declared developmentPath`);
    }
  });

  for (const r of p.related || []) {
    if (r?.id && !ctx.phenomenonIds.has(r.id)) {
      e(`related id ${JSON.stringify(r.id)} does not resolve to a known phenomenon`);
    }
  }
```

Then, before the `if (published)` block, add the derived-value checks:

```js
  // Derived values are written by the pipeline. A mismatch means someone hand-edited
  // them, which would make the drawer's evidence sentence describe a corpus that
  // does not exist.
  const derivedProfile = deriveEvidenceProfile(p, ctx.signalsById);
  if (p.evidenceProfile) {
    for (const key of ["independentContexts", "evidenceTypes", "quartersSpanned", "counterEvidence"]) {
      if (p.evidenceProfile[key] !== derivedProfile[key]) {
        e(`evidenceProfile.${key} is ${JSON.stringify(p.evidenceProfile[key])} but derives to ${JSON.stringify(derivedProfile[key])}`);
      }
    }
  }

  const derivedDates = deriveDates(p, ctx.signalsById);
  if (p.firstObserved && p.firstObserved !== derivedDates.firstObserved) {
    e(`firstObserved is ${p.firstObserved} but derives to ${derivedDates.firstObserved}`);
  }
  if (p.latestEvidenceDate && p.latestEvidenceDate !== derivedDates.latestEvidenceDate) {
    e(`latestEvidenceDate is ${p.latestEvidenceDate} but derives to ${derivedDates.latestEvidenceDate}`);
  }

  // Ring movement must always be auditable after the fact.
  const history = p.reachHistory || [];
  if (history.length > 0) {
    const last = history[history.length - 1];
    if (last?.observedReach !== p.observedReach) {
      e(`observedReach is '${p.observedReach}' but the latest reachHistory entry records '${last?.observedReach}' — every reach change needs a history entry`);
    }
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests green.

- [ ] **Step 5: Add the directory-level checks**

`readItems` catches files that the index names but that are missing. The reverse —
a file on disk that no index entry names — is invisible to the site, and a working
file under `public/` would be published on the live site. The signals validator
already guards both; phenomena need the same.

In `main()`, after the per-phenomenon loop, add:

```js
  for (const { file, data } of items) {
    if (data.id && `${data.id}.json` !== file) {
      problems.push(`${file}: id '${data.id}' does not match the filename`);
    }
  }

  for (const file of readdirSync(resolve(PHENOMENA_DIR))) {
    // Vite copies public/ into dist, so a pipeline working file left here would be
    // published on the live site. Fail the build rather than deploy it.
    if (file.startsWith("_")) {
      problems.push(`${file}: pipeline working file found under public/ — move it to data/`);
      continue;
    }
    if (file === "index.json" || file === "editions.json" || !file.endsWith(".json")) continue;
    if (!items.some((it) => it.file === file)) {
      problems.push(`${file}: exists on disk but is not listed in index.json (invisible to the site)`);
    }
  }
```

Add the imports this needs at the top of the file:

```js
import { readdirSync } from "fs";
import { resolve } from "path";
```

- [ ] **Step 6: Add the coverage report to the CLI**

Replace the success line in `main()`:

```js
  const publishedSignals = signalItems.filter(({ data }) => data.status === "published").length;
  const covered = new Set();
  for (const { data } of items) {
    for (const ev of data.evidence || []) covered.add(ev.signalId);
  }
  const publishedCount = items.filter(({ data }) => data.status === "published").length;
  const gate = publishedCount >= 10 ? "OPEN" : `closed (${10 - publishedCount} more needed)`;

  console.log(
    `validate-phenomena: OK — ${items.length} phenomena valid ` +
      `(${publishedCount} published, launch gate ${gate})\n` +
      `  coverage: ${covered.size} of ${publishedSignals} published signals map to a phenomenon`
  );
```

Uncovered signals are expected and are not an error; the number is printed so drift is visible.

- [ ] **Step 7: Verify the directory checks fire**

Create an unindexed file, confirm the failure, then delete it:

```bash
echo '{}' > public/content/phenomena/stray.json
node scripts/validate-phenomena.mjs   # expect: FAIL, "stray.json: exists on disk but is not listed"
rm public/content/phenomena/stray.json
node scripts/validate-phenomena.mjs   # expect: OK
```

At this point `public/content/phenomena/` contains only `index.json`, so the index has
an empty `items` array and the run reports zero phenomena. That is expected until
Task 8.

- [ ] **Step 8: Commit**

```bash
git add scripts/validate-phenomena.mjs scripts/__tests__/validate-phenomena.test.mjs
git commit -m "feat: validate phenomenon cross-references and derived values"
```

---

## Task 8: Content directory, worked fixture, and build wiring

Proves the validator end to end against a real file, and puts it in the build. The fixture references six real signals from the review cluster and types them, which is exactly what the spec says the bootstrap pass does.

**Files:**
- Modify: `public/content/phenomena/index.json` (created empty in Task 6)
- Create: `public/content/phenomena/review-shifts-to-verification.json`
- Modify: six signal files (add `signalType` and, where stated by the source, `sponsor`)
- Modify: `package.json`
- Create: `PR_DESCRIPTION_feat-futures-radar.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything from Tasks 1–7.
- Produces: `npm run validate` runs both validators; `npm run build` runs `validate` first.

- [ ] **Step 1: Type the six evidence signals**

Add `signalType` to each of these existing files. Add `sponsor` only where the publishing organisation is stated in the file's `source`.

| File id | `signalType` | Extra |
| --- | --- | --- |
| `2026-03-16-04` — Anthropic launches multi-agent Code Review | `tool-shift` | `"availability": "GA"` |
| `2026-05-06-11` — Cloudflare deploys across 5,169 repositories | `field-report` | `"sponsor": "Cloudflare"` |
| `2026-03-16-05` — Opsera benchmark | `field-report` | `"sponsor": "Opsera"` |
| `2026-05-25-03` — LinearB 2026 benchmarks | `field-report` | `"sponsor": "LinearB"` |
| `2026-05-20-04` — Code review time up 91% | `practitioner-account` | `"observer": "DevEssence, synthesising Faros AI and Atlas data"` |
| `2026-06-22-06` — Code review agents without humans | `study` | — |

Find each file by id:

Run: `grep -l '"id": "2026-03-16-04"' public/content/ai-signals/*.json`

`practitioner-account` requires `observer` — the validator from Task 2 enforces it, which is why `2026-05-20-04` gets one.

- [ ] **Step 2: Verify the signals still validate**

Run: `npm run signals:validate`
Expected: `validate: OK — 89 signals valid`

- [ ] **Step 3: Add the fixture to the phenomena index**

Replace the empty `items` array in `public/content/phenomena/index.json`:

```json
{
  "lastUpdated": "2026-08-05",
  "items": [
    {
      "id": "review-shifts-to-verification",
      "file": "review-shifts-to-verification.json",
      "date": "2026-08-05",
      "status": "draft"
    }
  ]
}
```

`status` is `draft`: this is a schema fixture, not a published research claim. The launch gate keeps the radar hidden until ten phenomena are published regardless.

- [ ] **Step 4: Create the fixture phenomenon**

Create `public/content/phenomena/review-shifts-to-verification.json`:

```json
{
  "id": "review-shifts-to-verification",
  "label": "Review becomes verification",
  "title": "From reading code to verifying evidence",
  "thesis": "As AI-generated changes exceed the capacity for line-by-line human review, software assurance shifts from inspecting code towards verifying intended behaviour, test evidence, security properties and architectural constraints. Automated systems take over routine checking, while human attention concentrates on intent, high-risk decisions, exceptions and accountability.",
  "currentPressure": "Generation capacity is growing faster than review capacity, producing longer queues and lower acceptance rates for AI-authored changes.",
  "status": "draft",

  "primaryDimension": "nature-and-division-of-work",
  "potentialImpact": "high",

  "implications": [
    {
      "dimension": "nature-and-division-of-work",
      "statement": "Reviewing shifts from reading diffs to judging whether the evidence accompanying a change is sufficient.",
      "actors": ["developer", "reviewer", "technical-lead"],
      "pathIds": []
    },
    {
      "dimension": "skills-knowledge-and-learning",
      "statement": "Specifying acceptance criteria and interpreting verification output become more valuable than close reading of code.",
      "actors": ["developer", "new-entrant"],
      "pathIds": ["verification-first-assurance"]
    },
    {
      "dimension": "leadership-governance-and-performance",
      "statement": "Accountability for defects moves from the author of a change toward whoever accepted the evidence for it.",
      "actors": ["technical-lead", "engineering-manager"],
      "pathIds": []
    }
  ],

  "evidence": [
    { "signalId": "2026-03-16-05", "stance": "contextual", "primary": true, "note": "4.6x longer review waits — establishes the pressure, not the shift" },
    { "signalId": "2026-05-25-03", "stance": "contextual", "primary": true, "note": "AI PRs accepted 32.7% vs 84.4% — pressure only" },
    { "signalId": "2026-05-20-04", "stance": "contextual", "primary": false, "note": "synthesis of other reports on review time" },
    { "signalId": "2026-03-16-04", "stance": "supports", "primary": true, "note": "routine checking automated ahead of humans" },
    { "signalId": "2026-05-06-11", "stance": "supports", "primary": true, "note": "gating 5,169 repositories, 131,000 reviews" },
    { "signalId": "2026-06-22-06", "stance": "counter", "primary": true, "note": "review agents without humans: 45% vs 68% merge rate, most feedback noise" }
  ],

  "observedReach": "gaining-traction",
  "reachRationale": "Automated first-pass review is running in production at several unrelated organisations and tooling vendors are building for it, but assurance practice outside those forerunners is still diff-centric.",
  "reachReviewedAt": "2026-08-05",

  "evidenceProfile": {
    "independentContexts": 2,
    "evidenceTypes": 2,
    "quartersSpanned": 2,
    "counterEvidence": true
  },

  "contested": false,
  "contestedNote": null,

  "firstObserved": "2026-01-29",
  "latestEvidenceDate": "2026-05-25",

  "whatWouldChangeThis": [
    "Review practice stays diff-centric through 2027 despite sustained volume growth",
    "Automated reviewers are rolled back after escaped-defect rates rise"
  ],

  "developmentPaths": [
    { "id": "verification-first-assurance", "title": "Verification-first assurance", "description": "Machine-generated evidence and behavioural checks displace most routine line-by-line review." },
    { "id": "ai-reviews-ai", "title": "AI reviews AI", "description": "Reviewing is delegated to separate models, with humans supervising exceptions." },
    { "id": "persistent-review-wall", "title": "The review wall persists", "description": "Output continues to exceed validation capacity, producing queues, fatigue and escaped defects." },
    { "id": "risk-tiered-review", "title": "Risk-tiered review", "description": "Routine changes verified automatically; critical paths receive intensified human scrutiny." }
  ],

  "related": [],
  "indicators": []
}
```

- [ ] **Step 5: Run the validator against the real fixture**

Run: `node scripts/validate-phenomena.mjs`
Expected: `validate-phenomena: OK — 1 phenomena valid (0 published, launch gate closed (10 more needed))` plus a coverage line.

If `evidenceProfile` or the dates mismatch, the validator prints the derived values — **use those**. They are computed from the real signal dates and are authoritative; the numbers above are the expected result but the signal files are the source of truth.

- [ ] **Step 6: Prove the validator actually catches a bad file**

Temporarily break the fixture — change `observedReach` to `"established"` and blank `reachRationale`:

Run: `node scripts/validate-phenomena.mjs`
Expected: FAIL, exit 1, with two messages naming `observedReach` and `reachRationale`.

Revert both changes and re-run to confirm it passes again. Do not commit the broken state.

- [ ] **Step 7: Wire into the build**

In `package.json`, update `scripts`:

```json
"validate": "node scripts/validate-signals.mjs && node scripts/validate-phenomena.mjs",
"validate:phenomena": "node scripts/validate-phenomena.mjs",
"build": "npm run validate && tsc && vite build && node scripts/prerender.mjs"
```

Keep `signals:validate` as it is — the pipeline docs reference it.

- [ ] **Step 8: Run the full build**

Run: `npm test && npm run build && npm run lint`
Expected: tests PASS; both validators report OK; build succeeds; zero lint warnings.

- [ ] **Step 9: Document the new content type**

In `CLAUDE.md`, under *Content Schema*, add a **Phenomenon** section listing: the required fields from `REQUIRED_FIELDS`, the three `observedReach` values, the three `stance` values, the nine work dimensions, and this rule verbatim:

> `observedReach` is a human judgment and must never be set by a script. `evidenceProfile`, `firstObserved` and `latestEvidenceDate` are derived and must never be hand-edited — the validator fails the build on either.

Under *Verification*, note that `npm run validate` runs both validators and `npm test` runs the script unit tests.

- [ ] **Step 10: Write the PR description**

Create `PR_DESCRIPTION_feat-futures-radar.md` at the project root, per `CLAUDE.md`. Cover: what Phase 1 delivers (schema, configs, validators, test runner), what it deliberately does not (no UI, no pipeline, no published phenomena), the two signal enum renames and the six newly typed signals, and a link to the spec. Note that the radar is invisible on the site until ten phenomena are published.

- [ ] **Step 11: Commit**

```bash
git add public/content/phenomena/ public/content/ai-signals/ package.json CLAUDE.md PR_DESCRIPTION_feat-futures-radar.md
git commit -m "feat: add the phenomena content type with a worked fixture"
```

---

## Phase 1 Done When

- `npm test` passes — content loader, derivation, config mirror and validator rules all covered.
- `npm run build` passes and runs both validators first.
- `npm run lint` reports zero warnings.
- `node scripts/validate-phenomena.mjs` reports the fixture valid, the launch gate closed, and signal coverage.
- Breaking a field in the fixture fails the build with a message naming that field.
- The site renders exactly as before — nothing in this phase is visible to a visitor.

## What Phase 1 Deliberately Does Not Do

No radar components, no drawer changes, no pipeline scripts, no preview deployment, and no published phenomena. Those are Phases 2–4, each of which gets its own plan written once this one lands:

- **Phase 2 — Bootstrap pipeline:** `radar:prepare`, `radar:apply`, `radar:accept`, `radar:derive`, `docs/radar-clustering-prompt.md`, the machine-owned/human-owned field manifest, and the first reviewed batch of phenomena.
- **Phase 3 — Radar UI:** `src/components/Radar/*`, the drawer stack, `?phenomenon=<id>` deep links, site placement, the launch gate.
- **Phase 4 — Preview deployment:** `VITE_RADAR_PREVIEW`, `deploy-preview.yml`, `clean-exclude: preview`, `noindex` on preview builds.

One spec validation rule is deliberately absent from this phase: **rule 12**, that
`radar:apply` touched no human-owned field on a pre-existing phenomenon. It checks a
manifest that `radar:apply` writes, and neither exists until Phase 2. It is listed in
that phase's plan.
