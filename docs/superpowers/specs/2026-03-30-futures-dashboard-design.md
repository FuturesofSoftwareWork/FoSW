# Futures Dashboard — Design Spec

A standalone dashboard application that visualizes emerging phenomena in software work futures (Futures Radar) and tracks real-world metrics with narrative data stories (Metrics & Trends). Separate repo for IPR reusability, but visually integrated with the main Futures of Software Work site.

## Architecture & Tech Stack

- **Separate repo** (`vttfinland/futureOfSW`), deployed to its own subdomain (e.g., `dashboard.futuresofsoftwarework.fi`)
- **React 18 + TypeScript** (strict mode) — same as main site
- **Vite 5** for build
- **Tailwind CSS 3** — same config as main site (colors, fonts, glass-morphism patterns)
- **Framer Motion** for animations (radar transitions, card reveals)
- **Supabase JS client** for data fetching — public `anon` key with Row Level Security
- **D3.js** for the concentric radar visualization; **Recharts** (or lightweight inline SVG) for metric sparklines
- **Inter + Merriweather** fonts, `midnight` / `electric-blue` / `neon-gold` / `hologram-cyan` palette
- **Firebase Hosting** for deployment (existing infrastructure, static SPA serving)

## Page Structure

Single scrolling page with two major sections:

### Header Bar

- Site title: "Futures Dashboard" (Merriweather serif)
- "← Back to Main Site" link (top-right)
- Minimal — branding + return link only

### Section 1: Futures Radar

- Section label: "FUTURES RADAR" (monospace, uppercase, cyan accent)
- **Interactive concentric radar**, centered on page
  - 4 rings: Now → 2026 → 2027-2028 → 2029+
  - 4-6 sectors by category (AI Agents, AI Tools, SDLC Change, Org & Leadership, Quality Testing, Security & Risk)
  - Each signal = a dot, color-coded by category, sized by weight (1-5)
  - **Hover**: tooltip with signal title + source
  - **Click**: expands a detail panel below the radar showing full signal info (title, summary, why it matters, recommended actions, risks & caveats, source link, tags)
  - Category legend below the radar, doubling as toggle filters
- Data source: Supabase `signals` table

### Divider

- Subtle gradient line between sections

### Section 2: Metrics & Trends

- Section label: "METRICS & TRENDS" (monospace, uppercase, gold accent)
- **Narrative data story cards**, vertically stacked:
  - Story headline (Merriweather serif, colored accent)
  - 2-3 sentence context paragraph (Inter, gray)
  - Key stat / number (large, color-accented)
  - Inline sparkline showing trend over time
  - Source attribution + last-updated date (small, bottom)
- Data source: Supabase `metrics` + `metric_datapoints` tables

### Footer

- Matches main site footer style (copyright, institution credits)

## Data Model (Supabase)

### Table: `signals`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | |
| `title` | text | |
| `summary` | text | |
| `source` | text | |
| `source_url` | text, nullable | |
| `date` | date | Publication date |
| `detected_at` | date | When signal was first detected |
| `status` | text | `published` or `draft` |
| `category` | text | AI Agents, AI Tools, SDLC Change, Quality Testing, Security & Risk, Org & Leadership |
| `decision_horizon` | text | `now`, `2026`, `2027-2028`, `2029+` |
| `tags` | text[] | |
| `why_it_matters` | text[] | Bullet points |
| `recommended_actions` | text[] | Bullet points |
| `risks_and_caveats` | text[] | Bullet points |
| `weight` | integer | 1-5, controls radar dot size |
| `radar_angle` | float, nullable | 0-360 override for dot placement; auto-distributed if null |

### Table: `metrics`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | |
| `slug` | text, unique | e.g., `junior-unemployment-rate` |
| `name` | text | Display name |
| `narrative_headline` | text | Story title |
| `narrative_body` | text | 2-3 sentence context |
| `source_name` | text | |
| `source_url` | text | |
| `unit` | text | %, count, ratio, etc. |
| `status` | text | `published` or `draft` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### Table: `metric_datapoints`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | |
| `metric_id` | uuid, FK → metrics | |
| `date` | date | |
| `value` | numeric | |
| `created_at` | timestamptz | When this datapoint was ingested |

### Row Level Security

- **Anonymous read**: all rows where `status = 'published'`
- **Insert/update/delete**: authenticated users only (admin via Supabase dashboard)

## Data Flow

1. **Signals**: manually entered via Supabase dashboard. One-time migration from existing JSON files in the main site's `public/content/ai-signals/` directory.
2. **Metrics**: narrative fields entered manually. Datapoints can be updated via Supabase Edge Functions on a schedule, pulling from public APIs (Bureau of Labor Statistics, GitHub API, Stack Overflow surveys, LinkedIn hiring data).

## Integration with Main Site

### Visual consistency

- Shared Tailwind config (colors, fonts, spacing) — duplicated initially, extracted to shared package if warranted later
- Same glass-morphism card style, dark background, accent color patterns
- Consistent typography hierarchy: Merriweather for headings, Inter for body

### Cross-linking

- **Main site → Dashboard**: prominent "Futures Dashboard" CTA link in Hero or nav area
- **Dashboard → Main site**: "← Back to Main Site" in header; signal detail panels can link to the signal's page on the main site if it exists
- Optional future enhancement: mini radar preview widget on the main site that links to the dashboard

### Deployment

- Firebase Hosting project, own subdomain
- Separate Supabase project (clean IPR boundaries for reuse in other projects)
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — safe to expose client-side with RLS enabled

## Reusability (IPR)

The dashboard is self-contained and reusable across projects:

- Different projects supply their own Supabase instance with the same schema
- Radar component, narrative card component, and Supabase hooks are all generic
- Theme is overridable via Tailwind config for different branding
- No hard dependencies on the Futures of Software Work main site
