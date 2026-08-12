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

// `decisionHorizon` is retired and no longer validated. 98 published files still
// carry it, and that is fine: nothing renders it, nothing reads it, and there is
// no unknown-field check here for it to trip. It is not re-added as an enum
// because the values ran 78 "now" / 19 "0,5 - 2 years" / 1 "2+ years" across the
// whole corpus — a judgement per signal that carried almost no information. The
// finder prompts tell the agent not to emit it; if one does anyway, it is
// ignored rather than being grounds to fail a promote.
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

// RFC 2606 reserves example.com/.net/.org and the .test/.example/.invalid/
// .localhost TLDs for documentation. A signal whose sourceUrl points into that
// space cites nothing, and on a research-communication site an unverifiable
// source is a correctness failure rather than a broken link. Three published
// signals reached the live site this way, carrying invented figures attributed
// to VTT and MIT Technology Review, because nothing here looked at sourceUrl.
const RESERVED_HOST = /(^|\.)(example\.(com|net|org)|localhost)$/i;
const RESERVED_TLD = /\.(test|example|invalid|localhost)$/i;

/**
 * Check sourceUrl, which is optional: an absent one is valid, and several
 * legitimate published signals have none. Returns a problem string, or null.
 */
function checkSourceUrl(url) {
  if (url === undefined || url === null || url === "") return null;
  if (typeof url !== "string") return `'sourceUrl' must be a string, got ${typeof url}`;

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return `sourceUrl ${JSON.stringify(url)} is not a URL (an absolute http(s) address is required)`;
  }
  // The site renders sourceUrl straight into an href, so a non-http scheme is
  // both useless as a citation and the shape a script-injection attempt takes.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return `sourceUrl uses the '${parsed.protocol.replace(":", "")}' scheme — only http and https are citable`;
  }
  const host = parsed.hostname.toLowerCase();
  if (RESERVED_HOST.test(host) || RESERVED_TLD.test(host)) {
    return `sourceUrl host '${host}' is a reserved placeholder domain, not a real source`;
  }
  return null;
}

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

  const urlProblem = checkSourceUrl(s.sourceUrl);
  if (urlProblem) errors.push(urlProblem);

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
