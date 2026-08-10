import type { ReactNode } from "react";
import { WORK_DIMENSIONS } from "@/config/radarDimensions";
import {
  RINGS,
  RING_EDGES,
  RING_LABEL,
  VIEWBOX,
  sectorAngles,
  wrapSectorLabel,
} from "@/config/radarGeometry";

const pointOnCircle = (deg: number, r: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: VIEWBOX.cx + r * Math.cos(rad), y: VIEWBOX.cy + r * Math.sin(rad) };
};

/** Ring labels name the axis the whole radar is built on, so they are sized to
 *  be read rather than to stay out of the way. They sit on each band's outer
 *  boundary, where placeBlip's radial inset keeps blips clear of them. */
const RING_FONT = 11;
const RING_CHAR = RING_FONT * 0.62; // monospace advance width

const SECTOR_FONT = 13;
const SECTOR_LINE = 15;

const RadarCanvas = ({ children }: { children: ReactNode }) => {
  const sectors = sectorAngles(WORK_DIMENSIONS.length);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.size} ${VIEWBOX.size}`}
      className="mx-auto block w-full max-w-3xl"
      role="group"
      aria-label="Futures radar: phenomena positioned by how far each change has reached"
    >
      <defs>
        <radialGradient id="radar-bg">
          <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.22" />
          <stop offset="35%" stopColor="#0EA5E9" stopOpacity="0.09" />
          <stop offset="70%" stopColor="#0b1220" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#030711" stopOpacity="1" />
        </radialGradient>
      </defs>

      <circle cx={VIEWBOX.cx} cy={VIEWBOX.cy} r={VIEWBOX.r} fill="url(#radar-bg)" />

      {RING_EDGES.slice(1).map((e, i) => (
        <circle
          key={e}
          cx={VIEWBOX.cx}
          cy={VIEWBOX.cy}
          r={VIEWBOX.r * e}
          fill="none"
          stroke="#1e293b"
          strokeDasharray={i === RING_EDGES.length - 2 ? undefined : "3 4"}
        />
      ))}

      {sectors.map((s) => {
        const p = pointOnCircle(s.start, VIEWBOX.r);
        return (
          <line
            key={s.start}
            x1={VIEWBOX.cx}
            y1={VIEWBOX.cy}
            x2={p.x}
            y2={p.y}
            stroke="#1e293b"
          />
        );
      })}

      {/* Ring labels sit on each band's outer boundary — where placeBlip's radial
          inset structurally keeps blips at least ~13px clear — rather than at
          the band midpoint, where blips are free to land. A backing rect keeps
          them readable over the gradient. The wording says evidence has spread,
          not that we are certain — the axis is reach, not confidence. */}
      {RINGS.map((ring, i) => {
        const edge = VIEWBOX.r * RING_EDGES[i + 1];
        const y = VIEWBOX.cy - edge;
        const label = RING_LABEL[ring];
        // Backing-rect width tracks the font: these are the only labels drawn
        // over the gradient, and a rect sized for a smaller font leaves the ends
        // of the word sitting on the background it was meant to mask.
        const half = (label.length * RING_CHAR) / 2 + 3;
        return (
          <g key={ring}>
            <rect x={VIEWBOX.cx - half} y={y - RING_FONT} width={half * 2} height={RING_FONT + 5} fill="#030711" />
            <text
              x={VIEWBOX.cx}
              y={y}
              textAnchor="middle"
              fontSize={RING_FONT}
              fontFamily="monospace"
              fill={i === 0 ? "#7dd3fc" : "#94a3b8"}
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Sector titles. These name the seven dimensions the whole radar is
          organised by, so they were the last thing on the canvas that should
          have been the hardest to read — 8px at 75% opacity was decorative
          rather than legible. The blip labels that used to compete with them for
          space are gone, so there is room to state them properly. */}
      {WORK_DIMENSIONS.map((d, i) => {
        const s = sectors[i];
        const p = pointOnCircle((s.start + s.end) / 2, VIEWBOX.r + 18);
        const lines = wrapSectorLabel(d.shortLabel);
        // Centre the block on the anchor point so a two-line title straddles the
        // sector's midline exactly as a one-line title does.
        const top = p.y - ((lines.length - 1) * SECTOR_LINE) / 2;
        return (
          <text
            key={d.id}
            x={p.x}
            y={top}
            textAnchor={p.x < VIEWBOX.cx - 4 ? "end" : p.x > VIEWBOX.cx + 4 ? "start" : "middle"}
            fontSize={SECTOR_FONT}
            fontFamily="monospace"
            fontWeight="500"
            fill={d.colour}
          >
            {lines.map((line, li) => (
              <tspan key={line} x={p.x} dy={li === 0 ? 0 : SECTOR_LINE}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}

      {children}
    </svg>
  );
};

export default RadarCanvas;
