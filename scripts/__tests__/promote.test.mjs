import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { promote } from "../promote-signals.mjs";

const SIGNALS = "public/content/ai-signals";
const DRAFTS = "data/signal-drafts";

/** A schema-valid draft; overrides let a test make exactly one thing wrong. */
function draft(id, overrides = {}) {
  return {
    id,
    title: `Title ${id}`,
    summary: "A summary.",
    source: "Practitioner Blog",
    // Not example.com: the schema rejects reserved placeholder domains.
    sourceUrl: `https://leaddev.com/${id}`,
    detectedAt: "2026-08-06",
    date: "2026-08-05",
    status: "draft",
    category: ["Work Wellbeing"],
    ...overrides,
  };
}

/** Build an isolated repo-shaped tree so no test touches real content. */
function makeRoot({ accepted = [], rejected = [], queued = [], indexItems = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), "promote-"));
  mkdirSync(join(root, SIGNALS), { recursive: true });
  mkdirSync(join(root, DRAFTS, "accepted"), { recursive: true });
  mkdirSync(join(root, DRAFTS, "rejected"), { recursive: true });
  writeFileSync(
    join(root, SIGNALS, "index.json"),
    JSON.stringify({ lastUpdated: "2026-01-01T00:00:00Z", items: indexItems }, null, 2),
  );
  const put = (dir, items) => {
    for (const d of items) writeFileSync(join(root, dir, `${d.id}.json`), JSON.stringify(d, null, 2));
  };
  put(DRAFTS, queued);
  put(join(DRAFTS, "accepted"), accepted);
  put(join(DRAFTS, "rejected"), rejected);
  return root;
}

const readIndex = (root) => JSON.parse(readFileSync(join(root, SIGNALS, "index.json"), "utf8"));
const readLedgerLines = (root) => {
  const f = join(root, "data/_seen-ledger.jsonl");
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
};

test("an accepted draft is moved into public and marked published", () => {
  const root = makeRoot({ accepted: [draft("2026-08-06-01")] });

  const result = promote({ root });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.promoted, ["2026-08-06-01"]);
  const moved = JSON.parse(readFileSync(join(root, SIGNALS, "2026-08-06-01.json"), "utf8"));
  assert.equal(moved.status, "published");
  assert.ok(!existsSync(join(root, DRAFTS, "accepted", "2026-08-06-01.json")), "draft should be gone");
});

test("each promoted item gains one index entry and lastUpdated moves", () => {
  const root = makeRoot({ accepted: [draft("2026-08-06-01"), draft("2026-08-06-02")] });

  promote({ root });

  const index = readIndex(root);
  assert.equal(index.items.length, 2);
  assert.deepEqual(
    index.items.map((i) => i.file).sort(),
    ["2026-08-06-01.json", "2026-08-06-02.json"],
  );
  assert.equal(index.items[0].status, "published");
  assert.notEqual(index.lastUpdated, "2026-01-01T00:00:00Z");
});

test("index entries are appended after existing ones", () => {
  const existing = { id: "2026-01-01-01", file: "2026-01-01-01.json", date: "2026-01-01", status: "published" };
  const root = makeRoot({ accepted: [draft("2026-08-06-01")], indexItems: [existing] });

  promote({ root });

  const index = readIndex(root);
  assert.equal(index.items[0].id, "2026-01-01-01", "existing entry stays first");
  assert.equal(index.items[1].id, "2026-08-06-01");
});

test("the unreviewed queue is left alone and reported", () => {
  const root = makeRoot({ accepted: [draft("2026-08-06-01")], queued: [draft("2026-08-06-09")] });

  const result = promote({ root });

  assert.equal(result.queued, 1);
  assert.ok(existsSync(join(root, DRAFTS, "2026-08-06-09.json")), "queued draft must not move");
  assert.ok(!existsSync(join(root, SIGNALS, "2026-08-06-09.json")));
});

test("rejected drafts are recorded but never published", () => {
  const root = makeRoot({ rejected: [draft("2026-08-06-07")] });

  const result = promote({ root });

  assert.deepEqual(result.promoted, []);
  assert.ok(!existsSync(join(root, SIGNALS, "2026-08-06-07.json")));
  assert.ok(existsSync(join(root, DRAFTS, "rejected", "2026-08-06-07.json")), "file stays put");
  const rejected = readLedgerLines(root).filter((r) => r.status === "rejected");
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].id, "2026-08-06-07");
});

test("promoted items are recorded in the ledger as published", () => {
  const root = makeRoot({ accepted: [draft("2026-08-06-01")] });

  promote({ root });

  const published = readLedgerLines(root).filter((r) => r.status === "published");
  assert.equal(published.length, 1);
  assert.equal(published[0].url, "https://leaddev.com/2026-08-06-01");
});

test("finder rejection lines reach the ledger", () => {
  const root = makeRoot();
  writeFileSync(
    join(root, "data/_finder-rejected-some-sector.jsonl"),
    JSON.stringify({
      run: "2026-08-06",
      claim: "A declined story",
      url: "https://leaddev.com/declined",
      reason: "stale fieldwork",
      rejectedUnder: "stale-fieldwork",
      reviewable: false,
    }) + "\n",
  );

  promote({ root });

  const rejected = readLedgerLines(root).filter((r) => r.status === "rejected");
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].url, "https://leaddev.com/declined");
});

test("one invalid accepted draft blocks the whole batch", () => {
  const root = makeRoot({
    // A capitalised sourceType — a violation the corpus has actually produced.
    // This used to use `decisionHorizon: "watch"`, but that field is no longer
    // validated, so it would have made this test assert nothing.
    accepted: [draft("2026-08-06-01"), draft("2026-08-06-02", { sourceType: "Academic" })],
  });

  const result = promote({ root });

  assert.ok(result.errors.length > 0);
  assert.match(result.errors.join(" "), /sourceType/);
  assert.deepEqual(result.promoted, []);
  assert.equal(readdirSync(join(root, SIGNALS)).length, 1, "only index.json should exist");
  assert.ok(existsSync(join(root, DRAFTS, "accepted", "2026-08-06-01.json")), "valid draft stays staged");
  assert.equal(readIndex(root).items.length, 0);
});

test("an existing published file is never overwritten", () => {
  const root = makeRoot({ accepted: [draft("2026-08-06-01", { title: "New" })] });
  writeFileSync(
    join(root, SIGNALS, "2026-08-06-01.json"),
    JSON.stringify(draft("2026-08-06-01", { title: "Already here", status: "published" }), null, 2),
  );

  const result = promote({ root });

  assert.ok(result.errors.length > 0);
  assert.match(result.errors.join(" "), /2026-08-06-01/);
  const onDisk = JSON.parse(readFileSync(join(root, SIGNALS, "2026-08-06-01.json"), "utf8"));
  assert.equal(onDisk.title, "Already here", "published content must survive");
});

test("nothing to do is a clean no-op", () => {
  const root = makeRoot();

  const result = promote({ root });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.promoted, []);
  assert.equal(readIndex(root).items.length, 0);
});

test("a second run adds nothing", () => {
  const root = makeRoot({ accepted: [draft("2026-08-06-01")], rejected: [draft("2026-08-06-07")] });

  const first = promote({ root });
  const afterFirst = readLedgerLines(root).length;
  const result = promote({ root });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.promoted, []);
  assert.equal(readIndex(root).items.length, 1);
  assert.equal(readLedgerLines(root).length, afterFirst, "ledger must not double up");
  assert.equal(first.ledger.added, 2, "first run records the promoted and the rejected item");
  assert.equal(result.ledger.added, 0, "second run must report nothing newly recorded");
  // Only the rejected draft is still on disk to re-record; the promoted one
  // left accepted/ on the first run.
  assert.equal(result.ledger.skipped, 1);
});

// ---------- editorial review fields ----------

// _review is a candid judgement about a named source and $schema is an editor
// affordance. Neither belongs on a public research site.
test("editorial fields never reach published content", () => {
  const d = draft("2026-08-06-01", {
    $schema: "../../schemas/signal-draft.schema.json",
    _review: { under: "too-vague", note: "kept anyway", reviewer: "arto" },
  });
  const root = makeRoot({ accepted: [d] });

  promote({ root });

  const published = JSON.parse(
    readFileSync(join(root, SIGNALS, "2026-08-06-01.json"), "utf8"),
  );
  assert.equal(published._review, undefined);
  assert.equal(published.$schema, undefined);
  assert.equal(published.status, "published");
  assert.equal(published.title, "Title 2026-08-06-01");
});

test("an out-of-enum _review.under blocks the whole batch", () => {
  const root = makeRoot({ accepted: [draft("2026-08-06-01", { _review: { under: "made-up" } })] });

  const result = promote({ root });

  assert.equal(result.promoted.length, 0);
  assert.match(result.errors.join(" "), /_review\.under/);
  assert.ok(!existsSync(join(root, SIGNALS, "2026-08-06-01.json")));
});

// ---------- the review log ----------

const readReviewLog = (root) => {
  const f = join(root, "data/_review-log.jsonl");
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
};

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
    join(root, DRAFTS, "rejected", "2026-08-06-02.json"),
    JSON.stringify(draft("2026-08-06-02")),
  );
  promote({ root });

  assert.equal(readReviewLog(root).length, 2);
});

// Judgment lives in the review log; the ledger stays a lean dedup index.
test("the seen-ledger shape is unchanged by review logging", () => {
  const root = makeRoot({ accepted: [draft("2026-08-06-01", { _review: { under: "low-altitude", note: "n" } })] });

  promote({ root });

  assert.deepEqual(Object.keys(readLedgerLines(root)[0]).sort(), [
    "claim", "firstSeen", "id", "key", "lastSeen", "status", "timesSeen", "url",
  ]);
});
