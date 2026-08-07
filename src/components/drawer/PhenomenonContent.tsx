import {
  AlertTriangle,
  ArrowRight,
  Check,
  Layers,
  Link as LinkIcon,
  Minus,
  RefreshCw,
  Telescope,
  Users,
  X,
} from "lucide-react";
import type { AISignal } from "@/types/content";
import type { Phenomenon, EvidenceStance } from "@/types/phenomenon";
import { WORK_DIMENSIONS } from "@/config/radarDimensions";
import { RADAR_ACTORS } from "@/config/radarActors";
import { deriveImpacts } from "@/lib/phenomenon";
import { openDisclosure } from "@/lib/drawer";
import {
  DisclosureSection,
  DrawerKicker,
  MetaList,
  Panel,
  SectionHeading,
  StatChip,
  StatStrip,
} from "@/components/drawer/primitives";

/** Ring order, low to high. Drives the three-segment reach meter, which is a
 *  deliberate echo of where the blip sat on the canvas — a phenomenon drawer is
 *  a cold open (a blip carries a 2-4 word label and labels can be off entirely),
 *  so the click has to carry its context with it. */
const REACH_ORDER: Phenomenon["observedReach"][] = [
  "early-manifestations",
  "gaining-traction",
  "field-level-shift",
];

const REACH_LABEL: Record<Phenomenon["observedReach"], string> = {
  "field-level-shift": "Field-level shift",
  "gaining-traction": "Gaining traction",
  "early-manifestations": "Early manifestations",
};

const dimension = (id: string) => WORK_DIMENSIONS.find((d) => d.id === id);
const dimensionLabel = (id: string) => dimension(id)?.label ?? id;
const dimensionColour = (id: string) => dimension(id)?.colour ?? "#94a3b8";
const actorLabel = (id: string) =>
  RADAR_ACTORS.find((a) => a.id === id)?.label ?? id;

const STANCE_ORDER: EvidenceStance[] = ["supports", "counter", "contextual"];
const STANCE_META: Record<
  EvidenceStance,
  { heading: string; short: string; icon: typeof Check; className: string }
> = {
  supports: {
    heading: "Evidence the change is happening",
    short: "supporting",
    icon: Check,
    className: "text-emerald-400",
  },
  counter: {
    heading: "Evidence against, or pointing elsewhere",
    short: "counter",
    icon: X,
    className: "text-amber-400",
  },
  contextual: {
    heading: "Evidence of the pressure driving it",
    short: "contextual",
    icon: Minus,
    className: "text-gray-500",
  },
};

const IMPACT_LABEL: Record<NonNullable<Phenomenon["potentialImpact"]>, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  transformative: "Transformative",
};

const RELATION_LABEL: Record<string, string> = {
  reinforces: "Reinforces",
  constrains: "Constrains",
  "depends-on": "Depends on",
};

const EVIDENCE_ID = "phenomenon-evidence";
const PLACEMENT_ID = "phenomenon-placement";
const RELATED_ID = "phenomenon-related";
const PROVENANCE_ID = "phenomenon-provenance";

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
  const reachIndex = REACH_ORDER.indexOf(data.observedReach);
  const primaryColour = dimensionColour(data.primaryDimension);

  const resolvedEvidence = data.evidence.filter((e) => byId.has(e.signalId));
  const stanceCounts = STANCE_ORDER.map((stance) => ({
    stance,
    n: resolvedEvidence.filter((e) => e.stance === stance).length,
  })).filter((c) => c.n > 0);
  const evidenceHint = stanceCounts
    .map((c) => `${c.n} ${STANCE_META[c.stance].short}`)
    .join(" · ");

  return (
    <div>
      {/* ---------- Tier 1: the verdict, in one screen ---------- */}
      <DrawerKicker>
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: primaryColour }}
            aria-hidden="true"
          />
          Phenomenon
        </span>
        <span aria-hidden="true">·</span>
        <span style={{ color: primaryColour }}>
          {dimensionLabel(data.primaryDimension)}
        </span>
      </DrawerKicker>

      <h2 className="mb-6 max-w-[24ch] font-serif text-2xl leading-tight text-white md:text-3xl">
        {data.title}
      </h2>

      <StatStrip>
        <StatChip
          label="Reach"
          controls={PLACEMENT_ID}
          onClick={() => openDisclosure(PLACEMENT_ID)}
        >
          <span className="flex items-center gap-2">
            <span className="flex gap-0.5" aria-hidden="true">
              {REACH_ORDER.map((r, i) => (
                <span
                  key={r}
                  className="block h-1.5 w-3 rounded-sm"
                  style={{
                    backgroundColor: primaryColour,
                    opacity: i <= reachIndex ? 1 : 0.2,
                  }}
                />
              ))}
            </span>
          </span>
          <span className="text-sm leading-tight text-gray-200">
            {REACH_LABEL[data.observedReach]}
          </span>
        </StatChip>

        {data.potentialImpact && (
          <StatChip label="Potential impact">
            <span
              className="text-sm leading-tight text-gray-200"
              title="Judged separately from reach — a change can be early and still matter enormously."
            >
              {IMPACT_LABEL[data.potentialImpact]}
            </span>
          </StatChip>
        )}

        {resolvedEvidence.length > 0 && (
          <StatChip
            label="Evidence"
            controls={EVIDENCE_ID}
            onClick={() => openDisclosure(EVIDENCE_ID)}
          >
            <span className="text-sm leading-tight text-gray-200">
              {resolvedEvidence.length}{" "}
              {resolvedEvidence.length === 1 ? "source" : "sources"}
            </span>
            {profile && (
              <span className="text-xs leading-tight text-gray-500">
                {profile.independentContexts} contexts · {profile.quartersSpanned}{" "}
                {profile.quartersSpanned === 1 ? "quarter" : "quarters"}
              </span>
            )}
          </StatChip>
        )}

        {data.contested && (
          <StatChip
            label="Status"
            tone="amber"
            controls={PLACEMENT_ID}
            onClick={() => openDisclosure(PLACEMENT_ID)}
          >
            <span className="flex items-center gap-1.5 text-sm leading-tight text-amber-300">
              <AlertTriangle size={13} className="shrink-0" />
              Contested
            </span>
          </StatChip>
        )}
      </StatStrip>

      <p className="mb-4 max-w-[68ch] font-serif text-lg leading-relaxed text-gray-200">
        {data.thesis}
      </p>

      {data.currentPressure && (
        <p className="mb-10 max-w-[68ch] text-sm leading-relaxed text-gray-400">
          <span className="font-mono text-xs uppercase tracking-wider text-gray-500">
            Driving it:
          </span>{" "}
          {data.currentPressure}
        </p>
      )}

      {/* ---------- Tier 2: the argument ---------- */}
      <section className="mb-10">
        <SectionHeading icon={Layers}>What this changes</SectionHeading>
        <ul className="space-y-4">
          {data.implications.map((im, i) => (
            <li
              key={i}
              className="border-l-2 pl-4"
              style={{ borderColor: dimensionColour(im.dimension) }}
            >
              <p
                className="mb-1 font-mono text-xs uppercase tracking-wider"
                style={{ color: dimensionColour(im.dimension) }}
              >
                {dimensionLabel(im.dimension)}
              </p>
              <p className="max-w-[68ch] text-sm leading-relaxed text-gray-200">
                {im.statement}
              </p>
              {im.actors && im.actors.length > 0 && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
                  <Users size={12} aria-hidden="true" />{" "}
                  {im.actors.map(actorLabel).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {data.developmentPaths && data.developmentPaths.length > 0 && (
        <section className="mb-10">
          <SectionHeading icon={Telescope}>Where it could lead</SectionHeading>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.developmentPaths.map((p) => (
              <li key={p.id}>
                <Panel>
                  <p className="mb-1.5 text-sm font-semibold text-gray-100">
                    {p.title}
                  </p>
                  <p className="text-sm leading-relaxed text-gray-400">
                    {p.description}
                  </p>
                </Panel>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.whatWouldChangeThis && data.whatWouldChangeThis.length > 0 && (
        <section className="mb-10">
          <SectionHeading icon={RefreshCw}>
            What would change our mind
          </SectionHeading>
          <ul className="space-y-3">
            {data.whatWouldChangeThis.map((w, i) => (
              <li
                key={i}
                className="flex max-w-[68ch] gap-3 text-sm leading-relaxed text-gray-300"
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-hologram-cyan"
                  aria-hidden="true"
                />
                {w}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Tier 3: the receipts, collapsed ---------- */}
      <div className="mt-10">
        {resolvedEvidence.length > 0 && (
          <DisclosureSection
            id={EVIDENCE_ID}
            title="Evidence"
            count={resolvedEvidence.length}
            hint={evidenceHint}
          >
            {profile && (
              <p className="mb-4 max-w-[68ch] text-sm leading-relaxed text-gray-400">
                Observed in{" "}
                <strong className="font-semibold text-gray-200">
                  {profile.independentContexts}
                </strong>{" "}
                independent{" "}
                {profile.independentContexts === 1 ? "context" : "contexts"} across{" "}
                <strong className="font-semibold text-gray-200">
                  {profile.evidenceTypes}
                </strong>{" "}
                evidence {profile.evidenceTypes === 1 ? "type" : "types"} over{" "}
                <strong className="font-semibold text-gray-200">
                  {profile.quartersSpanned}
                </strong>{" "}
                {profile.quartersSpanned === 1 ? "quarter" : "quarters"}.
                {profile.counterEvidence && " Counter-evidence present."}
              </p>
            )}

            {STANCE_ORDER.map((stance) => {
              const items = resolvedEvidence.filter((e) => e.stance === stance);
              if (items.length === 0) return null;
              const { heading, icon: StanceIcon, className } = STANCE_META[stance];
              return (
                <div key={stance} className="mb-5 last:mb-0">
                  <h4 className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-gray-500">
                    <StanceIcon size={12} className={`shrink-0 ${className}`} />
                    {heading}
                  </h4>
                  <ul className="space-y-2">
                    {items.map((e) => {
                      const signal = byId.get(e.signalId);
                      if (!signal) return null;
                      return (
                        <li key={e.signalId}>
                          <button
                            type="button"
                            onClick={() => onOpenSignal(signal)}
                            className="group flex w-full cursor-pointer gap-3 rounded-lg border border-white/10 p-3 text-left transition-colors duration-200 hover:border-electric-blue/40 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-electric-blue/50 motion-reduce:transition-none"
                          >
                            <StanceIcon
                              size={14}
                              aria-hidden="true"
                              className={`mt-0.5 shrink-0 ${className}`}
                            />
                            <span className="flex-1">
                              <span className="block text-sm text-gray-200">
                                {signal.title}
                              </span>
                              {e.note && (
                                <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">
                                  {e.note}
                                </span>
                              )}
                            </span>
                            <ArrowRight
                              size={14}
                              aria-hidden="true"
                              className="mt-0.5 shrink-0 text-gray-600 group-hover:text-electric-blue"
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </DisclosureSection>
        )}

        <DisclosureSection
          id={PLACEMENT_ID}
          title="Why it sits here"
          hint={REACH_LABEL[data.observedReach]}
        >
          <p className="max-w-[68ch] text-sm leading-relaxed text-gray-300">
            {data.reachRationale}
          </p>

          {data.contested && data.contestedNote && (
            <div className="mt-4">
              <Panel tone="amber">
                <p className="mb-1.5 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-amber-400">
                  <AlertTriangle size={13} className="shrink-0" />
                  Contested
                </p>
                <p className="max-w-[68ch] text-sm leading-relaxed text-gray-300">
                  {data.contestedNote}
                </p>
              </Panel>
            </div>
          )}

          {data.reachHistory && data.reachHistory.length > 0 && (
            <ul className="mt-4 space-y-2 border-l border-white/10 pl-4">
              {data.reachHistory.map((h) => (
                <li key={h.edition} className="text-sm text-gray-400">
                  <span className="font-mono text-xs uppercase tracking-wider text-gray-500">
                    {h.edition} · {REACH_LABEL[h.observedReach]}
                  </span>
                  <br />
                  {h.rationale}
                </li>
              ))}
            </ul>
          )}
        </DisclosureSection>

        {related.length > 0 && (
          <DisclosureSection
            id={RELATED_ID}
            title="Related phenomena"
            count={related.length}
          >
            <ul className="flex flex-wrap gap-2">
              {related.map((r) => {
                const rel = data.related?.find((x) => x.id === r.id)?.relation;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => onOpenPhenomenon(r)}
                      className="group flex cursor-pointer items-center gap-2 rounded-full border border-hologram-cyan/30 bg-hologram-cyan/5 py-1.5 pl-3 pr-2.5 text-left transition-colors duration-200 hover:border-hologram-cyan/60 hover:bg-hologram-cyan/15 focus:outline-none focus:ring-2 focus:ring-hologram-cyan/50 motion-reduce:transition-none"
                    >
                      <LinkIcon
                        size={12}
                        aria-hidden="true"
                        className="shrink-0 text-hologram-cyan"
                      />
                      <span className="text-sm text-gray-200">
                        {rel && (
                          <span className="font-mono text-xs uppercase tracking-wider text-gray-500">
                            {RELATION_LABEL[rel] ?? rel}{" "}
                          </span>
                        )}
                        {r.label}
                      </span>
                      <ArrowRight
                        size={12}
                        aria-hidden="true"
                        className="shrink-0 text-gray-600 group-hover:text-hologram-cyan"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </DisclosureSection>
        )}

        <DisclosureSection
          id={PROVENANCE_ID}
          title="Provenance"
          hint={`Reach reviewed ${data.reachReviewedAt}`}
        >
          <MetaList
            items={[
              ...(data.firstObserved
                ? [{ label: "First observed", value: data.firstObserved }]
                : []),
              ...(data.latestEvidenceDate
                ? [{ label: "Latest evidence", value: data.latestEvidenceDate }]
                : []),
              { label: "Reach reviewed", value: data.reachReviewedAt },
              ...(impacts.length > 0
                ? [
                    {
                      label: "Dimensions touched",
                      value: (
                        <span className="flex flex-wrap gap-1.5">
                          {impacts.map((id) => (
                            <span
                              key={id}
                              className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-gray-400"
                            >
                              <span
                                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: dimensionColour(id) }}
                                aria-hidden="true"
                              />
                              {dimensionLabel(id)}
                            </span>
                          ))}
                        </span>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </DisclosureSection>
      </div>
    </div>
  );
};

export default PhenomenonContent;
