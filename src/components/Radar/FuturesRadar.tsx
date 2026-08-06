import { useState } from "react";
import type { Phenomenon } from "@/types/phenomenon";
import type { WorkDimensionId } from "@/config/radarDimensions";
import { deriveImpacts, isPreviewContext } from "@/lib/phenomenon";
import RadarCanvas from "./RadarCanvas";
import RadarBlips from "./RadarBlips";
import RadarLegend from "./RadarLegend";

const LAUNCH_THRESHOLD = 10;
const LABELS_OFF_ABOVE = 15;

interface FuturesRadarProps {
  phenomena: Phenomenon[];
  onOpen: (p: Phenomenon) => void;
}

const FuturesRadar = ({ phenomena, onOpen }: FuturesRadarProps) => {
  const publishedCount = phenomena.filter((p) => p.status === "published").length;
  const [activeDimension, setActiveDimension] = useState<WorkDimensionId | null>(null);
  const [labelsOverride, setLabelsOverride] = useState<boolean | null>(null);
  const showLabels = labelsOverride ?? phenomena.length <= LABELS_OFF_ABOVE;

  // A stale research claim presented as current is worse than no radar, and an
  // unfinished one is worse than an absent one. Both guards live here.
  if (phenomena.length === 0) return null;
  if (publishedCount < LAUNCH_THRESHOLD && !isPreviewContext()) {
    return null;
  }

  const matchCount =
    activeDimension === null
      ? phenomena.length
      : phenomena.filter((p) => deriveImpacts(p).includes(activeDimension)).length;

  return (
    <section className="bg-midnight px-4 py-20" id="futures-radar">
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-center font-mono text-xs uppercase tracking-[0.2em] text-hologram-cyan">
          Futures Radar
        </p>
        <h2 className="mb-3 text-center font-serif text-3xl text-white">
          How far has each change reached?
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-gray-400">
          Each blip is a phenomenon — a claim about how software work may be changing,
          backed by dated evidence. Position shows how far it has spread beyond
          forerunners, not how certain we are.
        </p>

        {publishedCount < LAUNCH_THRESHOLD && (
          <p className="mx-auto mb-6 max-w-2xl rounded-lg border border-neon-gold/30 bg-neon-gold/5 px-4 py-2 text-center font-mono text-xs text-neon-gold">
            Preview — {publishedCount} of {LAUNCH_THRESHOLD} phenomena published. Not visible publicly.
          </p>
        )}

        <div className="mb-4 flex justify-center">
          <button
            onClick={() => setLabelsOverride(!showLabels)}
            aria-pressed={showLabels}
            className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-gray-400 transition-colors hover:border-white/25 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-electric-blue/50"
          >
            Labels {showLabels ? "on" : "off"}
          </button>
        </div>

        <RadarCanvas>
          <RadarBlips
            phenomena={phenomena}
            showLabels={showLabels}
            activeDimension={activeDimension}
            onOpen={onOpen}
          />
        </RadarCanvas>

        <RadarLegend
          active={activeDimension}
          onToggle={setActiveDimension}
          matchCount={matchCount}
          totalCount={phenomena.length}
        />
      </div>
    </section>
  );
};

export default FuturesRadar;
