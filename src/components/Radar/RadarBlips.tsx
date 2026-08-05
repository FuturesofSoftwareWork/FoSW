import { useState } from "react";
import type { Phenomenon } from "@/types/phenomenon";
import type { WorkDimensionId } from "@/config/radarDimensions";
import { WORK_DIMENSIONS } from "@/config/radarDimensions";
import { BLIP_RADIUS, RING_LABEL, VIEWBOX, placeBlip } from "@/config/radarGeometry";
import { deriveImpacts, freshnessOf } from "@/lib/phenomenon";

interface RadarBlipsProps {
  phenomena: Phenomenon[];
  showLabels: boolean;
  activeDimension: WorkDimensionId | null;
  onOpen: (p: Phenomenon) => void;
}

/** A small lightning bolt, drawn inside a contested blip. */
const BOLT = "M 1.1 -5.6 L -3.0 0.5 L -0.4 0.5 L -1.3 5.6 L 3.2 -0.9 L 0.4 -0.9 Z";

const RadarBlips = ({ phenomena, showLabels, activeDimension, onOpen }: RadarBlipsProps) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <g>
      {phenomena.map((p) => {
        const index = WORK_DIMENSIONS.findIndex((d) => d.id === p.primaryDimension);
        const colour = WORK_DIMENSIONS[index]?.colour ?? "#94a3b8";
        const { x, y } = placeBlip(p, index, WORK_DIMENSIONS.length);
        const r = BLIP_RADIUS[freshnessOf(p)];
        const dimmed =
          activeDimension !== null && !deriveImpacts(p).includes(activeDimension);
        const isHovered = hovered === p.id;
        const labelRight = x <= VIEWBOX.cx;

        return (
          <g
            key={p.id}
            opacity={dimmed ? 0.18 : 1}
            className="cursor-pointer focus:outline-none"
            role="button"
            tabIndex={0}
            aria-label={`${p.label} — ${RING_LABEL[p.observedReach]}`}
            onClick={() => onOpen(p)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(p);
              }
            }}
            onMouseEnter={() => setHovered(p.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(p.id)}
            onBlur={() => setHovered(null)}
          >
            {isHovered && (
              <circle cx={x} cy={y} r={r + 5} fill="none" stroke="#7dd3fc" strokeWidth="1.5" opacity="0.8" />
            )}
            <circle cx={x} cy={y} r={r} fill={colour} />
            {p.contested && (
              <path d={BOLT} fill="#030711" transform={`translate(${x} ${y}) scale(${r / 7})`} />
            )}
            {showLabels && !dimmed && (
              <text
                x={labelRight ? x + r + 5 : x - r - 5}
                y={y + 3.5}
                textAnchor={labelRight ? "start" : "end"}
                fontSize="10.5"
                fontFamily="monospace"
                fill="#cbd5e1"
                pointerEvents="none"
              >
                {p.label}
              </text>
            )}
            {isHovered && !showLabels && (
              <g pointerEvents="none">
                <rect x={x + r + 4} y={y - 14} width={190} height={30} rx={3} fill="#0b1220" stroke="#334155" />
                <text x={x + r + 10} y={y - 3} fontSize="8" fontFamily="monospace" fill="#e2e8f0">
                  {p.label}
                </text>
                <text x={x + r + 10} y={y + 8} fontSize="7.5" fontFamily="monospace" fill="#64748b">
                  {RING_LABEL[p.observedReach]}
                  {p.contested ? " · contested" : ""}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};

export default RadarBlips;
