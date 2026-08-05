/** Who an implication lands on. Optional per implication; a first pass, expected
 *  to be revised once the project's own interview material arrives. */

export type ActorId =
  | "developer"
  | "reviewer"
  | "technical-lead"
  | "engineering-manager"
  | "executive"
  | "new-entrant"
  | "organisation";

export interface RadarActor {
  id: ActorId;
  label: string;
}

export const RADAR_ACTORS: readonly RadarActor[] = [
  { id: "developer", label: "Developer" },
  { id: "reviewer", label: "Reviewer" },
  { id: "technical-lead", label: "Technical lead" },
  { id: "engineering-manager", label: "Engineering manager" },
  { id: "executive", label: "Executive" },
  { id: "new-entrant", label: "New entrant" },
  { id: "organisation", label: "Organisation" },
] as const;
