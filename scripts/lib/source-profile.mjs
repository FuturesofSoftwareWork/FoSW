/**
 * Source profiles: which feeds one collector run pulls from.
 *
 * Standalone by design — no `extends`, no `add`, no merge step. What you read
 * is what runs.
 *
 * Inheritance was considered and rejected. The decisive reason is operational:
 * the generic run executes weekly regardless, so its sources are already
 * collected and already in the seen-ledger by the time a sector run happens.
 * A sector profile that re-listed them would re-fetch items the generic run saw
 * days earlier, and collect-candidates filters against the ledger before
 * writing the pool — so the inherited half would be empty by construction.
 * Inheritance would buy duplicate work at the cost of merge semantics nobody
 * can predict from reading the file.
 *
 * A profile is therefore the *complement* of the generic run: the venues it
 * structurally cannot reach. See
 * docs/superpowers/specs/2026-08-12-source-profiles-and-review-log-design.md
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, join } from "path";

export const PROFILES_DIR = "config/sources";
const DEFAULT_WINDOW_DAYS = 10;

// Every source key a profile may declare. A key that is absent or empty means
// that collector does not run — nothing is inherited to fill the gap.
const LIST_KEYS = ["hackerNewsTerms", "devtoTags", "subreddits", "githubRepos", "feeds", "substacks"];

export function availableProfiles(root = process.cwd()) {
  const dir = resolve(root, PROFILES_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort();
}

/**
 * Load and validate one profile. Throws with a human-readable message on any
 * problem; the caller turns that into a non-zero exit.
 */
export function loadProfile(name, { root = process.cwd() } = {}) {
  const file = join(resolve(root, PROFILES_DIR), `${name}.json`);
  if (!existsSync(file)) {
    // Never fall back to generic. Collecting the wrong sources silently
    // produces a plausible pool that answers a different question, and nothing
    // downstream can tell it apart from a real one.
    throw new Error(
      `unknown profile '${name}'. Available: ${availableProfiles(root).join(", ") || "(none)"}`
    );
  }

  let raw;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`${name}.json is not valid JSON: ${e.message}`, { cause: e });
  }

  if (raw?.profile !== name) {
    throw new Error(
      `profile field '${raw?.profile}' does not match filename '${name}' — the output path would misreport its origin`
    );
  }

  const profile = {
    profile: name,
    description: raw.description ?? "",
    windowDays: raw.windowDays,
  };
  for (const key of LIST_KEYS) profile[key] = Array.isArray(raw[key]) ? raw[key] : [];

  if (LIST_KEYS.every((key) => profile[key].length === 0)) {
    throw new Error(
      `${name}.json declares no sources — a profile that collects nothing is a mistake, not a configuration`
    );
  }

  return profile;
}

/**
 * Where this profile's pool is written. Derived rather than passed, so a sector
 * run cannot silently overwrite the generic pool. `generic` keeps the
 * historical path so nothing else has to change.
 */
export function candidatesPathFor(name) {
  return name === "generic" ? "data/_candidates.json" : `data/_candidates-${name}.json`;
}

/**
 * Flag beats profile beats default.
 *
 * The per-profile window exists because sources publish at very different
 * cadences: Pragmatic Engineer contributed nothing on 2026-08-10 through no
 * fault of its own — its newest post was 12 days old against a 10-day window.
 */
export function resolveWindowDays(profile, flagDays) {
  if (Number.isFinite(flagDays) && flagDays > 0) return flagDays;
  if (Number.isFinite(profile?.windowDays) && profile.windowDays > 0) return profile.windowDays;
  return DEFAULT_WINDOW_DAYS;
}
