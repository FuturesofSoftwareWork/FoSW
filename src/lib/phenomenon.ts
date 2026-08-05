import type { Phenomenon } from "@/types/phenomenon";
import type { WorkDimensionId } from "@/config/radarDimensions";

/**
 * Drafts are shown in dev and in preview builds so work in progress stays
 * reviewable, and hidden in production so an unfinished research claim is never
 * published. `import.meta.env.DEV` covers `npm run dev`; the explicit flag covers
 * the preview deployment, which is a production build.
 */
export function includeDrafts(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_RADAR_PREVIEW === "1";
}

/**
 * The spec requires `impacts` be derived from the implications and never stored,
 * so that a tag list cannot drift from the statements it summarises.
 */
export function deriveImpacts(p: Phenomenon): WorkDimensionId[] {
  const seen = new Set<WorkDimensionId>();
  for (const im of p.implications ?? []) {
    if (im?.dimension) seen.add(im.dimension);
  }
  return [...seen];
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * How recently the world produced evidence — deliberately not how recently we
 * touched the record. Drives blip size.
 */
export function freshnessOf(
  p: Phenomenon,
  now: Date = new Date(),
): "current" | "recent" | "ageing" | "stale" {
  if (!p.latestEvidenceDate) return "stale";
  const age = (now.getTime() - new Date(p.latestEvidenceDate).getTime()) / DAY;
  if (age <= 92) return "current";
  if (age <= 183) return "recent";
  if (age <= 365) return "ageing";
  return "stale";
}
