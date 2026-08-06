import { WORK_DIMENSIONS } from "@/config/radarDimensions";
import type { WorkDimensionId } from "@/config/radarDimensions";

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
