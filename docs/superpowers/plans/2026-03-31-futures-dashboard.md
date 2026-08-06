# Futures Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Futures Dashboard with an interactive concentric radar for emerging signals and narrative data story cards for real-world metrics, backed by Supabase.

**Architecture:** React 18 + TypeScript SPA in the `vttfinland/futureOfSW` repo. Single scrolling page with two sections: Futures Radar (SVG-based concentric radar visualization) and Metrics & Trends (narrative cards with sparklines). Data fetched client-side from Supabase using the public anon key with Row Level Security.

**Tech Stack:** React 18, TypeScript (strict), Vite 5, Tailwind CSS 3, Framer Motion 11, Supabase JS, Recharts, Lucide React, Firebase Hosting.

**Spec:** `docs/superpowers/specs/2026-03-30-futures-dashboard-design.md` (in the FuturesofSoftwareWork repo)

---

## File Structure

```
futureOfSW/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .env.example                      # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_MAIN_SITE_URL
├── .gitignore
├── firebase.json
├── .firebaserc
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # Tables, RLS policies, seed data
├── scripts/
│   └── migrate-signals.ts            # One-time migration from JSON files
├── src/
│   ├── main.tsx                      # React entry point
│   ├── App.tsx                       # Page layout: Header → Radar → Divider → Metrics → Footer
│   ├── vite-env.d.ts                 # Vite type declarations
│   ├── index.css                     # Tailwind directives + global styles
│   ├── lib/
│   │   └── supabase.ts              # Supabase client init
│   ├── types/
│   │   └── index.ts                 # Signal, Metric, MetricDatapoint interfaces
│   ├── hooks/
│   │   ├── useSignals.ts            # Fetch published signals from Supabase
│   │   ├── useMetrics.ts            # Fetch published metrics + datapoints
│   │   └── useRadarLayout.ts        # Compute dot positions from signals
│   ├── components/
│   │   ├── Header.tsx               # Site title + back link
│   │   ├── Footer.tsx               # Copyright + institution credits
│   │   ├── SectionDivider.tsx       # Gradient divider between sections
│   │   ├── radar/
│   │   │   ├── FuturesRadar.tsx     # Radar container: SVG + legend + filters
│   │   │   ├── RadarRings.tsx       # Concentric rings + ring labels
│   │   │   ├── RadarSectors.tsx     # Sector divider lines + sector labels
│   │   │   ├── RadarDots.tsx        # Signal dots with hover/click
│   │   │   ├── RadarTooltip.tsx     # Hover tooltip
│   │   │   ├── RadarLegend.tsx      # Category legend + filter toggles
│   │   │   └── SignalDetailPanel.tsx # Expanded signal info on click
│   │   └── metrics/
│   │       ├── MetricsSection.tsx   # Section container
│   │       ├── NarrativeCard.tsx    # Single data story card
│   │       └── Sparkline.tsx        # Inline sparkline chart
│   └── data/
│       └── fallback.ts              # Fallback data for offline/error states
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `.gitignore`, `.env.example`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `src/index.css`

- [ ] **Step 1: Clone repo and initialize Vite project**

```bash
git clone git@github.com:vttfinland/futureOfSW.git
cd futureOfSW
npm create vite@latest . -- --template react-ts
```

Select "Ignore files and continue" if prompted about existing files.

- [ ] **Step 2: Install dependencies**

```bash
npm install react@^18.2.0 react-dom@^18.2.0 framer-motion@^11.0.0 lucide-react@^0.344.0 @supabase/supabase-js@^2.45.0 recharts@^2.12.0
npm install -D @types/react@^18.2.64 @types/react-dom@^18.2.21 typescript@^5.2.2 @vitejs/plugin-react@^4.2.1 tailwindcss@^3.4.1 autoprefixer@^10.4.18 postcss@^8.4.35 @tailwindcss/typography@^0.5.19
```

- [ ] **Step 3: Configure TypeScript**

Replace `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Replace `tsconfig.node.json` with:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Configure Vite**

Replace `vite.config.ts` with:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 5: Configure Tailwind**

Replace `tailwind.config.js` with:

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'midnight': '#050A14',
        'electric-blue': '#0EA5E9',
        'deep-purple': '#581c87',
        'neon-gold': '#F59E0B',
        'hologram-cyan': '#22d3ee',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 1s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

Replace `postcss.config.js` with:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: Set up index.html**

Replace `index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Futures Dashboard — Alternative Futures of Software Work</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Merriweather:wght@400;700&display=swap" rel="stylesheet" />
  </head>
  <body class="bg-midnight text-white antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Set up CSS entry point**

Replace `src/index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

::selection {
  background-color: rgba(14, 165, 233, 0.3);
  color: white;
}
```

- [ ] **Step 8: Set up entry point and App shell**

Replace `src/main.tsx` with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Replace `src/App.tsx` with:

```tsx
function App() {
  return (
    <div className="min-h-screen bg-midnight">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <h1 className="font-serif text-xl font-bold text-white">Futures Dashboard</h1>
        <a
          href={import.meta.env.VITE_MAIN_SITE_URL || '#'}
          className="text-sm text-electric-blue hover:text-hologram-cyan transition-colors"
        >
          ← Back to Main Site
        </a>
      </header>
      <main className="max-w-7xl mx-auto px-6">
        <p className="text-white/50 py-20 text-center">Dashboard coming soon...</p>
      </main>
    </div>
  )
}

export default App
```

- [ ] **Step 9: Create .env.example and .gitignore**

Create `.env.example`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_MAIN_SITE_URL=https://futuresofsoftwarework.fi/FoSW/
```

Ensure `.gitignore` includes:

```
node_modules
dist
.env
.env.local
.firebase
```

- [ ] **Step 10: Verify the app runs**

```bash
npm run dev
```

Expected: Dev server starts, browser shows "Futures Dashboard" header with "← Back to Main Site" link and placeholder text on a dark background.

- [ ] **Step 11: Verify build passes**

```bash
npx tsc && npx vite build
```

Expected: No TypeScript errors, build output in `dist/`.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + Tailwind project with shared design system"
```

---

### Task 2: TypeScript Types & Supabase Client

**Files:**
- Create: `src/types/index.ts`, `src/lib/supabase.ts`

- [ ] **Step 1: Define TypeScript interfaces**

Create `src/types/index.ts`:

```typescript
export interface Signal {
  id: string
  title: string
  summary: string
  source: string
  source_url: string | null
  date: string
  detected_at: string
  status: 'published' | 'draft'
  category: string
  decision_horizon: 'now' | '2026' | '2027-2028' | '2029+'
  tags: string[]
  why_it_matters: string[]
  recommended_actions: string[]
  risks_and_caveats: string[]
  weight: number
  radar_angle: number | null
}

export interface Metric {
  id: string
  slug: string
  name: string
  narrative_headline: string
  narrative_body: string
  source_name: string
  source_url: string
  unit: string
  status: 'published' | 'draft'
  created_at: string
  updated_at: string
  datapoints: MetricDatapoint[]
}

export interface MetricDatapoint {
  id: string
  metric_id: string
  date: string
  value: number
  created_at: string
}

export type DecisionHorizon = Signal['decision_horizon']

export type CategoryColor = {
  name: string
  color: string
  bgColor: string
}

export const CATEGORY_COLORS: CategoryColor[] = [
  { name: 'AI Agents', color: '#22d3ee', bgColor: 'rgba(34,211,238,0.2)' },
  { name: 'AI Tools', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.2)' },
  { name: 'SDLC Change', color: '#a855f7', bgColor: 'rgba(168,85,247,0.2)' },
  { name: 'Quality Testing', color: '#0EA5E9', bgColor: 'rgba(14,165,233,0.2)' },
  { name: 'Security & Risk', color: '#ef4444', bgColor: 'rgba(239,68,68,0.2)' },
  { name: 'Org & Leadership', color: '#4ade80', bgColor: 'rgba(74,222,128,0.2)' },
]

export const HORIZON_RINGS: { key: DecisionHorizon; label: string; ringIndex: number }[] = [
  { key: 'now', label: 'Now', ringIndex: 0 },
  { key: '2026', label: '2026', ringIndex: 1 },
  { key: '2027-2028', label: '2027–2028', ringIndex: 2 },
  { key: '2029+', label: '2029+', ringIndex: 3 },
]
```

- [ ] **Step 2: Create Supabase client**

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables not set. Using fallback data. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  )
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
```

- [ ] **Step 3: Verify build passes**

```bash
npx tsc && npx vite build
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/lib/supabase.ts
git commit -m "feat: add TypeScript types and Supabase client"
```

---

### Task 3: Data Hooks & Fallback Data

**Files:**
- Create: `src/hooks/useSignals.ts`, `src/hooks/useMetrics.ts`, `src/data/fallback.ts`

- [ ] **Step 1: Create fallback data**

Create `src/data/fallback.ts`:

```typescript
import type { Signal, Metric } from '@/types'

export const fallbackSignals: Signal[] = [
  {
    id: 'fallback-1',
    title: 'AI Coding Assistants Reshape Junior Developer Roles',
    summary: 'Major tech companies report that AI coding assistants are handling tasks traditionally assigned to junior developers, raising questions about entry-level career paths.',
    source: 'TechCrunch',
    source_url: null,
    date: '2026-03-15',
    detected_at: '2026-03-10',
    status: 'published',
    category: 'AI Tools',
    decision_horizon: '2026',
    tags: ['junior-developers', 'ai-assistants', 'career-paths'],
    why_it_matters: ['Entry-level positions are the traditional pipeline for software talent.', 'Without junior roles, the industry risks a seniority gap in 5-10 years.'],
    recommended_actions: ['Redesign junior roles to focus on AI-augmented workflows.', 'Invest in mentorship programs that teach AI collaboration skills.'],
    risks_and_caveats: ['The shift may be slower in regulated industries.', 'Some companies are counter-trending by explicitly hiring juniors.'],
    weight: 4,
    radar_angle: null,
  },
  {
    id: 'fallback-2',
    title: 'Autonomous AI Agents Enter Production Codebases',
    summary: 'First reports of AI agents autonomously committing to production repositories with human oversight limited to PR review.',
    source: 'The Verge',
    source_url: null,
    date: '2026-02-20',
    detected_at: '2026-02-18',
    status: 'published',
    category: 'AI Agents',
    decision_horizon: 'now',
    tags: ['ai-agents', 'automation', 'code-review'],
    why_it_matters: ['Shifts the developer role from writer to reviewer.', 'Quality assurance processes need rethinking.'],
    recommended_actions: ['Establish AI agent governance policies.', 'Upskill teams in AI output review.'],
    risks_and_caveats: ['Security implications of autonomous commits are not yet well understood.'],
    weight: 5,
    radar_angle: null,
  },
  {
    id: 'fallback-3',
    title: 'Software Testing Increasingly Delegated to AI',
    summary: 'Automated test generation tools now produce 60% of test suites in surveyed organizations.',
    source: 'IEEE Software',
    source_url: null,
    date: '2026-01-10',
    detected_at: '2026-01-05',
    status: 'published',
    category: 'Quality Testing',
    decision_horizon: '2027-2028',
    tags: ['testing', 'automation', 'quality'],
    why_it_matters: ['Test quality and coverage may improve, but test understanding decreases.'],
    recommended_actions: ['Maintain human oversight of test strategy and critical path tests.'],
    risks_and_caveats: ['AI-generated tests may miss edge cases that human testers would catch.'],
    weight: 3,
    radar_angle: null,
  },
]

export const fallbackMetrics: Metric[] = [
  {
    id: 'fallback-metric-1',
    slug: 'junior-unemployment-rate',
    name: 'Junior Developer Unemployment Rate',
    narrative_headline: 'The Junior Developer Squeeze',
    narrative_body: 'Entry-level software developer unemployment has climbed steadily since late 2024. As AI tools absorb routine coding tasks, companies are hiring fewer juniors and expecting more from mid-level candidates.',
    source_name: 'Bureau of Labor Statistics',
    source_url: 'https://www.bls.gov',
    unit: '%',
    status: 'published',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    datapoints: [
      { id: 'dp-1', metric_id: 'fallback-metric-1', date: '2024-Q1', value: 5.2, created_at: '2026-01-01T00:00:00Z' },
      { id: 'dp-2', metric_id: 'fallback-metric-1', date: '2024-Q3', value: 6.8, created_at: '2026-01-01T00:00:00Z' },
      { id: 'dp-3', metric_id: 'fallback-metric-1', date: '2025-Q1', value: 8.4, created_at: '2026-01-01T00:00:00Z' },
      { id: 'dp-4', metric_id: 'fallback-metric-1', date: '2025-Q3', value: 10.1, created_at: '2026-01-01T00:00:00Z' },
      { id: 'dp-5', metric_id: 'fallback-metric-1', date: '2026-Q1', value: 12.4, created_at: '2026-01-01T00:00:00Z' },
    ],
  },
  {
    id: 'fallback-metric-2',
    slug: 'ai-tool-adoption',
    name: 'AI Tool Adoption in Software Teams',
    narrative_headline: 'AI Tools Go Mainstream',
    narrative_body: 'The share of software teams using AI-assisted development tools has grown from niche to near-universal in under two years. GitHub Copilot, Cursor, and Claude Code lead adoption.',
    source_name: 'Stack Overflow Developer Survey',
    source_url: 'https://survey.stackoverflow.co',
    unit: '%',
    status: 'published',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    datapoints: [
      { id: 'dp-6', metric_id: 'fallback-metric-2', date: '2024-Q1', value: 38, created_at: '2026-01-01T00:00:00Z' },
      { id: 'dp-7', metric_id: 'fallback-metric-2', date: '2024-Q3', value: 52, created_at: '2026-01-01T00:00:00Z' },
      { id: 'dp-8', metric_id: 'fallback-metric-2', date: '2025-Q1', value: 64, created_at: '2026-01-01T00:00:00Z' },
      { id: 'dp-9', metric_id: 'fallback-metric-2', date: '2025-Q3', value: 71, created_at: '2026-01-01T00:00:00Z' },
      { id: 'dp-10', metric_id: 'fallback-metric-2', date: '2026-Q1', value: 78, created_at: '2026-01-01T00:00:00Z' },
    ],
  },
]
```

- [ ] **Step 2: Create useSignals hook**

Create `src/hooks/useSignals.ts`:

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { fallbackSignals } from '@/data/fallback'
import type { Signal } from '@/types'

export function useSignals() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSignals() {
      if (!supabase) {
        setSignals(fallbackSignals)
        setIsLoading(false)
        return
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('signals')
          .select('*')
          .eq('status', 'published')
          .order('detected_at', { ascending: false })

        if (fetchError) throw fetchError
        setSignals(data ?? fallbackSignals)
      } catch (err) {
        console.error('Failed to fetch signals:', err)
        setError('Failed to load signals')
        setSignals(fallbackSignals)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSignals()
  }, [])

  return { signals, isLoading, error }
}
```

- [ ] **Step 3: Create useMetrics hook**

Create `src/hooks/useMetrics.ts`:

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { fallbackMetrics } from '@/data/fallback'
import type { Metric, MetricDatapoint } from '@/types'

export function useMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetrics() {
      if (!supabase) {
        setMetrics(fallbackMetrics)
        setIsLoading(false)
        return
      }

      try {
        const { data: metricsData, error: metricsError } = await supabase
          .from('metrics')
          .select('*')
          .eq('status', 'published')
          .order('updated_at', { ascending: false })

        if (metricsError) throw metricsError

        const { data: datapointsData, error: dpError } = await supabase
          .from('metric_datapoints')
          .select('*')
          .order('date', { ascending: true })

        if (dpError) throw dpError

        const datapointsByMetric = (datapointsData ?? []).reduce<Record<string, MetricDatapoint[]>>(
          (acc, dp) => {
            if (!acc[dp.metric_id]) acc[dp.metric_id] = []
            acc[dp.metric_id].push(dp)
            return acc
          },
          {}
        )

        const enriched: Metric[] = (metricsData ?? []).map((m) => ({
          ...m,
          datapoints: datapointsByMetric[m.id] ?? [],
        }))

        setMetrics(enriched)
      } catch (err) {
        console.error('Failed to fetch metrics:', err)
        setError('Failed to load metrics')
        setMetrics(fallbackMetrics)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  return { metrics, isLoading, error }
}
```

- [ ] **Step 4: Verify build passes**

```bash
npx tsc && npx vite build
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/ src/data/fallback.ts
git commit -m "feat: add data hooks for signals and metrics with fallback data"
```

---

### Task 4: Header, Footer & Section Divider

**Files:**
- Create: `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/SectionDivider.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create Header component**

Create `src/components/Header.tsx`:

```tsx
const mainSiteUrl = import.meta.env.VITE_MAIN_SITE_URL || '#'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-midnight/80 backdrop-blur-md">
      <h1 className="font-serif text-xl font-bold text-white">
        Futures Dashboard
      </h1>
      <a
        href={mainSiteUrl}
        className="text-sm text-electric-blue hover:text-hologram-cyan transition-colors"
      >
        ← Back to Main Site
      </a>
    </header>
  )
}
```

- [ ] **Step 2: Create Footer component**

Create `src/components/Footer.tsx`:

```tsx
export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/30 py-8 px-6 text-center">
      <p className="text-sm text-white/40">
        © {new Date().getFullYear()} Alternative Futures of Software Work
      </p>
      <p className="text-xs text-white/25 mt-2">
        VTT Technical Research Centre of Finland · University of Helsinki · Funded by Business Finland
      </p>
    </footer>
  )
}
```

- [ ] **Step 3: Create SectionDivider component**

Create `src/components/SectionDivider.tsx`:

```tsx
export default function SectionDivider() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-4">
      <div className="h-px bg-gradient-to-r from-transparent via-electric-blue/30 to-transparent" />
    </div>
  )
}
```

- [ ] **Step 4: Update App.tsx to use components**

Replace `src/App.tsx` with:

```tsx
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SectionDivider from '@/components/SectionDivider'

function App() {
  return (
    <div className="min-h-screen bg-midnight flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-6 py-16">
          <p className="font-mono text-xs uppercase tracking-widest text-hologram-cyan mb-4">
            Futures Radar
          </p>
          <p className="text-white/50">Radar visualization coming next...</p>
        </section>

        <SectionDivider />

        <section className="max-w-7xl mx-auto px-6 py-16">
          <p className="font-mono text-xs uppercase tracking-widest text-neon-gold mb-4">
            Metrics & Trends
          </p>
          <p className="text-white/50">Narrative data stories coming next...</p>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default App
```

- [ ] **Step 5: Verify build passes and visually check**

```bash
npx tsc && npx vite build
npm run dev
```

Expected: Page shows sticky header, two labeled sections with placeholder text, gradient divider between them, and footer. Dark theme with correct fonts and colors.

- [ ] **Step 6: Commit**

```bash
git add src/components/Header.tsx src/components/Footer.tsx src/components/SectionDivider.tsx src/App.tsx
git commit -m "feat: add Header, Footer, SectionDivider and page layout"
```

---

### Task 5: Radar Layout Hook

**Files:**
- Create: `src/hooks/useRadarLayout.ts`

- [ ] **Step 1: Create the radar layout computation hook**

This hook takes signals and radar dimensions and computes the (x, y) position of each dot.

Create `src/hooks/useRadarLayout.ts`:

```typescript
import { useMemo } from 'react'
import type { Signal, DecisionHorizon } from '@/types'
import { CATEGORY_COLORS, HORIZON_RINGS } from '@/types'

export interface RadarDot {
  signal: Signal
  x: number
  y: number
  radius: number
  color: string
}

const RING_RADII = [0.15, 0.35, 0.6, 0.85] // fraction of total radius per horizon ring

function horizonToRingRadius(horizon: DecisionHorizon): number {
  const ring = HORIZON_RINGS.find((r) => r.key === horizon)
  if (!ring) return RING_RADII[1]
  return RING_RADII[ring.ringIndex]
}

function categoryToSectorAngle(category: string, indexInSector: number, totalInSector: number): number {
  const catIndex = CATEGORY_COLORS.findIndex((c) => c.name === category)
  const sectorCount = CATEGORY_COLORS.length
  const sectorSize = 360 / sectorCount
  const sectorStart = catIndex * sectorSize
  const padding = sectorSize * 0.15
  const usable = sectorSize - 2 * padding
  const step = totalInSector > 1 ? usable / (totalInSector - 1) : 0
  return sectorStart + padding + step * indexInSector
}

function weightToRadius(weight: number): number {
  return 4 + weight * 2 // 6px to 14px
}

export function useRadarLayout(signals: Signal[], size: number) {
  return useMemo(() => {
    const center = size / 2
    const maxRadius = size / 2 - 30 // padding from edge

    // Group signals by category to distribute within sectors
    const byCategory: Record<string, Signal[]> = {}
    for (const s of signals) {
      if (!byCategory[s.category]) byCategory[s.category] = []
      byCategory[s.category].push(s)
    }

    const dots: RadarDot[] = signals.map((signal) => {
      const categorySignals = byCategory[signal.category]
      const indexInSector = categorySignals.indexOf(signal)
      const totalInSector = categorySignals.length

      const ringFraction = horizonToRingRadius(signal.decision_horizon)
      const distFromCenter = ringFraction * maxRadius
      // Add jitter so dots in the same ring don't overlap
      const jitter = (Math.random() - 0.5) * maxRadius * 0.08

      const angleDeg = signal.radar_angle ?? categoryToSectorAngle(signal.category, indexInSector, totalInSector)
      const angleRad = (angleDeg - 90) * (Math.PI / 180) // -90 so 0° is top

      const x = center + (distFromCenter + jitter) * Math.cos(angleRad)
      const y = center + (distFromCenter + jitter) * Math.sin(angleRad)

      const catColor = CATEGORY_COLORS.find((c) => c.name === signal.category)

      return {
        signal,
        x,
        y,
        radius: weightToRadius(signal.weight),
        color: catColor?.color ?? '#0EA5E9',
      }
    })

    return dots
  }, [signals, size])
}
```

- [ ] **Step 2: Verify build passes**

```bash
npx tsc && npx vite build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useRadarLayout.ts
git commit -m "feat: add useRadarLayout hook for computing signal dot positions"
```

---

### Task 6: Radar Visualization Components

**Files:**
- Create: `src/components/radar/RadarRings.tsx`, `src/components/radar/RadarSectors.tsx`, `src/components/radar/RadarDots.tsx`, `src/components/radar/RadarTooltip.tsx`, `src/components/radar/RadarLegend.tsx`, `src/components/radar/SignalDetailPanel.tsx`, `src/components/radar/FuturesRadar.tsx`

- [ ] **Step 1: Create RadarRings component**

Create `src/components/radar/RadarRings.tsx`:

```tsx
import { HORIZON_RINGS } from '@/types'

const RING_RADII = [0.15, 0.35, 0.6, 0.85]

interface RadarRingsProps {
  size: number
}

export default function RadarRings({ size }: RadarRingsProps) {
  const center = size / 2
  const maxRadius = size / 2 - 30

  return (
    <g>
      {RING_RADII.map((fraction, i) => {
        const r = fraction * maxRadius
        const ring = HORIZON_RINGS[i]
        return (
          <g key={ring.key}>
            <circle
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke="rgba(14,165,233,0.15)"
              strokeWidth={1}
              style={{ opacity: 0.5 + i * 0.15 }}
            />
            <text
              x={center}
              y={center - r - 6}
              textAnchor="middle"
              fill={`rgba(255,255,255,${0.35 + i * 0.1})`}
              fontSize={11}
              fontFamily="Inter, sans-serif"
            >
              {ring.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}
```

- [ ] **Step 2: Create RadarSectors component**

Create `src/components/radar/RadarSectors.tsx`:

```tsx
import { CATEGORY_COLORS } from '@/types'

interface RadarSectorsProps {
  size: number
}

export default function RadarSectors({ size }: RadarSectorsProps) {
  const center = size / 2
  const maxRadius = size / 2 - 30
  const sectorCount = CATEGORY_COLORS.length
  const sectorSize = 360 / sectorCount

  return (
    <g>
      {CATEGORY_COLORS.map((cat, i) => {
        const angleDeg = i * sectorSize
        const angleRad = (angleDeg - 90) * (Math.PI / 180)
        const lineX = center + maxRadius * 1.05 * Math.cos(angleRad)
        const lineY = center + maxRadius * 1.05 * Math.sin(angleRad)

        const labelAngleDeg = angleDeg + sectorSize / 2
        const labelAngleRad = (labelAngleDeg - 90) * (Math.PI / 180)
        const labelR = maxRadius + 20
        const labelX = center + labelR * Math.cos(labelAngleRad)
        const labelY = center + labelR * Math.sin(labelAngleRad)

        return (
          <g key={cat.name}>
            <line
              x1={center}
              y1={center}
              x2={lineX}
              y2={lineY}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={cat.color}
              fontSize={10}
              fontFamily="Inter, sans-serif"
              opacity={0.7}
            >
              {cat.name}
            </text>
          </g>
        )
      })}
    </g>
  )
}
```

- [ ] **Step 3: Create RadarTooltip component**

Create `src/components/radar/RadarTooltip.tsx`:

```tsx
import type { Signal } from '@/types'

interface RadarTooltipProps {
  signal: Signal
  x: number
  y: number
}

export default function RadarTooltip({ signal, x, y }: RadarTooltipProps) {
  return (
    <foreignObject x={x + 12} y={y - 40} width={220} height={80} style={{ pointerEvents: 'none' }}>
      <div className="bg-midnight/95 border border-white/20 backdrop-blur-md rounded-lg px-3 py-2 shadow-xl">
        <p className="text-white text-xs font-medium leading-tight line-clamp-2">
          {signal.title}
        </p>
        <p className="text-white/50 text-[10px] mt-1">{signal.source}</p>
      </div>
    </foreignObject>
  )
}
```

- [ ] **Step 4: Create RadarDots component**

Create `src/components/radar/RadarDots.tsx`:

```tsx
import type { RadarDot } from '@/hooks/useRadarLayout'
import type { Signal } from '@/types'
import RadarTooltip from './RadarTooltip'

interface RadarDotsProps {
  dots: RadarDot[]
  hoveredSignal: Signal | null
  onHover: (signal: Signal | null) => void
  onClick: (signal: Signal) => void
  hiddenCategories: Set<string>
}

export default function RadarDots({ dots, hoveredSignal, onHover, onClick, hiddenCategories }: RadarDotsProps) {
  return (
    <g>
      {dots
        .filter((dot) => !hiddenCategories.has(dot.signal.category))
        .map((dot) => {
          const isHovered = hoveredSignal?.id === dot.signal.id
          return (
            <g key={dot.signal.id}>
              {/* Glow */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={dot.radius * 2.5}
                fill={dot.color}
                opacity={isHovered ? 0.2 : 0.08}
                style={{ transition: 'opacity 0.2s' }}
              />
              {/* Dot */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={isHovered ? dot.radius * 1.3 : dot.radius}
                fill={dot.color}
                opacity={isHovered ? 1 : 0.8}
                style={{ cursor: 'pointer', transition: 'r 0.2s, opacity 0.2s' }}
                onMouseEnter={() => onHover(dot.signal)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onClick(dot.signal)}
              />
              {/* Tooltip */}
              {isHovered && (
                <RadarTooltip signal={dot.signal} x={dot.x} y={dot.y} />
              )}
            </g>
          )
        })}
    </g>
  )
}
```

- [ ] **Step 5: Create RadarLegend component**

Create `src/components/radar/RadarLegend.tsx`:

```tsx
import { CATEGORY_COLORS } from '@/types'

interface RadarLegendProps {
  hiddenCategories: Set<string>
  onToggle: (category: string) => void
}

export default function RadarLegend({ hiddenCategories, onToggle }: RadarLegendProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-6">
      {CATEGORY_COLORS.map((cat) => {
        const isHidden = hiddenCategories.has(cat.name)
        return (
          <button
            key={cat.name}
            onClick={() => onToggle(cat.name)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              isHidden
                ? 'border-white/10 text-white/30 bg-transparent'
                : 'border-white/20 text-white/80 bg-white/5'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: isHidden ? 'rgba(255,255,255,0.15)' : cat.color,
              }}
            />
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 6: Create SignalDetailPanel component**

Create `src/components/radar/SignalDetailPanel.tsx`:

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lightbulb, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import type { Signal } from '@/types'
import { CATEGORY_COLORS } from '@/types'

interface SignalDetailPanelProps {
  signal: Signal | null
  onClose: () => void
}

export default function SignalDetailPanel({ signal, onClose }: SignalDetailPanelProps) {
  const catColor = CATEGORY_COLORS.find((c) => c.name === signal?.category)

  return (
    <AnimatePresence>
      {signal && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="mt-8 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono uppercase"
              style={{ backgroundColor: catColor?.bgColor, color: catColor?.color }}
            >
              {signal.category}
            </span>
            <span className="text-[10px] font-mono text-white/40 uppercase">
              {signal.decision_horizon}
            </span>
          </div>

          <h3 className="font-serif text-xl font-bold text-white mb-2">{signal.title}</h3>
          <p className="text-white/60 text-sm leading-relaxed mb-4">{signal.summary}</p>
          <p className="text-white/30 text-xs mb-6">
            {signal.source} · {signal.date}
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {signal.why_it_matters.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={14} className="text-neon-gold" />
                  <span className="text-xs font-semibold text-neon-gold">Why It Matters</span>
                </div>
                <ul className="space-y-1">
                  {signal.why_it_matters.map((item, i) => (
                    <li key={i} className="text-xs text-white/50 leading-relaxed">• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {signal.recommended_actions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">Recommended Actions</span>
                </div>
                <ul className="space-y-1">
                  {signal.recommended_actions.map((item, i) => (
                    <li key={i} className="text-xs text-white/50 leading-relaxed">• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {signal.risks_and_caveats.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">Risks & Caveats</span>
                </div>
                <ul className="space-y-1">
                  {signal.risks_and_caveats.map((item, i) => (
                    <li key={i} className="text-xs text-white/50 leading-relaxed">• {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {signal.source_url && (
            <a
              href={signal.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-6 text-xs text-electric-blue hover:text-hologram-cyan transition-colors"
            >
              View Source <ExternalLink size={12} />
            </a>
          )}

          {signal.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {signal.tags.map((tag) => (
                <span key={tag} className="text-[10px] text-white/30 border border-white/10 rounded-full px-2 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 7: Create FuturesRadar container component**

Create `src/components/radar/FuturesRadar.tsx`:

```tsx
import { useState, useCallback } from 'react'
import { useSignals } from '@/hooks/useSignals'
import { useRadarLayout } from '@/hooks/useRadarLayout'
import type { Signal } from '@/types'
import RadarRings from './RadarRings'
import RadarSectors from './RadarSectors'
import RadarDots from './RadarDots'
import RadarLegend from './RadarLegend'
import SignalDetailPanel from './SignalDetailPanel'

const RADAR_SIZE = 600

export default function FuturesRadar() {
  const { signals, isLoading } = useSignals()
  const dots = useRadarLayout(signals, RADAR_SIZE)
  const [hoveredSignal, setHoveredSignal] = useState<Signal | null>(null)
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())

  const handleToggleCategory = useCallback((category: string) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-hologram-cyan/30 border-t-hologram-cyan rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-hologram-cyan mb-8">
        Futures Radar
      </p>

      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
          width={RADAR_SIZE}
          height={RADAR_SIZE}
          className="max-w-full h-auto"
        >
          <RadarRings size={RADAR_SIZE} />
          <RadarSectors size={RADAR_SIZE} />
          <RadarDots
            dots={dots}
            hoveredSignal={hoveredSignal}
            onHover={setHoveredSignal}
            onClick={setSelectedSignal}
            hiddenCategories={hiddenCategories}
          />
        </svg>
      </div>

      <RadarLegend
        hiddenCategories={hiddenCategories}
        onToggle={handleToggleCategory}
      />

      <SignalDetailPanel
        signal={selectedSignal}
        onClose={() => setSelectedSignal(null)}
      />
    </section>
  )
}
```

- [ ] **Step 8: Verify build passes**

```bash
npx tsc && npx vite build
```

Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/radar/
git commit -m "feat: add Futures Radar visualization with interactive dots, tooltips, and detail panel"
```

---

### Task 7: Metrics & Trends Section

**Files:**
- Create: `src/components/metrics/Sparkline.tsx`, `src/components/metrics/NarrativeCard.tsx`, `src/components/metrics/MetricsSection.tsx`

- [ ] **Step 1: Create Sparkline component**

Create `src/components/metrics/Sparkline.tsx`:

```tsx
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { MetricDatapoint } from '@/types'

interface SparklineProps {
  datapoints: MetricDatapoint[]
  color: string
  height?: number
}

export default function Sparkline({ datapoints, color, height = 40 }: SparklineProps) {
  if (datapoints.length < 2) return null

  const data = datapoints.map((dp) => ({ date: dp.date, value: dp.value }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Create NarrativeCard component**

Create `src/components/metrics/NarrativeCard.tsx`:

```tsx
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import type { Metric } from '@/types'
import Sparkline from './Sparkline'

interface NarrativeCardProps {
  metric: Metric
  accentColor: string
  index: number
}

export default function NarrativeCard({ metric, accentColor, index }: NarrativeCardProps) {
  const latestValue = metric.datapoints.length > 0
    ? metric.datapoints[metric.datapoints.length - 1].value
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6"
    >
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className="flex-1">
          <h3
            className="font-serif text-lg font-bold mb-2"
            style={{ color: accentColor }}
          >
            {metric.narrative_headline}
          </h3>
          <p className="text-white/50 text-sm leading-relaxed">
            {metric.narrative_body}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 min-w-[140px]">
          {latestValue !== null && (
            <p
              className="text-3xl font-bold tabular-nums"
              style={{ color: accentColor }}
            >
              {latestValue}{metric.unit === '%' ? '%' : ` ${metric.unit}`}
            </p>
          )}
          <div className="w-full">
            <Sparkline datapoints={metric.datapoints} color={accentColor} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
        <p className="text-[10px] text-white/25">
          Source: {metric.source_name} · Updated {new Date(metric.updated_at).toLocaleDateString()}
        </p>
        {metric.source_url && (
          <a
            href={metric.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-electric-blue hover:text-hologram-cyan transition-colors inline-flex items-center gap-1"
          >
            View Source <ExternalLink size={10} />
          </a>
        )}
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 3: Create MetricsSection container**

Create `src/components/metrics/MetricsSection.tsx`:

```tsx
import { useMetrics } from '@/hooks/useMetrics'
import NarrativeCard from './NarrativeCard'

const ACCENT_COLORS = ['#0EA5E9', '#F59E0B', '#22d3ee', '#a855f7', '#4ade80', '#ef4444']

export default function MetricsSection() {
  const { metrics, isLoading } = useMetrics()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-neon-gold/30 border-t-neon-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-neon-gold mb-8">
        Metrics & Trends
      </p>

      <div className="space-y-6">
        {metrics.map((metric, i) => (
          <NarrativeCard
            key={metric.id}
            metric={metric}
            accentColor={ACCENT_COLORS[i % ACCENT_COLORS.length]}
            index={i}
          />
        ))}
      </div>

      {metrics.length === 0 && (
        <p className="text-white/30 text-sm text-center py-12">
          No metrics available yet.
        </p>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Verify build passes**

```bash
npx tsc && npx vite build
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/metrics/
git commit -m "feat: add Metrics section with narrative data story cards and sparklines"
```

---

### Task 8: Assemble Full Page

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Wire up all sections in App.tsx**

Replace `src/App.tsx` with:

```tsx
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SectionDivider from '@/components/SectionDivider'
import FuturesRadar from '@/components/radar/FuturesRadar'
import MetricsSection from '@/components/metrics/MetricsSection'

function App() {
  return (
    <div className="min-h-screen bg-midnight flex flex-col">
      <Header />
      <main className="flex-1">
        <FuturesRadar />
        <SectionDivider />
        <MetricsSection />
      </main>
      <Footer />
    </div>
  )
}

export default App
```

- [ ] **Step 2: Verify build passes and visually check**

```bash
npx tsc && npx vite build
npm run dev
```

Expected: Full page renders — Header, Futures Radar with dots (fallback data since no Supabase env), gradient divider, Metrics section with narrative cards and sparklines, Footer. All on dark background with correct colors and fonts.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: assemble full dashboard page with Radar and Metrics sections"
```

---

### Task 9: Supabase Schema & Migration

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Write the SQL migration**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Signals table
create table signals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  source text not null,
  source_url text,
  date date not null,
  detected_at date not null,
  status text not null default 'draft' check (status in ('published', 'draft')),
  category text not null,
  decision_horizon text not null check (decision_horizon in ('now', '2026', '2027-2028', '2029+')),
  tags text[] default '{}',
  why_it_matters text[] default '{}',
  recommended_actions text[] default '{}',
  risks_and_caveats text[] default '{}',
  weight integer not null default 3 check (weight between 1 and 5),
  radar_angle float,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Metrics table
create table metrics (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  narrative_headline text not null,
  narrative_body text not null,
  source_name text not null,
  source_url text not null,
  unit text not null,
  status text not null default 'draft' check (status in ('published', 'draft')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Metric datapoints table
create table metric_datapoints (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null references metrics(id) on delete cascade,
  date date not null,
  value numeric not null,
  created_at timestamptz default now()
);

create index idx_metric_datapoints_metric_id on metric_datapoints(metric_id);
create index idx_metric_datapoints_date on metric_datapoints(date);
create index idx_signals_status on signals(status);
create index idx_signals_category on signals(category);
create index idx_metrics_status on metrics(status);

-- Row Level Security
alter table signals enable row level security;
alter table metrics enable row level security;
alter table metric_datapoints enable row level security;

-- Anonymous read access for published content
create policy "Published signals are viewable by everyone"
  on signals for select
  using (status = 'published');

create policy "Published metrics are viewable by everyone"
  on metrics for select
  using (status = 'published');

create policy "Datapoints of published metrics are viewable by everyone"
  on metric_datapoints for select
  using (
    metric_id in (select id from metrics where status = 'published')
  );

-- Authenticated users can manage all data
create policy "Authenticated users can insert signals"
  on signals for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update signals"
  on signals for update
  to authenticated
  using (true);

create policy "Authenticated users can delete signals"
  on signals for delete
  to authenticated
  using (true);

create policy "Authenticated users can insert metrics"
  on metrics for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update metrics"
  on metrics for update
  to authenticated
  using (true);

create policy "Authenticated users can delete metrics"
  on metrics for delete
  to authenticated
  using (true);

create policy "Authenticated users can insert datapoints"
  on metric_datapoints for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update datapoints"
  on metric_datapoints for update
  to authenticated
  using (true);

create policy "Authenticated users can delete datapoints"
  on metric_datapoints for delete
  to authenticated
  using (true);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase schema migration with tables and RLS policies"
```

---

### Task 10: Signal Migration Script

**Files:**
- Create: `scripts/migrate-signals.ts`

- [ ] **Step 1: Create migration script**

This script reads the existing JSON signal files from the main site repo and inserts them into Supabase. Run it once manually.

Create `scripts/migrate-signals.ts`:

```typescript
/**
 * One-time migration: reads AI signal JSON files from the main site repo
 * and inserts them into the Supabase signals table.
 *
 * Usage:
 *   npx tsx scripts/migrate-signals.ts --source ../FuturesofSoftwareWork/public/content/ai-signals
 *
 * Requires environment variables:
 *   SUPABASE_URL (the full project URL, not the VITE_ prefixed one)
 *   SUPABASE_SERVICE_ROLE_KEY (NOT the anon key — this needs write access)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const args = process.argv.slice(2)
const sourceIdx = args.indexOf('--source')
if (sourceIdx === -1 || !args[sourceIdx + 1]) {
  console.error('Usage: npx tsx scripts/migrate-signals.ts --source <path-to-ai-signals-dir>')
  process.exit(1)
}
const sourceDir = args[sourceIdx + 1]

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrate() {
  const files = readdirSync(sourceDir).filter((f) => f.endsWith('.json') && f !== 'index.json')
  console.log(`Found ${files.length} signal files in ${sourceDir}`)

  let inserted = 0
  let skipped = 0

  for (const file of files) {
    const raw = readFileSync(join(sourceDir, file), 'utf-8')
    const signal = JSON.parse(raw)

    if (signal.status !== 'published') {
      skipped++
      continue
    }

    // Map from camelCase JSON to snake_case DB columns
    const row = {
      title: signal.title,
      summary: signal.summary,
      source: signal.source,
      source_url: signal.sourceUrl ?? null,
      date: signal.date,
      detected_at: signal.detectedAt,
      status: signal.status,
      category: signal.category,
      decision_horizon: signal.decisionHorizon ?? '2026',
      tags: signal.tags ?? [],
      why_it_matters: signal.whyItMatters ?? [],
      recommended_actions: signal.recommendedActions ?? [],
      risks_and_caveats: signal.risksAndCaveats ?? [],
      weight: signal.weight ?? 3,
      radar_angle: null,
    }

    const { error } = await supabase.from('signals').insert(row)
    if (error) {
      console.error(`Failed to insert ${file}:`, error.message)
    } else {
      inserted++
    }
  }

  console.log(`Done. Inserted: ${inserted}, Skipped (draft): ${skipped}`)
}

migrate().catch(console.error)
```

- [ ] **Step 2: Install tsx as dev dependency**

```bash
npm install -D tsx
```

- [ ] **Step 3: Verify build passes**

```bash
npx tsc && npx vite build
```

Expected: No errors (the script is in `scripts/` which is not included in tsconfig's `include`).

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-signals.ts package.json package-lock.json
git commit -m "feat: add one-time signal migration script from JSON to Supabase"
```

---

### Task 11: Firebase Hosting Setup

**Files:**
- Create: `firebase.json`, `.firebaserc`

- [ ] **Step 1: Create firebase.json**

Create `firebase.json`:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/assets/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Create .firebaserc**

Create `.firebaserc`:

```json
{
  "projects": {
    "default": "YOUR_FIREBASE_PROJECT_ID"
  }
}
```

Note: Replace `YOUR_FIREBASE_PROJECT_ID` with the actual Firebase project ID after creating it in the Firebase console.

- [ ] **Step 3: Add deploy script to package.json**

Add to `scripts` in `package.json`:

```json
"deploy": "npm run build && firebase deploy --only hosting"
```

- [ ] **Step 4: Commit**

```bash
git add firebase.json .firebaserc package.json
git commit -m "feat: add Firebase Hosting configuration"
```

---

### Task 12: Integration — Add Dashboard Link to Main Site

**Files:**
- Modify: `src/components/Hero.tsx` (in the **FuturesofSoftwareWork** repo, not futureOfSW)

- [ ] **Step 1: Read current Hero component**

Read `src/components/Hero.tsx` in the FuturesofSoftwareWork repo to identify where to add the link.

- [ ] **Step 2: Add Dashboard CTA link**

Add a "Futures Dashboard" link below the tagline in the Hero section. Example placement (adjust based on reading the actual file):

```tsx
<a
  href="https://dashboard.futuresofsoftwarework.fi"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full border border-electric-blue/30 bg-electric-blue/10 text-electric-blue text-sm font-medium hover:bg-electric-blue/20 transition-colors"
>
  Explore Futures Dashboard →
</a>
```

- [ ] **Step 3: Verify main site build passes**

```bash
cd ../FuturesofSoftwareWork && npm run build
```

Expected: No errors.

- [ ] **Step 4: Commit in the FuturesofSoftwareWork repo**

```bash
git add src/components/Hero.tsx
git commit -m "feat: add Futures Dashboard link to Hero section"
```

---

## Summary

| Task | What it builds | Commits |
|------|---------------|---------|
| 1 | Project scaffolding (Vite + React + Tailwind) | 1 |
| 2 | TypeScript types + Supabase client | 1 |
| 3 | Data hooks + fallback data | 1 |
| 4 | Header, Footer, SectionDivider + page layout | 1 |
| 5 | Radar layout computation hook | 1 |
| 6 | Full radar visualization (rings, sectors, dots, tooltip, legend, detail panel) | 1 |
| 7 | Metrics section (narrative cards + sparklines) | 1 |
| 8 | Assemble full page | 1 |
| 9 | Supabase schema + RLS migration | 1 |
| 10 | Signal migration script | 1 |
| 11 | Firebase Hosting config | 1 |
| 12 | Dashboard link on main site | 1 |
