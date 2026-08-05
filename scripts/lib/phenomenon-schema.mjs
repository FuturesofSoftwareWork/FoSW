/**
 * Enum values for phenomena.
 *
 * These mirror src/config/radarDimensions.ts and src/config/radarActors.ts, which
 * the scripts cannot import because they are TypeScript. scripts/__tests__/config.test.mjs
 * asserts the two stay in step.
 */

export const OBSERVED_REACH = ["early-manifestations", "gaining-traction", "field-level-shift"];
export const EVIDENCE_STANCES = ["supports", "counter", "contextual"];
export const POTENTIAL_IMPACTS = ["low", "moderate", "high", "transformative"];
export const RELATIONS = ["reinforces", "constrains", "depends-on"];
export const PHENOMENON_STATUSES = ["published", "draft", "retired"];

export const WORK_DIMENSION_IDS = [
  "nature-and-division-of-work",
  "organisation-and-leadership",
  "skills-knowledge-and-learning",
  "careers-occupations-and-labour-markets",
  "worker-experience-identity-and-wellbeing",
  "economics-productivity-and-value",
  "ethics-responsibility-and-society",
];

export const ACTOR_IDS = [
  "developer",
  "reviewer",
  "technical-lead",
  "engineering-manager",
  "executive",
  "new-entrant",
  "organisation",
];

export const REQUIRED_FIELDS = [
  "id",
  "label",
  "title",
  "thesis",
  "status",
  "primaryDimension",
  "implications",
  "evidence",
  "observedReach",
  "reachRationale",
  "reachReviewedAt",
];
