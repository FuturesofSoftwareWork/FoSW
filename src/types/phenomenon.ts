import type { WorkDimensionId } from "@/config/radarDimensions";
import type { ActorId } from "@/config/radarActors";

/** Ring placement: how far the change has spread beyond forerunners.
 *  Human judgment, never computed. */
export type ObservedReach = "early-manifestations" | "gaining-traction" | "field-level-shift";

/** How a piece of evidence relates to the transformation the phenomenon claims. */
export type EvidenceStance = "supports" | "counter" | "contextual";

export type PotentialImpact = "low" | "moderate" | "high" | "transformative";

export interface PhenomenonEvidence {
  /** The `id` of an AISignal. */
  signalId: string;
  stance: EvidenceStance;
  /** false when this item is commentary on another source rather than its own
   *  observation. Only primary items count toward independentContexts. */
  primary: boolean;
  /** Why this item was attached, in a few words. */
  note?: string;
}

export interface Implication {
  dimension: WorkDimensionId;
  /** One sentence, concrete enough to disagree with. */
  statement: string;
  actors?: ActorId[];
  /** Empty means the implication holds across all development paths. */
  pathIds?: string[];
}

export interface DevelopmentPath {
  id: string;
  title: string;
  description: string;
}

export interface RelatedPhenomenon {
  id: string;
  relation: "reinforces" | "constrains" | "depends-on";
}

/** Descriptive statistics over supporting evidence. Derived; never hand-edited. */
export interface EvidenceProfile {
  independentContexts: number;
  evidenceTypes: number;
  quartersSpanned: number;
  counterEvidence: boolean;
}

export interface ReachHistoryEntry {
  edition: string;
  observedReach: ObservedReach;
  rationale: string;
}

/** A candidate for reach review. Carries no ring: reach is a human judgment. */
export interface PossibleReachChange {
  /** What prompted it, naming the direction — contexts gained or lost. */
  reason: string;
  raisedAt: string;
  /**
   * The signals that changed, not the ones that remain: on a loss the removed ids
   * are already gone from `evidence`, so the survivors would name what did not
   * change. Empty when every changed signal was detached.
   */
  signalIds: string[];
}

export interface Phenomenon {
  id: string;
  /** 2–4 words. The radar blip label. */
  label: string;
  /** The headline, written to make a reader want the description. */
  title: string;
  /** The forward-looking transformation claim, stated so it could be wrong. */
  thesis: string;
  /** What must be measured for a source to count as evidence here. A source is
   *  evidence for a claim only if it measured the thing the claim is about.
   *  Required on published phenomena. */
  construct?: string;
  /** The observable present-day pressure driving the transformation. */
  currentPressure?: string;
  status: "published" | "draft" | "retired";

  primaryDimension: WorkDimensionId;
  potentialImpact?: PotentialImpact;
  implications: Implication[];

  evidence: PhenomenonEvidence[];

  observedReach: ObservedReach;
  reachRationale: string;
  /** The date a human last judged reach. Absent means no human has judged it
   *  yet — required on published phenomena, optional on drafts. */
  reachReviewedAt?: string;
  evidenceProfile?: EvidenceProfile;
  possibleReachChange?: PossibleReachChange | null;

  contested?: boolean;
  contestedNote?: string | null;

  firstObserved?: string;
  latestEvidenceDate?: string;
  lastReviewed?: string;

  reachHistory?: ReachHistoryEntry[];
  whatWouldChangeThis?: string[];
  developmentPaths?: DevelopmentPath[];
  related?: RelatedPhenomenon[];
  /** Reference ids only; the indicator layer is not built. */
  indicators?: string[];

  retiredAt?: string;
  retiredReason?: string;
}

export interface PhenomenonIndexEntry {
  id: string;
  file: string;
  date: string;
  status: "published" | "draft" | "retired";
}
