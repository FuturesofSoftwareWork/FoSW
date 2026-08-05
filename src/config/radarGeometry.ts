import type { Phenomenon, ObservedReach } from "@/types/phenomenon";

/** Centre outwards. Established practice sits in the lit middle; the frontier is
 *  at the dark rim. */
export const RINGS: readonly ObservedReach[] = [
  "field-level-shift",
  "gaining-traction",
  "early-manifestations",
] as const;

export const RING_LABEL: Record<ObservedReach, string> = {
  "field-level-shift": "FIELD-LEVEL SHIFT",
  "gaining-traction": "GAINING TRACTION",
  "early-manifestations": "EARLY MANIFESTATIONS",
};

export const BLIP_RADIUS = {
  current: 9,
  recent: 7.5,
  ageing: 6,
  stale: 4.5,
} as const;

export const VIEWBOX = { size: 760, cx: 380, cy: 380, r: 250 } as const;

/**
 * Ring boundaries as fractions of the outer radius, centre outwards. Exported
 * because the canvas draws these same boundaries — two copies would drift and
 * put blips outside the rings that are meant to contain them.
 */
export const RING_EDGES = [0, 0.36, 0.66, 1] as const;

/** Sector angular spans in degrees, measured clockwise from 12 o'clock. */
export function sectorAngles(count: number): { start: number; end: number }[] {
  const span = 360 / count;
  return Array.from({ length: count }, (_, i) => ({
    start: i * span,
    end: (i + 1) * span,
  }));
}

/** Deterministic 0..1 from a string, so a blip never moves between renders. */
function hash01(s: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Place a blip inside its sector-and-ring cell. Position is a pure function of
 * the phenomenon id, so blips are stable across renders and reloads; the inset
 * keeps them off the ring and sector borders where they would be ambiguous.
 */
export function placeBlip(
  p: Phenomenon,
  dimensionIndex: number,
  dimensionCount: number,
): { x: number; y: number } {
  const foundRing = RINGS.indexOf(p.observedReach);
  const ringIndex = foundRing === -1 ? RINGS.length - 1 : foundRing;
  const inner = RING_EDGES[ringIndex] * VIEWBOX.r;
  const outer = RING_EDGES[ringIndex + 1] * VIEWBOX.r;

  const radialInset = (outer - inner) * 0.18;
  const radius = inner + radialInset + hash01(p.id, 1) * (outer - inner - radialInset * 2);

  const safeIndex = Math.min(Math.max(0, dimensionIndex), dimensionCount - 1);
  const { start, end } = sectorAngles(dimensionCount)[safeIndex];
  const angularInset = (end - start) * 0.12;
  const deg = start + angularInset + hash01(p.id, 2) * (end - start - angularInset * 2);

  // -90 so 0 degrees is 12 o'clock rather than 3 o'clock.
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    x: VIEWBOX.cx + radius * Math.cos(rad),
    y: VIEWBOX.cy + radius * Math.sin(rad),
  };
}
