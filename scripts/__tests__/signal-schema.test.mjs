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
    // Deliberately not example.com: that is a reserved placeholder domain and
    // the schema now rejects it, which is the point of the sourceUrl tests below.
    sourceUrl: "https://leaddev.com/an-article",
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

// Three published signals reached the live site with `https://example.com/...`
// as their sourceUrl and invented figures attributed to VTT and MIT Technology
// Review. Nothing in the schema looked at sourceUrl at all, so neither promote
// nor validate had anything to say about them. On a research-communication site
// an unverifiable source is a correctness failure, not a cosmetic one.
test("a reserved placeholder host is rejected", () => {
  assert.match(validateSignal(valid({ sourceUrl: "https://example.com/arxiv" })).join(" "), /sourceUrl/);
  assert.match(validateSignal(valid({ sourceUrl: "https://example.org/x" })).join(" "), /sourceUrl/);
  assert.match(validateSignal(valid({ sourceUrl: "https://example.net" })).join(" "), /sourceUrl/);
});

// RFC 2606 reserves the whole subtree, and a fabricated URL is as likely to be
// dressed up with a subdomain as not.
test("a subdomain of a reserved host is rejected too", () => {
  assert.match(validateSignal(valid({ sourceUrl: "https://www.example.com/a" })).join(" "), /sourceUrl/);
  assert.match(validateSignal(valid({ sourceUrl: "http://research.example.org" })).join(" "), /sourceUrl/);
});

test("localhost and the reserved test TLDs are rejected", () => {
  for (const url of ["http://localhost:5173/x", "https://foo.test/a", "https://foo.invalid/a"]) {
    assert.match(validateSignal(valid({ sourceUrl: url })).join(" "), /sourceUrl/, url);
  }
});

test("a sourceUrl that is not a URL at all is rejected", () => {
  assert.match(validateSignal(valid({ sourceUrl: "not a url" })).join(" "), /sourceUrl/);
  assert.match(validateSignal(valid({ sourceUrl: "leaddev.com/article" })).join(" "), /sourceUrl/);
});

// The site renders sourceUrl straight into an href, so a non-http scheme is
// both useless as a citation and the shape a script-injection attempt takes.
test("only http and https are accepted schemes", () => {
  assert.match(validateSignal(valid({ sourceUrl: "ftp://ftp.example.org/p" })).join(" "), /sourceUrl/);
  assert.match(validateSignal(valid({ sourceUrl: "javascript:alert(1)" })).join(" "), /sourceUrl/);
  assert.deepEqual(validateSignal(valid({ sourceUrl: "http://leaddev.com/a" })), []);
});

// sourceUrl is optional in the schema and several legitimate published signals
// have none. Absent must stay absent-and-fine, or this check fails the corpus.
test("an absent sourceUrl is still allowed", () => {
  const s = valid();
  delete s.sourceUrl;
  assert.deepEqual(validateSignal(s), []);
});

test("a real source URL passes", () => {
  assert.deepEqual(validateSignal(valid({ sourceUrl: "https://newsletter.pragmaticengineer.com/p/x" })), []);
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
