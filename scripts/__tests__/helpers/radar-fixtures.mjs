/**
 * Shared fixtures for the radar:apply / radar:accept / radar:reject test suites.
 *
 * Node's test runner only collects files matching *.test.mjs, so this file is
 * never picked up as a suite on its own -- it exists purely to be imported by
 * files that are.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export const SIGNALS = "public/content/ai-signals";
export const PHENOMENA = "public/content/phenomena";

export const sig = (id, over = {}) => ({
  id,
  title: `T ${id}`,
  summary: "s",
  source: "Blog",
  detectedAt: "2026-08-01",
  date: "2026-08-01",
  status: "published",
  signalType: "study",
  ...over,
});

/** `over` can replace any default, including status, implications, construct,
 *  reachReviewedAt and latestEvidenceDate. */
export const phen = (id, evidence = [], over = {}) => ({
  id,
  label: "Label here",
  title: `T ${id}`,
  thesis: "A thesis.",
  construct: "the size of the delivery unit",
  status: "draft",
  primaryDimension: "organisation-and-leadership",
  implications: [],
  evidence,
  observedReach: "early-manifestations",
  reachRationale: "Because.",
  reachReviewedAt: "2026-08-01",
  ...over,
});

export function makeRoot({ signals = [], phenomena = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), "radar-fixtures-"));
  for (const [dir, items] of [
    [SIGNALS, signals],
    [PHENOMENA, phenomena],
  ]) {
    mkdirSync(join(root, dir), { recursive: true });
    for (const it of items) writeFileSync(join(root, dir, `${it.id}.json`), JSON.stringify(it, null, 2));
    writeFileSync(
      join(root, dir, "index.json"),
      JSON.stringify(
        {
          lastUpdated: "2026-01-01T00:00:00Z",
          items: items.map((i) => ({ id: i.id, file: `${i.id}.json`, date: "2026-08-01", status: i.status })),
        },
        null,
        2,
      ),
    );
  }
  mkdirSync(join(root, "data"), { recursive: true });
  return root;
}

export const read = (root, id) => JSON.parse(readFileSync(join(root, PHENOMENA, `${id}.json`), "utf8"));
export const index = (root) => JSON.parse(readFileSync(join(root, PHENOMENA, "index.json"), "utf8"));
