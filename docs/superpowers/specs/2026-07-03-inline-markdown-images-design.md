# Inline Markdown Images in Expert Insights — Design

**Date:** 2026-07-03
**Status:** Approved (pending spec review)

## Problem

Expert insight articles are authored as markdown (`markdownFile`, rendered in
`ContentDrawer` via `react-markdown` + `remark-gfm`). There is currently no way
to place an image inside an article. The `image` JSON field added in the prior
deep-links/SEO work controls only the **social share card** (`og:image`) — it is
not rendered in the article body.

Authors want to embed **one or more images anywhere** in an article.

## Goal

Let authors drop image files next to the article's markdown and reference them
with plain markdown image syntax, rendering as styled figures (with optional
captions) in the article body. No schema change, minimal code.

## Non-Goals

- No dedicated "hero/banner" image field (the `image` JSON field stays as the
  share-card only).
- No image upload UI, no image processing/resizing, no galleries/lightbox.
- No changes to AI signals (they are not markdown-authored articles).

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Scope | Inline markdown images only (multiple, positioned anywhere) |
| Captions | Alt text renders as a visible caption; empty alt = no caption |
| Where images live | `public/content/expert-insights/` (same folder as `.md`/`.json`) |
| Naming convention | `<insight-id>_<n>.png` (e.g. `productivity-systems-lens_1.png`) — human convention; any filename works |
| Authoring syntax | Standard markdown: `![caption](filename.png)` — bare filename |

## Authoring Convention

- Place the image file in `public/content/expert-insights/`.
- In the markdown, reference it by filename only:

  ```markdown
  ![Figure 1: where the bottleneck moves](productivity-systems-lens_1.png)
  ```

- The alt text (`Figure 1: …`) becomes the visible caption AND the `<img alt>`
  attribute (accessibility + SEO). For no caption, use empty alt: `![](file.png)`.
- External images are supported: `![caption](https://host/x.png)` is used as-is.

## Architecture

A single addition to the `components` map of the `<Markdown>` element in
`src/components/ContentDrawer.tsx`: an `img` renderer. No new files, no schema
change, no `prerender.mjs` change.

### Path resolution

The renderer resolves the markdown `src`:

- If `src` matches `^https?://` → use verbatim (external image).
- Otherwise → treat as a filename in the content folder and prefix with the
  Vite base:
  `` `${import.meta.env.BASE_URL}content/expert-insights/${src.replace(/^\.?\//, "")}` ``
  e.g. `productivity-systems-lens_1.png` →
  `/FoSW/content/expert-insights/productivity-systems-lens_1.png`.

This produces a **root-absolute** URL, so it resolves correctly regardless of
the article page's URL depth (`/FoSW/insights/<id>/`), and it honors the
`/FoSW/` base (never hardcoded).

### Rendering

The renderer returns a `<figure>` containing the `<img>` and, when alt text is
non-empty, a `<figcaption>`:

- `<img>`: `loading="lazy"`, `decoding="async"`, full width of the prose column,
  rounded corners, subtle border, block display. Alt attribute = the alt text.
- `<figcaption>`: rendered only when alt is non-empty; small, muted, centered,
  matching the site's `font-sans` metadata styling.
- `<figure>`: vertical margin so images breathe within the prose flow.

Rendering a `<figure>` (rather than the default `<p><img></p>`) attaches the
caption cleanly. Tailwind classes are fully static (no dynamic interpolation).

Note: `react-markdown` may wrap a lone image in a `<p>`; a `<figure>` inside a
`<p>` is invalid HTML and React will warn/reflow. This is handled by rendering
the image as a `<figure>` and keeping images on their own markdown line
(standard authoring); if a stray-wrapper warning appears in testing, resolve it
by adding a `remark`/`rehype` unwrap or by rendering a `<span>`-based figure.
The implementation plan will verify the console is clean.

## Data Flow

- **Runtime:** `ContentDrawer` fetches the markdown, `react-markdown` parses
  `![alt](src)` into the `img` renderer, which resolves the path and renders the
  figure. Image files are served from `public/` under `/FoSW/…`.
- **Prerender:** images are plain `<img>` in the article body, captured
  automatically by the existing per-insight prerender into the static page. Vite
  copies `public/content/expert-insights/*.png` into `dist/`, so the baked
  `src` resolves. No `prerender.mjs` change.

## Error Handling & Edge Cases

- **Missing file:** the `<img>` shows a broken-image icon; caption still renders.
  Acceptable — an authoring error, visible immediately in preview.
- **Empty alt (`![](file.png)`):** image renders, no `<figcaption>`.
- **External URL:** passed through unchanged.
- **Path with leading `./` or `/`:** normalized (leading `./` or `/` stripped
  before prefixing) so `![](./f.png)` and `![](f.png)` behave the same.

## Testing

The verification uses **temporary** artifacts that are reverted before commit —
only the `ContentDrawer` renderer ships. This avoids injecting placeholder
content into a real published article on production.

- **Build verification:** temporarily copy an existing small image to
  `public/content/expert-insights/_imgtest.png` and add one
  `![Test caption](_imgtest.png)` line to a real insight's markdown. Run
  `npm run build` and confirm the prerendered `dist/insights/<id>/index.html`
  contains `<img ... src="/FoSW/content/expert-insights/_imgtest.png"` and the
  caption text inside a `<figcaption>`.
- **Manual:** `npm run dev`, open that insight — confirm the image and caption
  render, are styled on-theme, and the console is warning-free (no invalid-DOM-
  nesting warning).
- **Revert test artifacts:** delete `_imgtest.png` and remove the test markdown
  line before committing.

## Files Touched

| File | Change |
| --- | --- |
| `src/components/ContentDrawer.tsx` | **(ships)** Add an `img` renderer to the `<Markdown>` `components` map (path resolution + figure/caption + styling) |
| `public/content/expert-insights/_imgtest.png` | **(temporary, reverted)** copied test image for end-to-end verification |
| `public/content/expert-insights/<id>.md` | **(temporary, reverted)** one `![caption](file.png)` line for verification |

The committed diff is **only** `src/components/ContentDrawer.tsx`. Authors add
real images to real articles later as ordinary content edits — no code change
needed.

## Rollout

Small, self-contained change. Per the user's direction, verify locally
(`npm run build` + dev preview), revert the test artifacts, then commit and push
the renderer directly to `main`, which triggers the GitHub Pages deploy.
