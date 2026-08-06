import { useMemo, useState } from "react";
import type { Phenomenon } from "@/types/phenomenon";
import type { WorkDimensionId } from "@/config/radarDimensions";
import { WORK_DIMENSIONS } from "@/config/radarDimensions";
import { BLIP_RADIUS, RING_LABEL, VIEWBOX, placeBlips } from "@/config/radarGeometry";
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

  // Positions depend on the whole set, not on one blip, because overlapping
  // pairs get nudged apart. Memoised so hovering does not re-run the relaxation.
  const positions = useMemo(
    () =>
      placeBlips(
        phenomena.map((p) => ({
          p,
          dimensionIndex: WORK_DIMENSIONS.findIndex((d) => d.id === p.primaryDimension),
          radius: BLIP_RADIUS[freshnessOf(p)],
        })),
        WORK_DIMENSIONS.length,
      ),
    [phenomena],
  );

  return (
    <g>
      {phenomena.map((p, arrayIndex) => {
        const index = WORK_DIMENSIONS.findIndex((d) => d.id === p.primaryDimension);
        const colour = WORK_DIMENSIONS[index]?.colour ?? "#94a3b8";
        const { x, y } = positions[arrayIndex];
        const r = BLIP_RADIUS[freshnessOf(p)];
        const isDraft = p.status === "draft";
        const dimmed =
          activeDimension !== null && !deriveImpacts(p).includes(activeDimension);
        const isHovered = hovered === p.id;
        const labelRight = x <= VIEWBOX.cx;

        return (
          <g
            key={p.id}
            data-status={p.status}
            opacity={dimmed ? 0.18 : 1}
            className="cursor-pointer focus:outline-none"
            role="button"
            tabIndex={dimmed ? -1 : 0}
            aria-hidden={dimmed || undefined}
            aria-label={`${p.label} — ${RING_LABEL[p.observedReach]}${isDraft ? " — draft" : ""}`}
            onClick={dimmed ? undefined : () => onOpen(p)}
            onKeyDown={
              dimmed
                ? undefined
                : (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpen(p);
                    }
                  }
            }
            onMouseEnter={() => setHovered(p.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(p.id)}
            onBlur={() => setHovered(null)}
          >
            {isHovered && (
              <circle cx={x} cy={y} r={r + 5} fill="none" stroke="#7dd3fc" strokeWidth="1.5" opacity="0.8" />
            )}
            {/* Drafts read as outlines: same position, same colour, visibly
                provisional. A reviewer needs to know whether the claim they are
                commenting on is settled or still being written, and the
                "N of 10 published" banner does not say which is which. */}
            <circle
              // Marks the blip proper, as opposed to the hover ring drawn in
              // the same group. The verification harness needs to tell them
              // apart; document order does not, since the ring comes first.
              data-blip=""
              cx={x}
              cy={y}
              r={r}
              fill={colour}
              fillOpacity={isDraft ? 0.15 : 1}
              stroke={isDraft ? colour : "none"}
              strokeWidth={isDraft ? 1.5 : 0}
              strokeDasharray={isDraft ? "3 2" : undefined}
            />
            {p.contested && (
              // The near-black bolt is invisible against a 15%-opacity fill, so
              // a contested draft draws its bolt in the sector colour instead.
              <path
                d={BOLT}
                fill={isDraft ? colour : "#030711"}
                transform={`translate(${x} ${y}) scale(${r / 7})`}
              />
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
                <rect
                  x={labelRight ? x + r + 4 : x - r - 4 - 190}
                  y={y - 14}
                  width={190}
                  height={30}
                  rx={3}
                  fill="#0b1220"
                  stroke="#334155"
                />
                <text
                  x={labelRight ? x + r + 10 : x - r - 10}
                  y={y - 3}
                  textAnchor={labelRight ? "start" : "end"}
                  fontSize="8"
                  fontFamily="monospace"
                  fill="#e2e8f0"
                >
                  {p.label}
                </text>
                <text
                  x={labelRight ? x + r + 10 : x - r - 10}
                  y={y + 8}
                  textAnchor={labelRight ? "start" : "end"}
                  fontSize="7.5"
                  fontFamily="monospace"
                  fill="#64748b"
                >
                  {RING_LABEL[p.observedReach]}
                  {p.contested ? " · contested" : ""}
                  {isDraft ? " · draft" : ""}
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
