import type { Phenomenon } from "@/types/phenomenon";

export type AISignalCategory =
  | "AI Agents"
  | "AI Tools"
  | "Productivity"
  | "SDLC Change"
  | "Quality & Testing"
  | "Security & Risk"
  | "Org & Leadership"
  | "Skills & Learning"
  | "Work Wellbeing"
  | "Ethics & Policy"
  | "Business Impact"
  | "Costs & Economics"
  | "Other";

// `DecisionHorizon` was here. The field is retired and nothing renders it, so
// the type is gone too — a typed field is a claim that the site consumes it.
// 98 published files still carry the raw value; that is inert, and excess
// properties on runtime-fetched JSON are not type-checked. See CLAUDE.md.

export type AISignalSourceType =
  | "academic"
  | "article"
  | "social"
  | "video"
  | "discussion"
  | "release";

/** Evidence genre. Determines which provenance fields apply. */
export type SignalType =
  | "practitioner-account"
  | "field-report"
  | "study"
  | "tool-shift"
  | "regulation-standard"
  | "market-event"
  | "forecast"
  | "primary-research";

/** How first-party research was gathered. Applies to `primary-research`. */
export type PrimaryResearchMethod = "interview" | "workshop" | "other";

/** Certainty. Drives the radar marker fill. */
export type SignalStrength = "weak" | "emerging" | "established";

/** Whether the item leads, matches, or trails current practice. */
export type SignalStage = "leading" | "concurrent" | "lagging";

export interface AISignal {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceType?: AISignalSourceType;
  sourceUrl?: string;
  detectedAt: string;
  date: string;
  status: "published" | "draft";
  tags?: string[];
  category?: AISignalCategory | AISignalCategory[];
  whyItMatters?: string[];
  recommendedActions?: string[];
  risksAndCaveats?: string[];

  // --- Radar + provenance (all optional; legacy signals omit them) ---
  /** Evidence genre; drives marker shape on the radar. */
  signalType?: SignalType;
  /** Certainty; drives marker fill on the radar. */
  signalStrength?: SignalStrength;
  /** Whether this leads, matches, or trails current practice. */
  signalStage?: SignalStage;
  /** Human-readable lead time, e.g. "~6-12 months". */
  leadTimeEstimate?: string;
  /** Supporting source URLs when multiple sources converge. */
  corroboration?: string[];

  // --- practitioner-account ---
  /** Who reported it and why they are credible. */
  observer?: string;

  // --- field-report ---
  sampleSize?: string;
  fieldworkPeriod?: string;
  /** Funding/publishing organisation, or "independent". */
  sponsor?: string;

  // --- study ---
  dataCollectedPeriod?: string;
  replicated?: boolean;

  // --- regulation-standard ---
  /** YYYY-MM-DD when the obligation takes effect. */
  effectiveDate?: string;
  jurisdiction?: string;
  /** The authority publishing the norm, e.g. "EU", "OWASP". */
  issuer?: string;

  // --- tool-shift ---
  version?: string;
  availability?: "GA" | "preview" | "announced";

  // --- market-event ---
  organisation?: string;
  /** Free text, e.g. "30,000 roles", "$50B". */
  magnitude?: string;

  // --- forecast ---
  forecaster?: string;
  /** The year or date the prediction is about. */
  horizonDate?: string;

  // --- primary-research ---
  method?: PrimaryResearchMethod;
  participants?: string;

  image?: string;
}

export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading2"; text: string }
  | { type: "heading3"; text: string }
  | { type: "list"; items: string[] };

export interface ExpertInsight {
  id: string;
  title: string;
  author: string;
  authorRole: string;
  excerpt: string;
  content?: ContentBlock[];
  markdownContent?: string;
  markdownFile?: string;
  paragraphs?: string[];
  date: string;
  status: "published" | "draft";
  tags?: string[];
  url?: string;
  image?: string;
}

export interface AISignalIndexEntry {
  id: string;
  file: string;
  date: string;
  status: "published" | "draft";
}

export interface ExpertInsightIndexEntry {
  id: string;
  file: string;
  date: string;
  status: "published" | "draft";
}

export interface ContentIndex<T> {
  lastUpdated: string;
  items: T[];
}

export type DrawerContent =
  | { type: "signal"; data: AISignal }
  | { type: "insight"; data: ExpertInsight }
  | { type: "phenomenon"; data: Phenomenon };
