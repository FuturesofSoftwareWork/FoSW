#!/usr/bin/env node
/**
 * Generate schemas/signal-draft.schema.json from the two schema libraries.
 *
 * The file exists to give an editor something to work with: a reviewer adds a
 * `_review` block to a draft in VS Code, and this is what offers the
 * `under` codes with their meanings on hover. `.vscode/settings.json` is
 * gitignored, so an inline `$schema` key in each draft is the only wiring that
 * survives a fresh checkout.
 *
 * Generated rather than hand-written so the codes cannot drift from
 * scripts/lib/review-schema.mjs — an editor offering a value that `promote`
 * then rejects is worse than no autocomplete at all. A test asserts the two
 * match; this script is how you fix it when they do not.
 *
 *   npm run schema:build
 */

import { writeFileSync, mkdirSync } from "fs";
import { REJECTED_UNDER } from "./lib/review-schema.mjs";
import {
  SOURCE_TYPES,
  SIGNAL_TYPES,
  SIGNAL_STRENGTHS,
  SIGNAL_STAGES,
  AVAILABILITY,
  CATEGORIES,
  STATUSES,
  REQUIRED,
} from "./lib/signal-schema.mjs";

/** One line per code, shown by the editor beside the value. */
const DESCRIPTIONS = {
  "out-of-sector": "Real signal, but not about this sector's subject.",
  "wrong-construct": "Did not measure the thing the claim is about, however well reported.",
  "outside-window": "Outside the run's search window.",
  "too-vague": "States a principle or direction without the specifics the claim needs.",
  "stale-fieldwork": "Data collected before the mechanism it is cited for existed.",
  "no-original-data": "Repeats figures it did not gather.",
  "overlaps-published": "The same development is already live on the site.",
  "unverifiable-source": "The claim cannot be traced to a nameable source.",
  "not-primary-source": "A recap of something else; the primary exists.",
  "commercial-intent": "Content whose purpose is to sell the capability it describes.",
  "already-in-ledger": "Already evaluated in a previous run.",
  "seo-content-no-method": "Search-optimised content whose numbers have no stated method.",
  "adjacent-already-covered": "The site already covers this from another angle.",
  "illustrative-not-measured": "Figures are modelled or illustrative rather than observed.",
  "superseded-by-later-development": "Overtaken by events since publication.",
  "aggregator-used-primary-instead": "Found via an aggregator; the primary source was used.",
  "capped-this-run": "Deferred by a per-run quota — NOT disqualified; a candidate for a later run.",
  "low-altitude":
    "The durable takeaway is a command, flag, config or library choice rather than a change in how work is organised.",
  "unrecorded": "Written by code when a decision was made without a rationale. Do not choose this by hand.",
};

const OUT = "schemas/signal-draft.schema.json";

export function buildSchema() {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://futuresofsoftwarework.github.io/schemas/signal-draft.schema.json",
    title: "AI signal draft",
    description:
      "A signal draft awaiting review in data/signal-drafts/. Generated from scripts/lib/signal-schema.mjs and scripts/lib/review-schema.mjs by scripts/build-draft-schema.mjs — do not hand-edit.",
    type: "object",
    required: REQUIRED,
    properties: {
      $schema: {
        type: "string",
        description: "Editor affordance. Stripped by signals:promote; never published.",
      },
      id: {
        type: "string",
        pattern: "^\\d{4}-\\d{2}-\\d{2}-\\d+$",
        description: "YYYY-MM-DD-NN. Must match the filename.",
      },
      title: { type: "string" },
      summary: { type: "string", description: "3-7 sentences: what changed and why it matters for software work." },
      source: { type: "string" },
      sourceUrl: {
        type: "string",
        format: "uri",
        description:
          "Absolute http(s) URL. Reserved placeholder domains (example.com, localhost, .test, .invalid) are rejected.",
      },
      sourceType: { type: "string", enum: SOURCE_TYPES },
      signalType: { type: "string", enum: SIGNAL_TYPES },
      signalStrength: { type: "string", enum: SIGNAL_STRENGTHS },
      signalStage: { type: "string", enum: SIGNAL_STAGES },
      availability: { type: "string", enum: AVAILABILITY },
      category: { type: "array", items: { type: "string", enum: CATEGORIES }, maxItems: 3 },
      status: { type: "string", enum: STATUSES },
      detectedAt: { type: "string" },
      date: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
      whyItMatters: { type: "array", items: { type: "string" } },
      recommendedActions: { type: "array", items: { type: "string" } },
      risksAndCaveats: { type: "array", items: { type: "string" } },
      corroboration: { type: "array", items: { type: "string" } },
      _review: {
        type: "object",
        description:
          "The REVIEWER writes this, never the finder. Rationale only — the folder you move the file into is the decision. Stripped by signals:promote and never published.",
        additionalProperties: false,
        properties: {
          under: {
            type: "string",
            description: "The rule that disqualified it. Hover a value for what it means.",
            enum: REJECTED_UNDER,
            // Not standard JSON Schema, but VS Code renders it beside each value.
            enumDescriptions: REJECTED_UNDER.map((code) => DESCRIPTIONS[code] ?? ""),
          },
          note: {
            type: "string",
            description:
              'Why, specifically. Name the disqualifying fact: "the consequence is the exploit, not a policy change", not "not relevant".',
          },
          reviewer: { type: "string", description: "Defaults to git config user.name when omitted." },
        },
      },
    },
  };
}

function main() {
  mkdirSync("schemas", { recursive: true });
  writeFileSync(OUT, JSON.stringify(buildSchema(), null, 2) + "\n", "utf8");
  console.log(`schema: wrote ${OUT} (${REJECTED_UNDER.length} rejection codes)`);
}

if (process.argv[1] && process.argv[1].endsWith("build-draft-schema.mjs")) main();
