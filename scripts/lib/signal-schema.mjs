/**
 * The AI-signal schema, in one place.
 *
 * Content is runtime-fetched and never type-checked by tsc, so these rules are
 * the only enforcement of the signal schema. Two callers share them:
 * validate-signals.mjs, which checks what is already published, and
 * promote-signals.mjs, which checks drafts before they can become published.
 *
 * Keep in step with the Content Schema section of CLAUDE.md.
 */

export const DECISION_HORIZONS = ["now", "0,5 - 2 years", "2+ years"];
export const SOURCE_TYPES = ["academic", "article", "social", "video", "discussion", "release"];
export const SIGNAL_TYPES = [
  "practitioner-account",
  "field-report",
  "study",
  "tool-shift",
  "regulation-standard",
  "market-event",
  "forecast",
  "primary-research",
];
export const SIGNAL_STRENGTHS = ["weak", "emerging", "established"];
export const SIGNAL_STAGES = ["leading", "concurrent", "lagging"];
export const AVAILABILITY = ["GA", "preview", "announced"];
export const CATEGORIES = [
  "AI Agents", "AI Tools", "Productivity", "SDLC Change", "Quality & Testing",
  "Security & Risk", "Org & Leadership", "Skills & Learning", "Work Wellbeing",
  "Ethics & Policy", "Business Impact", "Costs & Economics", "Other",
];
export const STATUSES = ["published", "draft"];
export const REQUIRED = ["id", "title", "summary", "source", "detectedAt", "date", "status"];
// Fields the site renders with .map() — a non-array value crashes the render.
export const ARRAY_FIELDS = [
  "tags",
  "whyItMatters",
  "recommendedActions",
  "risksAndCaveats",
  "corroboration",
];

/**
 * Check one signal object against the schema.
 * Returns an array of human-readable problems; empty means valid.
 */
export function validateSignal(s) {
  // A root that is null, an array or a scalar would make every field check
  // below throw or silently pass, so reject it before looking at fields.
  if (typeof s !== "object" || s === null || Array.isArray(s)) {
    return ["root value is not a JSON object"];
  }

  const errors = [];
  const checkEnum = (field, value, allowed) => {
    if (value === undefined) return;
    if (!allowed.includes(value)) {
      errors.push(`${field} = ${JSON.stringify(value)} is not one of ${allowed.join(" | ")}`);
    }
  };

  for (const field of REQUIRED) {
    if (s[field] == null || s[field] === "") errors.push(`missing required field '${field}'`);
  }

  for (const field of ARRAY_FIELDS) {
    if (s[field] !== undefined && !Array.isArray(s[field])) {
      errors.push(`'${field}' must be an array, got ${typeof s[field]}`);
    }
  }

  checkEnum("decisionHorizon", s.decisionHorizon, DECISION_HORIZONS);
  checkEnum("sourceType", s.sourceType, SOURCE_TYPES);
  checkEnum("signalType", s.signalType, SIGNAL_TYPES);
  checkEnum("signalStrength", s.signalStrength, SIGNAL_STRENGTHS);
  checkEnum("signalStage", s.signalStage, SIGNAL_STAGES);
  checkEnum("availability", s.availability, AVAILABILITY);

  const cats = Array.isArray(s.category) ? s.category : s.category ? [s.category] : [];
  for (const c of cats) checkEnum("category", c, CATEGORIES);
  if (cats.length > 3) errors.push(`category has ${cats.length} values (max 3)`);

  // Checked explicitly rather than via checkEnum: status is required, so an
  // absent value must be reported as missing, not skipped as undefined.
  if (s.status !== undefined && !STATUSES.includes(s.status)) {
    errors.push(`status = ${JSON.stringify(s.status)} must be 'published' or 'draft'`);
  }

  if (s.signalType === "regulation-standard" && !s.effectiveDate) {
    errors.push("signalType 'regulation-standard' requires effectiveDate");
  }
  if (s.signalType === "practitioner-account" && !s.observer) {
    errors.push("signalType 'practitioner-account' requires observer");
  }

  return errors;
}
