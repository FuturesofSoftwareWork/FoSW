export type AISignalCategory =
  | "AI Agents"
  | "AI Tools"
  | "SDLC Change"
  | "Quality Testing"
  | "Org & Leadership"
  | "Work Wellbeing"
  | "Skills & Learning"
  | "Ethics & Policy"
  | "Security & Risk";

export type DecisionHorizon = "2026" | "2027-2028" | "2029+";

export type AISignalSourceType = "Academic" | "Article" | "Social" | "Video";

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
  decisionHorizon?: DecisionHorizon;
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
  | { type: "insight"; data: ExpertInsight };
