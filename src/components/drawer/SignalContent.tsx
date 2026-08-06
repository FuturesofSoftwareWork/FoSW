import {
  ExternalLink,
  Sparkles,
  Calendar,
  Tag,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  Clock,
  LayoutGrid,
  Radio,
  BarChart3,
  FlaskConical,
  Scale,
  Package,
  TrendingUp,
  Telescope,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AISignal, SignalType, SignalStrength } from "@/types/content";

// Full static Tailwind class strings — never interpolate (see CLAUDE.md).
const SIGNAL_TYPE_META: Record<
  SignalType,
  { label: string; className: string; Icon: LucideIcon }
> = {
  "practitioner-account": {
    label: "Practitioner account",
    className: "border-neon-gold/40 text-neon-gold bg-neon-gold/10",
    Icon: Radio,
  },
  "field-report": {
    label: "Field report",
    className: "border-electric-blue/40 text-electric-blue bg-electric-blue/10",
    Icon: BarChart3,
  },
  study: {
    label: "Study",
    className: "border-hologram-cyan/40 text-hologram-cyan bg-hologram-cyan/10",
    Icon: FlaskConical,
  },
  "tool-shift": {
    label: "Tool shift",
    className: "border-emerald-400/40 text-emerald-300 bg-emerald-400/10",
    Icon: Package,
  },
  "regulation-standard": {
    label: "Regulation / standard",
    className: "border-rose-400/40 text-rose-300 bg-rose-400/10",
    Icon: Scale,
  },
  "market-event": {
    label: "Market event",
    className: "border-orange-400/40 text-orange-300 bg-orange-400/10",
    Icon: TrendingUp,
  },
  forecast: {
    label: "Forecast",
    className: "border-purple-400/40 text-purple-300 bg-purple-400/10",
    Icon: Telescope,
  },
  "primary-research": {
    label: "Primary research",
    className: "border-teal-400/40 text-teal-300 bg-teal-400/10",
    Icon: Users,
  },
};

const SIGNAL_STRENGTH_META: Record<SignalStrength, { label: string; className: string }> = {
  weak: { label: "Weak · unvalidated", className: "border-white/20 text-gray-400" },
  emerging: { label: "Emerging", className: "border-white/30 text-gray-200 bg-white/5" },
  established: { label: "Established", className: "border-white/40 text-white bg-white/10" },
};

const hostLabel = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const SignalContent = ({ data }: { data: AISignal }) => {
  const typeMeta = data.signalType ? SIGNAL_TYPE_META[data.signalType] : null;
  const TypeIcon = typeMeta?.Icon;
  const strengthMeta = data.signalStrength
    ? SIGNAL_STRENGTH_META[data.signalStrength]
    : null;
  const evidenceParts: string[] = [];
  if (data.observer) evidenceParts.push(data.observer);
  if (data.sampleSize) evidenceParts.push(data.sampleSize);
  if (data.fieldworkPeriod) evidenceParts.push(`fieldwork ${data.fieldworkPeriod}`);
  if (data.sponsor) evidenceParts.push(`sponsor: ${data.sponsor}`);
  if (data.dataCollectedPeriod) evidenceParts.push(`data collected ${data.dataCollectedPeriod}`);
  if (data.replicated !== undefined) {
    evidenceParts.push(data.replicated ? "independently replicated" : "not replicated");
  }
  if (data.effectiveDate) evidenceParts.push(`effective ${data.effectiveDate}`);
  if (data.jurisdiction) evidenceParts.push(data.jurisdiction);
  if (data.version) evidenceParts.push(data.version);
  if (data.availability) evidenceParts.push(data.availability);
  if (data.leadTimeEstimate) evidenceParts.push(`lead time ${data.leadTimeEstimate}`);
  return (
    <>
      {/* Top metadata row: source + category + decision horizon */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-hologram-cyan font-mono uppercase tracking-wider">
          <Sparkles size={14} />
          {data.source}
        </div>
        {typeMeta && TypeIcon && (
          <span
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-full border ${typeMeta.className}`}
          >
            <TypeIcon size={12} />
            {typeMeta.label}
          </span>
        )}
        {strengthMeta && (
          <span
            className={`px-3 py-1 text-xs font-mono rounded-full border ${strengthMeta.className}`}
          >
            {strengthMeta.label}
          </span>
        )}
        {data.category && (
          <>
            {Array.isArray(data.category) ? (
              data.category.map((cat) => (
                <span
                  key={cat}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-full border border-hologram-cyan/30 text-hologram-cyan bg-hologram-cyan/10"
                >
                  <LayoutGrid size={12} />
                  {cat}
                </span>
              ))
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-full border border-hologram-cyan/30 text-hologram-cyan bg-hologram-cyan/10">
                <LayoutGrid size={12} />
                {data.category}
              </span>
            )}
          </>
        )}
        {data.decisionHorizon && (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-full border border-electric-blue/30 text-electric-blue bg-electric-blue/10">
            <Clock size={12} />
            {data.decisionHorizon}
          </span>
        )}
      </div>

      {/* Date */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Calendar size={14} className="text-hologram-cyan" />
        <span className="text-hologram-cyan font-mono">
          {new Date(data.date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
        <span className="text-gray-500 ml-1">
          (Signal scanned:{" "}
          {new Date(data.detectedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          )
        </span>
      </div>

      {evidenceParts.length > 0 && (
        <div className="mb-6 text-xs text-gray-400 font-mono">
          {evidenceParts.join(" · ")}
        </div>
      )}

      {Array.isArray(data.corroboration) && data.corroboration.length > 0 && (
        <div className="mb-6 text-xs text-gray-400 font-mono">
          <span className="text-hologram-cyan">
            Corroborated by {data.corroboration.length} independent source
            {data.corroboration.length > 1 ? "s" : ""}:
          </span>{" "}
          {data.corroboration.map((url, i) => (
            <span key={`${url}-${i}`}>
              {i > 0 && " · "}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-hologram-cyan"
              >
                {hostLabel(url)}
              </a>
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 leading-tight">
        {data.title}
      </h2>

      {/* Summary */}
      <div className="prose prose-invert max-w-none">
        <p className="text-gray-300 leading-relaxed whitespace-pre-line">{data.summary}</p>
      </div>

      {/* Why It Matters */}
      {data.whyItMatters && data.whyItMatters.length > 0 && (
        <div className="mt-10">
          <h3 className="flex items-center gap-2 text-sm font-bold text-hologram-cyan uppercase tracking-widest mb-4">
            <Lightbulb size={16} />
            Why It Matters
          </h3>
          <ul className="space-y-3">
            {data.whyItMatters.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 text-gray-300 text-sm leading-relaxed"
              >
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-hologram-cyan shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Actions */}
      {data.recommendedActions && data.recommendedActions.length > 0 && (
        <div className="mt-8">
          <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-400 uppercase tracking-widest mb-4">
            <CheckCircle size={16} />
            Recommended Actions
          </h3>
          <ul className="space-y-3">
            {data.recommendedActions.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 text-gray-300 text-sm leading-relaxed"
              >
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks & Caveats */}
      {data.risksAndCaveats && data.risksAndCaveats.length > 0 && (
        <div className="mt-8">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-400 uppercase tracking-widest mb-4">
            <AlertTriangle size={16} />
            Risks & Caveats
          </h3>
          <ul className="space-y-3">
            {data.risksAndCaveats.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 text-gray-300 text-sm leading-relaxed"
              >
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      {data.tags && data.tags.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2">
          <Tag size={14} className="text-hologram-cyan mt-1" />
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 text-xs font-mono rounded-full border border-hologram-cyan/30 text-hologram-cyan bg-hologram-cyan/5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Source link */}
      {data.sourceUrl && (
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 text-hologram-cyan hover:text-white border border-hologram-cyan/50 px-6 py-3 rounded-full hover:bg-hologram-cyan/20 transition-all text-sm font-bold uppercase tracking-widest"
        >
          View Source <ExternalLink size={14} />
        </a>
      )}
    </>
  );
};

export default SignalContent;
