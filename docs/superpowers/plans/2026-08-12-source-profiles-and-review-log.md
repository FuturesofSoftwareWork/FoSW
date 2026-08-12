# Source Profiles and Review Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make candidate collection sector- and claim-aware via standalone JSON source profiles, and record why a human accepted or rejected each draft.

**Architecture:** Two pure libraries under `scripts/lib/` (`source-profile.mjs`, `review-schema.mjs`) hold all logic and are unit-tested without network or filesystem fixtures where possible. `collect-candidates.mjs` and `promote-signals.mjs` become thin consumers. Source lists move out of code into `config/sources/*.json` with no inheritance — what you read is what runs.

**Tech Stack:** Node 22 ESM, `node --test`, zero runtime dependencies. Existing conventions: pure logic in `scripts/lib/`, tests in `scripts/__tests__/*.test.mjs`, `mkdtempSync` for isolated roots.

**Spec:** [`docs/superpowers/specs/2026-08-12-source-profiles-and-review-log-design.md`](../specs/2026-08-12-source-profiles-and-review-log-design.md)

## Global Constraints

- Zero new npm dependencies. The collector is zero-dependency by design.
- No network calls in tests, ever.
- `npm run lint` allows **zero** warnings. No literal invisible characters in source — write `​`-style escapes.
- Working files live in `data/`, never `public/`. Vite copies `public/` into `dist`.
- `data/_review-log.jsonl` must be gitignored: it holds free-text judgment about named third parties and this repo is public.
- Every task ends green on `npm test` and `npm run lint`.
- Commit at the end of each task. Branch is `feat-signal-pipeline-hardening` (already checked out).
- Follow TDD: write the failing test, watch it fail for the right reason, then implement.

---

# PART A — Source profiles

### Task A1: Profile loader library

**Files:**
- Create: `scripts/lib/source-profile.mjs`
- Test: `scripts/__tests__/source-profile.test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `PROFILES_DIR = "config/sources"`
  - `availableProfiles(root?: string): string[]` — sorted filename stems
  - `loadProfile(name: string, opts?: {root?: string}): Profile` — throws `Error` on any problem
  - `candidatesPathFor(name: string): string` — `"data/_candidates.json"` for `generic`, else `"data/_candidates-<name>.json"`
  - `resolveWindowDays(profile: Profile, flagDays?: number): number`
  - `Profile` = `{profile, description, hackerNewsTerms[], devtoTags[], subreddits[], githubRepos[], feeds[{name,url}], substacks[{name,host}], windowDays?}` with every list defaulted to `[]`

- [ ] **Step 1: Write the failing tests**

```javascript
// scripts/__tests__/source-profile.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  loadProfile, availableProfiles, candidatesPathFor, resolveWindowDays,
} from "../lib/source-profile.mjs";

/** Build an isolated repo root holding the given profiles. */
function rootWith(profiles) {
  const root = mkdtempSync(join(tmpdir(), "profiles-"));
  mkdirSync(join(root, "config/sources"), { recursive: true });
  for (const [name, body] of Object.entries(profiles)) {
    writeFileSync(join(root, "config/sources", `${name}.json`), JSON.stringify(body), "utf8");
  }
  return root;
}

const minimal = (over = {}) => ({ profile: "p", hackerNewsTerms: ["a"], ...over });

test("a valid profile loads with every list defaulted", () => {
  const root = rootWith({ p: minimal() });
  const p = loadProfile("p", { root });
  assert.deepEqual(p.hackerNewsTerms, ["a"]);
  assert.deepEqual(p.devtoTags, []);
  assert.deepEqual(p.subreddits, []);
  assert.deepEqual(p.githubRepos, []);
  assert.deepEqual(p.feeds, []);
  assert.deepEqual(p.substacks, []);
});

// Falling back to generic would collect the wrong sources and produce a
// plausible pool that answers the wrong question.
test("an unknown profile throws and lists what is available", () => {
  const root = rootWith({ generic: minimal({ profile: "generic" }), other: minimal({ profile: "other" }) });
  assert.throws(() => loadProfile("nope", { root }), /unknown profile 'nope'[\s\S]*generic[\s\S]*other/);
});

test("a profile field that disagrees with the filename is rejected", () => {
  const root = rootWith({ p: minimal({ profile: "something-else" }) });
  assert.throws(() => loadProfile("p", { root }), /profile field 'something-else'.*filename 'p'/);
});

test("a profile with no sources at all is rejected", () => {
  const root = rootWith({ p: { profile: "p" } });
  assert.throws(() => loadProfile("p", { root }), /no sources/);
});

test("malformed JSON names the file", () => {
  const root = mkdtempSync(join(tmpdir(), "profiles-"));
  mkdirSync(join(root, "config/sources"), { recursive: true });
  writeFileSync(join(root, "config/sources/p.json"), "{not json", "utf8");
  assert.throws(() => loadProfile("p", { root }), /p\.json/);
});

test("availableProfiles lists stems in sorted order", () => {
  const root = rootWith({ zeta: minimal({ profile: "zeta" }), alpha: minimal({ profile: "alpha" }) });
  assert.deepEqual(availableProfiles(root), ["alpha", "zeta"]);
});

// The generic pool keeps its historical path so nothing else has to change.
test("the output path is derived from the profile name", () => {
  assert.equal(candidatesPathFor("generic"), "data/_candidates.json");
  assert.equal(candidatesPathFor("worker-experience"), "data/_candidates-worker-experience.json");
});

test("window precedence is flag over profile over default", () => {
  assert.equal(resolveWindowDays({ windowDays: 30 }, 5), 5);
  assert.equal(resolveWindowDays({ windowDays: 30 }, undefined), 30);
  assert.equal(resolveWindowDays({}, undefined), 10);
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `node --test scripts/__tests__/source-profile.test.mjs`
Expected: FAIL — `Cannot find module '../lib/source-profile.mjs'`

- [ ] **Step 3: Implement the library**

```javascript
// scripts/lib/source-profile.mjs
/**
 * Source profiles: which feeds one collector run pulls from.
 *
 * Standalone by design — no `extends`, no merge step. The generic run collects
 * the shared sources weekly anyway and the ledger dedupes them, so an inherited
 * half would be empty by construction. See the design doc.
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, join } from "path";

export const PROFILES_DIR = "config/sources";
const DEFAULT_WINDOW_DAYS = 10;
const LIST_KEYS = ["hackerNewsTerms", "devtoTags", "subreddits", "githubRepos", "feeds", "substacks"];

export function availableProfiles(root = process.cwd()) {
  const dir = resolve(root, PROFILES_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort();
}

export function loadProfile(name, { root = process.cwd() } = {}) {
  const file = join(resolve(root, PROFILES_DIR), `${name}.json`);
  if (!existsSync(file)) {
    // Never fall back to generic: collecting the wrong sources silently
    // produces a plausible pool that answers a different question.
    throw new Error(`unknown profile '${name}'. Available: ${availableProfiles(root).join(", ") || "(none)"}`);
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`${name}.json is not valid JSON: ${e.message}`);
  }
  if (raw?.profile !== name) {
    throw new Error(`profile field '${raw?.profile}' does not match filename '${name}' — the output path would misreport its origin`);
  }
  const profile = { profile: name, description: raw.description ?? "", windowDays: raw.windowDays };
  for (const key of LIST_KEYS) profile[key] = Array.isArray(raw[key]) ? raw[key] : [];
  if (LIST_KEYS.every((k) => profile[k].length === 0)) {
    throw new Error(`${name}.json declares no sources — a profile that collects nothing is a mistake, not a configuration`);
  }
  return profile;
}

export function candidatesPathFor(name) {
  return name === "generic" ? "data/_candidates.json" : `data/_candidates-${name}.json`;
}

export function resolveWindowDays(profile, flagDays) {
  if (Number.isFinite(flagDays) && flagDays > 0) return flagDays;
  if (Number.isFinite(profile?.windowDays) && profile.windowDays > 0) return profile.windowDays;
  return DEFAULT_WINDOW_DAYS;
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `node --test scripts/__tests__/source-profile.test.mjs`
Expected: 8 pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/source-profile.mjs scripts/__tests__/source-profile.test.mjs
git commit -m "feat(signals): add source-profile loader"
```

---

### Task A2: Extract generic.json and pin it

Extraction happens before rewiring so the pin test can fail against a missing file rather than against half-moved code.

**Files:**
- Create: `config/sources/generic.json`
- Test: `scripts/__tests__/source-profile.test.mjs` (append)

**Interfaces:**
- Consumes: `loadProfile` from Task A1.
- Produces: `config/sources/generic.json`, the profile every default run uses.

- [ ] **Step 1: Write the failing pin test**

Values are written literally rather than compared against the constants, so the pin survives Task A3 deleting them.

```javascript
// append to scripts/__tests__/source-profile.test.mjs
// Pins the extraction from collect-candidates.mjs as a pure move. If someone
// edits generic.json thinking it is scratch, this fails and says so.
test("generic.json holds the collector's original constants verbatim", () => {
  const p = loadProfile("generic");
  assert.deepEqual(p.hackerNewsTerms, [
    "coding agent", "AI coding", "Copilot", "Claude Code",
    "Cursor editor", "LLM software engineering", "agentic coding", "AI code review",
  ]);
  assert.deepEqual(p.devtoTags, ["ai", "llm", "machinelearning", "devops", "programming"]);
  assert.deepEqual(p.subreddits, ["ExperiencedDevs", "devops", "programming", "LocalLLaMA"]);
  assert.deepEqual(p.githubRepos, [
    "microsoft/vscode", "cline/cline", "Aider-AI/aider", "All-Hands-AI/OpenHands",
  ]);
  assert.deepEqual(p.feeds, [
    { name: "LeadDev", url: "https://leaddev.com/feed" },
    { name: "InfoQ Culture & Methods", url: "https://feed.infoq.com/culture-methods/" },
    { name: "Martin Fowler", url: "https://martinfowler.com/feed.atom" },
    { name: "Stack Overflow Blog", url: "https://stackoverflow.blog/feed/" },
  ]);
  assert.deepEqual(p.substacks, [
    { name: "The Pragmatic Engineer", host: "newsletter.pragmaticengineer.com" },
    { name: "Engineering Leadership", host: "newsletter.eng-leadership.com" },
  ]);
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test scripts/__tests__/source-profile.test.mjs`
Expected: FAIL — `unknown profile 'generic'. Available: (none)`

- [ ] **Step 3: Create the profile**

```json
{
  "profile": "generic",
  "description": "The weekly generic run. Practitioner-technical sources plus leadership feeds. Values moved verbatim from scripts/collect-candidates.mjs.",
  "hackerNewsTerms": [
    "coding agent", "AI coding", "Copilot", "Claude Code",
    "Cursor editor", "LLM software engineering", "agentic coding", "AI code review"
  ],
  "devtoTags": ["ai", "llm", "machinelearning", "devops", "programming"],
  "subreddits": ["ExperiencedDevs", "devops", "programming", "LocalLLaMA"],
  "githubRepos": [
    "microsoft/vscode", "cline/cline", "Aider-AI/aider", "All-Hands-AI/OpenHands"
  ],
  "feeds": [
    { "name": "LeadDev", "url": "https://leaddev.com/feed" },
    { "name": "InfoQ Culture & Methods", "url": "https://feed.infoq.com/culture-methods/" },
    { "name": "Martin Fowler", "url": "https://martinfowler.com/feed.atom" },
    { "name": "Stack Overflow Blog", "url": "https://stackoverflow.blog/feed/" }
  ],
  "substacks": [
    { "name": "The Pragmatic Engineer", "host": "newsletter.pragmaticengineer.com" },
    { "name": "Engineering Leadership", "host": "newsletter.eng-leadership.com" }
  ]
}
```

Note in the file's `description` that `subreddits` collects nothing until Reddit OAuth exists; it is retained so this is a verbatim move.

- [ ] **Step 4: Run and verify it passes**

Run: `npm test`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add config/sources/generic.json scripts/__tests__/source-profile.test.mjs
git commit -m "feat(signals): extract generic source lists into config/sources/generic.json"
```

---

### Task A3: Wire the collector to profiles

**Files:**
- Modify: `scripts/collect-candidates.mjs` — delete the six constants, add `--profile`, thread the profile through
- Test: `scripts/__tests__/collect-candidates.test.mjs` (append)

**Interfaces:**
- Consumes: `loadProfile`, `candidatesPathFor`, `resolveWindowDays` from A1.
- Produces: `collectorsFor(profile): Array<[string, () => Promise<object[]>]>` — exported so a test can assert which collectors a profile activates without any network call.

- [ ] **Step 1: Write the failing test**

```javascript
// append to scripts/__tests__/collect-candidates.test.mjs
import { collectorsFor } from "../collect-candidates.mjs";

// Nothing is inherited, so a profile that omits a key must run no collector for
// it. Asserted on names only — building the list makes no network call.
test("a profile activates only the collectors it declares", () => {
  const names = collectorsFor({
    hackerNewsTerms: ["a"], devtoTags: [], subreddits: [],
    githubRepos: [], feeds: [{ name: "F", url: "https://f.dev/feed" }], substacks: [],
  }).map(([name]) => name);
  assert.deepEqual(names, ["Hacker News", "Leadership feeds"]);
});

test("a profile declaring every source activates all six collectors", () => {
  const names = collectorsFor({
    hackerNewsTerms: ["a"], devtoTags: ["ai"], subreddits: ["devops"],
    githubRepos: ["o/r"], feeds: [{ name: "F", url: "https://f.dev/feed" }],
    substacks: [{ name: "S", host: "s.dev" }],
  }).map(([name]) => name);
  assert.deepEqual(names, [
    "Hacker News", "Dev.to", "Reddit", "GitHub releases", "Leadership feeds", "Substack",
  ]);
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test scripts/__tests__/collect-candidates.test.mjs`
Expected: FAIL — `does not provide an export named 'collectorsFor'`

- [ ] **Step 3: Implement**

Delete `TERMS`, `DEVTO_TAGS`, `SUBREDDITS`, `GITHUB_REPOS`, `LEADERSHIP_FEEDS`, `SUBSTACK_PUBS` and the `COLLECTORS` array. Give each collector function a parameter, and replace the constant it closed over:

```javascript
import { loadProfile, candidatesPathFor, resolveWindowDays } from "./lib/source-profile.mjs";

// Each collector takes its own list, so a profile that omits a key simply does
// not get that collector. Nothing is inherited.
async function collectHackerNews(terms) { return perItem("Hacker News", terms, async (term) => { /* body unchanged */ }); }
async function collectDevto(tags) { return perItem("Dev.to", tags, async (tag) => { /* unchanged */ }); }
async function collectReddit(subs) { return perItem("Reddit", subs, async (sub) => { /* unchanged */ }); }
async function collectGithubReleases(repos) { return perItem("GitHub releases", repos, async (repo) => { /* unchanged */ }); }
async function collectLeadershipFeeds(feeds) { return perItem("Leadership feeds", feeds, async (feed) => { /* unchanged */ }); }
async function collectSubstack(pubs) { return perItem("Substack", pubs, async (pub) => { /* unchanged */ }); }

/** Only the collectors this profile actually declares sources for. */
export function collectorsFor(profile) {
  const wired = [
    ["Hacker News", profile.hackerNewsTerms, collectHackerNews],
    ["Dev.to", profile.devtoTags, collectDevto],
    ["Reddit", profile.subreddits, collectReddit],
    ["GitHub releases", profile.githubRepos, collectGithubReleases],
    ["Leadership feeds", profile.feeds, collectLeadershipFeeds],
    ["Substack", profile.substacks, collectSubstack],
  ];
  return wired
    .filter(([, list]) => Array.isArray(list) && list.length > 0)
    .map(([name, list, fn]) => [name, () => fn(list)]);
}
```

In `main()`: read `--profile` (default `"generic"`), `loadProfile` it, set `DAYS` from `resolveWindowDays(profile, numArg("--days", undefined))`, default `OUT` to `candidatesPathFor(profileName)` with `--out` still overriding, and iterate `collectorsFor(profile)` instead of `COLLECTORS`.

`CUTOFF` and `TIMEOUT_MS` are module-level today. Convert `CUTOFF` to a `let` assigned in `main()` after the window resolves, and keep `withinWindow` reading it — the existing `withinWindow` tests still pass because the module-level default remains 10 days.

Update the "all sources failed" check to compare against `collectorsFor(profile).length`, and log the profile name and resolved window in the summary line so a run log says which profile produced the pool.

- [ ] **Step 4: Run and verify**

Run: `npm test && npm run lint`
Expected: all pass, lint clean

- [ ] **Step 5: Smoke-test a real run**

Run: `npm run signals:collect -- --days 3`
Expected: exits 0, logs `profile: generic`, writes `data/_candidates.json`. Reddit fails as documented — that is correct.

- [ ] **Step 6: Commit**

```bash
git add scripts/collect-candidates.mjs scripts/__tests__/collect-candidates.test.mjs
git commit -m "feat(signals): collect against a named source profile"
```

---

### Task A4: Sector profile, prompts and docs

**Files:**
- Create: `config/sources/worker-experience-identity-and-wellbeing.json`
- Modify: `docs/sector-prompts/worker-experience-identity-and-wellbeing.md` — the "Where to hunt" opening
- Modify: `docs/claim-prompts/claim-prompt-instructions.md`, `docs/sector-prompts/sector-prompt-instructions.md` — run order gains the collect step
- Modify: `docs/ai-signals-pipeline.md`, `docs/pipeline-runbook.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: everything from A1–A3. Produces no code.

- [ ] **Step 1: Write the sector profile**

Seed `feeds` from the names the last worker-experience run found productive — Sean Goedecke, Wes McKinney and the others named in `data/_finder-report-worker-experience-identity-and-wellbeing.md`. Verify each feed URL returns 200 and parses before adding it:

```bash
curl -s -o /dev/null -w "%{http_code}\n" <feed-url>
```

Leave `subreddits` empty — Reddit collects nothing. Set `windowDays` to `21`: this profile is built around individual writers who post monthly, and 10 days would drop most of them, exactly as it dropped Pragmatic Engineer on 2026-08-10.

- [ ] **Step 2: Verify the profile loads and collects**

Run: `npm run signals:collect -- --profile worker-experience-identity-and-wellbeing`
Expected: exits 0, writes `data/_candidates-worker-experience-identity-and-wellbeing.json`. Inspect the pool and confirm items look on-topic.

- [ ] **Step 3: Correct the prompts**

Both "Where to hunt" sections currently open with *"There is no candidate pool for this run, so the venue list is part of the method."* That becomes false for any run with a profile. Replace with wording that states which venues the pool covers (Hacker News, listed blogs and Substacks, Dev.to tags) and which remain manual (Reddit, LinkedIn, X, Blind, surveys), and add the collect step to each run order.

Keep the sector prompt's existing instruction to check the ledger by hand: a profile only dedupes what it collected, and web-search finds remain undeduped.

- [ ] **Step 4: Update the docs**

- `ai-signals-pipeline.md`: replace "there is **no `signals:collect` step**" for sector and claim runs; document the profile schema and the reachability table.
- `pipeline-runbook.md`: add `--profile` to the command reference; add refusal rows for unknown profile, filename mismatch, and empty profile; state that run order decides which run takes a shared item.
- `CLAUDE.md`: add `config/sources/` to Project Structure and one line to Commands.

- [ ] **Step 5: Verify and commit**

```bash
npm test && npm run lint && npm run build
git add -A
git commit -m "feat(signals): add worker-experience source profile; document profiles"
```

---

# PART B — Review rationale and the review log

### Task B1: Review schema library

**Files:**
- Create: `scripts/lib/review-schema.mjs`
- Test: `scripts/__tests__/review-schema.test.mjs`

**Interfaces:**
- Produces:
  - `REJECTED_UNDER: string[]` — the twelve codes
  - `validateReview(signal: object): string[]` — problems; `[]` when valid or `_review` absent
  - `stripReviewFields(signal: object): object` — copy without `_review` and `$schema`
  - `reviewEvent({signal, decision, reviewer, ts}): object` — one log line

- [ ] **Step 1: Write the failing tests**

```javascript
// scripts/__tests__/review-schema.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { REJECTED_UNDER, validateReview, stripReviewFields, reviewEvent } from "../lib/review-schema.mjs";

const drafted = (over = {}) => ({ id: "2026-08-10-02", title: "T", ...over });

test("a draft with no _review block is valid", () => {
  assert.deepEqual(validateReview(drafted()), []);
});

test("a well-formed _review block is valid", () => {
  assert.deepEqual(
    validateReview(drafted({ _review: { under: "commercial-intent", note: "vendor research", reviewer: "arto" } })),
    [],
  );
});

test("an out-of-enum under is rejected and names the value", () => {
  const problems = validateReview(drafted({ _review: { under: "made-up" } }));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /made-up/);
});

// Written by code when a reviewer moved a file without commenting; a human
// writing it by hand would make the unrecorded rate meaningless.
test("unrecorded is a valid code", () => {
  assert.deepEqual(validateReview(drafted({ _review: { under: "unrecorded" } })), []);
});

test("a non-object _review is rejected", () => {
  assert.equal(validateReview(drafted({ _review: "too technical" })).length, 1);
});

test("note and reviewer must be strings when present", () => {
  assert.equal(validateReview(drafted({ _review: { note: 42 } })).length, 1);
  assert.equal(validateReview(drafted({ _review: { reviewer: [] } })).length, 1);
});

// Editorial commentary must never reach the live site.
test("stripReviewFields removes _review and $schema without mutating the input", () => {
  const draft = drafted({ _review: { under: "too-vague" }, $schema: "../../schemas/x.json", summary: "s" });
  const clean = stripReviewFields(draft);
  assert.equal(clean._review, undefined);
  assert.equal(clean.$schema, undefined);
  assert.equal(clean.summary, "s");
  assert.ok(draft._review, "input must not be mutated");
});

test("an event carries the decision, the rationale and the id", () => {
  const e = reviewEvent({
    signal: drafted({ _review: { under: "commercial-intent", note: "n" } }),
    decision: "rejected", reviewer: "arto", ts: "2026-08-12T09:00:00Z",
  });
  assert.deepEqual(e, {
    ts: "2026-08-12T09:00:00Z", id: "2026-08-10-02", decision: "rejected",
    by: "human", reviewer: "arto", under: "commercial-intent", note: "n",
  });
});

test("a draft reviewed with no rationale is recorded as unrecorded", () => {
  const e = reviewEvent({ signal: drafted(), decision: "rejected", reviewer: "arto", ts: "2026-08-12T09:00:00Z" });
  assert.equal(e.under, "unrecorded");
  assert.equal(e.note, "");
});

test("an explicit reviewer in _review beats the caller's default", () => {
  const e = reviewEvent({
    signal: drafted({ _review: { reviewer: "someone-else" } }),
    decision: "accepted", reviewer: "arto", ts: "2026-08-12T09:00:00Z",
  });
  assert.equal(e.reviewer, "someone-else");
});

test("REJECTED_UNDER carries the documented codes", () => {
  for (const code of ["wrong-construct", "commercial-intent", "low-altitude", "unrecorded"]) {
    assert.ok(REJECTED_UNDER.includes(code), code);
  }
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test scripts/__tests__/review-schema.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```javascript
// scripts/lib/review-schema.mjs
/**
 * The review vocabulary, in one place.
 *
 * The codes are not new: the sector and claim prompts have required
 * `rejectedUnder` for a while and every rejection line in data/ carries one.
 * This lifts that vocabulary to where a human reviewer and the JSON Schema can
 * share it. `low-altitude` is added because it is the generic prompt's
 * most-used rule and had no code; `unrecorded` is written only by code.
 */
export const REJECTED_UNDER = [
  "out-of-sector", "wrong-construct", "outside-window", "too-vague",
  "stale-fieldwork", "no-original-data", "overlaps-published",
  "unverifiable-source", "not-primary-source", "commercial-intent",
  "already-in-ledger", "low-altitude", "unrecorded",
];

export function validateReview(s) {
  const r = s?._review;
  if (r === undefined) return [];
  if (typeof r !== "object" || r === null || Array.isArray(r)) {
    return ["'_review' must be an object"];
  }
  const errors = [];
  if (r.under !== undefined && !REJECTED_UNDER.includes(r.under)) {
    errors.push(`_review.under = ${JSON.stringify(r.under)} is not one of ${REJECTED_UNDER.join(" | ")}`);
  }
  for (const field of ["note", "reviewer"]) {
    if (r[field] !== undefined && typeof r[field] !== "string") {
      errors.push(`_review.${field} must be a string, got ${typeof r[field]}`);
    }
  }
  return errors;
}

/** Editorial working fields, removed before anything reaches public/. */
export function stripReviewFields(signal) {
  const { _review, $schema, ...rest } = signal;
  void _review;
  void $schema;
  return rest;
}

export function reviewEvent({ signal, decision, reviewer, ts }) {
  const r = signal?._review ?? {};
  const event = {
    ts,
    id: signal?.id ?? "",
    decision,
    by: "human",
    reviewer: r.reviewer ?? reviewer,
    under: r.under ?? "unrecorded",
    note: r.note ?? "",
  };
  if (!event.reviewer) delete event.reviewer;
  return event;
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `node --test scripts/__tests__/review-schema.test.mjs`
Expected: 11 pass

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/review-schema.mjs scripts/__tests__/review-schema.test.mjs
git commit -m "feat(signals): add review vocabulary and event shape"
```

---

### Task B2: Promote strips editorial fields and validates `_review`

**Files:**
- Modify: `scripts/promote-signals.mjs` — validation loop and the publish write
- Test: `scripts/__tests__/promote.test.mjs` (append)

**Interfaces:**
- Consumes: `validateReview`, `stripReviewFields` from B1.
- Produces: published files guaranteed free of `_review` and `$schema`.

- [ ] **Step 1: Write the failing tests**

```javascript
// append to scripts/__tests__/promote.test.mjs
test("editorial fields never reach published content", () => {
  const d = draft("2026-08-06-01", {
    $schema: "../../schemas/signal-draft.schema.json",
    _review: { under: "too-vague", note: "kept anyway", reviewer: "arto" },
  });
  const root = makeRoot({ accepted: [d] });

  promote({ root });

  const published = JSON.parse(
    readFileSync(join(root, "public/content/ai-signals/2026-08-06-01.json"), "utf8"),
  );
  assert.equal(published._review, undefined);
  assert.equal(published.$schema, undefined);
  assert.equal(published.status, "published");
});

test("an out-of-enum _review.under blocks the whole batch", () => {
  const root = makeRoot({ accepted: [draft("2026-08-06-01", { _review: { under: "made-up" } })] });

  const result = promote({ root });

  assert.equal(result.promoted.length, 0);
  assert.match(result.errors.join(" "), /_review\.under/);
  assert.ok(!existsSync(join(root, "public/content/ai-signals/2026-08-06-01.json")));
});
```

Add `readFileSync`/`existsSync` to the file's `fs` import if absent.

- [ ] **Step 2: Run and verify it fails**

Run: `node --test scripts/__tests__/promote.test.mjs`
Expected: FAIL — published file still carries `_review`

- [ ] **Step 3: Implement**

In `promote()`, inside the accepted-drafts validation loop, after `validateSignal`:

```javascript
for (const problem of validateReview(signal)) errors.push(`${file}: ${problem}`);
```

and change the publish write from `{ ...signal, status: "published" }` to:

```javascript
writeJson(join(signalsDir, `${signal.id}.json`), { ...stripReviewFields(signal), status: "published" });
```

- [ ] **Step 4: Run and verify**

Run: `npm test`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add scripts/promote-signals.mjs scripts/__tests__/promote.test.mjs
git commit -m "feat(signals): validate and strip _review at promote"
```

---

### Task B3: Promote writes the review log

**Files:**
- Modify: `scripts/promote-signals.mjs`
- Modify: `.gitignore`
- Test: `scripts/__tests__/promote.test.mjs` (append)

**Interfaces:**
- Consumes: `reviewEvent` from B1.
- Produces: `data/_review-log.jsonl`; `promote()` returns `{..., reviewed: {accepted, rejected, unrecorded}}`.

- [ ] **Step 1: Write the failing tests**

```javascript
// append to scripts/__tests__/promote.test.mjs
const readReviewLog = (root) =>
  readFileSync(join(root, "data/_review-log.jsonl"), "utf8")
    .split("\n").filter(Boolean).map((l) => JSON.parse(l));

test("each decision produces exactly one review-log event", () => {
  const root = makeRoot({
    accepted: [draft("2026-08-06-01", { _review: { under: "low-altitude", note: "kept for context", reviewer: "arto" } })],
    rejected: [draft("2026-08-06-02", { _review: { under: "commercial-intent", note: "vendor pitch", reviewer: "arto" } })],
  });

  promote({ root });

  const events = readReviewLog(root).filter((e) => e.by === "human");
  assert.equal(events.length, 2);
  const byId = Object.fromEntries(events.map((e) => [e.id, e]));
  assert.equal(byId["2026-08-06-01"].decision, "accepted");
  assert.equal(byId["2026-08-06-02"].decision, "rejected");
  assert.equal(byId["2026-08-06-02"].under, "commercial-intent");
  assert.equal(byId["2026-08-06-02"].note, "vendor pitch");
});

// A bare `mv` must keep working: refusing would punish a reviewer at the end of
// a session and break the guarantee that an interrupted review publishes nothing.
test("a draft moved without a rationale is recorded as unrecorded and does not block", () => {
  const root = makeRoot({ rejected: [draft("2026-08-06-02")] });

  const result = promote({ root });

  assert.deepEqual(result.errors, []);
  assert.equal(result.reviewed.unrecorded, 1);
  assert.equal(readReviewLog(root).find((e) => e.id === "2026-08-06-02").under, "unrecorded");
});

test("the review log is append-only across runs", () => {
  const root = makeRoot({ accepted: [draft("2026-08-06-01")] });
  promote({ root });
  writeFileSync(
    join(root, "data/signal-drafts/rejected/2026-08-06-02.json"),
    JSON.stringify(draft("2026-08-06-02")),
  );
  promote({ root });

  assert.equal(readReviewLog(root).length, 2);
});

test("the seen-ledger shape is unchanged by review logging", () => {
  const root = makeRoot({ accepted: [draft("2026-08-06-01", { _review: { under: "low-altitude" } })] });
  promote({ root });
  const rec = readLedgerLines(root)[0];
  assert.deepEqual(Object.keys(rec).sort(), ["claim", "firstSeen", "id", "key", "lastSeen", "status", "timesSeen", "url"]);
});
```

`makeRoot` in this suite must create `data/signal-drafts/rejected/` even when no rejected drafts are passed; check and extend it if not.

- [ ] **Step 2: Run and verify it fails**

Run: `node --test scripts/__tests__/promote.test.mjs`
Expected: FAIL — `data/_review-log.jsonl` does not exist

- [ ] **Step 3: Implement**

Add to `promote-signals.mjs`:

```javascript
import { appendFileSync } from "fs";
import { execFileSync } from "child_process";
import { reviewEvent, validateReview, stripReviewFields } from "./lib/review-schema.mjs";

/** git's configured name, so a reviewer never has to type their own. */
function gitUserName(root) {
  try {
    return execFileSync("git", ["config", "user.name"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function appendReviewEvents(file, events) {
  if (!events.length) return;
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, events.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
}
```

Import `dirname` from `path`. After the ledger write in `promote()`, build one event per decided draft with a single `ts` for the run, append them, and return the counts:

```javascript
const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const reviewer = gitUserName(root);
const events = [
  ...accepted.map(({ signal }) => reviewEvent({ signal, decision: "accepted", reviewer, ts })),
  ...rejected.map((signal) => reviewEvent({ signal, decision: "rejected", reviewer, ts })),
];
appendReviewEvents(resolve(root, "data/_review-log.jsonl"), events);
```

`reviewed` counts go in the return value, and `main()` prints the unrecorded count when non-zero.

Add to `.gitignore`, under the existing pipeline-files comment:

```gitignore
# Human review rationale. Free-text judgment about named vendors, publications
# and individual practitioners — not for a permanent public git history. Same
# rule as data/_finder-rejected*. This is the clearest pressure toward a private
# store; see the source-profiles/review-log design doc.
data/_review-log.jsonl
```

- [ ] **Step 4: Run and verify**

Run: `npm test && npm run lint`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add scripts/promote-signals.mjs scripts/__tests__/promote.test.mjs .gitignore
git commit -m "feat(signals): record every review decision in a review log"
```

---

### Task B4: Stop discarding the finder's rationale

**Files:**
- Modify: `scripts/promote-signals.mjs` — `finderRejections()`
- Test: `scripts/__tests__/promote.test.mjs` (append)

**Interfaces:**
- Consumes: the review log from B3.
- Produces: `by: "finder"` events carrying `under`, `note` and `reviewable`.

- [ ] **Step 1: Write the failing regression test**

```javascript
// append to scripts/__tests__/promote.test.mjs
// The prompts require reason/rejectedUnder/reviewable and finderRejections()
// copied out only claim, url and status — deleting the editorial reasoning at
// the last step. This is the regression test for that.
test("the finder's own rationale survives into the review log", () => {
  const root = makeRoot();
  writeFileSync(
    join(root, "data/_finder-rejected-some-sector.jsonl"),
    JSON.stringify({
      run: "2026-08-06",
      claim: "A declined story",
      url: "https://leaddev.com/declined",
      reason: "fieldwork traces to 2021 and predates any AI mechanism",
      rejectedUnder: "stale-fieldwork",
      reviewable: true,
    }) + "\n",
  );

  promote({ root });

  const e = readReviewLog(root).find((x) => x.by === "finder");
  assert.equal(e.under, "stale-fieldwork");
  assert.equal(e.reviewable, true);
  assert.match(e.note, /predates any AI mechanism/);
  assert.equal(e.decision, "rejected");
});

test("a finder line with no code is recorded as unrecorded, not dropped", () => {
  const root = makeRoot();
  writeFileSync(
    join(root, "data/_finder-rejected-generic.jsonl"),
    JSON.stringify({ run: "2026-08-06", claim: "C", url: "https://x.dev/1", reason: "thin" }) + "\n",
  );

  promote({ root });

  assert.equal(readReviewLog(root).find((x) => x.by === "finder").under, "unrecorded");
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test scripts/__tests__/promote.test.mjs`
Expected: FAIL — no event with `by: "finder"`

- [ ] **Step 3: Implement**

Have `finderRejections()` return both the ledger record and an event. Keep the ledger record's fields exactly as they are — the ledger stays a lean dedup index:

```javascript
function finderRejections(dataDir) {
  // ...existing parse loop, then per line:
  out.push({
    ledger: { key: keyFor({ url, claim }), claim, url, firstSeen: seen, lastSeen: seen, timesSeen: 1, status: "rejected", id: r.id || "" },
    event: {
      ts: seen, claim, url, decision: "rejected", by: "finder",
      under: REJECTED_UNDER.includes(r.rejectedUnder) ? r.rejectedUnder : "unrecorded",
      note: r.reason || "",
      ...(typeof r.reviewable === "boolean" ? { reviewable: r.reviewable } : {}),
    },
  });
}
```

Update the two call sites in `promote()`: `records` takes `.map((x) => x.ledger)`, `events` gains `.map((x) => x.event)`.

- [ ] **Step 4: Run and verify**

Run: `npm test`
Expected: all pass, including the unchanged-ledger-shape test from B3

- [ ] **Step 5: Commit**

```bash
git add scripts/promote-signals.mjs scripts/__tests__/promote.test.mjs
git commit -m "fix(signals): stop discarding the finder's rejection rationale"
```

---

### Task B5: Editor schema, prompts and docs

**Files:**
- Create: `schemas/signal-draft.schema.json`
- Modify: `docs/ai-signals-finder-prompt.md` — add `rejectedUnder`/`reviewable`, `$schema`, the `low-altitude` code
- Modify: `docs/sector-prompts/sector-prompt-instructions.md`, `docs/claim-prompts/claim-prompt-instructions.md` — add `low-altitude` and `$schema`
- Modify: `docs/ai-signals-pipeline.md`, `docs/pipeline-runbook.md`, `CLAUDE.md`

- [ ] **Step 1: Write the JSON Schema**

Draft-07, describing the signal fields plus `_review`, with `enum` and `description` on `_review.under` so VS Code shows the codes and their meaning on hover. Import `REJECTED_UNDER` values verbatim. Add a test asserting the schema's enum equals `REJECTED_UNDER`, so the two cannot drift:

```javascript
// append to scripts/__tests__/review-schema.test.mjs
import { readFileSync } from "fs";
test("the editor schema's enum matches the library's", () => {
  const schema = JSON.parse(readFileSync("schemas/signal-draft.schema.json", "utf8"));
  assert.deepEqual(schema.properties._review.properties.under.enum, REJECTED_UNDER);
});
```

- [ ] **Step 2: Run and verify the drift test fails, then passes**

Run: `node --test scripts/__tests__/review-schema.test.mjs`
Expected: FAIL (no schema file), then PASS once written.

- [ ] **Step 3: Update the prompts**

All three finder prompts emit `"$schema": "../../schemas/signal-draft.schema.json"` as the first key of every draft. The generic prompt's rejection format gains `rejectedUnder` and `reviewable` with the same wording the sector instructions use. Add `low-altitude` to the enum in all three.

State in each prompt that the agent **never writes `_review`** — that block is the human reviewer's.

- [ ] **Step 4: Update the docs**

- `ai-signals-pipeline.md`: a Review rationale section — the `_review` block, the log, why it is gitignored, and that the finder's own rationale now survives.
- `pipeline-runbook.md`: A3 shows adding `_review` before the `mv`; refusal rows for a bad `under`; note the unrecorded count in A4's output.
- `CLAUDE.md`: `schemas/` and `config/sources/` in Project Structure; the `_review` convention under Content Schema.

- [ ] **Step 5: Full verification and commit**

```bash
npm test && npm run lint && npm run build
git add -A
git commit -m "feat(signals): editor schema for drafts; align rejection vocabulary across prompts"
```

---

## Self-review

**Spec coverage.** Part A: standalone profiles (A1, A2), CLI and derived paths (A1, A3), per-profile window (A1, A3), reachability and prompt corrections (A4), run-ordering note (A4). Part B: `_review` block (B1, B2), review log and `unrecorded` fallback (B3), gitignore and privacy (B3), reviewer default (B1, B3), finder rationale retention (B4), vocabulary alignment and `low-altitude` (B1, B5), editor schema (B5). The nomination loop, Reddit OAuth and cadence are explicitly out of scope in the spec and absent here, as intended.

**Placeholders.** None: every code step carries real code, and the two steps that are prose-only (A4 Step 3–4, B5 Step 3–4) are documentation edits with named files and stated content.

**Type consistency.** `loadProfile` returns the `Profile` shape A3 destructures; `collectorsFor` takes that same object. `reviewEvent` is defined in B1 and called in B3 and B4 with the same `{signal, decision, reviewer, ts}` signature. `stripReviewFields` and `validateReview` are defined in B1 and used in B2. `REJECTED_UNDER` is imported into B4 and B5 from B1. `finderRejections()` changes shape in B4, and both call sites are named.

**Known ordering risk.** B4 changes `finderRejections()`'s return shape, so B3 must land first — B3's tests exercise the old shape and would break if reordered.
