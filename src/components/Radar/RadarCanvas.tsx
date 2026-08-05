import type { ReactNode } from "react";
import { WORK_DIMENSIONS } from "@/config/radarDimensions";
import {
  RINGS,
  RING_EDGES,
  RING_LABEL,
  VIEWBOX,
  sectorAngles,
} from "@/config/radarGeometry";

const pointOnCircle = (deg: number, r: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: VIEWBOX.cx + r * Math.cos(rad), y: VIEWBOX.cy + r * Math.sin(rad) };
};

const RadarCanvas = ({ children }: { children: ReactNode }) => {
  const sectors = sectorAngles(WORK_DIMENSIONS.length);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.size} ${VIEWBOX.size}`}
      className="mx-auto block w-full max-w-2xl"
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
        return (
          <g key={ring}>
            <rect x={VIEWBOX.cx - label.length * 3.1} y={y - 9} width={label.length * 6.2} height={13} fill="#030711" />
            <text x={VIEWBOX.cx} y={y} textAnchor="middle" fontSize="9" fontFamily="monospace" fill={i === 0 ? "#7dd3fc" : "#64748b"}>
              {label}
            </text>
          </g>
        );
      })}

      {WORK_DIMENSIONS.map((d, i) => {
        const s = sectors[i];
        const p = pointOnCircle((s.start + s.end) / 2, VIEWBOX.r + 16);
        return (
          <text
            key={d.id}
            x={p.x}
            y={p.y}
            textAnchor={p.x < VIEWBOX.cx - 4 ? "end" : p.x > VIEWBOX.cx + 4 ? "start" : "middle"}
            fontSize="8"
            fontFamily="monospace"
            fill={d.colour}
            opacity="0.75"
          >
            {d.shortLabel}
          </text>
        );
      })}

      {children}
    </svg>
  );
};

export default RadarCanvas;
