/**
 * The one taxonomy the radar uses. A phenomenon's `primaryDimension` places it in
 * a sector; every dimension named by an implication becomes a filter tag.
 *
 * Sector angles are computed as 360/N from this array's length, so adding or
 * removing a dimension needs no component changes.
 *
 * Colours are consumed as SVG `fill`/`stroke` attribute values, never as Tailwind
 * class names — per CLAUDE.md, dynamic class interpolation would not survive
 * Tailwind's static extraction, but SVG attributes are unaffected.
 */

export type WorkDimensionId =
  | "nature-and-division-of-work"
  | "organisation-and-leadership"
  | "skills-knowledge-and-learning"
  | "careers-occupations-and-labour-markets"
  | "worker-experience-identity-and-wellbeing"
  | "economics-productivity-and-value"
  | "ethics-responsibility-and-society";

export interface WorkDimension {
  id: WorkDimensionId;
  label: string;
  /** As close to `label` as the radar rim has room for — the legend and drawer
   *  keep `label` itself. Tune against the verify-radar.mjs bbox/overlap checks
   *  rather than guessing a character count. */
  shortLabel: string;
  colour: string;
}

export const WORK_DIMENSIONS: readonly WorkDimension[] = [
  // Merged with human-ai-collaboration-and-agency: the division of labour between
  // human and machine — including machine agency — now largely is what "the
  // nature of work" means, so it no longer earns a separate sector.
  { id: "nature-and-division-of-work", label: "Nature & division of work", shortLabel: "Nature & division of work", colour: "#0EA5E9" },
  { id: "organisation-and-leadership", label: "Organisation & leadership", shortLabel: "Organisation & leadership", colour: "#4ade80" },
  { id: "skills-knowledge-and-learning", label: "Skills, knowledge & learning", shortLabel: "Skills, knowledge & learning", colour: "#a855f7" },
  { id: "careers-occupations-and-labour-markets", label: "Careers, occupations & labour markets", shortLabel: "Careers & labour markets", colour: "#f472b6" },
  { id: "worker-experience-identity-and-wellbeing", label: "Worker experience, identity & wellbeing", shortLabel: "Experience, identity & wellbeing", colour: "#fb7185" },
  { id: "economics-productivity-and-value", label: "Economics, productivity & value", shortLabel: "Economics & productivity", colour: "#F59E0B" },
  { id: "ethics-responsibility-and-society", label: "Ethics, responsibility & society", shortLabel: "Ethics, responsibility & society", colour: "#94a3b8" },
] as const;
