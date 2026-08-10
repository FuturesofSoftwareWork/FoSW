#!/usr/bin/env node
/**
 * Apply a clustering or claim-run proposal.
 *
 * The only writer of a phenomenon's evidence, and the only thing that writes any
 * machine-owned field from a proposal — radar-derive.mjs writes the derived ones
 * (evidenceProfile, the dates, possibleReachChange) on its own.
 *
 * On an existing phenomenon every write goes through mergeMachineFields, so
 * rewriting a thesis is not forbidden but unreachable — there is no code path that
 * does it. Where the model believes human-owned content should change, it emits a
 * suggestion into the report, which a person reads and a person acts on.
 *
 * All-or-nothing, and against the real schema: every record this run would write —
 * merged existing ones as well as new ones — is built in memory and put through
 * validate-phenomena's own validatePhenomenon before anything reaches disk. There is
 * no second restatement of the schema here to drift out of step, and no path that
 * lands a file and an index entry only for the spawned validator to redden the build
 * afterwards, which `npm run build` runs first and so blocks everyone.
 *
 *   node scripts/radar-apply.mjs data/_radar-proposal.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, join } from "path";
import { spawnSync } from "child_process";
import { readIndex, readItems, indexById } from "./lib/content.mjs";
import { mergeMachineFields } from "./lib/radar-fields.mjs";
import { deriveOne } from "./radar-derive.mjs";
import { validatePhenomenon } from "./validate-phenomena.mjs";

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

/**
 * Match radar-derive.mjs's convention for possibleReachChange (and any future
 * derived field): a key that computed to null and was never present on `source`
 * is not a real change, just the field's absence written out explicitly — drop
 * it rather than writing noise onto a phenomenon that never carried it. Once a
 * key IS present on `source`, a later null is a real clearing and stays.
 */
function withoutPhantomNulls(next, updates, source) {
  const out = { ...next };
  for (const key of Object.keys(updates)) {
    if (out[key] === null && !(key in source)) delete out[key];
  }
  return out;
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

  let signalsById = new Map();
  let items = [];
  let phenomenaIndex = null;
  try {
    const result = readItems(signalsDir, readIndex(signalsDir));
    signalsById = indexById(result.items);
    errors.push(...result.errors);
  } catch (e) {
    errors.push(e.message);
  }
  try {
    phenomenaIndex = readIndex(phenomenaDir);
    const result = readItems(phenomenaDir, phenomenaIndex);
    items = result.items;
    errors.push(...result.errors);
  } catch (e) {
    errors.push(e.message);
  }
  if (errors.length) return { attached: 0, detached: 0, created: [], warnings, errors };

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
    // Same argument radar:reject makes about --reason. Removing evidence is a
    // decision, the apply report is the only place it is ever recorded, and a
    // removal recorded as "_no reason given_" records nothing.
    if (!String(d.reason ?? "").trim()) {
      errors.push(
        `detachment: '${d.phenomenonId}' / '${d.signalId}' has no reason — ` +
          `removing evidence with no stated reason is not a decision`,
      );
    }
  }
  const created = [];
  for (const p of newPhenomena) {
    const id = slugify(p.label);
    if (!id) {
      errors.push("newPhenomena: an entry has no usable label");
      continue;
    }
    if (!p.construct || !String(p.construct).trim()) {
      errors.push(`newPhenomena '${id}': construct is required — it defines what counts as evidence here`);
    }
    // The proposal format carries no developmentPaths, so this script writes none.
    // A pathIds reference could therefore never resolve, and letting it through
    // would write the file and then fail validate-phenomena in the spawned check —
    // leaving an invalid phenomenon on disk and an index entry pointing at it.
    // Development paths are added by a person during review, and the links with them.
    for (const [j, im] of (p.implications || []).entries()) {
      if (Array.isArray(im?.pathIds) && im.pathIds.length) {
        errors.push(
          `newPhenomena '${id}': implications[${j}].pathIds is non-empty, but a proposal ` +
            `carries no developmentPaths for it to reference — leave pathIds out and add ` +
            `paths during review`,
        );
      }
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

  // ---- mutate evidence on existing phenomena, in memory only ----
  const touched = new Map();
  const evidenceOf = (id) => {
    if (!touched.has(id)) touched.set(id, [...(byId.get(id).data.evidence || [])]);
    return touched.get(id);
  };
  // What actually moved, per phenomenon. deriveOne needs it: on a loss the removed
  // ids are gone from the evidence array, so the surviving ids name what did NOT
  // change — the opposite of what the reach candidate is for.
  const changedSignals = new Map();
  const noteChange = (id, signalId) => {
    if (!changedSignals.has(id)) changedSignals.set(id, new Set());
    changedSignals.get(id).add(signalId);
  };

  let attached = 0;
  for (const a of attachments) {
    const list = evidenceOf(a.phenomenonId);
    if (list.some((e) => e.signalId === a.signalId)) continue; // no-op, safe to re-run
    list.push({ signalId: a.signalId, stance: a.stance, primary: a.primary, ...(a.note ? { note: a.note } : {}) });
    noteChange(a.phenomenonId, a.signalId);
    attached += 1;
  }
  // Removals are recorded with their reason: an evidence item that vanishes from a
  // phenomenon with no trace of why is exactly the hand-edit the ownership split
  // exists to prevent, done by a script instead. Only applied removals are listed —
  // a detachment of something not cited changed nothing and is not a removal.
  const removals = [];
  let detached = 0;
  for (const d of detachments) {
    const list = evidenceOf(d.phenomenonId);
    const at = list.findIndex((e) => e.signalId === d.signalId);
    if (at === -1) continue; // no-op
    list.splice(at, 1);
    detached += 1;
    noteChange(d.phenomenonId, d.signalId);
    removals.push({ phenomenonId: d.phenomenonId, signalId: d.signalId, reason: d.reason });
  }

  // ---- build every record exactly as it would be written ----
  const pending = [];

  for (const [id, evidence] of touched) {
    const { file, data } = byId.get(id);
    const withEvidence = mergeMachineFields(data, { evidence });
    const moved = [...(changedSignals.get(id) ?? [])];
    const { updates } = deriveOne(withEvidence, signalsById, {
      today,
      ...(moved.length ? { changedSignalIds: moved } : {}),
    });
    const merged = mergeMachineFields(withEvidence, updates);
    const next = withoutPhantomNulls(merged, updates, data);
    pending.push({ path: join(phenomenaDir, file), record: next });
    if (!evidence.some((e) => e.stance === "supports")) {
      warnings.push(
        `${id}: no 'supports' evidence remains — it can no longer be published, ` +
          `and a claim nobody is measuring is a finding, not an error`,
      );
    }
  }

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
    const merged = { ...record, ...updates };
    const finalRecord = withoutPhantomNulls(merged, updates, record);
    pending.push({ path: join(phenomenaDir, `${id}.json`), record: finalRecord });
  }

  // ---- the schema is enforced in exactly one place ----
  // Not a restatement of the rules: the same validatePhenomenon the build runs, on
  // the exact bytes this run would write. A related[] reference to a sibling created
  // in the same batch resolves because the batch's own ids are in scope.
  const phenomenonIds = new Set([...byId.keys(), ...created]);
  for (const { record } of pending) {
    for (const msg of validatePhenomenon(record, { signalsById, phenomenonIds })) {
      errors.push(`${record.id}: ${msg}`);
    }
  }
  if (errors.length) return { attached: 0, detached: 0, created: [], warnings: [], errors };

  // ---- write, files before index ----
  for (const { path, record } of pending) writeJson(path, record);

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
  if (removals.length) {
    lines.push(
      "## Detachments",
      "",
      "Evidence removed, and why. Nothing else records this.",
      "",
      // The reason is guaranteed non-blank: a detachment without one is refused above.
      ...removals.map((r) => `- **${r.phenomenonId}** dropped \`${r.signalId}\`: ${String(r.reason).trim()}`),
      "",
    );
  }
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
