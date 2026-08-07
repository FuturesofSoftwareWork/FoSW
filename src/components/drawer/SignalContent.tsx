import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ExternalLink,
  FlaskConical,
  Lightbulb,
  Package,
  Radio,
  Scale,
  Telescope,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type {
  AISignal,
  AISignalCategory,
  SignalType,
  SignalStrength,
} from "@/types/content";
import type { Phenomenon } from "@/types/phenomenon";
import { formatDate, hostLabel, splitLead } from "@/lib/drawer";
import {
  DisclosureSection,
  DrawerKicker,
  MetaList,
  Panel,
  SectionHeading,
} from "@/components/drawer/primitives";

/**
 * Full static Tailwind class strings — never interpolate (see CLAUDE.md).
 *
 * The eight evidence genres used to each claim a whole accent — border, text
 * and background — which spent eight colours on a distinction a reader cannot
 * act on, and left cyan meaning "source", "category", "date", "tag" and "call
 * to action" all at once. The icon already tells the genres apart, so only the
 * icon keeps a colour; the chip itself is neutral. Cyan is now reserved for
 * navigation into our own content.
 */
const SIGNAL_TYPE_META: Record<
  SignalType,
  { label: string; iconClassName: string; Icon: LucideIcon }
> = {
  "practitioner-account": {
    label: "Practitioner account",
    iconClassName: "text-neon-gold",
    Icon: Radio,
  },
  "field-report": {
    label: "Field report",
    iconClassName: "text-electric-blue",
    Icon: BarChart3,
  },
  study: { label: "Study", iconClassName: "text-hologram-cyan", Icon: FlaskConical },
  "tool-shift": {
    label: "Tool shift",
    iconClassName: "text-emerald-300",
    Icon: Package,
  },
  "regulation-standard": {
    label: "Regulation / standard",
    iconClassName: "text-rose-300",
    Icon: Scale,
  },
  "market-event": {
    label: "Market event",
    iconClassName: "text-orange-300",
    Icon: TrendingUp,
  },
  forecast: { label: "Forecast", iconClassName: "text-purple-300", Icon: Telescope },
  "primary-research": {
    label: "Primary research",
    iconClassName: "text-teal-300",
    Icon: Users,
  },
};

const SIGNAL_STRENGTH_LABEL: Record<SignalStrength, string> = {
  weak: "Weak · unvalidated",
  emerging: "Emerging",
  established: "Established",
};

const STAGE_LABEL: Record<NonNullable<AISignal["signalStage"]>, string> = {
  leading: "Leading current practice",
  concurrent: "Concurrent with current practice",
  lagging: "Lagging current practice",
};

const CHIP =
  "flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs text-gray-300";

const PROVENANCE_ID = "signal-provenance";
const CORROBORATION_ID = "signal-corroboration";
const TAGS_ID = "signal-tags";

const sentenceCase = (value: string | undefined): string | undefined =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const categoryList = (
  category: AISignal["category"],
): AISignalCategory[] => {
  if (!category) return [];
  return Array.isArray(category) ? category : [category];
};

interface SignalContentProps {
  data: AISignal;
  /** All phenomena, for the "evidence for X" backlink. This used to be rendered
   *  by ContentDrawer above the component, which left it orphaned above the
   *  metadata block with no relationship to anything below it. */
  phenomena: Phenomenon[];
  onOpenPhenomenon: (p: Phenomenon) => void;
}

const SignalContent = ({
  data,
  phenomena,
  onOpenPhenomenon,
}: SignalContentProps) => {
  const typeMeta = data.signalType ? SIGNAL_TYPE_META[data.signalType] : null;
  const TypeIcon = typeMeta?.Icon;
  const categories = categoryList(data.category);
  const [primaryCategory, ...otherCategories] = categories;
  const partOf = phenomena.filter((p) =>
    p.evidence.some((e) => e.signalId === data.id),
  );

  // The card on the main page already showed the first ~50 words, so the drawer
  // never gates the rest behind a second expander. The lead is typography only:
  // it orients deep-link arrivals, who never saw a card.
  const { lead, rest } = splitLead(data.summary);

  const provenance: { label: string; value: ReactNode }[] = [];
  const add = (label: string, value: string | undefined | null) => {
    if (value) provenance.push({ label, value });
  };
  add("Source", data.source);
  // The schema stores these enums lowercase; they are labels here, not values.
  add("Source type", sentenceCase(data.sourceType));
  add("Evidence genre", typeMeta?.label);
  add("Strength", data.signalStrength && SIGNAL_STRENGTH_LABEL[data.signalStrength]);
  add("Stage", data.signalStage && STAGE_LABEL[data.signalStage]);
  add("Observer", data.observer);
  add("Sample", data.sampleSize);
  add("Participants", data.participants);
  add("Method", sentenceCase(data.method));
  add("Fieldwork", data.fieldworkPeriod);
  add("Data collected", data.dataCollectedPeriod);
  if (data.replicated !== undefined) {
    provenance.push({
      label: "Replication",
      value: data.replicated ? "Independently replicated" : "Not replicated",
    });
  }
  add("Sponsor", data.sponsor);
  add("Issuer", data.issuer);
  add("Jurisdiction", data.jurisdiction);
  add("Effective", data.effectiveDate);
  add("Version", data.version);
  // "GA" is an initialism and must not be lowercased into "Ga".
  add("Availability", data.availability === "GA" ? "GA" : sentenceCase(data.availability));
  add("Organisation", data.organisation);
  add("Magnitude", data.magnitude);
  add("Forecaster", data.forecaster);
  add("Forecast horizon", data.horizonDate);
  add("Lead time", data.leadTimeEstimate);
  add("Signal scanned", formatDate(data.detectedAt));
  if (otherCategories.length > 0) {
    provenance.push({
      label: "Also categorised",
      value: otherCategories.join(" · "),
    });
  }

  const provenanceHint = [
    typeMeta?.label,
    data.sampleSize,
    data.replicated === false ? "not replicated" : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      {/* ---------- Tier 1: what it is, before how we know ---------- */}
      <DrawerKicker>
        <span className="text-hologram-cyan">AI Signal</span>
        {primaryCategory && (
          <>
            <span aria-hidden="true">·</span>
            <span>{primaryCategory}</span>
          </>
        )}
        <span className="ml-auto normal-case tracking-normal">
          {formatDate(data.date)}
        </span>
      </DrawerKicker>

      <h2 className="mb-5 max-w-[32ch] text-2xl font-bold leading-tight text-white md:text-3xl">
        {data.title}
      </h2>

      {/* `decisionHorizon` is deliberately not rendered anywhere.
       *
       * Its values are literal year ranges ("0,5 - 2 years") and the
       * distribution is degenerate: of 102 signals, 78 say "now", 19 say
       * "0,5 - 2 years" and exactly one says "2+ years". A chip in the top row
       * was spending the reader's attention to tell them almost nothing.
       *
       * Relabelling rather than removing would have been worse — it would dress
       * a distinction the corpus cannot support in wording that implies it can.
       * The same finding is why the radar does not use this field as its radius:
       * see docs/superpowers/specs/2026-08-04-futures-radar-design.md. The
       * signal-level vocabulary is `signalStrength`; the temporal axis lives on
       * the phenomenon as `observedReach`. */}
      {(typeMeta || data.signalStrength) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {typeMeta && TypeIcon && (
            <span className={CHIP}>
              <TypeIcon
                size={12}
                aria-hidden="true"
                className={`shrink-0 ${typeMeta.iconClassName}`}
              />
              {typeMeta.label}
            </span>
          )}
          {data.signalStrength && (
            <span className={CHIP}>
              {SIGNAL_STRENGTH_LABEL[data.signalStrength]}
            </span>
          )}
        </div>
      )}

      <p className="mb-2 text-sm text-gray-400">
        {data.source}
        {data.sourceUrl && (
          <>
            {" "}
            <a
              href={data.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-hologram-cyan underline decoration-dotted underline-offset-2 transition-colors duration-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-hologram-cyan/50 motion-reduce:transition-none"
            >
              {hostLabel(data.sourceUrl)}
              <ExternalLink size={11} aria-hidden="true" className="shrink-0" />
            </a>
          </>
        )}
      </p>

      {partOf.length > 0 && (
        <p className="mb-6 text-sm text-gray-400">
          Evidence for{" "}
          {partOf.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ", "}
              <button
                type="button"
                onClick={() => onOpenPhenomenon(p)}
                className="cursor-pointer text-hologram-cyan underline decoration-dotted underline-offset-2 transition-colors duration-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-hologram-cyan/50 motion-reduce:transition-none"
              >
                {p.label}
              </button>
            </span>
          ))}
        </p>
      )}

      <div className="mb-10 max-w-[68ch]">
        {lead && (
          <p className="mb-4 font-serif text-lg leading-relaxed text-gray-100">
            {lead}
          </p>
        )}
        {rest && (
          <p className="whitespace-pre-line leading-relaxed text-gray-300">
            {rest}
          </p>
        )}
      </div>

      {/* ---------- Tier 2: the payload the card could not show ---------- */}
      {data.whyItMatters && data.whyItMatters.length > 0 && (
        <section className="mb-8">
          <SectionHeading icon={Lightbulb}>Why it matters</SectionHeading>
          <ul className="space-y-3">
            {data.whyItMatters.map((item, i) => (
              <li
                key={i}
                className="flex max-w-[68ch] gap-3 text-sm leading-relaxed text-gray-300"
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-hologram-cyan"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.recommendedActions && data.recommendedActions.length > 0 && (
        <section className="mb-8">
          <Panel tone="emerald">
            <SectionHeading icon={CheckCircle} tone="emerald">
              Recommended actions
            </SectionHeading>
            <ol className="space-y-3">
              {data.recommendedActions.map((item, i) => (
                <li
                  key={i}
                  className="flex max-w-[68ch] gap-3 text-sm leading-relaxed text-gray-300"
                >
                  <span
                    className="mt-px shrink-0 font-mono text-xs text-emerald-400"
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </Panel>
        </section>
      )}

      {data.risksAndCaveats && data.risksAndCaveats.length > 0 && (
        <section className="mb-10">
          <Panel tone="amber">
            <SectionHeading icon={AlertTriangle} tone="amber">
              Risks &amp; caveats
            </SectionHeading>
            <ul className="space-y-3">
              {data.risksAndCaveats.map((item, i) => (
                <li
                  key={i}
                  className="flex max-w-[68ch] gap-3 text-sm leading-relaxed text-gray-400"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}

      {/* ---------- Tier 3: sourcing, collapsed ---------- */}
      <div>
        {provenance.length > 0 && (
          <DisclosureSection
            id={PROVENANCE_ID}
            title="Provenance & method"
            hint={provenanceHint}
          >
            <MetaList items={provenance} />
          </DisclosureSection>
        )}

        {Array.isArray(data.corroboration) && data.corroboration.length > 0 && (
          <DisclosureSection
            id={CORROBORATION_ID}
            title="Corroboration"
            count={data.corroboration.length}
            hint={data.corroboration.map(hostLabel).join(" · ")}
          >
            <p className="mb-3 max-w-[68ch] text-sm text-gray-400">
              Independent sources reporting the same development.
            </p>
            <ul className="space-y-2">
              {data.corroboration.map((url, i) => (
                <li key={`${url}-${i}`}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-hologram-cyan underline decoration-dotted underline-offset-2 transition-colors duration-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-hologram-cyan/50 motion-reduce:transition-none"
                  >
                    {hostLabel(url)}
                    <ExternalLink size={12} aria-hidden="true" className="shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </DisclosureSection>
        )}

        {data.tags && data.tags.length > 0 && (
          <DisclosureSection id={TAGS_ID} title="Tags" count={data.tags.length}>
            <ul className="flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-white/15 px-3 py-1 font-mono text-xs text-gray-400"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </DisclosureSection>
        )}
      </div>

      {data.sourceUrl && (
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-hologram-cyan/50 px-6 py-3 text-sm font-bold uppercase tracking-widest text-hologram-cyan transition-all duration-200 hover:bg-hologram-cyan/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-hologram-cyan/50 motion-reduce:transition-none"
        >
          View source <ExternalLink size={14} aria-hidden="true" />
        </a>
      )}
    </div>
  );
};

export default SignalContent;
