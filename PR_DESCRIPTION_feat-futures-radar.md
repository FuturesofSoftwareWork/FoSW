# Futures Radar — Phase 1: content schema, config, and validators

## What this delivers

Phase 1 of the "futures radar" feature: a new **Phenomenon** content type that
represents a forward-looking claim about how software work may be changing,
backed by dated evidence drawn from existing AI-signal content.

- **Types:** `Phenomenon`, `PhenomenonEvidence`, `PhenomenonImplication`,
  `DevelopmentPath`, `EvidenceProfile` and related TypeScript interfaces.
- **Config:** nine work-dimension vocabulary entries and seven actor entries
  (`src/config/radarDimensions.ts`, `src/config/radarActors.ts`), mirrored for
  the Node scripts in `scripts/lib/phenomenon-schema.mjs` (kept in sync by a
  unit test).
- **Derivation library** (`scripts/lib/derive.mjs`): computes
  `evidenceProfile` (independent contexts, evidence-type diversity, quarters
  spanned, counter-evidence presence) and `firstObserved` /
  `latestEvidenceDate` from a phenomenon's evidence list and the referenced
  signals — these fields are never hand-authored.
- **Validator** (`scripts/validate-phenomena.mjs`): required fields, enum
  values, cross-references to published signals, editorial minimums for
  published phenomena, and — critically — that any stored `evidenceProfile`
  / derived dates match what the evidence actually computes to. Also reports
  signal-to-phenomenon coverage and the launch-gate status (radar goes live
  only once ten phenomena are published).
- **Test runner:** `npm test` (`node --test`) covering the content loader,
  the derivation library, the config mirrors, and the validator rules — 48
  tests, all passing.
- **Signal schema extension:** eight optional `signalType` values
  (`practitioner-account`, `field-report`, `study`, `tool-shift`,
  `regulation-standard`, `market-event`, `forecast`, `primary-research`) plus
  type-specific provenance fields, all optional so untyped legacy signals are
  unaffected.
- **Two signal enum renames** (from the prior signal-types work this phase
  builds on): the weak-signal and regulatory genres were renamed as part of
  landing the eight-genre `signalType` vocabulary.
- **Six signals newly typed** as the worked fixture's evidence, to prove the
  bootstrap-pass pattern the spec describes:
  - `2026-03-16-04` (Anthropic multi-agent Code Review) → `tool-shift`,
    `availability: GA`
  - `2026-05-06-11` (Cloudflare, 5,169 repos) → `field-report`,
    `sponsor: Cloudflare`
  - `2026-03-16-05` (Opsera benchmark) → `field-report`, `sponsor: Opsera`
  - `2026-05-25-03` (LinearB 2026 benchmarks) → `field-report`,
    `sponsor: LinearB`
  - `2026-05-20-04` (code review time up 91%) → `practitioner-account`,
    with `observer`
  - `2026-06-22-06` (review agents without humans) → `study`
- **Worked fixture:** `review-shifts-to-verification`, a draft phenomenon
  claiming that software assurance is shifting from reading code to
  verifying evidence. Its evidence deliberately splits stance: the two
  benchmark signals showing longer review queues and lower AI-PR acceptance
  rates are `contextual` (they establish the pressure, not the shift
  itself), while the signals showing automated verification actually
  displacing routine review are `supports`, and one signal showing
  autonomous review underperforming is `counter`. This is the schema's
  point — pressure and shift are validated as distinct evidentiary roles.
- **Build wiring:** `npm run build` now runs `npm run validate` first, which
  runs both `validate-signals.mjs` and the new `validate-phenomena.mjs`.
  `npm run signals:validate` is unchanged (referenced by
  `docs/ai-signals-pipeline.md`); a new `validate:phenomena` script runs the
  phenomenon validator alone.

## What this deliberately does not do

- No radar UI components, no drawer changes, no `?phenomenon=<id>` deep
  links, no site placement.
- No bootstrap/clustering pipeline (`radar:prepare`, `radar:apply`,
  `radar:accept`, `radar:derive`) and no machine/human-owned field manifest.
- No preview deployment wiring (`VITE_RADAR_PREVIEW`, `deploy-preview.yml`).
- No published phenomena. The one phenomenon in this branch
  (`review-shifts-to-verification`) is `status: "draft"` — a schema fixture,
  not an editorial claim ready for publication.
- **The radar is invisible on the site.** Nothing in this phase is rendered
  anywhere; the launch gate additionally keeps the (not-yet-built) radar UI
  hidden until ten phenomena are published, and this phase ships zero.

See the design spec for the full schema and validation rules:
`docs/superpowers/specs/2026-08-04-futures-radar-design.md`, and the phased
implementation plan: `docs/superpowers/plans/2026-08-05-futures-radar-phase1-schema.md`.

## Verification

- `npm test` — 48/48 passing (content loader, derivation, config mirrors,
  validator rules).
- `npm run signals:validate` — `validate: OK — 89 signals valid`.
- `node scripts/validate-phenomena.mjs` — `validate-phenomena: OK — 1
  phenomena valid (0 published, launch gate closed (10 more needed))`,
  coverage `6 of 89 published signals map to a phenomenon`.
- `npm run build` — passes, runs both validators first.
- `npm run lint` — zero warnings.
- Manually broke the fixture (`observedReach: "established"`, blank
  `reachRationale`) and confirmed the validator fails with exit 1 and
  messages naming both fields, then reverted and confirmed it passes again.
