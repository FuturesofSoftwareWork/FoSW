import type { Phenomenon } from "@/types/phenomenon";
import type { WorkDimensionId } from "@/config/radarDimensions";

/**
 * True in dev and in preview builds. The single source of truth for "should
 * unpublished research be visible here?" — both draft fetching and the radar's
 * launch gate must answer this the same way, or one will silently disagree
 * with the other.
 *
 * Two independent signals, deliberately OR'd. `VITE_RADAR_PREVIEW` is the
 * documented switch and the one CI sets. A `BASE_URL` containing `/preview/`
 * is the backstop: a build deployed to the preview folder without the flag
 * would otherwise render as production — an empty page where the radar should
 * be, with no error anywhere to explain it.
 */
export function isPreviewContext(): boolean {
  return (
    import.meta.env.DEV ||
    import.meta.env.VITE_RADAR_PREVIEW === "1" ||
    import.meta.env.BASE_URL.includes("/preview/")
  );
}

/**
 * Drafts are shown in dev and in preview builds so work in progress stays
 * reviewable, and hidden in production so an unfinished research claim is never
 * published. `import.meta.env.DEV` covers `npm run dev`; the explicit flag covers
 * the preview deployment, which is a production build.
 */
export function includeDrafts(): boolean {
  return isPreviewContext();
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
