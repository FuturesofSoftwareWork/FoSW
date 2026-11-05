import { WORK_DIMENSIONS } from "@/config/radarDimensions";
import type { WorkDimensionId } from "@/config/radarDimensions";
import { BLIP_FADE, BLIP_RADIUS } from "@/config/radarGeometry";

interface RadarLegendProps {
  active: WorkDimensionId | null;
  onToggle: (id: WorkDimensionId | null) => void;
  matchCount: number;
  totalCount: number;
  /** How many of the rendered phenomena are still drafts. Zero in production,
   *  where drafts are never fetched — the key below is then pointless and is
   *  not rendered at all. */
  draftCount: number;
}

/** The key's sample blips, drawn with the canvas's own values so the two cannot
 *  drift. Neutral grey, because colour is the sector. */
const KEY_COLOUR = "#94a3b8";
const KEY_GAP = 4;
const SIZE_SAMPLES = [BLIP_RADIUS.low, BLIP_RADIUS.moderate, BLIP_RADIUS.high, BLIP_RADIUS.transformative];
const FADE_SAMPLES = [BLIP_FADE.current, BLIP_FADE.recent, BLIP_FADE.ageing, BLIP_FADE.stale];

const SizeKey = () => {
  const height = BLIP_RADIUS.transformative * 2 + 2;
  const placed = SIZE_SAMPLES.map((r, i) => ({
    r,
    cx: 1 + r + SIZE_SAMPLES.slice(0, i).reduce((sum, prev) => sum + prev * 2 + KEY_GAP, 0),
  }));
  const last = placed[placed.length - 1];
  return (
    <svg width={last.cx + last.r + 1} height={height} aria-hidden="true" className="shrink-0">
      {placed.map(({ r, cx }) => (
        <circle key={r} cx={cx} cy={height / 2} r={r} fill={KEY_COLOUR} />
      ))}
    </svg>
  );
};

const FadeKey = () => {
  const r = BLIP_RADIUS.moderate;
  const step = r * 2 + KEY_GAP;
  return (
    <svg width={step * FADE_SAMPLES.length} height={r * 2 + 2} aria-hidden="true" className="shrink-0">
      {FADE_SAMPLES.map((fade, i) => (
        <circle
          key={fade}
          cx={1 + r + i * step}
          cy={r + 1}
          r={r}
          fill={KEY_COLOUR}
          fillOpacity={fade}
          stroke={fade < 1 ? KEY_COLOUR : "none"}
        />
      ))}
    </svg>
  );
};

const RadarLegend = ({
  active,
  onToggle,
  matchCount,
  totalCount,
  draftCount,
}: RadarLegendProps) => {
  const activeLabel = WORK_DIMENSIONS.find((d) => d.id === active)?.label ?? "";

  return (
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      {WORK_DIMENSIONS.map((d) => {
        const isActive = active === d.id;
        return (
          <button
            key={d.id}
            onClick={() => onToggle(isActive ? null : d.id)}
            aria-pressed={isActive}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-electric-blue/50 ${
              isActive
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200"
            }`}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: d.colour }}
            />
            {d.label}
          </button>
        );
      })}
      <div className="mt-3 flex w-full flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-xs text-gray-400">
        <p className="flex items-center gap-2">
          <SizeKey />
          Size: potential impact if this happens
        </p>
        <p className="flex items-center gap-2">
          <FadeKey />
          Fainter: no new evidence for 3, 6 or 12+ months
        </p>
      </div>
      {draftCount > 0 && (
        <p className="mt-2 flex w-full items-center justify-center gap-2 font-mono text-xs text-gray-500">
          <svg width="14" height="14" aria-hidden="true" className="shrink-0">
            <circle
              cx="7"
              cy="7"
              r="5"
              fill="#94a3b8"
              fillOpacity="0.15"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          </svg>
          dashed outline — draft, not yet published ({draftCount} of {totalCount})
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {active
          ? `Filtered to ${matchCount} of ${totalCount} phenomena affecting ${activeLabel}.`
          : `Showing all ${totalCount} phenomena.`}
      </p>
    </div>
  );
};

export default RadarLegend;
