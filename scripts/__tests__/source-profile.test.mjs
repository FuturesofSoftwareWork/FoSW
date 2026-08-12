/**
 * Tests for source profiles — which feeds one collector run pulls from.
 *
 * The failure these guard against is quiet: a run that collects the wrong
 * sources still writes a plausible pool, and the finder scores it without any
 * sign that it answered a different question than the one asked.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  loadProfile,
  availableProfiles,
  candidatesPathFor,
  resolveWindowDays,
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
  const root = rootWith({
    generic: minimal({ profile: "generic" }),
    other: minimal({ profile: "other" }),
  });
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

// Pins the extraction from collect-candidates.mjs as a pure move. The values
// are written literally rather than compared against the constants, so the pin
// survives those constants being deleted — and so an edit to generic.json made
// in the belief that it is scratch fails here and says what it changed.
test("generic.json holds the collector's original constants verbatim", () => {
  const p = loadProfile("generic");
  assert.deepEqual(p.hackerNewsTerms, [
    "coding agent",
    "AI coding",
    "Copilot",
    "Claude Code",
    "Cursor editor",
    "LLM software engineering",
    "agentic coding",
    "AI code review",
  ]);
  assert.deepEqual(p.devtoTags, ["ai", "llm", "machinelearning", "devops", "programming"]);
  assert.deepEqual(p.subreddits, ["ExperiencedDevs", "devops", "programming", "LocalLLaMA"]);
  assert.deepEqual(p.githubRepos, [
    "microsoft/vscode",
    "cline/cline",
    "Aider-AI/aider",
    "All-Hands-AI/OpenHands",
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
