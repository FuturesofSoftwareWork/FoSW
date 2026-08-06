#!/usr/bin/env node
/**
 * Validates every signal referenced by index.json against the content schema.
 *
 * Content is runtime-fetched and never type-checked by tsc, so this script is
 * the only enforcement of the AI-signal schema. Run it after editing content.
 *
 *   node scripts/validate-signals.mjs
 *
 * Exits 1 if any signal is invalid or any file on disk is missing from index.json.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, join } from "path";

const SIGNALS_DIR = resolve("public/content/ai-signals");
const INDEX_FILE = join(SIGNALS_DIR, "index.json");

// The schema rules live in lib/signal-schema.mjs so promote-signals.mjs can
// apply exactly the same checks to a draft before it is allowed into public/.
import { validateSignal, SIGNAL_TYPES } from "./lib/signal-schema.mjs";

export { SIGNAL_TYPES };

const errors = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

function main() {
  let index;
  try {
    index = JSON.parse(readFileSync(INDEX_FILE, "utf8"));
  } catch (e) {
    // Report this in the script's own format rather than as a raw Node stack trace;
    // this runs first in `npm run build`, so the message is what a failing CI shows.
    console.error(`validate: could not read ${INDEX_FILE}\n  ${e.message}`);
    process.exit(1);
  }

  const indexed = new Set();

  for (const entry of index.items || []) {
    if (typeof entry?.file !== "string" || !entry.file) {
      err(JSON.stringify(entry), "index entry has a missing or non-string 'file'");
      continue;
    }
    indexed.add(entry.file);
    const path = join(SIGNALS_DIR, entry.file);
    if (!existsSync(path)) {
      err(entry.file, "referenced by index.json but missing on disk");
      continue;
    }

    let s;
    try {
      s = JSON.parse(readFileSync(path, "utf8"));
    } catch (e) {
      err(entry.file, `invalid JSON: ${e.message}`);
      continue;
    }

    for (const problem of validateSignal(s)) err(entry.file, problem);
  }

  for (const file of readdirSync(SIGNALS_DIR)) {
    // Pipeline working files must never sit under public/ — Vite copies public/
    // into dist, so anything here is published on the live site. The ledger and
    // the finder's rejected list record stories the team declined; they belong
    // in data/. Fail the build rather than deploy them.
    if (file.startsWith("_")) {
      err(
        file,
        "pipeline working file found under public/ — it would be published on the live site. Move it to data/ (see docs/ai-signals-pipeline.md)"
      );
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}-\d+\.json$/.test(file)) continue;
    if (!indexed.has(file)) err(file, "exists on disk but is not listed in index.json (invisible to the site)");
  }

  if (errors.length) {
    console.error(`validate: ${errors.length} problem(s) found\n`);
    errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }
  console.log(`validate: OK — ${index.items.length} signals valid`);
}

// Only run the CLI when invoked directly, so importing this module for tests is safe.
if (process.argv[1] && process.argv[1].endsWith("validate-signals.mjs")) main();
