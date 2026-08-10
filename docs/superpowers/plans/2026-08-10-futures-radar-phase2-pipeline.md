# Futures Radar Phase 2 — Bootstrap Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pipeline that turns published AI signals into reviewed phenomena, so the radar can pass its ten-published launch gate.

**Architecture:** Five Node scripts around one shared ownership library. `radar:prepare` digests uncovered signals; an LLM pass proposes clusters; `radar:apply` is the only writer of machine-owned fields; `radar:derive` computes facts; `radar:accept` and `radar:reject` are the two human outcomes. Every script takes an injectable `root` and returns an `errors` array rather than throwing, matching `scripts/promote-signals.mjs`.

**Tech Stack:** Node 20+ ESM (`.mjs`), `node --test`, no new dependencies.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-07-radar-phase2-pipeline-design.md`. Where this plan and the spec disagree, stop and ask.
- **`observedReach` is human-only.** No script may compute, suggest, or write a ring value. `possibleReachChange` carries no ring.
- **`data/` is never published; `public/` is.** No pipeline working file goes under `public/`.
- **Every script:** `export function name({ root = process.cwd() } = {})`, returns `{ ..., errors: [] }`, and a `main()` guarded by `if (process.argv[1] && process.argv[1].endsWith("<file>.mjs")) main();`
- **JSON writes:** `JSON.stringify(value, null, 2) + "\n"`, utf8.
- **Batch semantics:** all-or-nothing. A non-empty `errors` means nothing was written.
- **Tests:** `node --test`, isolated trees via `mkdtempSync`, never touch real content.
- **Baseline:** 94 tests passing, `npm run lint` clean. Both must hold after every task.
- **Commit after every task.** Run `npm test && npm run lint` before each commit.
- **No unused imports.** `npm run lint` runs with `--max-warnings 0`; trim the import list to what each file actually uses, in tests as well as sources.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `scripts/lib/radar-fields.mjs` | The machine/human field split; `mergeMachineFields()` |
| `scripts/radar-prepare.mjs` | Build the digest of uncovered signals |
| `scripts/radar-derive.mjs` | Recompute derived values; raise `possibleReachChange` |
| `scripts/radar-apply.mjs` | Apply a proposal: attach, detach, create |
| `scripts/radar-accept.mjs` | Publish reviewed drafts |
| `scripts/radar-reject.mjs` | Decline a draft, record it, release its signals |
| `docs/radar-clustering-prompt.md` | The clustering pass |
| `docs/radar-reach-review-prompt.md` | The reach conversation |

Modified: `src/types/phenomenon.ts`, `scripts/lib/phenomenon-schema.mjs`, `scripts/validate-phenomena.mjs`, `package.json`, `.gitignore`.

---

### Task 1: Field ownership library

**Files:**
- Create: `scripts/lib/radar-fields.mjs`
- Create: `scripts/__tests__/radar-fields.test.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `MACHINE_OWNED: string[]`, `HUMAN_OWNED: string[]`, `mergeMachineFields(existing, updates) -> object`

Note: the spec's ownership table is illustrative and does not name every field. The mirror test forces a decision on all of them. `reachHistory` is **human-owned** here — `radar:snapshot` is out of scope, and its entries record human judgments.

- [ ] **Step 1: Add the gitignore rule first**

Append to `.gitignore`, after the existing `data/signal-drafts/` block:

```
# Radar pipeline working files. Same rule as the finder artifacts above: data/ is
# never published, and this repo is public — a proposal is unreviewed research
# claims, and the reach log records how a reviewer judged them.
data/_radar-*
```

- [ ] **Step 2: Write the failing test**

Create `scripts/__tests__/radar-fields.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { MACHINE_OWNED, HUMAN_OWNED, mergeMachineFields } from "../lib/radar-fields.mjs";

/** Property names declared on the Phenomenon interface. */
function phenomenonKeys() {
  const src = readFileSync("src/types/phenomenon.ts", "utf8");
  const body = /export interface Phenomenon \{([\s\S]*?)\n\}/.exec(src);
  assert.ok(body, "could not find the Phenomenon interface");
  return [...body[1].matchAll(/^ {2}(\w+)\??:/gm)].map((m) => m[1]);
}

test("every Phenomenon key is classified exactly once", () => {
  const keys = phenomenonKeys();
  assert.ok(keys.length > 10, `expected a populated interface, got ${keys.length} keys`);
  for (const key of keys) {
    const inMachine = MACHINE_OWNED.includes(key);
    const inHuman = HUMAN_OWNED.includes(key);
    assert.ok(inMachine || inHuman, `'${key}' is classified in neither list`);
    assert.ok(!(inMachine && inHuman), `'${key}' is classified in both lists`);
  }
});

test("the lists name no field that is not on the interface", () => {
  const keys = new Set(phenomenonKeys());
  for (const key of [...MACHINE_OWNED, ...HUMAN_OWNED]) {
    assert.ok(keys.has(key), `'${key}' is classified but not on the Phenomenon interface`);
  }
});

test("mergeMachineFields copies machine-owned updates", () => {
  const existing = { id: "a", thesis: "original", evidence: [] };
  const merged = mergeMachineFields(existing, { evidence: [{ signalId: "s1" }] });
  assert.deepEqual(merged.evidence, [{ signalId: "s1" }]);
});

test("mergeMachineFields cannot write a human-owned field", () => {
  const existing = { id: "a", thesis: "original", observedReach: "early-manifestations" };
  const merged = mergeMachineFields(existing, {
    thesis: "rewritten by a script",
    observedReach: "field-level-shift",
    construct: "redefined",
  });
  assert.equal(merged.thesis, "original");
  assert.equal(merged.observedReach, "early-manifestations");
  assert.equal(merged.construct, undefined);
});

test("mergeMachineFields does not mutate the original", () => {
  const existing = { id: "a", evidence: [] };
  mergeMachineFields(existing, { evidence: [{ signalId: "s1" }] });
  assert.deepEqual(existing.evidence, []);
});
```

- [ ] **Step 3: Run it and verify it fails**

Run: `node --test scripts/__tests__/radar-fields.test.mjs`
Expected: FAIL — cannot find module `../lib/radar-fields.mjs`.

- [ ] **Step 4: Write the implementation**

Create `scripts/lib/radar-fields.mjs`:

```js
/**
 * Which fields of a phenomenon a script may write.
 *
 * Once a phenomenon exists, its wording is research output. A routine run
 * attaching one signal must not be able to rewrite a thesis that took an hour to
 * get right — so `mergeMachineFields` is the only write path onto an existing
 * phenomenon, and touching a human-owned field is not forbidden but unreachable.
 *
 * scripts/__tests__/radar-fields.test.mjs asserts every key of the Phenomenon
 * interface appears in exactly one list. That test is the guard: it fails the day
 * someone adds a field and forgets to classify it.
 */

/** Derived facts. A script computes these; nobody hand-edits them. */
export const MACHINE_OWNED = [
  "evidence",
  "evidenceProfile",
  "firstObserved",
  "latestEvidenceDate",
  "possibleReachChange",
];

/**
 * Research output and human judgment.
 *
 * `observedReach` is the most important entry: it is the whole radar's meaning,
 * and nothing automatic may move it. `construct` is here because it defines what
 * counts as evidence — a script that could rewrite it could redefine the claim.
 * `reachHistory` is here because its entries record judgments; radar:snapshot is
 * out of scope for Phase 2.
 */
export const HUMAN_OWNED = [
  "id",
  "label",
  "title",
  "thesis",
  "construct",
  "currentPressure",
  "status",
  "primaryDimension",
  "potentialImpact",
  "implications",
  "observedReach",
  "reachRationale",
  "reachReviewedAt",
  "contested",
  "contestedNote",
  "lastReviewed",
  "reachHistory",
  "whatWouldChangeThis",
  "developmentPaths",
  "related",
  "indicators",
  "retiredAt",
  "retiredReason",
];

/**
 * Copy `existing`, applying only machine-owned keys from `updates`.
 * The single write path onto a phenomenon that already exists.
 */
export function mergeMachineFields(existing, updates = {}) {
  const out = { ...existing };
  for (const key of MACHINE_OWNED) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) out[key] = updates[key];
  }
  return out;
}
```

- [ ] **Step 5: Run the tests**

Run: `node --test scripts/__tests__/radar-fields.test.mjs`
Expected: PASS, 5 tests. If "classified in neither list" fails, the interface has a key the lists are missing — add it to the correct list rather than loosening the test.

- [ ] **Step 6: Full suite and lint**

Run: `npm test && npm run lint`
Expected: 99 tests passing, lint clean.

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/radar-fields.mjs scripts/__tests__/radar-fields.test.mjs .gitignore
git commit -m "feat: add the radar machine/human field split"
```

---

### Task 2: Schema — `construct` and `possibleReachChange`

**Files:**
- Modify: `src/types/phenomenon.ts`
- Modify: `scripts/lib/phenomenon-schema.mjs:35-47`
- Modify: `scripts/validate-phenomena.mjs`
- Modify: `scripts/__tests__/validate-phenomena.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `PossibleReachChange` type; `REQUIRED_FIELDS` without `reachReviewedAt`; validator rules for `construct` and `possibleReachChange`.

`reachReviewedAt` leaves the unconditional required list and becomes published-only, because its absence is how the pipeline records "no human has judged reach yet". `construct` gets the same treatment.

- [ ] **Step 1a: Update the existing fixture first, or you will break passing tests**

`scripts/__tests__/validate-phenomena.test.mjs` defines `valid()` (a **published** phenomenon that passes every rule), `withOut(key)`, and `ctx` as a **plain object, not a function**. Match those names exactly.

`valid()` has no `construct`, so the moment the published-only rule lands, the existing test `"a well-formed phenomenon has no errors"` fails. Add the field to the fixture, after `thesis`:

```js
  construct: "whether assurance work inspects code or verifies evidence",
```

Then replace the existing test at line 49, which asserts the old unconditional rule:

```js
test("reachReviewedAt must be present", () => {
  assert.match(validatePhenomenon(withOut("reachReviewedAt"), ctx).join("\n"), /reachReviewedAt/);
```

with the status-dependent pair in Step 1b. `valid()` is published, so `withOut("reachReviewedAt")` still errors — but now for the published-only reason, and a draft must not.

- [ ] **Step 1b: Write the failing tests**

Append to the same file:

```js
test("a draft may omit reachReviewedAt — nobody has judged its reach yet", () => {
  const p = { ...withOut("reachReviewedAt"), status: "draft" };
  assert.deepEqual(validatePhenomenon(p, ctx), []);
});

test("a published phenomenon may not omit reachReviewedAt", () => {
  const errors = validatePhenomenon(withOut("reachReviewedAt"), ctx);
  assert.ok(
    errors.some((e) => e.includes("reachReviewedAt")),
    `expected a reachReviewedAt error, got: ${errors.join("; ")}`,
  );
});

test("a draft may omit construct", () => {
  const p = { ...withOut("construct"), status: "draft" };
  assert.deepEqual(validatePhenomenon(p, ctx), []);
});

test("a published phenomenon may not omit construct", () => {
  const errors = validatePhenomenon(withOut("construct"), ctx);
  assert.ok(
    errors.some((e) => e.includes("construct")),
    `expected a construct error, got: ${errors.join("; ")}`,
  );
});

test("possibleReachChange needs a reason, a date and signal ids", () => {
  const p = { ...valid(), possibleReachChange: { reason: "", raisedAt: "2026-08-10", signalIds: [] } };
  const errors = validatePhenomenon(p, ctx);
  assert.ok(errors.some((e) => e.includes("possibleReachChange.reason")));
  assert.ok(errors.some((e) => e.includes("possibleReachChange.signalIds")));
});

test("possibleReachChange may be null", () => {
  assert.deepEqual(validatePhenomenon({ ...valid(), possibleReachChange: null }, ctx), []);
});

test("possibleReachChange may name no ring", () => {
  const p = {
    ...valid(),
    possibleReachChange: {
      reason: "gained 2 independent context(s) since reach was last reviewed (1 -> 3)",
      raisedAt: "2026-08-10",
      signalIds: ["s-a"],
      suggested: "gaining-traction",
    },
  };
  assert.ok(
    validatePhenomenon(p, ctx).some((e) => e.includes("suggested")),
    "a suggested ring must be rejected — reach is a human judgment",
  );
});
```

Note `{ ...withOut("x"), status: "draft" }` keeps the two implications and the typed `supports` evidence `valid()` already carries, so a draft case cannot fail for an unrelated reason.

- [ ] **Step 2: Run and verify they fail**

Run: `node --test scripts/__tests__/validate-phenomena.test.mjs`
Expected: FAIL — drafts currently error on the missing `reachReviewedAt`, and no `construct` or `possibleReachChange` rules exist.

- [ ] **Step 3: Add the types**

In `src/types/phenomenon.ts`, add above `export interface Phenomenon`:

```ts
/** A candidate for reach review. Carries no ring: reach is a human judgment. */
export interface PossibleReachChange {
  /** What prompted it, naming the direction — contexts gained or lost. */
  reason: string;
  raisedAt: string;
  signalIds: string[];
}
```

Inside `interface Phenomenon`, add `construct` immediately after `thesis`:

```ts
  /** What must be measured for a source to count as evidence here. A source is
   *  evidence for a claim only if it measured the thing the claim is about.
   *  Required on published phenomena. */
  construct?: string;
```

and `possibleReachChange` immediately after `evidenceProfile`:

```ts
  possibleReachChange?: PossibleReachChange | null;
```

- [ ] **Step 4: Relax REQUIRED_FIELDS**

In `scripts/lib/phenomenon-schema.mjs`, delete the `"reachReviewedAt",` line from `REQUIRED_FIELDS` and add above the array:

```js
/**
 * Required on every phenomenon at any status.
 *
 * `reachReviewedAt` and `construct` are deliberately absent: both record a human
 * act, and requiring them on a draft would only produce a fabricated value. Both
 * are enforced on published phenomena in validate-phenomena.mjs.
 */
```

- [ ] **Step 5: Add the validator rules**

In `scripts/validate-phenomena.mjs`, replace the two unconditional reach checks (currently around lines 62-64):

```js
  // A ring position without a stated reason is unreviewable.
  if (isBlank(p.reachRationale)) e("reachRationale must be present and non-empty");
  if (isBlank(p.reachReviewedAt)) e("reachReviewedAt must be present");
```

with:

```js
  // A ring position without a stated reason is unreviewable at any status.
  if (isBlank(p.reachRationale)) e("reachRationale must be present and non-empty");

  // reachReviewedAt records when a human last judged reach, and construct records
  // what a source must measure to count here. A draft that has neither has simply
  // not been reviewed yet; a published one must have been.
  if (published && isBlank(p.reachReviewedAt)) {
    e("a published phenomenon needs reachReviewedAt — the date a human judged its reach");
  }
  if (published && isBlank(p.construct)) {
    e("a published phenomenon needs construct — what a source must measure to be evidence here");
  }

  // Derived, and never a ring: nothing automatic may propose where a blip sits.
  if (p.possibleReachChange != null) {
    const prc = p.possibleReachChange;
    if (typeof prc !== "object" || Array.isArray(prc)) {
      e("possibleReachChange must be an object or null");
    } else {
      if (isBlank(prc.reason)) e("possibleReachChange.reason must be a non-empty string");
      if (isBlank(prc.raisedAt)) e("possibleReachChange.raisedAt must be present");
      if (!Array.isArray(prc.signalIds) || prc.signalIds.length === 0) {
        e("possibleReachChange.signalIds must be a non-empty array");
      }
      if ("suggested" in prc) {
        e("possibleReachChange must not carry 'suggested' — reach is a human judgment");
      }
    }
  }
```

- [ ] **Step 6: Run the tests**

Run: `node --test scripts/__tests__/validate-phenomena.test.mjs`
Expected: PASS.

- [ ] **Step 7: Confirm real content still validates**

Run: `npm run validate`
Expected: `6 phenomena valid`. The six existing drafts all carry `reachReviewedAt` and none carries `construct`, and both are now optional for drafts — so this must stay green.

- [ ] **Step 8: Typecheck, full suite, lint**

Run: `npx tsc --noEmit && npm test && npm run lint`
Expected: all clean.

- [ ] **Step 9: Commit**

```bash
git add src/types/phenomenon.ts scripts/lib/phenomenon-schema.mjs scripts/validate-phenomena.mjs scripts/__tests__/validate-phenomena.test.mjs
git commit -m "feat: add construct and possibleReachChange to the phenomenon schema"
```

---

### Task 3: `radar:prepare`

**Files:**
- Create: `scripts/radar-prepare.mjs`
- Create: `scripts/__tests__/radar-prepare.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `readIndex`, `readItems`, `indexById` from `scripts/lib/content.mjs`.
- Produces: `prepare({ root, all, since, out }) -> { digest, coverage, undecided, errors }` where `digest` is `{ generatedAt, phenomena: [], signals: [], rejectedClusters: [] }`.

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/radar-prepare.test.mjs`:

```js
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
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test scripts/__tests__/radar-prepare.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `scripts/radar-prepare.mjs`:

```js
#!/usr/bin/env node
/**
 * Build the digest the clustering prompt reads.
 *
 * Selects published signals that no phenomenon cites. "Uncovered" rather than a
 * date window because draft staging decoupled a signal's date from when it was
 * published: a signal can sit in data/signal-drafts/accepted/ for weeks, so its
 * date predates the last run's cutoff and a date filter skips it silently.
 *
 * The per-dimension coverage table is printed for the reviewer and deliberately
 * kept OUT of the digest. Two sectors have no phenomenon, and handing a model a
 * gap it is told not to fill is not a control — primaryDimension is a property of
 * what a phenomenon claims, not of what is missing.
 *
 *   node scripts/radar-prepare.mjs [--all] [--since YYYY-MM-DD] [--out FILE]
 */

import { writeFileSync, existsSync, readFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { readIndex, readItems } from "./lib/content.mjs";
import { WORK_DIMENSION_IDS } from "./lib/phenomenon-schema.mjs";

const SIGNALS_DIR = "public/content/ai-signals";
const PHENOMENA_DIR = "public/content/phenomena";
const REJECTED_FILE = "data/_radar-rejected.jsonl";
const DEFAULT_OUT = "data/_radar-input.json";

/** Fields the model needs to judge a signal. Deliberately not the whole record. */
const digestSignal = (s) => ({
  id: s.id,
  title: s.title,
  summary: s.summary,
  source: s.source,
  date: s.date,
  category: s.category,
  tags: s.tags,
  signalType: s.signalType,
  signalStrength: s.signalStrength,
  signalStage: s.signalStage,
  whyItMatters: s.whyItMatters,
});

/** Enough to attach to a phenomenon or avoid re-proposing it — not its evidence. */
const digestPhenomenon = (p) => ({
  id: p.id,
  label: p.label,
  title: p.title,
  thesis: p.thesis,
  construct: p.construct,
  primaryDimension: p.primaryDimension,
  status: p.status,
  citedSignalIds: (p.evidence || []).map((e) => e.signalId),
});

function readRejected(root) {
  const file = resolve(root, REJECTED_FILE);
  if (!existsSync(file)) return [];
  const out = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const text = line.trim();
    if (!text) continue;
    try {
      out.push(JSON.parse(text));
    } catch {
      console.warn(`  ! skipping malformed line in ${REJECTED_FILE}`);
    }
  }
  return out;
}

export function prepare({ root = process.cwd(), all = false, since = null, out = null } = {}) {
  const errors = [];
  let signalItems = [];
  let phenomenonItems = [];

  try {
    const dir = resolve(root, SIGNALS_DIR);
    signalItems = readItems(dir, readIndex(dir)).items;
  } catch (e) {
    errors.push(e.message);
  }
  try {
    const dir = resolve(root, PHENOMENA_DIR);
    phenomenonItems = readItems(dir, readIndex(dir)).items;
  } catch (e) {
    errors.push(e.message);
  }
  if (errors.length) return { digest: null, coverage: {}, undecided: 0, errors };

  const phenomena = phenomenonItems.map(({ data }) => data);

  // Covered means cited by ANY phenomenon, drafts included: a draft still under
  // consideration owns its evidence. radar:reject releases it.
  const covered = new Set();
  for (const p of phenomena) {
    for (const ev of p.evidence || []) covered.add(ev.signalId);
  }

  const signals = signalItems
    .map(({ data }) => data)
    .filter((s) => s.status === "published")
    .filter((s) => all || !covered.has(s.id))
    .filter((s) => !since || (typeof s.date === "string" && s.date >= since))
    .map(digestSignal);

  const coverage = Object.fromEntries(WORK_DIMENSION_IDS.map((id) => [id, 0]));
  for (const p of phenomena) {
    if (p.primaryDimension in coverage) coverage[p.primaryDimension] += 1;
  }

  const digest = {
    generatedAt: new Date().toISOString().slice(0, 10),
    phenomena: phenomena.map(digestPhenomenon),
    signals,
    rejectedClusters: readRejected(root),
  };

  const undecided = phenomena.filter((p) => p.status === "draft").length;

  if (out) {
    const path = resolve(root, out);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(digest, null, 2) + "\n", "utf8");
  }

  return { digest, coverage, undecided, errors: [] };
}

function flag(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
}

function main() {
  const out = flag("--out", DEFAULT_OUT);
  const result = prepare({
    all: process.argv.includes("--all"),
    since: flag("--since"),
    out,
  });

  if (result.errors.length) {
    console.error(`radar:prepare: ${result.errors.length} problem(s)\n`);
    result.errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }

  const n = result.digest.signals.length;
  console.log(
    n === 0
      ? "radar:prepare: nothing to cluster — every published signal is already cited"
      : `radar:prepare: ${n} uncovered signal(s) -> ${out}`,
  );
  console.log("\n  phenomena per dimension (for you, not for the model):");
  for (const [id, count] of Object.entries(result.coverage)) {
    console.log(`    ${count === 0 ? "!" : " "} ${String(count).padStart(2)}  ${id}`);
  }
  if (result.undecided) {
    console.log(`\n  ${result.undecided} draft phenomena awaiting accept or reject`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("radar-prepare.mjs")) main();
```

- [ ] **Step 4: Run the tests**

Run: `node --test scripts/__tests__/radar-prepare.test.mjs`
Expected: PASS, 12 tests.

- [ ] **Step 5: Wire the npm script**

In `package.json`, after `"validate:phenomena"`, add:

```json
    "radar:prepare": "node scripts/radar-prepare.mjs",
```

- [ ] **Step 6: Run it against real content**

Run: `npm run radar:prepare`
Expected: `65 uncovered signal(s) -> data/_radar-input.json`, then the coverage table with `!` on the two empty dimensions. Confirm `git status` shows `data/_radar-input.json` as **ignored**, not untracked.

- [ ] **Step 7: Full suite and lint, then commit**

```bash
npm test && npm run lint
git add scripts/radar-prepare.mjs scripts/__tests__/radar-prepare.test.mjs package.json
git commit -m "feat: add radar:prepare, the clustering digest"
```

---

### Task 4: `radar:derive`

**Files:**
- Create: `scripts/radar-derive.mjs`
- Create: `scripts/__tests__/radar-derive.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `deriveEvidenceProfile`, `deriveDates` from `scripts/lib/derive.mjs`; `readIndex`, `readItems`, `indexById` from `scripts/lib/content.mjs`.
- Produces: `deriveOne(phenomenon, signalsById, { today }) -> { updates, reachChangeNote }` and `derive({ root, today }) -> { changed, notes, errors }`.

**How `possibleReachChange` is detected — read this before implementing.** The spec describes computing the profile twice and filtering evidence by date against `reachReviewedAt`. That works for evidence *arriving* and fails for evidence *removed*: a detached signal is gone from the array, so there is nothing left to filter and the decrease is invisible. Instead compare the freshly computed profile against the **stored** `evidenceProfile` — the previous derive's output, already in the file. It sees both directions and needs no new field.

The flag must be **sticky**: once raised it persists until a human re-reviews reach, i.e. until `reachReviewedAt >= raisedAt`. Otherwise a second derive with no further change would clear a candidate nobody looked at.

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/radar-derive.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { deriveOne } from "../radar-derive.mjs";

const sig = (id, over = {}) => ({ id, date: "2026-08-01", status: "published", signalType: "study", ...over });

function signals(list) {
  return new Map(list.map((s) => [s.id, s]));
}

const base = (over = {}) => ({
  id: "p1", reachReviewedAt: "2026-08-01",
  evidence: [{ signalId: "s1", stance: "supports", primary: true }],
  ...over,
});

test("the profile and dates are computed from the evidence", () => {
  const { updates } = deriveOne(base(), signals([sig("s1")]), { today: "2026-08-10" });
  assert.equal(updates.evidenceProfile.independentContexts, 1);
  assert.equal(updates.firstObserved, "2026-08-01");
  assert.equal(updates.latestEvidenceDate, "2026-08-01");
});

test("no stored profile means no reach candidate — nothing to compare against", () => {
  const { updates } = deriveOne(base(), signals([sig("s1")]), { today: "2026-08-10" });
  assert.equal(updates.possibleReachChange, null);
});

test("a GAINED independent context raises a candidate", () => {
  const p = base({
    evidenceProfile: { independentContexts: 1, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false },
    evidence: [
      { signalId: "s1", stance: "supports", primary: true },
      { signalId: "s2", stance: "supports", primary: true },
    ],
  });
  const { updates } = deriveOne(p, signals([sig("s1"), sig("s2")]), { today: "2026-08-10" });
  assert.equal(updates.possibleReachChange.raisedAt, "2026-08-10");
  assert.match(updates.possibleReachChange.reason, /gained|new/i);
  assert.deepEqual(updates.possibleReachChange.signalIds, ["s1", "s2"]);
  assert.equal("suggested" in updates.possibleReachChange, false);
});

test("a LOST independent context raises a candidate too", () => {
  const p = base({
    evidenceProfile: { independentContexts: 3, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false },
  });
  const { updates } = deriveOne(p, signals([sig("s1")]), { today: "2026-08-10" });
  assert.ok(updates.possibleReachChange, "a shrinking evidence base is the more urgent review");
  assert.match(updates.possibleReachChange.reason, /lost|removed|fell/i);
});

test("elapsed quarters alone raise nothing — time passing is not spread", () => {
  const p = base({
    evidenceProfile: { independentContexts: 1, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false },
    evidence: [
      { signalId: "s1", stance: "supports", primary: true },
      { signalId: "s2", stance: "supports", primary: false },
    ],
  });
  const { updates } = deriveOne(p, signals([sig("s1"), sig("s2", { date: "2026-11-01" })]), { today: "2026-11-02" });
  assert.equal(updates.evidenceProfile.quartersSpanned, 2);
  assert.equal(updates.possibleReachChange, null);
});

test("an existing candidate is sticky while reach is still unreviewed", () => {
  const p = base({
    evidenceProfile: { independentContexts: 1, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false },
    possibleReachChange: { reason: "raised earlier", raisedAt: "2026-08-05", signalIds: ["s1"] },
  });
  const { updates } = deriveOne(p, signals([sig("s1")]), { today: "2026-08-10" });
  assert.equal(updates.possibleReachChange.raisedAt, "2026-08-05", "must not be cleared by a no-op run");
});

test("a candidate clears once reach has been reviewed since it was raised", () => {
  const p = base({
    reachReviewedAt: "2026-08-09",
    evidenceProfile: { independentContexts: 1, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false },
    possibleReachChange: { reason: "raised earlier", raisedAt: "2026-08-05", signalIds: ["s1"] },
  });
  const { updates } = deriveOne(p, signals([sig("s1")]), { today: "2026-08-10" });
  assert.equal(updates.possibleReachChange, null);
});

test("derive is idempotent", () => {
  const p = base({ evidenceProfile: { independentContexts: 1, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false } });
  const map = signals([sig("s1")]);
  const first = deriveOne(p, map, { today: "2026-08-10" }).updates;
  const second = deriveOne({ ...p, ...first }, map, { today: "2026-08-10" }).updates;
  assert.deepEqual(second, first);
});

test("counter-evidence with contested unset is reported, not written", () => {
  const p = base({
    evidence: [
      { signalId: "s1", stance: "supports", primary: true },
      { signalId: "s2", stance: "counter", primary: true },
    ],
  });
  const { updates, reachChangeNote } = deriveOne(p, signals([sig("s1"), sig("s2")]), { today: "2026-08-10" });
  assert.equal(updates.evidenceProfile.counterEvidence, true);
  assert.equal("contested" in updates, false, "contested is human-owned");
  assert.match(reachChangeNote ?? "", /contested/i);
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test scripts/__tests__/radar-derive.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `scripts/radar-derive.mjs`:

```js
#!/usr/bin/env node
/**
 * Recompute every derived value on every phenomenon, and flag reach candidates.
 *
 * Mechanical work only. Nothing here decides where a blip sits: possibleReachChange
 * names what prompted a second look and carries no ring, because reach is a human
 * judgment and a script naming a target ring is most of the way to deciding it.
 *
 *   node scripts/radar-derive.mjs
 */

import { writeFileSync } from "fs";
import { resolve, join } from "path";
import { readIndex, readItems, indexById } from "./lib/content.mjs";
import { deriveEvidenceProfile, deriveDates } from "./lib/derive.mjs";

const PHENOMENA_DIR = "public/content/phenomena";
const SIGNALS_DIR = "public/content/ai-signals";

/**
 * Derived values for one phenomenon, plus a reviewer note.
 *
 * The reach candidate compares the fresh profile against the STORED one rather
 * than re-filtering evidence by date. Detached evidence is gone from the array,
 * so a date filter can only ever see additions — and a claim run that strips
 * off-construct evidence produces exactly the decrease that matters most.
 */
export function deriveOne(phenomenon, signalsById, { today }) {
  const evidenceProfile = deriveEvidenceProfile(phenomenon, signalsById);
  const { firstObserved, latestEvidenceDate } = deriveDates(phenomenon, signalsById);

  const stored = phenomenon.evidenceProfile;
  const previous = phenomenon.possibleReachChange ?? null;
  const reviewedAt = phenomenon.reachReviewedAt;
  const signalIds = (phenomenon.evidence || []).map((e) => e.signalId);

  let possibleReachChange = null;

  // A candidate stays up until a human has looked at reach since it was raised.
  // Clearing it on a quiet run would drop a review nobody performed.
  const stillOutstanding =
    previous && (!reviewedAt || !previous.raisedAt || reviewedAt < previous.raisedAt);

  if (stored && stored.independentContexts !== evidenceProfile.independentContexts) {
    const delta = evidenceProfile.independentContexts - stored.independentContexts;
    const reason =
      delta > 0
        ? `gained ${delta} independent context(s) since reach was last reviewed ` +
          `(${stored.independentContexts} -> ${evidenceProfile.independentContexts})`
        : `lost ${-delta} independent context(s) since reach was last reviewed ` +
          `(${stored.independentContexts} -> ${evidenceProfile.independentContexts}); ` +
          `the blip may need to move outward`;
    possibleReachChange = { reason, raisedAt: today, signalIds };
  } else if (stillOutstanding) {
    possibleReachChange = previous;
  }

  // contested is human-owned; derive only says a reviewer should look.
  const note =
    evidenceProfile.counterEvidence && !phenomenon.contested
      ? `${phenomenon.id}: counter-evidence present but 'contested' is not set. ` +
        `Check the counter items measure this phenomenon's construct — off-construct ` +
        `counter-evidence manufactures contestation.`
      : null;

  return {
    updates: { evidenceProfile, firstObserved, latestEvidenceDate, possibleReachChange },
    reachChangeNote: note,
  };
}

export function derive({ root = process.cwd(), today = new Date().toISOString().slice(0, 10) } = {}) {
  const phenomenaDir = resolve(root, PHENOMENA_DIR);
  const signalsDir = resolve(root, SIGNALS_DIR);
  const errors = [];

  let items = [];
  let signalsById = new Map();
  try {
    signalsById = indexById(readItems(signalsDir, readIndex(signalsDir)).items);
    const loaded = readItems(phenomenaDir, readIndex(phenomenaDir));
    items = loaded.items;
    errors.push(...loaded.errors);
  } catch (e) {
    errors.push(e.message);
  }
  if (errors.length) return { changed: [], notes: [], errors };

  const changed = [];
  const notes = [];
  for (const { file, data } of items) {
    const { updates, reachChangeNote } = deriveOne(data, signalsById, { today });
    if (reachChangeNote) notes.push(reachChangeNote);
    const next = { ...data, ...updates };
    if (JSON.stringify(next) !== JSON.stringify(data)) {
      writeFileSync(join(phenomenaDir, file), JSON.stringify(next, null, 2) + "\n", "utf8");
      changed.push(data.id);
    }
  }
  return { changed, notes, errors: [] };
}

function main() {
  const result = derive();
  if (result.errors.length) {
    console.error(`radar:derive: ${result.errors.length} problem(s)\n`);
    result.errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }
  console.log(`radar:derive: ${result.changed.length} phenomena updated`);
  result.changed.forEach((id) => console.log(`  -> ${id}`));
  result.notes.forEach((n) => console.log(`  ! ${n}`));
}

if (process.argv[1] && process.argv[1].endsWith("radar-derive.mjs")) main();
```

- [ ] **Step 4: Run the tests**

Run: `node --test scripts/__tests__/radar-derive.test.mjs`
Expected: PASS, 9 tests.

- [ ] **Step 5: Wire the npm script and run it**

Add to `package.json`: `"radar:derive": "node scripts/radar-derive.mjs",`

Run: `npm run radar:derive && npm run validate`
Expected: `0 phenomena updated` — the six existing files already carry correct derived values, and the validator fails the build on a mismatch, so any change here means a real bug. Investigate before proceeding if anything is written.

- [ ] **Step 6: Full suite, lint, commit**

```bash
npm test && npm run lint
git add scripts/radar-derive.mjs scripts/__tests__/radar-derive.test.mjs package.json
git commit -m "feat: add radar:derive with bidirectional reach candidates"
```

---

### Task 5: `radar:apply`

**Files:**
- Create: `scripts/radar-apply.mjs`
- Create: `scripts/__tests__/radar-apply.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `mergeMachineFields` from `scripts/lib/radar-fields.mjs`; `deriveOne` from `scripts/radar-derive.mjs`; `readIndex`, `readItems`, `indexById` from `scripts/lib/content.mjs`.
- Produces: `apply({ root, proposal, today }) -> { attached, detached, created, warnings, errors }`.

Proposal shape (from the spec): `{ attachments[], detachments[], newPhenomena[], suggestions[] }`.

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/radar-apply.test.mjs`. Reuse the `makeRoot` helper shape from `radar-prepare.test.mjs` — copy it in rather than importing across test files.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { apply } from "../radar-apply.mjs";

const SIGNALS = "public/content/ai-signals";
const PHENOMENA = "public/content/phenomena";

const sig = (id, over = {}) => ({
  id, title: `T ${id}`, summary: "s", source: "Blog", detectedAt: "2026-08-01",
  date: "2026-08-01", status: "published", signalType: "study", ...over,
});

const phen = (id, evidence = [], over = {}) => ({
  id, label: "Label here", title: `T ${id}`, thesis: "A thesis.",
  construct: "the size of the delivery unit", status: "draft",
  primaryDimension: "organisation-and-leadership", implications: [],
  evidence, observedReach: "early-manifestations", reachRationale: "Because.",
  reachReviewedAt: "2026-08-01", ...over,
});

function makeRoot({ signals = [], phenomena = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), "radar-apply-"));
  for (const [dir, items] of [[SIGNALS, signals], [PHENOMENA, phenomena]]) {
    mkdirSync(join(root, dir), { recursive: true });
    for (const it of items) writeFileSync(join(root, dir, `${it.id}.json`), JSON.stringify(it, null, 2));
    writeFileSync(join(root, dir, "index.json"), JSON.stringify({
      lastUpdated: "2026-01-01T00:00:00Z",
      items: items.map((i) => ({ id: i.id, file: `${i.id}.json`, date: "2026-08-01", status: i.status })),
    }, null, 2));
  }
  mkdirSync(join(root, "data"), { recursive: true });
  return root;
}

const read = (root, id) => JSON.parse(readFileSync(join(root, PHENOMENA, `${id}.json`), "utf8"));
const index = (root) => JSON.parse(readFileSync(join(root, PHENOMENA, "index.json"), "utf8"));

const newPhen = (over = {}) => ({
  label: "Teams get smaller", title: "The unit of delivery shrinks",
  thesis: "A claim.", construct: "the size of the delivery unit",
  primaryDimension: "organisation-and-leadership",
  observedReach: "early-manifestations", reachRationale: "One report.",
  implications: [{ dimension: "organisation-and-leadership", statement: "A thing." }],
  evidence: [{ signalId: "s1", stance: "supports", primary: true }], ...over,
});

test("an attachment is added and the profile recomputed", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1")] });
  const result = apply({ root, today: "2026-08-10", proposal: {
    attachments: [{ phenomenonId: "p1", signalId: "s1", stance: "supports", primary: true, note: "n" }],
  }});
  assert.deepEqual(result.errors, []);
  const p = read(root, "p1");
  assert.equal(p.evidence.length, 1);
  assert.equal(p.evidenceProfile.independentContexts, 1);
});

test("human-owned fields are byte-identical after a proposal that tries to change them", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1")] });
  const before = read(root, "p1");
  apply({ root, today: "2026-08-10", proposal: {
    attachments: [{ phenomenonId: "p1", signalId: "s1", stance: "supports", primary: true }],
    newPhenomena: [], suggestions: [],
    // a hostile proposal: these must be ignored entirely
    thesis: "rewritten", observedReach: "field-level-shift",
  }});
  const after = read(root, "p1");
  for (const k of ["thesis", "construct", "observedReach", "reachRationale", "reachReviewedAt", "label", "title"]) {
    assert.equal(after[k], before[k], `${k} must not move`);
  }
});

test("a detachment removes the item and recomputes", () => {
  const root = makeRoot({
    signals: [sig("s1"), sig("s2")],
    phenomena: [phen("p1", [
      { signalId: "s1", stance: "supports", primary: true },
      { signalId: "s2", stance: "counter", primary: true },
    ])],
  });
  const result = apply({ root, today: "2026-08-10", proposal: {
    detachments: [{ phenomenonId: "p1", signalId: "s2", reason: "wrong-construct" }],
  }});
  assert.deepEqual(result.errors, []);
  assert.deepEqual(read(root, "p1").evidence.map((e) => e.signalId), ["s1"]);
  assert.equal(read(root, "p1").evidenceProfile.counterEvidence, false);
});

test("detaching the last supports item warns and proceeds", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1", [{ signalId: "s1", stance: "supports", primary: true }])] });
  const result = apply({ root, today: "2026-08-10", proposal: {
    detachments: [{ phenomenonId: "p1", signalId: "s1", reason: "wrong-construct" }],
  }});
  assert.deepEqual(result.errors, []);
  assert.equal(read(root, "p1").evidence.length, 0);
  assert.ok(result.warnings.some((w) => w.includes("p1")), "a claim nobody measures is a finding");
});

test("a duplicate attachment and an absent detachment are both no-ops", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1", [{ signalId: "s1", stance: "supports", primary: true }])] });
  const result = apply({ root, today: "2026-08-10", proposal: {
    attachments: [{ phenomenonId: "p1", signalId: "s1", stance: "supports", primary: true }],
    detachments: [{ phenomenonId: "p1", signalId: "s9", reason: "x" }],
  }});
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
  const result = apply({ root, today: "2026-08-10", proposal: {
    attachments: [{ phenomenonId: "nope", signalId: "s1", stance: "supports", primary: true }],
  }});
  assert.ok(result.errors.length);
  assert.equal(read(root, "p1").evidence.length, 0);
});

test("an unpublished signal aborts", () => {
  const root = makeRoot({ signals: [sig("s1", { status: "draft" })], phenomena: [phen("p1")] });
  const result = apply({ root, today: "2026-08-10", proposal: {
    attachments: [{ phenomenonId: "p1", signalId: "s1", stance: "supports", primary: true }],
  }});
  assert.ok(result.errors.some((e) => e.includes("published")));
});

test("a slug collision aborts rather than overwriting", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("teams-get-smaller")] });
  const result = apply({ root, today: "2026-08-10", proposal: { newPhenomena: [newPhen()] } });
  assert.ok(result.errors.some((e) => e.includes("refusing to overwrite")));
});

test("a new phenomenon without construct aborts", () => {
  const root = makeRoot({ signals: [sig("s1")] });
  const p = newPhen(); delete p.construct;
  const result = apply({ root, today: "2026-08-10", proposal: { newPhenomena: [p] } });
  assert.ok(result.errors.some((e) => e.includes("construct")));
});

test("a detachment on an unknown phenomenon aborts the whole batch", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1")] });
  const result = apply({ root, today: "2026-08-10", proposal: {
    attachments: [{ phenomenonId: "p1", signalId: "s1", stance: "supports", primary: true }],
    detachments: [{ phenomenonId: "ghost", signalId: "s1", reason: "x" }],
  }});
  assert.ok(result.errors.length);
  assert.equal(read(root, "p1").evidence.length, 0, "nothing moves when the batch fails");
});

test("the apply report records suggestions without touching any file", () => {
  const root = makeRoot({ signals: [sig("s1")], phenomena: [phen("p1")] });
  apply({ root, today: "2026-08-10", proposal: {
    attachments: [{ phenomenonId: "p1", signalId: "s1", stance: "supports", primary: true }],
    suggestions: [{ phenomenonId: "p1", field: "thesis", observation: "outgrown by its evidence" }],
  }});
  const report = readFileSync(join(root, "data/_radar-apply-report.md"), "utf8");
  assert.match(report, /outgrown by its evidence/);
  assert.equal(read(root, "p1").thesis, "A thesis.");
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test scripts/__tests__/radar-apply.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `scripts/radar-apply.mjs`:

```js
#!/usr/bin/env node
/**
 * Apply a clustering or claim-run proposal.
 *
 * The only writer of machine-owned fields. On an existing phenomenon every write
 * goes through mergeMachineFields, so rewriting a thesis is not forbidden but
 * unreachable — there is no code path that does it. Where the model believes
 * human-owned content should change, it emits a suggestion into the report, which
 * a person reads and a person acts on.
 *
 * All-or-nothing: any validation error and nothing is written at all.
 *
 *   node scripts/radar-apply.mjs data/_radar-proposal.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, join } from "path";
import { spawnSync } from "child_process";
import { readIndex, readItems, indexById } from "./lib/content.mjs";
import { mergeMachineFields } from "./lib/radar-fields.mjs";
import { deriveOne } from "./radar-derive.mjs";

const PHENOMENA_DIR = "public/content/phenomena";
const SIGNALS_DIR = "public/content/ai-signals";
const REPORT_FILE = "data/_radar-apply-report.md";

const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n", "utf8");
const nowStamp = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

/** "Teams get smaller" -> "teams-get-smaller", matching the existing filenames. */
export function slugify(label) {
  return String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function apply({ root = process.cwd(), proposal, today = new Date().toISOString().slice(0, 10) } = {}) {
  const phenomenaDir = resolve(root, PHENOMENA_DIR);
  const signalsDir = resolve(root, SIGNALS_DIR);
  const errors = [];
  const warnings = [];

  if (!proposal || typeof proposal !== "object") {
    return { attached: 0, detached: 0, created: [], warnings, errors: ["proposal is not an object"] };
  }
  const attachments = proposal.attachments || [];
  const detachments = proposal.detachments || [];
  const newPhenomena = proposal.newPhenomena || [];
  const suggestions = proposal.suggestions || [];

  const signalsById = indexById(readItems(signalsDir, readIndex(signalsDir)).items);
  const phenomenaIndex = readIndex(phenomenaDir);
  const { items } = readItems(phenomenaDir, phenomenaIndex);
  const byId = new Map(items.map(({ file, data }) => [data.id, { file, data }]));

  // ---- validate the whole batch before writing anything ----
  for (const a of attachments) {
    if (!byId.has(a.phenomenonId)) errors.push(`attachment: unknown phenomenon '${a.phenomenonId}'`);
    const s = signalsById.get(a.signalId);
    if (!s) errors.push(`attachment: unknown signal '${a.signalId}'`);
    else if (s.status !== "published") errors.push(`attachment: signal '${a.signalId}' is not published`);
  }
  for (const d of detachments) {
    if (!byId.has(d.phenomenonId)) errors.push(`detachment: unknown phenomenon '${d.phenomenonId}'`);
  }
  const created = [];
  for (const p of newPhenomena) {
    const id = slugify(p.label);
    if (!id) { errors.push("newPhenomena: an entry has no usable label"); continue; }
    if (!p.construct || !String(p.construct).trim()) {
      errors.push(`newPhenomena '${id}': construct is required — it defines what counts as evidence here`);
    }
    if (byId.has(id) || existsSync(join(phenomenaDir, `${id}.json`))) {
      errors.push(`newPhenomena '${id}': ${id}.json already exists — refusing to overwrite`);
    }
    if (created.includes(id)) errors.push(`newPhenomena '${id}': proposed twice in one batch`);
    created.push(id);
  }
  for (const ev of newPhenomena.flatMap((p) => p.evidence || [])) {
    const s = signalsById.get(ev.signalId);
    if (!s) errors.push(`newPhenomena: unknown signal '${ev.signalId}'`);
    else if (s.status !== "published") errors.push(`newPhenomena: signal '${ev.signalId}' is not published`);
  }

  if (errors.length) return { attached: 0, detached: 0, created: [], warnings, errors };

  // ---- mutate evidence on existing phenomena ----
  const touched = new Map();
  const evidenceOf = (id) => {
    if (!touched.has(id)) touched.set(id, [...(byId.get(id).data.evidence || [])]);
    return touched.get(id);
  };

  let attached = 0;
  for (const a of attachments) {
    const list = evidenceOf(a.phenomenonId);
    if (list.some((e) => e.signalId === a.signalId)) continue; // no-op, safe to re-run
    list.push({ signalId: a.signalId, stance: a.stance, primary: a.primary, ...(a.note ? { note: a.note } : {}) });
    attached += 1;
  }
  let detached = 0;
  for (const d of detachments) {
    const list = evidenceOf(d.phenomenonId);
    const at = list.findIndex((e) => e.signalId === d.signalId);
    if (at === -1) continue; // no-op
    list.splice(at, 1);
    detached += 1;
  }

  // ---- write existing phenomena through the machine-owned allowlist ----
  for (const [id, evidence] of touched) {
    const { file, data } = byId.get(id);
    const withEvidence = mergeMachineFields(data, { evidence });
    const { updates } = deriveOne(withEvidence, signalsById, { today });
    const next = mergeMachineFields(withEvidence, updates);
    writeJson(join(phenomenaDir, file), next);
    if (!evidence.some((e) => e.stance === "supports")) {
      warnings.push(
        `${id}: no 'supports' evidence remains — it can no longer be published, ` +
          `and a claim nobody is measuring is a finding, not an error`,
      );
    }
  }

  // ---- write new phenomena, files before index ----
  for (const [i, p] of newPhenomena.entries()) {
    const id = created[i];
    const record = {
      id,
      label: p.label,
      title: p.title,
      thesis: p.thesis,
      construct: p.construct,
      ...(p.currentPressure ? { currentPressure: p.currentPressure } : {}),
      status: "draft",
      primaryDimension: p.primaryDimension,
      ...(p.potentialImpact ? { potentialImpact: p.potentialImpact } : {}),
      implications: p.implications || [],
      evidence: p.evidence || [],
      observedReach: p.observedReach,
      reachRationale: p.reachRationale,
      ...(p.whatWouldChangeThis ? { whatWouldChangeThis: p.whatWouldChangeThis } : {}),
    };
    const { updates } = deriveOne(record, signalsById, { today });
    writeJson(join(phenomenaDir, `${id}.json`), { ...record, ...updates });
  }

  if (created.length) {
    phenomenaIndex.items = phenomenaIndex.items || [];
    for (const id of created) {
      phenomenaIndex.items.push({ id, file: `${id}.json`, date: today, status: "draft" });
    }
    phenomenaIndex.lastUpdated = nowStamp();
    writeJson(join(phenomenaDir, "index.json"), phenomenaIndex);
  }

  // ---- report ----
  const lines = [
    `# radar:apply — ${today}`,
    "",
    `- attached: ${attached}`,
    `- detached: ${detached}`,
    `- created: ${created.length ? created.join(", ") : "none"}`,
    "",
  ];
  if (warnings.length) lines.push("## Warnings", "", ...warnings.map((w) => `- ${w}`), "");
  if (suggestions.length) {
    lines.push(
      "## Suggestions for human-owned fields",
      "",
      "Read by a person, acted on by a person. This run changed none of them.",
      "",
      ...suggestions.map((s) => `- **${s.phenomenonId}** \`${s.field}\`: ${s.observation}`),
      "",
    );
  }
  mkdirSync(resolve(root, "data"), { recursive: true });
  writeFileSync(resolve(root, REPORT_FILE), lines.join("\n"), "utf8");

  return { attached, detached, created, warnings, errors: [] };
}

function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: node scripts/radar-apply.mjs <proposal.json>");
    process.exit(1);
  }
  let proposal;
  try {
    proposal = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`radar:apply: could not read ${path}: ${e.message}`);
    process.exit(1);
  }

  const result = apply({ proposal });
  if (result.errors.length) {
    console.error(`radar:apply: ${result.errors.length} problem(s) — nothing was written\n`);
    result.errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }
  console.log(
    `radar:apply: ${result.attached} attached, ${result.detached} detached, ${result.created.length} created`,
  );
  result.created.forEach((id) => console.log(`  -> ${PHENOMENA_DIR}/${id}.json`));
  result.warnings.forEach((w) => console.log(`  ! ${w}`));
  console.log(`  report: ${REPORT_FILE}`);

  const check = spawnSync(process.execPath, ["scripts/validate-phenomena.mjs"], { stdio: "inherit" });
  if (check.status !== 0) process.exit(check.status ?? 1);
}

if (process.argv[1] && process.argv[1].endsWith("radar-apply.mjs")) main();
```

- [ ] **Step 4: Run the tests**

Run: `node --test scripts/__tests__/radar-apply.test.mjs`
Expected: PASS, 12 tests.

- [ ] **Step 5: Wire the npm script**

Add to `package.json`: `"radar:apply": "node scripts/radar-apply.mjs",`

- [ ] **Step 6: Full suite, lint, validate, commit**

```bash
npm test && npm run lint && npm run validate
git add scripts/radar-apply.mjs scripts/__tests__/radar-apply.test.mjs package.json
git commit -m "feat: add radar:apply, the only writer of machine-owned fields"
```

---

### Task 6: `radar:accept`

**Files:**
- Create: `scripts/radar-accept.mjs`
- Create: `scripts/__tests__/radar-accept.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `accept({ root, ids, today }) -> { accepted, warnings, errors }`.

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/radar-accept.test.mjs`, reusing the `makeRoot`/`phen`/`sig` helpers from `radar-apply.test.mjs` (copy them in):

```js
import test from "node:test";
import assert from "node:assert/strict";
import { accept } from "../radar-accept.mjs";
// ... copy makeRoot, sig, phen, read, index from radar-apply.test.mjs ...

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
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test scripts/__tests__/radar-accept.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `scripts/radar-accept.mjs`:

```js
#!/usr/bin/env node
/**
 * Publish reviewed draft phenomena.
 *
 * The accept gate. It is split out of radar:apply so lastReviewed is honest —
 * apply runs before anyone has looked, so stamping it there would claim a review
 * that had not happened, on exactly the phenomena where staleness matters most.
 *
 * A phenomenon with no reachReviewedAt has never had its reach judged by a human,
 * and that date is the only machine-checkable trace that the conversation
 * happened. It is refused here rather than caught at build time.
 *
 *   node scripts/radar-accept.mjs <id> [<id>...]
 */

import { writeFileSync } from "fs";
import { resolve, join } from "path";
import { spawnSync } from "child_process";
import { readIndex, readItems, indexById } from "./lib/content.mjs";

const PHENOMENA_DIR = "public/content/phenomena";
const SIGNALS_DIR = "public/content/ai-signals";

const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n", "utf8");
const nowStamp = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const isBlank = (v) => typeof v !== "string" || v.trim() === "";

export function accept({ root = process.cwd(), ids = [], today = new Date().toISOString().slice(0, 10) } = {}) {
  const phenomenaDir = resolve(root, PHENOMENA_DIR);
  const signalsDir = resolve(root, SIGNALS_DIR);
  const errors = [];
  const warnings = [];

  if (!ids.length) return { accepted: [], warnings, errors: ["no phenomenon ids given"] };

  const signalsById = indexById(readItems(signalsDir, readIndex(signalsDir)).items);
  const phenomenaIndex = readIndex(phenomenaDir);
  const { items } = readItems(phenomenaDir, phenomenaIndex);
  const byId = new Map(items.map(({ file, data }) => [data.id, { file, data }]));

  // ---- check every id before writing anything ----
  for (const id of ids) {
    const entry = byId.get(id);
    if (!entry) { errors.push(`'${id}': no such phenomenon`); continue; }
    const p = entry.data;

    if (p.status !== "draft") { errors.push(`'${id}': status is '${p.status}', not 'draft'`); continue; }

    if (isBlank(p.reachReviewedAt)) {
      errors.push(
        `'${id}': no reachReviewedAt — reach has never been judged by a human. ` +
          `Run the reach review before accepting.`,
      );
    }
    if (isBlank(p.construct)) {
      errors.push(`'${id}': no construct — a published phenomenon must state what its evidence measures`);
    }

    // The published-only editorial minimums, pre-checked so a failure is a refusal
    // rather than a red build that blocks everyone from building anything.
    const implications = Array.isArray(p.implications) ? p.implications : [];
    if (implications.length < 2) {
      errors.push(`'${id}': a published phenomenon needs at least two implications`);
    }
    const supports = (p.evidence || []).filter((e) => e.stance === "supports");
    if (supports.length < 1) {
      errors.push(`'${id}': a published phenomenon needs at least one 'supports' evidence item`);
    }
    for (const ev of supports) {
      const s = signalsById.get(ev.signalId);
      if (s && !s.signalType) {
        errors.push(`'${id}': supporting signal '${ev.signalId}' has no signalType`);
      }
    }

    // Not a refusal: reach may still be right, but it was judged without the newest
    // evidence in front of the reviewer.
    if (!isBlank(p.reachReviewedAt) && p.latestEvidenceDate && p.reachReviewedAt < p.latestEvidenceDate) {
      warnings.push(
        `'${id}': reach was judged ${p.reachReviewedAt}, before the newest evidence (${p.latestEvidenceDate})`,
      );
    }
  }

  if (errors.length) return { accepted: [], warnings, errors };

  const accepted = [];
  for (const id of ids) {
    const { file, data } = byId.get(id);
    writeJson(join(phenomenaDir, file), { ...data, status: "published", lastReviewed: today });
    const entry = phenomenaIndex.items.find((i) => i.id === id);
    if (entry) entry.status = "published";
    accepted.push(id);
  }
  phenomenaIndex.lastUpdated = nowStamp();
  writeJson(join(phenomenaDir, "index.json"), phenomenaIndex);

  return { accepted, warnings, errors: [] };
}

function main() {
  const ids = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const result = accept({ ids });

  if (result.errors.length) {
    console.error(`radar:accept: ${result.errors.length} problem(s) — nothing was published\n`);
    result.errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }
  result.warnings.forEach((w) => console.log(`  ! ${w}`));
  console.log(`radar:accept: ${result.accepted.length} published`);
  result.accepted.forEach((id) => console.log(`  -> ${id}`));

  const check = spawnSync(process.execPath, ["scripts/validate-phenomena.mjs"], { stdio: "inherit" });
  if (check.status !== 0) process.exit(check.status ?? 1);
}

if (process.argv[1] && process.argv[1].endsWith("radar-accept.mjs")) main();
```

- [ ] **Step 4: Run the tests, wire npm, commit**

```bash
node --test scripts/__tests__/radar-accept.test.mjs
```
Expected: PASS, 9 tests. Add `"radar:accept": "node scripts/radar-accept.mjs",` to `package.json`, then:

```bash
npm test && npm run lint && npm run validate
git add scripts/radar-accept.mjs scripts/__tests__/radar-accept.test.mjs package.json
git commit -m "feat: add radar:accept, the publish gate"
```

---

### Task 7: `radar:reject`

**Files:**
- Create: `scripts/radar-reject.mjs`
- Create: `scripts/__tests__/radar-reject.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `reject({ root, ids, reason, today }) -> { rejected, released, errors }`.

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/radar-reject.test.mjs`, reusing the helpers from `radar-apply.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { reject } from "../radar-reject.mjs";
// ... copy makeRoot, sig, phen, index from radar-apply.test.mjs ...

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
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test scripts/__tests__/radar-reject.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `scripts/radar-reject.mjs`:

```js
#!/usr/bin/env node
/**
 * Decline a draft phenomenon: record the decision, then remove the file.
 *
 * Deleting the file is what releases its signals — "covered" is derived from
 * files on disk, not stored — so the release needs no machinery. The store exists
 * for the second problem: without it the next clustering run re-proposes the
 * cluster just declined, and rejection-by-absence cannot tell a considered
 * decline from an accidental rm.
 *
 * Refuses a published phenomenon. Removing something already on the site, with
 * deep links pointing at it, is retirement — a different act, out of scope.
 *
 *   node scripts/radar-reject.mjs <id> [<id>...] --reason "why"
 */

import { appendFileSync, readFileSync, existsSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { readIndex, readItems } from "./lib/content.mjs";

const PHENOMENA_DIR = "public/content/phenomena";
const STORE_FILE = "data/_radar-rejected.jsonl";

const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n", "utf8");
const nowStamp = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

function alreadyRejected(root) {
  const file = resolve(root, STORE_FILE);
  if (!existsSync(file)) return new Set();
  const ids = new Set();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const text = line.trim();
    if (!text) continue;
    try { ids.add(JSON.parse(text).id); } catch { /* skip malformed */ }
  }
  return ids;
}

export function reject({ root = process.cwd(), ids = [], reason = "", today = new Date().toISOString().slice(0, 10) } = {}) {
  const phenomenaDir = resolve(root, PHENOMENA_DIR);
  const errors = [];

  if (!ids.length) return { rejected: [], released: [], errors: ["no phenomenon ids given"] };
  if (!String(reason).trim()) {
    return { rejected: [], released: [], errors: ["--reason is required: a decline with no stated reason is not a decision"] };
  }

  const phenomenaIndex = readIndex(phenomenaDir);
  const { items } = readItems(phenomenaDir, phenomenaIndex);
  const byId = new Map(items.map(({ file, data }) => [data.id, { file, data }]));
  const seen = alreadyRejected(root);

  const targets = [];
  for (const id of ids) {
    if (seen.has(id) && !byId.has(id)) continue; // already rejected — no-op
    const entry = byId.get(id);
    if (!entry) { errors.push(`'${id}': no such phenomenon`); continue; }
    if (entry.data.status !== "draft") {
      errors.push(`'${id}': status is '${entry.data.status}' — only a draft may be rejected (published is retirement)`);
      continue;
    }
    targets.push(entry);
  }

  if (errors.length) return { rejected: [], released: [], errors };

  // Append before deleting: an interrupted run should lose a file whose record
  // already exists, never a decision with no trace.
  mkdirSync(resolve(root, "data"), { recursive: true });
  const released = [];
  const rejected = [];
  for (const { file, data } of targets) {
    const signalIds = (data.evidence || []).map((e) => e.signalId);
    appendFileSync(
      resolve(root, STORE_FILE),
      JSON.stringify({ id: data.id, label: data.label, thesis: data.thesis, signalIds, reason, at: today }) + "\n",
      "utf8",
    );
    rmSync(join(phenomenaDir, file));
    phenomenaIndex.items = phenomenaIndex.items.filter((i) => i.id !== data.id);
    released.push(...signalIds);
    rejected.push(data.id);
  }

  if (rejected.length) {
    phenomenaIndex.lastUpdated = nowStamp();
    writeJson(join(phenomenaDir, "index.json"), phenomenaIndex);
  }

  return { rejected, released: [...new Set(released)], errors: [] };
}

function flag(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? "" : process.argv[i + 1] || "";
}

function main() {
  const reason = flag("--reason");
  const ids = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && all[i - 1] !== "--reason");

  const result = reject({ ids, reason });
  if (result.errors.length) {
    console.error(`radar:reject: ${result.errors.length} problem(s) — nothing was removed\n`);
    result.errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }
  console.log(`radar:reject: ${result.rejected.length} declined`);
  result.rejected.forEach((id) => console.log(`  -> ${id}`));
  if (result.released.length) {
    console.log(`  ${result.released.length} signal(s) released back to the uncovered pool`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("radar-reject.mjs")) main();
```

- [ ] **Step 4: Run the tests, wire npm, commit**

```bash
node --test scripts/__tests__/radar-reject.test.mjs
```
Expected: PASS, 8 tests. Add `"radar:reject": "node scripts/radar-reject.mjs",` to `package.json`, then:

```bash
npm test && npm run lint && npm run validate
git add scripts/radar-reject.mjs scripts/__tests__/radar-reject.test.mjs package.json
git commit -m "feat: add radar:reject, releasing a declined draft's signals"
```

---

### Task 8: The two prompts, and the docs

**Files:**
- Create: `docs/radar-clustering-prompt.md`
- Create: `docs/radar-reach-review-prompt.md`
- Modify: `CLAUDE.md`, `AGENTS.md`
- Modify: `docs/superpowers/specs/2026-08-07-radar-phase2-pipeline-design.md`

No tests — these are prompts. The check is the first real run.

- [ ] **Step 1: Correct the spec's `possibleReachChange` rule**

The spec says to compute the profile twice and filter evidence by `reachReviewedAt`. That cannot see removals: a detached signal is gone from the array. Replace that paragraph with the stored-profile comparison and the stickiness rule actually implemented in Task 4. Keep the "never on `quartersSpanned` alone" sentence.

- [ ] **Step 2: Write the clustering prompt**

`docs/radar-clustering-prompt.md`. It must carry, at minimum:

- **Role and input:** reads `data/_radar-input.json`, writes `data/_radar-proposal.json`. Never edits a phenomenon file.
- **The construct test, first and as a gate.** A source is evidence for a claim only if it measured the thing the claim is about. If it did not, **do not attach it at any stance**. `wrong-construct` is a rejection, never a demotion to `contextual`. Cite the worked example: `teams-get-smaller` cites six signals of which one measures team size, and the rest measure employment — which makes a thin claim look furnished and an uncontested one look contested.
- **Then stance:** `supports` (the change is observably happening), `counter` (it is not, or is going elsewhere), `contextual` (the pressure is real but shows no direction). Only `supports` counts in the profile.
- **Then primary:** its own observation, or commentary on someone else's.
- **Every new phenomenon names its `construct`** — one sentence saying what must be measured. List near neighbours that do *not* count.
- **`observedReach` and `reachRationale` are proposed, not decided.** State that a human confirms or overrides both, and that no `reachReviewedAt` is written.
- **No quota.** Find the clusters the corpus supports and stop. Inventing blips to reach ten is the failure the two-level model exists to prevent.
- **`implications` must be traceable** to something in the phenomenon's evidence.
- **Honour `rejectedClusters`** from the digest: do not re-propose a declined cluster unless the evidence has materially changed.
- **Output contract:** the exact proposal JSON from the spec's *The proposal format* section, including `detachments` and `suggestions`.

- [ ] **Step 3: Write the reach-review prompt**

`docs/radar-reach-review-prompt.md`. It must carry:

- **Scope:** phenomena with no `reachReviewedAt`. One at a time; never a batch confirmation.
- **Per phenomenon, present in this order:** the evidence profile and what each supporting item actually observed; the proposed ring and rationale; then **the strongest case for the ring one step in and the ring one step out.**
- **Why the third item exists,** stated in the prompt: a proposal that only argues for itself gets nodded through, and confirming is a far lower bar than deciding.
- **On confirm or override:** write the agreed `observedReach` and `reachRationale`, stamp `reachReviewedAt`, and append one line to `data/_radar-reach-log.jsonl`:
  ```json
  {"id":"...","proposedReach":"gaining-traction","finalReach":"early-manifestations","overridden":true,"at":"2026-08-10"}
  ```
- **What the log is for:** whether human review is doing work. A reviewer who accepts every proposal and one who overrides two in five are otherwise indistinguishable.
- **The ring vocabulary,** centre outwards: `field-level-shift`, `gaining-traction`, `early-manifestations` — how far the change has *spread*, never confidence or evidence volume.

- [ ] **Step 4: Update CLAUDE.md and AGENTS.md**

Both files are identical apart from the heading. Add to the Commands section:

```
- `npm run radar:prepare` — digest uncovered signals for the clustering pass
- `npm run radar:apply -- <proposal.json>` — apply a proposal; the only writer of machine-owned fields
- `npm run radar:derive` — recompute derived values and reach candidates
- `npm run radar:accept -- <ids...>` — publish reviewed drafts
- `npm run radar:reject -- <ids...> --reason "..."` — decline a draft and release its signals
```

And to the Content Schema section, under Phenomenon:

```
- `construct` — what a source must measure to count as evidence. Optional on drafts, **required on published**.
- `possibleReachChange` — derived candidate for reach review. Carries no ring.
- `reachReviewedAt` is now **required on published only**; its absence means no human has judged reach yet, and `radar:accept` refuses on it.
```

- [ ] **Step 5: Verify and commit**

```bash
npm test && npm run lint && npm run validate
git add docs/radar-clustering-prompt.md docs/radar-reach-review-prompt.md CLAUDE.md AGENTS.md docs/superpowers/specs/2026-08-07-radar-phase2-pipeline-design.md
git commit -m "docs: add the clustering and reach-review prompts"
```

---

## Done when

- `npm test` passes with roughly 145 tests, `npm run lint` clean, `npm run validate` green.
- `npm run radar:prepare` produces a digest of the uncovered signals and prints the coverage table.
- A hand-written proposal can be applied, derived, and either accepted or rejected end to end.
- No script can write `observedReach`, `reachRationale`, `thesis` or `construct` on an existing phenomenon — asserted by `radar-fields.test.mjs` and `radar-apply.test.mjs`.

**Not in this plan:** running the pipeline for real. That is the next session's work, and it needs a human at the reach conversation.
