/**
 * Shared loading for JSON content directories (ai-signals, phenomena).
 *
 * Content is runtime-fetched and never type-checked, so every consumer needs the
 * same defensive reads. Keeping them here means the validators and the Phase 2
 * pipeline scripts agree on what "loaded" means.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, join, basename } from "path";

/** Read <dir>/index.json. Throws with a single-line message the build can print. */
export function readIndex(dir) {
  const file = join(resolve(dir), "index.json");
  try {
    const index = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(index.items)) throw new Error("index.items is not an array");
    return index;
  } catch (e) {
    throw new Error(`could not read ${file}: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
  }
}

/**
 * Load every file referenced by `index`. Entries whose file is missing, is not
 * valid JSON, or whose root is not an object are reported in `errors` rather than
 * thrown, so one bad file does not hide the rest.
 */
export function readItems(dir, index) {
  const root = resolve(dir);
  const items = [];
  const errors = [];

  for (const entry of index.items || []) {
    if (typeof entry?.file !== "string" || !entry.file) {
      errors.push(`${JSON.stringify(entry)}: index entry has a missing or non-string 'file'`);
      continue;
    }
    // index.json entries may carry a path prefix; only the basename lives in dir.
    const name = basename(entry.file);
    const path = join(root, name);
    if (!existsSync(path)) {
      errors.push(`${name}: referenced by index.json but missing on disk`);
      continue;
    }
    let data;
    try {
      data = JSON.parse(readFileSync(path, "utf8"));
    } catch (e) {
      errors.push(`${name}: invalid JSON: ${e.message}`);
      continue;
    }
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      errors.push(`${name}: root value is not a JSON object`);
      continue;
    }
    items.push({ file: name, data });
  }

  return { items, errors };
}

/** Map each loaded item's `id` to its data. Later duplicates overwrite earlier ones. */
export function indexById(items) {
  const byId = new Map();
  for (const { data } of items) {
    if (typeof data.id === "string" && data.id) byId.set(data.id, data);
  }
  return byId;
}
