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
  | "human-ai-collaboration-and-agency"
  | "organisation-and-coordination"
  | "leadership-governance-and-performance"
  | "skills-knowledge-and-learning"
  | "careers-occupations-and-labour-markets"
  | "worker-experience-identity-and-wellbeing"
  | "economics-productivity-and-value"
  | "ethics-responsibility-and-society";

export interface WorkDimension {
  id: WorkDimensionId;
  label: string;
  colour: string;
}

export const WORK_DIMENSIONS: readonly WorkDimension[] = [
  { id: "nature-and-division-of-work", label: "Nature & division of work", colour: "#0EA5E9" },
  { id: "human-ai-collaboration-and-agency", label: "Human–AI collaboration & agency", colour: "#22d3ee" },
  { id: "organisation-and-coordination", label: "Organisation & coordination", colour: "#4ade80" },
  { id: "leadership-governance-and-performance", label: "Leadership, governance & performance", colour: "#a3e635" },
  { id: "skills-knowledge-and-learning", label: "Skills, knowledge & learning", colour: "#a855f7" },
  { id: "careers-occupations-and-labour-markets", label: "Careers, occupations & labour markets", colour: "#f472b6" },
  { id: "worker-experience-identity-and-wellbeing", label: "Worker experience, identity & wellbeing", colour: "#fb7185" },
  { id: "economics-productivity-and-value", label: "Economics, productivity & value distribution", colour: "#F59E0B" },
  { id: "ethics-responsibility-and-society", label: "Ethics, responsibility & society", colour: "#94a3b8" },
] as const;
