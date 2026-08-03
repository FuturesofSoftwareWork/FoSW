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

const DECISION_HORIZONS = ["now", "0,5 - 2 years", "2+ years"];
const SOURCE_TYPES = ["academic", "article", "social", "video", "discussion", "release"];
const SIGNAL_TYPES = ["weak-signal", "field-report", "study", "regulatory", "tool-shift"];
const SIGNAL_STRENGTHS = ["weak", "emerging", "established"];
const SIGNAL_STAGES = ["leading", "concurrent", "lagging"];
const AVAILABILITY = ["GA", "preview", "announced"];
const CATEGORIES = [
  "AI Agents", "AI Tools", "Productivity", "SDLC Change", "Quality & Testing",
  "Security & Risk", "Org & Leadership", "Skills & Learning", "Work Wellbeing",
  "Ethics & Policy", "Business Impact", "Costs & Economics", "Other",
];
const REQUIRED = ["id", "title", "summary", "source", "detectedAt", "date", "status"];

const errors = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

function checkEnum(file, field, value, allowed) {
  if (value === undefined) return;
  if (!allowed.includes(value)) {
    err(file, `${field} = ${JSON.stringify(value)} is not one of ${allowed.join(" | ")}`);
  }
}

const index = JSON.parse(readFileSync(INDEX_FILE, "utf8"));
const indexed = new Set();

for (const entry of index.items || []) {
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

  for (const field of REQUIRED) {
    if (s[field] == null || s[field] === "") err(entry.file, `missing required field '${field}'`);
  }

  checkEnum(entry.file, "decisionHorizon", s.decisionHorizon, DECISION_HORIZONS);
  checkEnum(entry.file, "sourceType", s.sourceType, SOURCE_TYPES);
  checkEnum(entry.file, "signalType", s.signalType, SIGNAL_TYPES);
  checkEnum(entry.file, "signalStrength", s.signalStrength, SIGNAL_STRENGTHS);
  checkEnum(entry.file, "signalStage", s.signalStage, SIGNAL_STAGES);
  checkEnum(entry.file, "availability", s.availability, AVAILABILITY);

  const cats = Array.isArray(s.category) ? s.category : s.category ? [s.category] : [];
  for (const c of cats) checkEnum(entry.file, "category", c, CATEGORIES);
  if (cats.length > 3) err(entry.file, `category has ${cats.length} values (max 3)`);

  if (s.status !== "published" && s.status !== "draft") {
    err(entry.file, `status = ${JSON.stringify(s.status)} must be 'published' or 'draft'`);
  }
  if (s.signalType === "regulatory" && !s.effectiveDate) {
    err(entry.file, "signalType 'regulatory' requires effectiveDate");
  }
  if (s.signalType === "weak-signal" && !s.observer) {
    err(entry.file, "signalType 'weak-signal' requires observer");
  }
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
