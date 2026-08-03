# Signal Types & Radar Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a five-value `signalType` discriminator plus radar/provenance fields to AI signals, render them in the drawer, correct two stale type declarations, and normalise existing content to match.

**Architecture:** One shared `AISignal` interface gains a `signalType` discriminator and a set of optional type-specific fields — no discriminated union, no new components. `ContentDrawer` renders new badges and an evidence line conditionally, so untyped legacy signals are unaffected. Because the project has no test runner, a new `scripts/validate-signals.mjs` acts as the executable specification: it fails on today's data, and the normalisation task makes it pass.

**Tech Stack:** React 18 + TypeScript (strict), Vite 5, Tailwind CSS 3, Lucide React, Node ESM scripts (`.mjs`, zero dependencies).

## Global Constraints

- **No new dependencies.** Scripts are zero-dependency Node ESM `.mjs`, matching `scripts/prerender.mjs` and `scripts/ledger.mjs`.
- **Tailwind classes must be complete static strings.** Never interpolate (`` `text-${x}` ``). Use lookup maps holding full class strings — required by `CLAUDE.md`.
- **Strict TypeScript:** `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` are on.
- **All new `AISignal` fields are optional.** The 84 existing signals must stay valid and render unchanged.
- **`decisionHorizon` values are rendered verbatim** by the drawer. The exact strings are `"now"`, `"0,5 - 2 years"`, `"2+ years"` — keep the comma in `"0,5 - 2 years"`.
- **Verification is `npm run build` (runs `tsc` + vite + prerender) and `npm run lint` (zero warnings).** Both must pass before every commit.
- Content is runtime-fetched from `public/content/`, never imported, so `tsc` does **not** validate it. That is why `validate-signals.mjs` exists.

---

## File Structure

| File | Responsibility | Task |
| --- | --- | --- |
| `scripts/validate-signals.mjs` | Create — validates every indexed signal against the schema; the executable spec | 1 |
| `src/types/content.ts` | Modify — add `SignalType`/`SignalStrength`/`SignalStage`, extend `AISignal`, fix two stale types | 2 |
| `public/content/ai-signals/*.json` | Modify — normalise `decisionHorizon` and `sourceType`; resolve orphans | 3 |
| `public/content/ai-signals/index.json` | Modify — add or drop 5 orphan entries | 3 |
| `src/components/ContentDrawer.tsx` | Modify — type + strength badges, evidence line | 4, 5 |
| `docs/ai-signals-finder-prompt.md` | Modify — teach the finder the five types | 7 |
| `package.json` | Modify — add `signals:validate` script | 1 |

---

### Task 1: Signal schema validator

Builds the executable specification. It must **fail** on today's data — that failure is the red test for Task 3.

**Files:**
- Create: `scripts/validate-signals.mjs`
- Modify: `package.json` (add `signals:validate` script)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: CLI `node scripts/validate-signals.mjs`, exit code `0` on success and `1` on any error. Later tasks rely on this command name.

- [ ] **Step 1: Write the validator**

Create `scripts/validate-signals.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Validates every signal referenced by index.json against the content schema.
 *
 * Content is runtime-fetched and never type-checked by tsc, so this script is
 * the only enforcement of the AI-signal schema. Run it after editing content.
 *
 *   node scripts/validate-signals.mjs
 *
 * Exits 1 if any signal is invalid or any file on disk is missing from index.json.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, join } from "path";

const SIGNALS_DIR = resolve("public/content/ai-signals");
const INDEX_FILE = join(SIGNALS_DIR, "index.json");

const DECISION_HORIZONS = ["now", "0,5 - 2 years", "2+ years"];
const SOURCE_TYPES = ["academic", "article", "social", "video", "discussion", "release"];
const SIGNAL_TYPES = ["weak-signal", "field-report", "study", "regulatory", "tool-shift"];
const SIGNAL_STRENGTHS = ["weak", "emerging", "established"];
const SIGNAL_STAGES = ["leading", "concurrent", "lagging"];
const CATEGORIES = [
  "AI Agents", "AI Tools", "Productivity", "SDLC Change", "Quality & Testing",
  "Security & Risk", "Org & Leadership", "Skills & Learning", "Work Wellbeing",
  "Ethics & Policy", "Business Impact", "Costs & Economics", "Other",
];
const REQUIRED = ["id", "title", "summary", "source", "detectedAt", "date", "status"];

const errors = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

function checkEnum(file, field, value, allowed) {
  if (value === undefined) return;
  if (!allowed.includes(value)) {
    err(file, `${field} = ${JSON.stringify(value)} is not one of ${allowed.join(" | ")}`);
  }
}

const index = JSON.parse(readFileSync(INDEX_FILE, "utf8"));
const indexed = new Set();

for (const entry of index.items || []) {
  indexed.add(entry.file);
  const path = join(SIGNALS_DIR, entry.file);
  if (!existsSync(path)) {
    err(entry.file, "referenced by index.json but missing on disk");
    continue;
  }

  let s;
  try {
    s = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    err(entry.file, `invalid JSON: ${e.message}`);
    continue;
  }

  for (const field of REQUIRED) {
    if (s[field] === undefined || s[field] === "") err(entry.file, `missing required field '${field}'`);
  }

  checkEnum(entry.file, "decisionHorizon", s.decisionHorizon, DECISION_HORIZONS);
  checkEnum(entry.file, "sourceType", s.sourceType, SOURCE_TYPES);
  checkEnum(entry.file, "signalType", s.signalType, SIGNAL_TYPES);
  checkEnum(entry.file, "signalStrength", s.signalStrength, SIGNAL_STRENGTHS);
  checkEnum(entry.file, "signalStage", s.signalStage, SIGNAL_STAGES);

  const cats = Array.isArray(s.category) ? s.category : s.category ? [s.category] : [];
  for (const c of cats) checkEnum(entry.file, "category", c, CATEGORIES);
  if (cats.length > 3) err(entry.file, `category has ${cats.length} values (max 3)`);

  if (s.status !== "published" && s.status !== "draft") {
    err(entry.file, `status = ${JSON.stringify(s.status)} must be 'published' or 'draft'`);
  }
  if (s.signalType === "regulatory" && !s.effectiveDate) {
    err(entry.file, "signalType 'regulatory' requires effectiveDate");
  }
  if (s.signalType === "weak-signal" && !s.observer) {
    err(entry.file, "signalType 'weak-signal' requires observer");
  }
}

for (const file of readdirSync(SIGNALS_DIR)) {
  if (!/^\d{4}-\d{2}-\d{2}-\d+\.json$/.test(file)) continue;
  if (!indexed.has(file)) err(file, "exists on disk but is not listed in index.json (invisible to the site)");
}

if (errors.length) {
  console.error(`validate: ${errors.length} problem(s) found\n`);
  errors.forEach((e) => console.error("  " + e));
  process.exit(1);
}
console.log(`validate: OK — ${index.items.length} signals valid`);
```

- [ ] **Step 2: Add the npm script**

In `package.json`, add to `"scripts"` after `"signals:reconcile"`:

```json
"signals:validate": "node scripts/validate-signals.mjs"
```

- [ ] **Step 3: Run it and confirm it FAILS**

Run: `npm run signals:validate`

Expected: exit code 1 and **exactly 18** problems — 8 × `decisionHorizon = "0-6m"`, 5 × capitalised `sourceType` (`"Academic"` / `"Article"`), and 5 × orphan files not in `index.json`. This failure is the point; do not fix the data yet.

These 18 are the complete set: the content was checked on 2026-08-03 and has no missing required fields, no invalid categories, no signal with more than 3 categories, and no bad `status`. If the validator reports anything outside those 18, the content changed after this plan was written — investigate before proceeding, since Task 3 has no instructions for other error classes.

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-signals.mjs package.json
git commit -m "test: add signal schema validator (fails on current data)"
```

---

### Task 2: Type definitions and stale-type corrections

**Files:**
- Modify: `src/types/content.ts:16-37`

**Interfaces:**
- Consumes: nothing.
- Produces: exported types `SignalType`, `SignalStrength`, `SignalStage`; corrected `DecisionHorizon` and `AISignalSourceType`; extended `AISignal` with `signalType`, `signalStrength`, `signalStage`, `leadTimeEstimate`, `corroboration`, `observer`, `sampleSize`, `fieldworkPeriod`, `sponsor`, `dataCollectedPeriod`, `replicated`, `effectiveDate`, `jurisdiction`, `version`, `availability`. Task 4, 5 and 6 use these exact names.

- [ ] **Step 1: Replace the two stale type declarations**

In `src/types/content.ts`, replace lines 16–18:

```ts
export type DecisionHorizon = "2026" | "2027-2028" | "2029+";

export type AISignalSourceType = "Academic" | "Article" | "Social" | "Video";
```

with:

```ts
// Rendered verbatim by ContentDrawer — keep these exact strings, comma included.
export type DecisionHorizon = "now" | "0,5 - 2 years" | "2+ years";

export type AISignalSourceType =
  | "academic"
  | "article"
  | "social"
  | "video"
  | "discussion"
  | "release";

/** Evidence genre. Drives the radar marker shape. */
export type SignalType =
  | "weak-signal"
  | "field-report"
  | "study"
  | "regulatory"
  | "tool-shift";

/** Certainty. Drives the radar marker fill. */
export type SignalStrength = "weak" | "emerging" | "established";

/** Whether the item leads, matches, or trails current practice. */
export type SignalStage = "leading" | "concurrent" | "lagging";
```

- [ ] **Step 2: Extend the AISignal interface**

In the same file, inside `interface AISignal`, add these fields immediately after `decisionHorizon?: DecisionHorizon;`:

```ts
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

  // --- weak-signal ---
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

  // --- regulatory ---
  /** YYYY-MM-DD when the obligation takes effect. */
  effectiveDate?: string;
  jurisdiction?: string;

  // --- tool-shift ---
  version?: string;
  availability?: "GA" | "preview" | "announced";
```

- [ ] **Step 3: Verify the build passes**

Run: `npm run build`
Expected: PASS. `DecisionHorizon` and `AISignalSourceType` are consumed only by the `AISignal` interface itself (`decisionHorizon` is rendered as a raw string, `sourceType` is not consumed in `src/` at all), so narrowing them breaks no call site.

- [ ] **Step 4: Verify lint passes**

Run: `npm run lint`
Expected: PASS, zero warnings.

- [ ] **Step 5: Commit**

```bash
git add src/types/content.ts
git commit -m "feat: add signal type, strength, stage and provenance fields"
```

---

### Task 3: Normalise existing content

Turns Task 1's validator from red to green.

**Files:**
- Modify: 8 signal files with `decisionHorizon: "0-6m"`
- Modify: 5 signal files with capitalised `sourceType`
- Modify: `public/content/ai-signals/index.json` (orphans)

**Interfaces:**
- Consumes: `npm run signals:validate` from Task 1.
- Produces: content that satisfies the validator. No code interface.

- [ ] **Step 1: List the files needing each fix**

Run:

```bash
node -e "
const fs=require('fs'),p='public/content/ai-signals/';
const idx=JSON.parse(fs.readFileSync(p+'index.json','utf8'));
const bad={horizon:[],source:[]};
for(const e of idx.items){const s=JSON.parse(fs.readFileSync(p+e.file,'utf8'));
 if(s.decisionHorizon&&!['now','0,5 - 2 years','2+ years'].includes(s.decisionHorizon))bad.horizon.push([e.file,s.decisionHorizon]);
 if(s.sourceType&&s.sourceType!==s.sourceType.toLowerCase())bad.source.push([e.file,s.sourceType]);}
console.log('decisionHorizon:',bad.horizon);console.log('sourceType:',bad.source);
const indexed=new Set(idx.items.map(e=>e.file));
console.log('orphans:',fs.readdirSync(p).filter(f=>/^\d{4}-\d{2}-\d{2}-\d+\.json\$/.test(f)&&!indexed.has(f)));
"
```

Expected: 8 `decisionHorizon` entries with `"0-6m"`, 5 `sourceType` entries (`"Academic"` / `"Article"`), 5 orphan files.

- [ ] **Step 2: Normalise `decisionHorizon`**

In each of the 8 files listed, change `"decisionHorizon": "0-6m"` to `"decisionHorizon": "now"`. `"0-6m"` means zero-to-six months, which maps to the nearest ring, `"now"`.

- [ ] **Step 3: Normalise `sourceType`**

In each of the 5 files listed, lowercase the value: `"Academic"` → `"academic"`, `"Article"` → `"article"`.

- [ ] **Step 4: Resolve the 5 orphan files**

For each orphan (`2026-02-05-01`, `2026-02-06-01`, `2026-02-06-02`, `2026-04-20-01`, `2026-06-08-01`), print its title and status:

```bash
node -e "
const fs=require('fs'),p='public/content/ai-signals/';
for(const f of ['2026-02-05-01','2026-02-06-01','2026-02-06-02','2026-04-20-01','2026-06-08-01']){
 const s=JSON.parse(fs.readFileSync(p+f+'.json','utf8'));
 console.log(f,'|',s.status,'|',s.title.slice(0,70));}
"
```

Then for each: if it is a real signal worth showing, add an entry to `index.json` in the `items` array using the existing shape:

```json
{
  "id": "2026-02-05-01",
  "file": "2026-02-05-01.json",
  "date": "2026-02-05",
  "status": "published"
}
```

using the file's own `id` and `date`. If it is a superseded draft, delete the file instead. **Ask the user which to do for any file that is ambiguous** — do not silently delete content.

- [ ] **Step 5: Run the validator and confirm it PASSES**

Run: `npm run signals:validate`
Expected: `validate: OK — N signals valid`, exit code 0.

- [ ] **Step 6: Confirm the site still builds**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add public/content/ai-signals/
git commit -m "fix: normalise decisionHorizon and sourceType, resolve orphan signals"
```

---

### Task 4: Signal type and strength badges

**Files:**
- Modify: `src/components/ContentDrawer.tsx` — imports (lines 3–17), and the `SignalContent` badge row (lines 183–218)

**Interfaces:**
- Consumes: `SignalType`, `SignalStrength` from Task 2.
- Produces: module-level constants `SIGNAL_TYPE_META` and `SIGNAL_STRENGTH_META` in `ContentDrawer.tsx`. Task 5 adds to the same component but does not use these maps.

- [ ] **Step 1: Add the Lucide icon imports**

In `src/components/ContentDrawer.tsx`, add to the existing `lucide-react` import block (after `Check,`):

```ts
  Radio,
  BarChart3,
  FlaskConical,
  Scale,
  Package,
```

Then add the icon **type** import on its own line directly below the closing `} from "lucide-react";`:

```ts
import type { LucideIcon } from "lucide-react";
```

- [ ] **Step 2: Add the metadata lookup maps**

Insert immediately above `const SignalContent = ({ data }: { data: AISignal }) => {` (line 183):

```tsx
// Full static Tailwind class strings — never interpolate (see CLAUDE.md).
const SIGNAL_TYPE_META: Record<
  SignalType,
  { label: string; className: string; Icon: LucideIcon }
> = {
  "weak-signal": {
    label: "Weak signal",
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
  regulatory: {
    label: "Regulatory",
    className: "border-rose-400/40 text-rose-300 bg-rose-400/10",
    Icon: Scale,
  },
  "tool-shift": {
    label: "Tool shift",
    className: "border-emerald-400/40 text-emerald-300 bg-emerald-400/10",
    Icon: Package,
  },
};

const SIGNAL_STRENGTH_META: Record<SignalStrength, { label: string; className: string }> = {
  weak: { label: "Weak · unvalidated", className: "border-white/20 text-gray-400" },
  emerging: { label: "Emerging", className: "border-white/30 text-gray-200 bg-white/5" },
  established: { label: "Established", className: "border-white/40 text-white bg-white/10" },
};
```

- [ ] **Step 3: Import the new types**

Change the type import on line 20 to include the two new types:

```ts
import type {
  AISignal,
  ExpertInsight,
  DrawerContent,
  SignalType,
  SignalStrength,
} from "@/types/content";
```

- [ ] **Step 4: Resolve the type metadata at the top of the component**

Add these as the **first statements** in the `SignalContent` component body, before its `return (`. A capitalised local (`TypeIcon`) is required — JSX treats lowercase names as HTML tags. Task 5 appends more statements here.

```tsx
  const typeMeta = data.signalType ? SIGNAL_TYPE_META[data.signalType] : null;
  const TypeIcon = typeMeta?.Icon;
  const strengthMeta = data.signalStrength
    ? SIGNAL_STRENGTH_META[data.signalStrength]
    : null;
```

- [ ] **Step 5: Render the badges**

In `SignalContent`, insert immediately after the `data.source` block (its closing `</div>`) and before `{data.category && (`:

```tsx
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
```

Note: the template literal appends one **complete** static class string from the lookup map; it never assembles a class name from fragments, so Tailwind still detects every class.

- [ ] **Step 6: Verify build and lint**

Run: `npm run build && npm run lint`
Expected: both PASS. If `tsc` reports `SignalType`/`SignalStrength` unused, confirm Step 3 imported them and the `Record<...>` annotations in Step 2 reference them.

- [ ] **Step 7: Commit**

```bash
git add src/components/ContentDrawer.tsx
git commit -m "feat: render signal type and strength badges in drawer"
```

---

### Task 5: Provenance evidence line

**Files:**
- Modify: `src/components/ContentDrawer.tsx` — after the date block (around lines 220–235)

**Interfaces:**
- Consumes: the provenance fields from Task 2 (`sampleSize`, `fieldworkPeriod`, `sponsor`, `dataCollectedPeriod`, `replicated`, `effectiveDate`, `jurisdiction`, `version`, `availability`, `observer`, `leadTimeEstimate`, `corroboration`); the top-of-body statements added in Task 4.
- Produces: a local `evidenceParts` array and a module-level `hostLabel(url: string): string` helper in `ContentDrawer.tsx`. Nothing downstream depends on them.

- [ ] **Step 1: Build the evidence parts**

Inside `SignalContent`, append these directly below the `typeMeta` / `TypeIcon` / `strengthMeta` statements added in Task 4, still before `return (`:

```tsx
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
```

- [ ] **Step 2: Render the line**

Immediately after the closing `</div>` of the date block (the block containing `Signal scanned:`), insert:

```tsx
      {evidenceParts.length > 0 && (
        <div className="mb-6 text-xs text-gray-400 font-mono">
          {evidenceParts.join(" · ")}
        </div>
      )}
```

- [ ] **Step 3: Render corroborating sources**

Independent corroboration is a trust signal in its own right, so it gets its own line rather than being flattened into the text above. Insert immediately after the evidence-line block from Step 2:

```tsx
      {data.corroboration && data.corroboration.length > 0 && (
        <div className="mb-6 text-xs text-gray-400 font-mono">
          <span className="text-hologram-cyan">
            Corroborated by {data.corroboration.length} independent source
            {data.corroboration.length > 1 ? "s" : ""}:
          </span>{" "}
          {data.corroboration.map((url, i) => (
            <span key={url}>
              {i > 0 && " · "}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-hologram-cyan"
              >
                {new URL(url).hostname.replace(/^www\./, "")}
              </a>
            </span>
          ))}
        </div>
      )}
```

`new URL(url)` throws on a malformed string. The validator does not check URL syntax, so if a bad `corroboration` entry ever reaches content this would break the drawer — Step 4 adds the guard.

- [ ] **Step 4: Guard against malformed corroboration URLs**

Add this helper immediately above `const SignalContent = ...`, next to the lookup maps:

```tsx
const hostLabel = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
```

Then replace `{new URL(url).hostname.replace(/^www\./, "")}` in Step 3 with `{hostLabel(url)}`.

- [ ] **Step 5: Verify build and lint**

Run: `npm run build && npm run lint`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ContentDrawer.tsx
git commit -m "feat: render provenance evidence line and corroborating sources"
```

---

### Task 6: Type five real signals, one per type, and verify visually

Uses real content rather than fixtures, so the work also seeds the radar with genuine typed data.

**Files:**
- Modify: 5 existing files in `public/content/ai-signals/`

**Interfaces:**
- Consumes: fields from Task 2, rendering from Tasks 4–5, validator from Task 1.
- Produces: 5 typed signals. No code interface.

- [ ] **Step 1: Pick one signal per type**

Run this to see candidates:

```bash
node -e "
const fs=require('fs'),p='public/content/ai-signals/';
const idx=JSON.parse(fs.readFileSync(p+'index.json','utf8'));
for(const e of idx.items.slice(0,25)){const s=JSON.parse(fs.readFileSync(p+e.file,'utf8'));
 console.log(e.file,'|',(s.sourceType||'?'),'|',s.title.slice(0,72));}
"
```

Choose one clear example of each: `study` (an arXiv item), `field-report` (a survey such as the Jellyfish or Faros item), `weak-signal` (a practitioner post such as the Addy Osmani item), `regulatory` (the EU AI Act item), `tool-shift` (a release/capability item). If no `regulatory` or `tool-shift` example exists, type only the ones that do and note it in the commit message.

- [ ] **Step 2: Add the fields**

For the `study` example add:

```json
  "signalType": "study",
  "signalStrength": "established",
  "signalStage": "lagging",
  "leadTimeEstimate": "confirms current practice",
  "dataCollectedPeriod": "2025-09 – 2025-12",
  "replicated": false,
```

For the `field-report` example add:

```json
  "signalType": "field-report",
  "signalStrength": "established",
  "signalStage": "concurrent",
  "leadTimeEstimate": "confirms current practice",
  "sampleSize": "635 engineering leaders",
  "fieldworkPeriod": "Q1 2026",
  "sponsor": "Jellyfish",
```

For the `weak-signal` example add (the `corroboration` array also exercises the Task 5 Step 3 rendering — use real supporting URLs, or omit the field if there are none):

```json
  "signalType": "weak-signal",
  "signalStrength": "weak",
  "signalStage": "leading",
  "leadTimeEstimate": "~6-12 months",
  "observer": "Addy Osmani, Engineering leader at Google Chrome",
  "corroboration": ["https://news.ycombinator.com/item?id=00000000"],
```

For the `regulatory` example add:

```json
  "signalType": "regulatory",
  "signalStrength": "established",
  "signalStage": "leading",
  "leadTimeEstimate": "fixed date",
  "effectiveDate": "2026-08-02",
  "jurisdiction": "EU",
```

For the `tool-shift` example add:

```json
  "signalType": "tool-shift",
  "signalStrength": "emerging",
  "signalStage": "leading",
  "leadTimeEstimate": "~3-6 months",
  "version": "see source",
  "availability": "GA",
```

Replace the illustrative values (`sampleSize`, `observer`, `dataCollectedPeriod`, `effectiveDate`, `version`) with the real values from each chosen signal. Do **not** invent numbers — if a real value is unknown, omit that field.

- [ ] **Step 3: Validate**

Run: `npm run signals:validate`
Expected: PASS. If it reports `signalType 'weak-signal' requires observer` or `'regulatory' requires effectiveDate`, add the missing field.

- [ ] **Step 4: Verify visually**

Run: `npm run dev`, open the site, and open each of the 5 typed signals in the drawer.

Confirm:
1. Each shows its type badge with the right label, icon and colour.
2. The strength badge reads `Weak · unvalidated` on the weak signal and is visually lighter than `Established`.
3. The evidence line appears under the date, e.g. `635 engineering leaders · fieldwork Q1 2026 · sponsor: Jellyfish`.
4. The weak signal shows the `Corroborated by N independent source(s):` line with clickable hostname links.
5. Open an **untyped** legacy signal (e.g. `2026-07-02-01.json`) and confirm it renders exactly as before — no badges, no evidence line, no corroboration line, no layout shift.

- [ ] **Step 5: Commit**

```bash
git add public/content/ai-signals/
git commit -m "content: type five exemplar signals, one per signal type"
```

---

### Task 7: Teach the finder the five types

**Files:**
- Modify: `docs/ai-signals-finder-prompt.md`

**Interfaces:**
- Consumes: the type/field names from Task 2.
- Produces: an updated prompt. No code interface.

- [ ] **Step 1: Add the type section**

In `docs/ai-signals-finder-prompt.md`, insert a new section immediately before `## Output`:

```markdown
## Signal types

Assign exactly one `signalType`. Each type requires its own fields.

| Type | Use when | Required extra fields |
| --- | --- | --- |
| `weak-signal` | One named practitioner's firsthand, unvalidated observation | `observer` |
| `field-report` | Industry or vendor survey / benchmark report | `sampleSize`, `fieldworkPeriod`, `sponsor` |
| `study` | Academic paper or formal benchmark | `dataCollectedPeriod`, `replicated` |
| `regulatory` | Law, policy or standard with a real date | `effectiveDate`, `jurisdiction` |
| `tool-shift` | Release or capability change that alters practice | `version`, `availability` |

**`recommendedActions` may be `[]` for `weak-signal`.** An early firsthand report
does not support confident recommendations, and inventing them is worse than
omitting them. Do not let the need to fill this field stop you surfacing an early
signal — this is the single most important rule in this section.

For `study` and `field-report`, `dataCollectedPeriod` / `fieldworkPeriod` are
mandatory precisely because they expose staleness: a paper published this week
about 2025 data is a lagging indicator, and the reader must see that.

For `regulatory`, compute `decisionHorizon` from `effectiveDate` rather than
judging it: within 6 months → `"now"`, within ~2 years → `"0,5 - 2 years"`,
beyond → `"2+ years"`.

Set `sponsor` to `"independent"` when a report has no commercial backer.
```

- [ ] **Step 2: Add the fields to the schema block**

In the same file, inside the ```json schema block, add after `"signalStage"`:

```json
  "observer": "string (weak-signal only: who reported it and why credible)",
  "sampleSize": "string (field-report only)",
  "fieldworkPeriod": "string (field-report only)",
  "sponsor": "string (field-report only; 'independent' if none)",
  "dataCollectedPeriod": "string (study only)",
  "replicated": false,
  "effectiveDate": "YYYY-MM-DD (regulatory only)",
  "jurisdiction": "string (regulatory only)",
  "version": "string (tool-shift only)",
  "availability": "GA | preview | announced (tool-shift only)",
```

and add `signalType` to the required list by inserting before `"signalStrength"`:

```json
  "signalType": "weak-signal | field-report | study | regulatory | tool-shift",
```

- [ ] **Step 3: Update the allowed-values list**

In the `### Allowed values` section, add:

```markdown
- `signalType`: `weak-signal`, `field-report`, `study`, `regulatory`, `tool-shift`
```

- [ ] **Step 4: Commit**

```bash
git add docs/ai-signals-finder-prompt.md
git commit -m "docs: teach finder prompt the five signal types"
```

---

## Final Verification

- [ ] `npm run signals:validate` → `validate: OK`
- [ ] `npm run build` → PASS
- [ ] `npm run lint` → PASS, zero warnings
- [ ] An untyped legacy signal renders identically to before
- [ ] Update `PR_DESCRIPTION_feat-signal-types.md` if scope changed during implementation
