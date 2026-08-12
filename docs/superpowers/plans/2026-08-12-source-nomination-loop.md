# Source Nomination Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a finder run nominate the sources it found productive, so a human can promote them into a source profile instead of re-finding the same writers every week.

**Architecture:** One pure library (`feed-discovery.mjs`) plus two thin CLIs. Discovery takes an injectable fetcher so the whole path is testable without network. Promotion is pure filesystem. Nomination files follow the signal-draft contract exactly: agent proposes, human moves the file, script promotes.

**Tech Stack:** Node 22 ESM, `node --test`, zero runtime dependencies.

**Spec:** [`docs/superpowers/specs/2026-08-12-source-nomination-loop-design.md`](../specs/2026-08-12-source-nomination-loop-design.md)

## Global Constraints

- Zero new npm dependencies.
- **No network in tests**, ever. Discovery takes an injected fetcher.
- `npm run lint` allows zero warnings; `preserve-caught-error` requires `{ cause: e }` on any error thrown from a `catch`.
- Some source files have mixed line endings. Prefer Edit/Write, or line-based Node edits; a `\n\n` marker match will fail.
- `data/source-nominations/` is gitignored — unreviewed material naming individuals on a public repo.
- Reuse rather than reimplement: `parseFeed` from `collect-candidates.mjs`, `normalizeUrl` from `ledger.mjs`, `loadProfile`/`availableProfiles` from `lib/source-profile.mjs`.
- Every task ends green on `npm test` and `npm run lint`, then commits.
- TDD: write the failing test, watch it fail for the right reason, then implement.

---

### Task N1: Feed-discovery library

**Files:**
- Create: `scripts/lib/feed-discovery.mjs`
- Test: `scripts/__tests__/feed-discovery.test.mjs`

**Interfaces:**
- Produces:
  - `slugify(name: string): string`
  - `findFeedUrls(html: string, baseUrl: string): string[]` — absolute, document order, deduped
  - `fallbackFeedUrls(baseUrl: string): string[]` — conventional paths against the origin
  - `FALLBACK_PATHS: string[]`

- [ ] **Step 1: Write the failing tests**

```javascript
// scripts/__tests__/feed-discovery.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { slugify, findFeedUrls, fallbackFeedUrls } from "../lib/feed-discovery.mjs";

test("slugify makes a filename stem from a person's name", () => {
  assert.equal(slugify("Jono Herrington"), "jono-herrington");
  assert.equal(slugify("InfoQ Culture & Methods"), "infoq-culture-methods");
  assert.equal(slugify("  spaced  out  "), "spaced-out");
});

// Publishers order link attributes however they like, so matching must not
// assume rel comes before type.
test("a feed link is found with attributes in either order", () => {
  const relFirst = `<link rel="alternate" type="application/rss+xml" href="https://x.dev/rss.xml">`;
  const typeFirst = `<link type="application/rss+xml" rel="alternate" href="https://x.dev/rss.xml">`;
  assert.deepEqual(findFeedUrls(relFirst, "https://x.dev/p/1"), ["https://x.dev/rss.xml"]);
  assert.deepEqual(findFeedUrls(typeFirst, "https://x.dev/p/1"), ["https://x.dev/rss.xml"]);
});

test("Atom links are found as well as RSS", () => {
  const html = `<link rel="alternate" type="application/atom+xml" href="/atom.xml"/>`;
  assert.deepEqual(findFeedUrls(html, "https://x.dev/p/1"), ["https://x.dev/atom.xml"]);
});

test("relative and protocol-relative hrefs resolve against the page URL", () => {
  const html = `
    <link rel="alternate" type="application/rss+xml" href="/feed/">
    <link rel='alternate' type='application/atom+xml' href='//cdn.x.dev/atom.xml'>`;
  assert.deepEqual(findFeedUrls(html, "https://x.dev/posts/one"), [
    "https://x.dev/feed/",
    "https://cdn.x.dev/atom.xml",
  ]);
});

test("several feeds keep document order and are deduped", () => {
  const html = `
    <link rel="alternate" type="application/rss+xml" href="https://x.dev/a.xml">
    <link rel="alternate" type="application/atom+xml" href="https://x.dev/b.xml">
    <link rel="alternate" type="application/rss+xml" href="https://x.dev/a.xml">`;
  assert.deepEqual(findFeedUrls(html, "https://x.dev/"), ["https://x.dev/a.xml", "https://x.dev/b.xml"]);
});

// A stylesheet or icon link must not be mistaken for a feed.
test("non-feed link tags are ignored", () => {
  const html = `
    <link rel="stylesheet" href="/style.css">
    <link rel="icon" type="image/png" href="/favicon.png">
    <link rel="alternate" type="text/html" href="/amp">`;
  assert.deepEqual(findFeedUrls(html, "https://x.dev/"), []);
});

test("a page with no links yields none rather than throwing", () => {
  assert.deepEqual(findFeedUrls("<html><body>hi</body></html>", "https://x.dev/"), []);
  assert.deepEqual(findFeedUrls("", "https://x.dev/"), []);
});

test("an unparseable base URL yields no candidates rather than throwing", () => {
  assert.deepEqual(findFeedUrls(`<link rel="alternate" type="application/rss+xml" href="/f">`, "not a url"), []);
  assert.deepEqual(fallbackFeedUrls("not a url"), []);
});

// Every feed in the first hand-built profile was found this way, because none
// of those sites advertised one in a link tag.
test("fallback paths are built against the origin, discarding the path", () => {
  const urls = fallbackFeedUrls("https://x.dev/posts/one?a=1");
  assert.ok(urls.includes("https://x.dev/rss.xml"));
  assert.ok(urls.includes("https://x.dev/feed"));
  assert.ok(urls.every((u) => u.startsWith("https://x.dev/")));
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test scripts/__tests__/feed-discovery.test.mjs`
Expected: FAIL — `Cannot find module '../lib/feed-discovery.mjs'`

- [ ] **Step 3: Implement**

```javascript
// scripts/lib/feed-discovery.mjs
/**
 * Finding a writer's feed from a page they published on.
 *
 * Code's job, not the model's: asking an LLM to guess a feed path produces
 * plausible 404s. Seeding the first source profile by hand needed a probe over
 * six candidate paths per domain, and none of those five sites advertised a
 * feed in a <link> tag — which is why the fallback list matters as much as the
 * tag parsing.
 *
 * String-based rather than a real HTML parse, matching the collector's
 * zero-dependency feed reader. We need one attribute off one kind of tag.
 */

/** Conventional feed paths, for sites that publish one without advertising it. */
export const FALLBACK_PATHS = ["/rss.xml", "/feed", "/feed.xml", "/index.xml", "/atom.xml", "/rss"];

const FEED_TYPE = /application\/(rss|atom)\+xml/i;

export function slugify(name) {
  return String(name ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Absolute feed URLs advertised by the page, in document order.
 *
 * Attribute order varies between publishers, so the tag is matched first and
 * its attributes read individually rather than in one positional pattern.
 */
export function findFeedUrls(html, baseUrl) {
  const out = [];
  const seen = new Set();
  for (const tag of String(html ?? "").match(/<link\b[^>]*>/gi) ?? []) {
    if (!/\brel\s*=\s*["']?alternate/i.test(tag)) continue;
    const type = tag.match(/\btype\s*=\s*["']([^"']+)["']/i);
    if (!type || !FEED_TYPE.test(type[1])) continue;
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (!href) continue;
    let absolute;
    try {
      absolute = new URL(href[1], baseUrl).href;
    } catch {
      continue; // an unresolvable href is not a candidate
    }
    if (seen.has(absolute)) continue;
    seen.add(absolute);
    out.push(absolute);
  }
  return out;
}

export function fallbackFeedUrls(baseUrl) {
  let origin;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return [];
  }
  return FALLBACK_PATHS.map((p) => `${origin}${p}`);
}
```

- [ ] **Step 4: Run and verify it passes**

Run: `node --test scripts/__tests__/feed-discovery.test.mjs` — expected 9 pass
Then: `npm test && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/feed-discovery.mjs scripts/__tests__/feed-discovery.test.mjs
git commit -m "feat(sources): add feed discovery from a page URL"
```

---

### Task N2: `sources:discover`

**Files:**
- Create: `scripts/sources-discover.mjs`
- Test: `scripts/__tests__/sources-discover.test.mjs`
- Modify: `package.json` — `"sources:discover": "node scripts/sources-discover.mjs"`

**Interfaces:**
- Consumes: `findFeedUrls`, `fallbackFeedUrls` (N1); `parseFeed` from `../collect-candidates.mjs`; `loadProfile` from `lib/source-profile.mjs`; `normalizeUrl` from `ledger.mjs`.
- Produces: `discover({root, fetcher, force}): Promise<{checked, resolved, unresolved, skipped}>` — `fetcher(url) => Promise<{ok, text()}>`, defaulting to `fetch`.

- [ ] **Step 1: Write the failing tests**

```javascript
// scripts/__tests__/sources-discover.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { discover } from "../sources-discover.mjs";

const NOMS = "data/source-nominations";

const FEED_XML = `<rss><channel>
  <item><title>A post</title><link>https://x.dev/a</link><pubDate>Mon, 10 Aug 2026 09:00:00 GMT</pubDate></item>
</channel></rss>`;

/** A fetcher over a fixed url -> body map. Anything unlisted 404s. */
function stubFetcher(pages) {
  return async (url) => {
    if (!(url in pages)) return { ok: false, status: 404, text: async () => "" };
    return { ok: true, status: 200, text: async () => pages[url] };
  };
}

function rootWith(nominations, profiles = {}) {
  const root = mkdtempSync(join(tmpdir(), "noms-"));
  mkdirSync(join(root, NOMS, "accepted"), { recursive: true });
  mkdirSync(join(root, NOMS, "rejected"), { recursive: true });
  mkdirSync(join(root, "config/sources"), { recursive: true });
  for (const n of nominations) {
    writeFileSync(join(root, NOMS, `${n.name.toLowerCase().replace(/\W+/g, "-")}.json`), JSON.stringify(n, null, 2));
  }
  for (const [name, body] of Object.entries(profiles)) {
    writeFileSync(join(root, "config/sources", `${name}.json`), JSON.stringify(body));
  }
  return root;
}

const readNoms = (root) =>
  require("fs")
    .readdirSync(join(root, NOMS))
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(root, NOMS, f), "utf8")));

const nom = (over = {}) => ({
  name: "Jono Herrington",
  profile: "p",
  foundAt: "https://x.dev/posts/one",
  why: "firsthand account",
  ...over,
});

test("a page advertising a feed resolves it", async () => {
  const root = rootWith([nom()]);
  const fetcher = stubFetcher({
    "https://x.dev/posts/one": `<link rel="alternate" type="application/rss+xml" href="/rss.xml">`,
    "https://x.dev/rss.xml": FEED_XML,
  });

  const result = await discover({ root, fetcher });

  assert.equal(result.resolved, 1);
  const [n] = readNoms(root);
  assert.equal(n.feed, "https://x.dev/rss.xml");
  assert.match(n.feedStatus, /^ok/);
  assert.match(n.feedStatus, /1 entr/);
});

// None of the five feeds in the first profile were advertised in a link tag.
test("a site advertising nothing is resolved by a fallback path", async () => {
  const root = rootWith([nom()]);
  const fetcher = stubFetcher({
    "https://x.dev/posts/one": "<html><body>no link tags here</body></html>",
    "https://x.dev/feed": FEED_XML,
  });

  const result = await discover({ root, fetcher });

  assert.equal(result.resolved, 1);
  assert.equal(readNoms(root)[0].feed, "https://x.dev/feed");
});

// "This person has no feed" is a reason to reject, not an error.
test("no feed anywhere is recorded, not thrown", async () => {
  const root = rootWith([nom()]);
  const fetcher = stubFetcher({ "https://x.dev/posts/one": "<html></html>" });

  const result = await discover({ root, fetcher });

  assert.equal(result.unresolved, 1);
  const [n] = readNoms(root);
  assert.equal(n.feed, undefined);
  assert.match(n.feedStatus, /no feed found/);
});

// A URL that returns 200 but is not a feed must not be accepted: the collector
// would then carry a source it cannot read.
test("a candidate that fetches but parses to nothing is rejected", async () => {
  const root = rootWith([nom()]);
  const fetcher = stubFetcher({
    "https://x.dev/posts/one": `<link rel="alternate" type="application/rss+xml" href="/rss.xml">`,
    "https://x.dev/rss.xml": "<html>not a feed</html>",
  });

  const result = await discover({ root, fetcher });

  assert.equal(result.unresolved, 1);
  assert.equal(readNoms(root)[0].feed, undefined);
});

test("an already-resolved nomination is skipped, and --force re-runs it", async () => {
  const root = rootWith([nom({ feed: "https://x.dev/old.xml", feedStatus: "ok — 3 entries" })]);
  const fetcher = stubFetcher({
    "https://x.dev/posts/one": `<link rel="alternate" type="application/rss+xml" href="/rss.xml">`,
    "https://x.dev/rss.xml": FEED_XML,
  });

  assert.equal((await discover({ root, fetcher })).skipped, 1);
  assert.equal(readNoms(root)[0].feed, "https://x.dev/old.xml");

  await discover({ root, fetcher, force: true });
  assert.equal(readNoms(root)[0].feed, "https://x.dev/rss.xml");
});

test("a feed already in the target profile is flagged", async () => {
  const root = rootWith([nom()], {
    p: { profile: "p", feeds: [{ name: "Someone", url: "https://x.dev/rss.xml/" }] },
  });
  const fetcher = stubFetcher({
    "https://x.dev/posts/one": `<link rel="alternate" type="application/rss+xml" href="/rss.xml">`,
    "https://x.dev/rss.xml": FEED_XML,
  });

  await discover({ root, fetcher });

  assert.equal(readNoms(root)[0].alreadyInProfile, true);
});

test("accepted and rejected folders are not touched", async () => {
  const root = rootWith([]);
  writeFileSync(join(root, NOMS, "accepted", "x.json"), JSON.stringify(nom({ name: "X" })));
  const before = readFileSync(join(root, NOMS, "accepted", "x.json"), "utf8");

  await discover({ root, fetcher: stubFetcher({}) });

  assert.equal(readFileSync(join(root, NOMS, "accepted", "x.json"), "utf8"), before);
});
```

Replace the `require("fs")` in `readNoms` with the imported `readdirSync` — the helper is written that way only for brevity here.

- [ ] **Step 2: Run and verify it fails**

Run: `node --test scripts/__tests__/sources-discover.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

`discover()` reads `*.json` in the queue root only. For each: skip when `feed` is set and `feedStatus` starts `ok` and `!force`; otherwise fetch `foundAt`, build candidates as `findFeedUrls(html, foundAt)` then `fallbackFeedUrls(foundAt)`, and take the first whose body yields `parseFeed(...).length > 0`. Write back `feed`, `feedStatus` (`ok — N entries, newest YYYY-MM-DD` or `no feed found (tried N candidates)`), `discoveredAt`, and `alreadyInProfile` when the profile loads and already carries that normalised URL. A failed page fetch is `feedStatus: "could not fetch foundAt"`, not a throw. Guard `main()` with the usual direct-invocation check.

- [ ] **Step 4: Run and verify**

Run: `npm test && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add scripts/sources-discover.mjs scripts/__tests__/sources-discover.test.mjs package.json
git commit -m "feat(sources): discover and verify a nominee's feed"
```

---

### Task N3: `sources:promote`

**Files:**
- Create: `scripts/sources-promote.mjs`
- Test: `scripts/__tests__/sources-promote.test.mjs`
- Modify: `package.json` — `"sources:promote": "node scripts/sources-promote.mjs"`

**Interfaces:**
- Consumes: `normalizeUrl` from `ledger.mjs`; profile files from `config/sources/`.
- Produces: `promoteSources({root}): {promoted: Array<{name, url, profile}>, errors: string[], queued: number}`.

- [ ] **Step 1: Write the failing tests**

```javascript
// scripts/__tests__/sources-promote.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { promoteSources } from "../sources-promote.mjs";

const NOMS = "data/source-nominations";

const ready = (over = {}) => ({
  name: "Jono Herrington",
  profile: "p",
  foundAt: "https://x.dev/posts/one",
  why: "firsthand account",
  feed: "https://x.dev/rss.xml",
  feedStatus: "ok — 24 entries, newest 2026-08-09",
  ...over,
});

function rootWith({ accepted = [], rejected = [], queued = [], profiles = { p: { profile: "p", feeds: [] } } } = {}) {
  const root = mkdtempSync(join(tmpdir(), "srcprom-"));
  mkdirSync(join(root, NOMS, "accepted"), { recursive: true });
  mkdirSync(join(root, NOMS, "rejected"), { recursive: true });
  mkdirSync(join(root, "config/sources"), { recursive: true });
  const put = (dir, items) =>
    items.forEach((n, i) => writeFileSync(join(root, dir, `n${i}.json`), JSON.stringify(n, null, 2)));
  put(NOMS, queued);
  put(join(NOMS, "accepted"), accepted);
  put(join(NOMS, "rejected"), rejected);
  for (const [name, body] of Object.entries(profiles)) {
    writeFileSync(join(root, "config/sources", `${name}.json`), JSON.stringify(body, null, 2));
  }
  return root;
}

const readProfile = (root, name) =>
  JSON.parse(readFileSync(join(root, "config/sources", `${name}.json`), "utf8"));

test("an accepted nomination is appended to its profile's feeds", () => {
  const root = rootWith({
    accepted: [ready()],
    profiles: { p: { profile: "p", description: "keep me", feeds: [{ name: "First", url: "https://a.dev/f" }] } },
  });

  const result = promoteSources({ root });

  assert.deepEqual(result.errors, []);
  const p = readProfile(root, "p");
  assert.deepEqual(p.feeds, [
    { name: "First", url: "https://a.dev/f" },
    { name: "Jono Herrington", url: "https://x.dev/rss.xml" },
  ]);
  assert.equal(p.description, "keep me", "other keys must survive");
});

test("nominations route to their own profiles in one run", () => {
  const root = rootWith({
    accepted: [ready(), ready({ name: "Other", profile: "q", feed: "https://y.dev/rss" })],
    profiles: { p: { profile: "p", feeds: [] }, q: { profile: "q", feeds: [] } },
  });

  promoteSources({ root });

  assert.equal(readProfile(root, "p").feeds.length, 1);
  assert.equal(readProfile(root, "q").feeds[0].name, "Other");
});

test("the accepted file is consumed and the rejected one is kept", () => {
  const root = rootWith({ accepted: [ready()], rejected: [ready({ name: "No" })] });

  promoteSources({ root });

  assert.ok(!existsSync(join(root, NOMS, "accepted", "n0.json")));
  assert.ok(existsSync(join(root, NOMS, "rejected", "n0.json")), "rejections are the memory that stops re-nomination");
});

test("a nomination without a verified feed blocks the batch", () => {
  const root = rootWith({ accepted: [ready({ feed: undefined, feedStatus: "no feed found" })] });

  const result = promoteSources({ root });

  assert.equal(result.promoted.length, 0);
  assert.match(result.errors.join(" "), /feed/);
  assert.deepEqual(readProfile(root, "p").feeds, []);
});

test("an unknown profile blocks the batch", () => {
  const root = rootWith({ accepted: [ready({ profile: "nope" })] });

  const result = promoteSources({ root });

  assert.match(result.errors.join(" "), /nope/);
  assert.equal(result.promoted.length, 0);
});

// Two entries for one feed would silently double that source's weight in the pool.
test("a feed already in the profile is refused, ignoring scheme and trailing slash", () => {
  const root = rootWith({
    accepted: [ready()],
    profiles: { p: { profile: "p", feeds: [{ name: "Same", url: "http://x.dev/rss.xml/" }] } },
  });

  const result = promoteSources({ root });

  assert.match(result.errors.join(" "), /already/);
  assert.equal(readProfile(root, "p").feeds.length, 1);
});

test("one bad nomination blocks a good one in the same batch", () => {
  const root = rootWith({ accepted: [ready(), ready({ name: "Bad", profile: "nope" })] });

  promoteSources({ root });

  assert.deepEqual(readProfile(root, "p").feeds, []);
  assert.ok(existsSync(join(root, NOMS, "accepted", "n0.json")), "nothing is consumed when the batch fails");
});

test("the unreviewed queue is reported and never touched", () => {
  const root = rootWith({ queued: [ready({ name: "Unreviewed" })] });

  const result = promoteSources({ root });

  assert.equal(result.queued, 1);
  assert.equal(result.promoted.length, 0);
  assert.ok(existsSync(join(root, NOMS, "n0.json")));
});

test("a second run with nothing accepted is a no-op", () => {
  const root = rootWith({ accepted: [ready()] });
  promoteSources({ root });
  const after = readProfile(root, "p");

  promoteSources({ root });

  assert.deepEqual(readProfile(root, "p"), after);
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `node --test scripts/__tests__/sources-promote.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

Validate the whole batch before writing anything, exactly as `promote-signals.mjs` does. Per nomination require `profile` naming an existing `config/sources/<profile>.json`, a `feed`, and a `feedStatus` starting `ok`; reject a normalised-URL duplicate against both the profile's existing feeds and the rest of the batch. On success, append `{name, url}` to each touched profile, rewrite it with 2-space JSON and a trailing newline, then delete the consumed accepted files. Report the queue depth. Guard `main()`; exit 1 on errors.

- [ ] **Step 4: Run and verify**

Run: `npm test && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add scripts/sources-promote.mjs scripts/__tests__/sources-promote.test.mjs package.json
git commit -m "feat(sources): promote accepted nominations into a source profile"
```

---

### Task N4: Prompts, docs and gitignore

**Files:**
- Modify: `.gitignore`
- Modify: `docs/sector-prompts/sector-prompt-instructions.md` — report section 5 becomes structured output
- Modify: `docs/claim-prompts/claim-prompt-instructions.md`, `docs/ai-signals-finder-prompt.md`
- Modify: `docs/ai-signals-pipeline.md`, `docs/pipeline-runbook.md`, `CLAUDE.md`

- [ ] **Step 1: Gitignore the queue**

```gitignore
# Source nominations awaiting review. Unreviewed material naming individuals, on
# a public repo, plus a reviewer's reasons for declining a named person. Same
# rule as data/_review-log.jsonl and data/_finder-rejected*.
data/source-nominations/
```

- [ ] **Step 2: Turn report section 5 into structured nominations**

Section 5 currently asks, in prose, *"would a dedicated candidate collector have helped? If yes, which feeds…"*. Keep the prose verdict, and add: write one `data/source-nominations/<slug>.json` per source you would want collected every run, with `name`, `profile`, `foundAt`, `why` and `signalId` where there is one.

State the criterion — **nominate a source when you drafted, or seriously considered drafting, a signal from it this run** — and that the finder must check the profile plus all three nomination folders first and never re-nominate what is there. State that the finder does not write `feed`: `sources:discover` finds and verifies it. Mirror a short version into the claim and generic prompts.

- [ ] **Step 3: Document the loop**

`ai-signals-pipeline.md` gains a *Source nominations* section under Source profiles: the four-step diagram, the feeds-only scope and why, what `discover` writes, what `promote` refuses, and that rejections are the memory. `pipeline-runbook.md` gains the commands, a refusal-table row per refusal, and the note that the queue is gitignored and therefore local. `CLAUDE.md` gains the two commands.

- [ ] **Step 4: Verify and commit**

```bash
npm test && npm run lint && npm run build
git add -A
git commit -m "docs(sources): document the nomination loop; gitignore the queue"
```

---

## Self-review

**Spec coverage.** Nomination file shape (N2, N4); slug (N1); feed discovery incl. fallbacks (N1, N2); injectable fetcher (N2); idempotence and `--force` (N2); `alreadyInProfile` (N2); promotion, routing and every refusal (N3); accepted consumed, rejected kept (N3); gitignore and privacy (N4); nomination criterion and prompt wiring (N4); docs (N4). Out-of-scope items appear nowhere, as intended.

**Placeholders.** None: every code step carries real code, and N4's steps name exact files and state the content to write.

**Type consistency.** `findFeedUrls`/`fallbackFeedUrls`/`slugify` are defined in N1 and consumed in N2 with those names. `discover({root, fetcher, force})` and `promoteSources({root})` are used consistently in their own tests. The nomination object's keys are identical across N2 and N3 fixtures.

**Known ordering risk.** N3 depends on N2 only through the shape of a resolved nomination, not through code, so the two could be built in either order — but N2 first keeps the test fixtures honest, since `ready()` in N3 is exactly what `discover` produces.
