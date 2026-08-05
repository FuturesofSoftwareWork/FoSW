import { WORK_DIMENSIONS } from "@/config/radarDimensions";
import type { WorkDimensionId } from "@/config/radarDimensions";

interface RadarLegendProps {
  active: WorkDimensionId | null;
  onToggle: (id: WorkDimensionId | null) => void;
}

const RadarLegend = ({ active, onToggle }: RadarLegendProps) => (
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
  </div>
);

export default RadarLegend;
