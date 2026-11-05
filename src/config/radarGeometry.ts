import type { Phenomenon, ObservedReach, PotentialImpact } from "@/types/phenomenon";

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

/**
 * Blip size is potential impact: bigger already reads as more important, so that
 * is what it says. The steps are far enough apart to tell at a glance.
 */
export const BLIP_RADIUS: Record<PotentialImpact, number> = {
  low: 5.5,
  moderate: 7.5,
  high: 10,
  transformative: 13,
};

/** A draft may not be rated yet, and the smallest size would claim it is minor. */
export const blipRadius = (p: Phenomenon): number =>
  BLIP_RADIUS[p.potentialImpact ?? "moderate"];

/**
 * Fill strength by how recent the newest evidence is. A blip fades but never
 * disappears, because quiet does not mean false: a field-level shift can stop
 * making news by becoming normal. The floor stays well above the filter's 0.18,
 * so "no recent evidence" and "filtered out" cannot be mistaken for each other.
 */
export const BLIP_FADE = {
  current: 1,
  recent: 0.8,
  ageing: 0.65,
  stale: 0.5,
} as const;

export const VIEWBOX = { size: 760, cx: 380, cy: 380, r: 250 } as const;

/**
 * Ring boundaries as fractions of the outer radius, centre outwards. Exported
 * because the canvas draws these same boundaries — two copies would drift and
 * put blips outside the rings that are meant to contain them.
 */
export const RING_EDGES = [0, 0.36, 0.66, 1] as const;

/** Ring labels name the axis the whole radar is built on, so they are sized to
 *  be read rather than to stay out of the way. */
export const RING_FONT = 11;
const RING_CHAR = RING_FONT * 0.62; // monospace advance width

/**
 * The backing rect of a ring's label, on the ring's outer boundary at 12 o'clock.
 * Width tracks the font: a rect sized for a smaller font leaves the ends of the
 * word sitting on the background it was meant to mask. Shared because the canvas
 * draws this box and placeBlips keeps blips off it.
 */
export function ringLabelBox(ringIndex: number) {
  const half = (RING_LABEL[RINGS[ringIndex]].length * RING_CHAR) / 2 + 3;
  const baseline = VIEWBOX.cy - VIEWBOX.r * RING_EDGES[ringIndex + 1];
  return {
    x: VIEWBOX.cx - half,
    y: baseline - RING_FONT,
    width: half * 2,
    height: RING_FONT + 5,
    baseline,
  };
}

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
  const { minRadius, maxRadius, minDeg, maxDeg } = cellBounds(p, dimensionIndex, dimensionCount);

  const radius = minRadius + hash01(p.id, 1) * (maxRadius - minRadius);
  const deg = minDeg + hash01(p.id, 2) * (maxDeg - minDeg);

  return polarToXY(radius, deg);
}

/** -90 so 0 degrees is 12 o'clock rather than 3 o'clock. */
function polarToXY(radius: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    x: VIEWBOX.cx + radius * Math.cos(rad),
    y: VIEWBOX.cy + radius * Math.sin(rad),
  };
}

/**
 * Distance from the centre, in viewBox units, for a blip placed by editorial
 * choice rather than by hash. Each value must stay inside the blip's own ring.
 * "Justifying AI spend" is a field-level shift that has only just got there, so
 * it sits just inside the ring's outer edge (90): its centre stays in the ring
 * while its edge touches the border with "gaining traction".
 */
const RADIUS_OVERRIDE: Readonly<Record<string, number>> = {
  "compute-becomes-a-budget-line": 84,
};

/**
 * The polar box a blip may occupy: its own ring band and its own sector wedge,
 * inset off both borders so a blip never sits on a boundary where the ring or
 * sector it belongs to would be ambiguous. An entry in RADIUS_OVERRIDE is the one
 * deliberate exception, and fixes the radius so a nudge can only change the angle.
 */
function cellBounds(p: Phenomenon, dimensionIndex: number, dimensionCount: number) {
  const foundRing = RINGS.indexOf(p.observedReach);
  const ringIndex = foundRing === -1 ? RINGS.length - 1 : foundRing;
  const inner = RING_EDGES[ringIndex] * VIEWBOX.r;
  const outer = RING_EDGES[ringIndex + 1] * VIEWBOX.r;
  const radialInset = (outer - inner) * 0.18;

  const safeIndex = Math.min(Math.max(0, dimensionIndex), dimensionCount - 1);
  const { start, end } = sectorAngles(dimensionCount)[safeIndex];
  const angularInset = (end - start) * 0.22;
  const fixedRadius = RADIUS_OVERRIDE[p.id];

  return {
    minRadius: fixedRadius ?? inner + radialInset,
    maxRadius: fixedRadius ?? outer - radialInset,
    minDeg: start + angularInset,
    maxDeg: end - angularInset,
  };
}

/** How much clear space to leave between two blip edges, in viewBox units. */
const BLIP_GAP = 4;
/** The same around a ring label. */
const LABEL_GAP = 2;
/** Enough passes to settle a realistic cell; bounded so a full one cannot spin. */
const NUDGE_PASSES = 24;

export interface BlipInput {
  p: Phenomenon;
  dimensionIndex: number;
  radius: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/**
 * Place every blip, then push overlapping pairs apart.
 *
 * `placeBlip` hashes the id and knows nothing about its neighbours, so two ids
 * that hash close together in the same ring-and-sector cell land on top of each
 * other. Invisible at six phenomena, near-certain at the thirty-plus this is
 * built for.
 *
 * Two properties matter more than perfect separation:
 *
 *   - **Deterministic.** Pairs are visited in a fixed order and nothing is
 *     random, so a blip never moves between renders or reloads.
 *   - **Never leaves its cell.** Every nudge is clamped back into the blip's own
 *     ring band and sector wedge. Position *is* the claim being made; a blip
 *     nudged into the next ring out would misstate how far that change has
 *     reached. A cell that stays crowded is the honest outcome.
 */
export function placeBlips(
  entries: BlipInput[],
  dimensionCount: number,
): { x: number; y: number }[] {
  const bounds = entries.map((e) => cellBounds(e.p, e.dimensionIndex, dimensionCount));

  // Work in polar coordinates, so clamping back into a cell is trivial.
  const toPolar = (x: number, y: number, i: number) => {
    const dx = x - VIEWBOX.cx;
    const dy = y - VIEWBOX.cy;
    const b = bounds[i];
    return {
      radius: clamp(Math.hypot(dx, dy), b.minRadius, b.maxRadius),
      deg: clamp((Math.atan2(dy, dx) * 180) / Math.PI + 90, b.minDeg, b.maxDeg),
    };
  };

  const polar = entries.map((e, i) => {
    const seed = placeBlip(e.p, e.dimensionIndex, dimensionCount);
    return toPolar(seed.x, seed.y, i);
  });

  const at = (i: number) => polarToXY(polar[i].radius, polar[i].deg);
  const labelBoxes = RINGS.map((_, i) => ringLabelBox(i));

  for (let pass = 0; pass < NUDGE_PASSES; pass++) {
    let moved = false;
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = at(i);
        const b = at(j);
        const need = entries[i].radius + entries[j].radius + BLIP_GAP;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist >= need) continue;

        // Exactly coincident: separate along a fixed axis rather than dividing
        // by zero. Fixed, not random, so the result stays reproducible.
        const ux = dist === 0 ? 1 : dx / dist;
        const uy = dist === 0 ? 0 : dy / dist;
        const push = (need - dist) / 2 + 0.01;

        for (const [k, sign] of [
          [i, -1],
          [j, 1],
        ] as const) {
          const cur = at(k);
          polar[k] = toPolar(cur.x + ux * push * sign, cur.y + uy * push * sign, k);
        }
        moved = true;
      }

      // Blips paint over ring labels, and a large one can reach a label while
      // staying inside its own cell. Boxes rather than radii, because a boundary
      // curves away from a flat label.
      for (const box of labelBoxes) {
        const a = at(i);
        const nx = clamp(a.x, box.x, box.x + box.width);
        const ny = clamp(a.y, box.y, box.y + box.height);
        const dist = Math.hypot(a.x - nx, a.y - ny);
        const need = entries[i].radius + LABEL_GAP;
        if (dist >= need) continue;

        // Centre inside the box: head outwards, away from the radar's centre.
        const ux = dist === 0 ? 0 : (a.x - nx) / dist;
        const uy = dist === 0 ? -1 : (a.y - ny) / dist;
        const push = need - dist + 0.01;
        polar[i] = toPolar(a.x + ux * push, a.y + uy * push, i);
        moved = true;
      }
    }
    if (!moved) break;
  }

  return polar.map((q) => polarToXY(q.radius, q.deg));
}

/** Longest sector title that still fits beside the circle on one line at the
 *  canvas's sector font size. "Experience, identity & wellbeing" is 32
 *  characters and ran 180px past the viewBox edge before wrapping. */
const SECTOR_WRAP = 17;

/**
 * Break a sector title into at most two lines, at the space nearest its middle.
 *
 * Wrapping rather than shrinking is deliberate. These titles name the seven
 * dimensions the whole radar is organised by, and the single-line width of the
 * longest one caps the type at about 9px — barely more than the 8px that made
 * them unreadable in the first place. Two lines halve the width, so the type can
 * be sized to be read.
 */
export function wrapSectorLabel(label: string, max = SECTOR_WRAP): string[] {
  if (label.length <= max) return [label];
  const mid = label.length / 2;
  let best = -1;
  for (let i = 0; i < label.length; i++) {
    if (label[i] === " " && (best === -1 || Math.abs(i - mid) < Math.abs(best - mid))) {
      best = i;
    }
  }
  // No space to break on: one long line beats a mid-word split.
  if (best === -1) return [label];
  return [label.slice(0, best), label.slice(best + 1)];
}
