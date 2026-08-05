/**
 * Derived values for a phenomenon.
 *
 * These are descriptive statistics, not a score: nothing here decides where a blip
 * sits. `observedReach` is a human judgment and no function in this file may
 * influence it.
 *
 * Counting rules follow the spec's *Evidence profile* section. The two that matter:
 * a forecast is a prediction, not an observation, so it never counts; and several
 * field reports from one sponsor are one interested party, not several.
 */

/** "2026-03-15" -> "2026-Q1". Returns null for anything unparseable. */
export function quarterOf(date) {
  if (typeof date !== "string") return null;
  const m = /^(\d{4})-(\d{2})/.exec(date);
  if (!m) return null;
  return `${m[1]}-Q${Math.floor((Number(m[2]) - 1) / 3) + 1}`;
}

const resolve = (evidence, signalsById) =>
  (Array.isArray(evidence) ? evidence : [])
    .map((e) => ({ e, s: signalsById.get(e.signalId) }))
    .filter(({ s }) => s !== undefined);

export function deriveEvidenceProfile(phenomenon, signalsById) {
  const scoring = resolve(phenomenon.evidence, signalsById).filter(
    ({ e, s }) => e.stance === "supports" && s.signalType !== "forecast"
  );

  // A sponsor names an interested party. Several reports from one sponsor are one
  // context; anything else is counted per signal.
  const contexts = new Set();
  const types = new Set();
  for (const { e, s } of scoring) {
    if (!e.primary) continue;
    contexts.add(
      s.signalType === "field-report" && s.sponsor ? `sponsor:${s.sponsor}` : `signal:${s.id}`
    );
    if (s.signalType) types.add(s.signalType);
  }

  const quarters = new Set();
  for (const { s } of scoring) {
    const q = quarterOf(s.date);
    if (q) quarters.add(q);
  }

  const counterEvidence = resolve(phenomenon.evidence, signalsById).some(
    ({ e }) => e.stance === "counter" && e.primary
  );

  return {
    independentContexts: contexts.size,
    evidenceTypes: types.size,
    quartersSpanned: quarters.size,
    counterEvidence,
  };
}

/** Earliest and latest evidence dates, over evidence of every stance. */
export function deriveDates(phenomenon, signalsById) {
  const dates = resolve(phenomenon.evidence, signalsById)
    .map(({ s }) => s.date)
    .filter((d) => typeof d === "string" && d)
    .sort();
  return {
    firstObserved: dates[0] ?? null,
    latestEvidenceDate: dates[dates.length - 1] ?? null,
  };
}
