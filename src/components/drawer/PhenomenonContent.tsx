import { AlertTriangle, ArrowRight, Calendar, Users } from "lucide-react";
import type { AISignal } from "@/types/content";
import type { Phenomenon, EvidenceStance } from "@/types/phenomenon";
import { WORK_DIMENSIONS } from "@/config/radarDimensions";
import { RADAR_ACTORS } from "@/config/radarActors";
import { deriveImpacts } from "@/lib/phenomenon";

const REACH_LABEL: Record<Phenomenon["observedReach"], string> = {
  "field-level-shift": "Field-level shift",
  "gaining-traction": "Gaining traction",
  "early-manifestations": "Early manifestations",
};

const dimensionLabel = (id: string) =>
  WORK_DIMENSIONS.find((d) => d.id === id)?.label ?? id;
const dimensionColour = (id: string) =>
  WORK_DIMENSIONS.find((d) => d.id === id)?.colour ?? "#94a3b8";
const actorLabel = (id: string) =>
  RADAR_ACTORS.find((a) => a.id === id)?.label ?? id;

const STANCE_ORDER: EvidenceStance[] = ["supports", "counter", "contextual"];
const STANCE_HEADING: Record<EvidenceStance, string> = {
  supports: "Evidence the change is happening",
  counter: "Evidence against, or pointing elsewhere",
  contextual: "Evidence of the pressure driving it",
};

const IMPACT_LABEL: Record<NonNullable<Phenomenon["potentialImpact"]>, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  transformative: "Transformative",
};

interface PhenomenonContentProps {
  data: Phenomenon;
  signals: AISignal[];
  onOpenSignal: (signal: AISignal) => void;
  related: Phenomenon[];
  onOpenPhenomenon: (p: Phenomenon) => void;
}

const PhenomenonContent = ({
  data,
  signals,
  onOpenSignal,
  related,
  onOpenPhenomenon,
}: PhenomenonContentProps) => {
  const impacts = deriveImpacts(data);
  const byId = new Map(signals.map((s) => [s.id, s]));
  const profile = data.evidenceProfile;

  return (
    <div className="space-y-8">
      <p className="font-serif text-lg leading-relaxed text-gray-200">
        {data.thesis}
      </p>

      {data.currentPressure && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="mb-1 font-mono text-xs uppercase tracking-wider text-gray-500">
            What is driving it
          </p>
          <p className="text-sm text-gray-300">{data.currentPressure}</p>
        </div>
      )}

      {/* Reach and its rationale, together — a reader who disagrees with where
          this sits should find the argument immediately. */}
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-hologram-cyan">
          {REACH_LABEL[data.observedReach]}
        </p>
        <p className="text-sm leading-relaxed text-gray-300">
          {data.reachRationale}
        </p>
        {data.contested && data.contestedNote && (
          <div className="mt-3 flex gap-2 rounded-lg border border-white/20 bg-white/5 p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-white" />
            <p className="text-sm text-gray-300">{data.contestedNote}</p>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-serif text-xl text-white">
          What this changes about software work
        </h3>
        <ul className="space-y-4">
          {data.implications.map((im, i) => (
            <li key={i} className="border-l-2 pl-4" style={{ borderColor: dimensionColour(im.dimension) }}>
              <p className="mb-1 font-mono text-xs uppercase tracking-wider" style={{ color: dimensionColour(im.dimension) }}>
                {dimensionLabel(im.dimension)}
              </p>
              <p className="text-sm text-gray-200">{im.statement}</p>
              {im.actors && im.actors.length > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <Users size={12} /> {im.actors.map(actorLabel).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {profile && (
        <p className="text-sm text-gray-400">
          Observed in <strong className="text-gray-200">{profile.independentContexts}</strong>{" "}
          independent {profile.independentContexts === 1 ? "context" : "contexts"} across{" "}
          <strong className="text-gray-200">{profile.evidenceTypes}</strong>{" "}
          evidence {profile.evidenceTypes === 1 ? "type" : "types"} over{" "}
          <strong className="text-gray-200">{profile.quartersSpanned}</strong>{" "}
          {profile.quartersSpanned === 1 ? "quarter" : "quarters"}.
          {profile.counterEvidence && " Counter-evidence present."}
        </p>
      )}

      {STANCE_ORDER.map((stance) => {
        const items = data.evidence.filter((e) => e.stance === stance);
        if (items.length === 0) return null;
        return (
          <div key={stance}>
            <h4 className="mb-2 font-mono text-xs uppercase tracking-wider text-gray-500">
              {STANCE_HEADING[stance]}
            </h4>
            <ul className="space-y-2">
              {items.map((e) => {
                const signal = byId.get(e.signalId);
                if (!signal) return null;
                return (
                  <li key={e.signalId}>
                    <button
                      onClick={() => onOpenSignal(signal)}
                      className="group flex w-full gap-2 rounded-lg border border-white/10 p-3 text-left transition-colors hover:border-electric-blue/40 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-electric-blue/50"
                    >
                      <span className="flex-1">
                        <span className="block text-sm text-gray-200">{signal.title}</span>
                        {e.note && (
                          <span className="mt-0.5 block text-xs text-gray-500">{e.note}</span>
                        )}
                      </span>
                      <ArrowRight size={14} className="mt-1 shrink-0 text-gray-600 group-hover:text-electric-blue" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {data.potentialImpact && (
        <p className="text-sm text-gray-400">
          Potential impact if it plays out:{" "}
          <strong className="text-gray-200">{IMPACT_LABEL[data.potentialImpact]}</strong>.
          Judged separately from reach — a change can be early and still matter enormously.
        </p>
      )}

      {related.length > 0 && (
        <div>
          <h3 className="mb-3 font-serif text-xl text-white">Related phenomena</h3>
          <ul className="space-y-2">
            {related.map((r) => {
              const rel = data.related?.find((x) => x.id === r.id)?.relation;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => onOpenPhenomenon(r)}
                    className="group flex w-full items-center gap-2 rounded-lg border border-white/10 p-3 text-left transition-colors hover:border-hologram-cyan/40 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-hologram-cyan/50"
                  >
                    <span className="flex-1">
                      <span className="block text-sm text-gray-200">{r.title}</span>
                      {rel && (
                        <span className="mt-0.5 block font-mono text-xs text-gray-500">
                          {rel.replace("-", " ")}
                        </span>
                      )}
                    </span>
                    <ArrowRight size={14} className="shrink-0 text-gray-600 group-hover:text-hologram-cyan" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {data.developmentPaths && data.developmentPaths.length > 0 && (
        <div>
          <h3 className="mb-3 font-serif text-xl text-white">Where it could lead</h3>
          <ul className="space-y-3">
            {data.developmentPaths.map((p) => (
              <li key={p.id}>
                <p className="text-sm font-semibold text-gray-200">{p.title}</p>
                <p className="text-sm text-gray-400">{p.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.whatWouldChangeThis && data.whatWouldChangeThis.length > 0 && (
        <div>
          <h3 className="mb-3 font-serif text-xl text-white">What would change our mind</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-300">
            {data.whatWouldChangeThis.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {impacts.map((id) => (
          <span key={id} className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
            {dimensionLabel(id)}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 border-t border-white/10 pt-4 font-mono text-xs text-gray-500">
        {data.firstObserved && (
          <span className="flex items-center gap-1">
            <Calendar size={12} /> First observed {data.firstObserved}
          </span>
        )}
        {data.latestEvidenceDate && <span>Latest evidence {data.latestEvidenceDate}</span>}
        <span>Reach reviewed {data.reachReviewedAt}</span>
      </div>
    </div>
  );
};

export default PhenomenonContent;
