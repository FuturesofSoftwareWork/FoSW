/**
 * Headless verification of the futures radar, using the project's own Puppeteer.
 *
 * Usage: node scripts/verify-radar.mjs <baseUrl>
 *
 * Requires a server already running at <baseUrl> — this script does not start
 * one. It is deliberately NOT wired into `npm run build`, `npm test` or
 * `npm run lint`: it needs a live server, so putting it in an unattended
 * pipeline would fail spuriously. Run it manually via `npm run verify:radar
 * <baseUrl>` whenever the radar changes.
 *
 * The radar itself is hidden in production builds below ten published
 * phenomena (see `isPreviewContext()` in `src/lib/phenomenon.ts`), so a plain
 * `npm run build && npm run preview` shows no radar at all and every check
 * below that depends on it will fail. Point this script at `npm run dev`
 * instead, or at a production build made with `VITE_RADAR_PREVIEW=1` so
 * drafts and the radar both render.
 *
 * What each check exists to catch:
 *   1     Every phenomenon the page ought to show renders, and nothing else —
 *         counted from the index the page fetched, not from a literal. The
 *         expected set depends on context (drafts render in dev and preview,
 *         not in production), so it keys off whether any draft rendered: all of
 *         them must, or none. A hardcoded count instead fails on the day someone
 *         publishes a phenomenon, which reads as a broken radar.
 *   2-6   Structural/behavioural checks on ring placement, contested bolts,
 *         drawer open, URL, reload stability and filtering — ordinary DOM
 *         assertions.
 *   7     No blip carries a standing label and no toggle offers to add one.
 *         Ten phenomena across seven sectors could not be labelled in place —
 *         the labels collided with each other and struck through the ring
 *         labels while the blips stayed cleanly separated. This is the
 *         regression guard for that removal.
 *   8     Sanity check that the radar rendered at all. Without it, checks 9
 *         and 10 (the viewBox and crowding checks) would iterate over zero
 *         `<text>` elements on a page with no radar — such as a production
 *         build below the publish threshold — and report a false pass
 *         instead of catching that the radar never rendered.
 *   9     No SVG `<text>` bounding box may fall outside the viewBox. Added
 *         after six rim labels shipped visibly clipped while the harness
 *         reported 9/9 — a real defect the DOM-only checks above had missed.
 *   10    Labels sharing a horizontal band need 6px of clearance; labels on
 *         different lines just need to not overlap. Added after ring labels
 *         were struck through by blip labels — again, a defect the earlier
 *         checks did not catch.
 *   11    No hover card may leave the viewBox with labels off. Added because
 *         this is a state no other check ever enters, and hover cards were
 *         never exercised by anything above. It also requires the card to
 *         paint after every blip: it used to sit inside its own blip's group,
 *         and any blip later in the array covered it.
 *   12    No two blip circles may overlap. `placeBlip` hashes each id
 *         independently, so two ids in the same ring-and-sector cell could
 *         land on top of each other; `placeBlips` nudges them apart. Note
 *         that at six phenomena across seven sectors this rarely fires — the
 *         load-bearing verification is the forced-collision run described in
 *         the Phase 4 plan, which packs twenty blips into one cell.
 *   13    Every `draft` phenomenon renders with the dashed outline. Drafts and
 *         published phenomena used to be identical blips, so a reviewer could
 *         not tell whether the claim they were commenting on was settled.
 *   14    Blip size follows `potentialImpact`, and every published blip has a
 *         rating. Size reads as importance whatever a legend says, so a wrong
 *         size is a wrong public claim.
 *   15    Older evidence is never drawn stronger than newer. Date-independent on
 *         purpose: every blip's age changes daily, so no fixed value can be
 *         asserted here.
 *   16    No blip covers a ring label. Added when sizing blips by impact put a
 *         transformative blip over FIELD-LEVEL SHIFT; check 10 compares text
 *         with text and never looks at blips.
 */
/* global document, MouseEvent -- this file runs in Node, but the callbacks
   passed to page.evaluate()/page.$eval() are serialised and executed inside
   the browser page, where `document` and `MouseEvent` are real globals. */
import puppeteer from "puppeteer";

const BASE = process.argv[2] || "http://localhost:5199/FoSW/";
const results = [];
const check = (name, pass, detail = "") =>
  results.push({ name, pass, detail });

// --no-sandbox in CI for the same reason prerender.mjs needs it: Chrome's
// sandbox does not come up in the Actions container.
const browser = await puppeteer.launch({
  headless: true,
  args: process.env.CI ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const getBlips = () =>
  page.evaluate(() => {
    const svg = document.querySelector('svg[aria-label^="Futures radar"]');
    if (!svg) return null;
    const cx = parseFloat(svg.viewBox.baseVal
      ? svg.viewBox.baseVal.width / 2
      : 280);
    const cy = cx;
    return [...svg.querySelectorAll('g[role="button"]')].map((g) => {
      const circle = g.querySelector("circle");
      const x = parseFloat(circle.getAttribute("cx"));
      const y = parseFloat(circle.getAttribute("cy"));
      return {
        label: g.getAttribute("aria-label"),
        x,
        y,
        dist: Math.hypot(x - cx, y - cy),
        opacity: g.getAttribute("opacity"),
        hasBolt: !!g.querySelector("path"),
        hasText: !!g.querySelector("text"),
      };
    });
  });

try {
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.waitForSelector('#futures-radar', { timeout: 15000 });

  // 1. Every phenomenon the page ought to show renders, and nothing else.
  //
  // Derived from the index the page itself fetched, never a literal: the corpus
  // grows, and a hardcoded count fails on the day someone publishes a
  // phenomenon — which reads as "the radar broke" rather than "the number in the
  // harness is stale".
  //
  // Which phenomena *ought* to show depends on context, and the harness cannot
  // read `isPreviewContext()` from outside the bundle: drafts render in dev and
  // in a preview build, and are hidden in production. So the expectation keys
  // off whether any draft rendered at all. Either none do (production) or all of
  // them do (dev/preview) — a partial set is itself the bug, and is caught here
  // rather than silently rounding to whichever total happens to match.
  let blips = await getBlips();
  const index = await fetch(new URL("content/phenomena/index.json", BASE)).then((r) => r.json());
  const inIndex = { published: 0, draft: 0 };
  for (const item of index.items) {
    if (item.status in inIndex) inIndex[item.status] += 1;
  }
  // Same marker check 15 relies on: the blip's accessible name ends with the status.
  const renderedDrafts = (blips || []).filter((b) => /draft$/i.test(b.label || "")).length;
  const showsDrafts = renderedDrafts > 0;
  const expected = inIndex.published + (showsDrafts ? inIndex.draft : 0);
  check(
    `every published${showsDrafts ? " and draft" : ""} phenomenon renders as a blip`,
    blips !== null && blips.length === expected && (!showsDrafts || renderedDrafts === inIndex.draft),
    blips === null
      ? "no radar on the page"
      : `got ${blips.length}, expected ${expected} ` +
        `(index: ${inIndex.published} published + ${inIndex.draft} draft; ` +
        `${showsDrafts ? `drafts shown, ${renderedDrafts} rendered` : "drafts hidden"})`,
  );

  // 2. Ring placement by distance from centre.
  const bandOf = (d) => (d <= 90 ? "field-level-shift" : d <= 165 ? "gaining-traction" : d <= 250 ? "early-manifestations" : "outside");
  const spend = blips.find((b) => b.label.startsWith("Justifying AI spend"));
  const evals = blips.find((b) => b.label.startsWith("Evals become the spec"));
  check(
    "Justifying AI spend is in the innermost ring",
    spend && bandOf(spend.dist) === "field-level-shift",
    spend ? `dist=${spend.dist.toFixed(1)} band=${bandOf(spend.dist)}` : "not found",
  );
  check(
    "Evals become the spec is at the rim",
    evals && bandOf(evals.dist) === "early-manifestations",
    evals ? `dist=${evals.dist.toFixed(1)} band=${bandOf(evals.dist)}` : "not found",
  );

  // 3. A bolt renders on exactly the phenomena marked contested.
  //
  //    Read from the content, not from a list of names. `contested` is a human
  //    judgment that moves — detaching off-construct counter-evidence took
  //    teams-get-smaller from contested to not — and a hardcoded pair turns an
  //    ordinary editorial decision into a harness failure.
  const contestedLabels = await Promise.all(
    index.items.map((item) =>
      fetch(new URL(`content/phenomena/${item.file}`, BASE))
        .then((r) => r.json())
        .then((p) => (p.contested ? p.label : null))
        .catch(() => null),
    ),
  ).then((labels) => labels.filter(Boolean));
  const boltMismatch = blips.filter((b) => {
    const shouldHaveBolt = contestedLabels.some((c) => b.label.startsWith(c));
    return shouldHaveBolt !== b.hasBolt;
  });
  check(
    `a bolt renders on exactly the ${contestedLabels.length} contested phenomena`,
    boltMismatch.length === 0,
    boltMismatch.map((b) => `${b.label}: hasBolt=${b.hasBolt}`).join("; ") ||
      `all match (${contestedLabels.join(", ") || "none contested"})`,
  );

  // 4. Clicking a blip opens the phenomenon drawer and updates the URL.
  const clickResult = await page.evaluate(() => {
    const g = document.querySelector('svg[aria-label^="Futures radar"] g[role="button"]');
    if (!g) return null;
    const label = g.getAttribute("aria-label");
    g.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return label;
  });
  await new Promise((r) => setTimeout(r, 700));
  const dialog = await page.$('[role="dialog"]').catch(() => null);
  const dialogLabel = dialog
    ? await page.$eval('[role="dialog"]', (el) => el.getAttribute("aria-label"))
    : null;
  check(
    "clicking a blip opens the phenomenon drawer",
    dialogLabel === "Phenomenon details",
    `clicked "${clickResult}", dialog label "${dialogLabel}"`,
  );
  // The expected prefix comes from the base this run was pointed at, not from a
  // literal: against the preview deployment the correct URL is
  // /FoSW/preview/phenomena/<id>/, and a hardcoded /FoSW/ would fail a radar
  // that is behaving perfectly.
  const basePath = new URL(BASE).pathname.replace(/\/$/, "");
  check(
    `URL becomes ${basePath}/phenomena/<id>/`,
    new RegExp(`${basePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/phenomena/[a-z0-9-]+/?$`).test(
      page.url(),
    ),
    page.url(),
  );

  // 5. Reload places every blip at identical coordinates.
  const before = blips.map((b) => ({ label: b.label, x: b.x, y: b.y }));
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.waitForSelector('#futures-radar', { timeout: 15000 });
  const after = await getBlips();
  let allSame = before.length === after.length;
  const diffs = [];
  for (const b of before) {
    const match = after.find((a) => a.label === b.label);
    if (!match || match.x !== b.x || match.y !== b.y) {
      allSame = false;
      diffs.push(`${b.label}: before=(${b.x},${b.y}) after=(${match ? match.x : "?"},${match ? match.y : "?"})`);
    }
  }
  check("reloading places every blip at identical coordinates", allSame, diffs.join("; ") || "all identical");

  // 6. Filtering by skills-knowledge-and-learning leaves undimmed exactly the
  //    phenomena with an implication in that dimension. Counted from the content,
  //    not a literal: publishing a phenomenon there is an ordinary editorial
  //    decision, and a hardcoded count turned it into a failed deploy.
  const expectedUndimmed = await Promise.all(
    index.items
      .filter((item) => item.status === "published" || showsDrafts)
      .map((item) =>
        fetch(new URL(`content/phenomena/${item.file}`, BASE))
          .then((r) => r.json())
          .then((p) => (p.implications ?? []).some((im) => im?.dimension === "skills-knowledge-and-learning")),
      ),
  ).then((hits) => hits.filter(Boolean).length);
  const legendClicked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button[aria-pressed]")];
    const btn = btns.find((b) => /skills, knowledge & learning/i.test(b.textContent || ""));
    if (!btn) return false;
    btn.click();
    return true;
  });
  await new Promise((r) => setTimeout(r, 300));
  const filtered = await getBlips();
  const undimmed = filtered.filter((b) => b.opacity !== "0.18");
  check(
    `filtering by skills-knowledge-and-learning leaves ${expectedUndimmed} blips undimmed`,
    legendClicked && undimmed.length === expectedUndimmed,
    `legendClicked=${legendClicked}, undimmed=${undimmed.length} [${undimmed.map((b) => b.label).join(", ")}]`,
  );

  // Unfilter for cleanliness.
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button[aria-pressed]")];
    const btn = btns.find((b) => /skills, knowledge & learning/i.test(b.textContent || ""));
    btn && btn.click();
  });
  await new Promise((r) => setTimeout(r, 300));

  // 7. No blip carries a standing label, and no toggle offers to add one.
  //    Ten phenomena across seven sectors could not be labelled in place: the
  //    labels collided with each other and struck through the ring labels while
  //    the blips themselves stayed cleanly separated. The name is on hover, on
  //    focus, and in the drawer. This check is the regression guard — a
  //    re-introduced label would quietly bring the crowding back with it.
  const labelledBlips = (await getBlips()).filter((b) => b.hasText).length;
  const toggleExists = await page.evaluate(() =>
    [...document.querySelectorAll("button[aria-pressed]")].some((b) =>
      /^Labels (on|off)$/.test((b.textContent || "").trim()),
    ),
  );
  check(
    "no blip renders a standing label, and no labels toggle exists",
    labelledBlips === 0 && !toggleExists,
    `${labelledBlips} labelled blip(s); labels toggle ${toggleExists ? "present" : "absent"}`,
  );

  // 8. Sanity check that the radar actually rendered, before trusting the two
  //    geometry checks below. Both of those iterate over every <text> element
  //    in the radar SVG and pass whenever no violation is found — including
  //    when there are zero <text> elements to check, e.g. a production build
  //    below the ten-published-phenomena threshold, where the radar renders
  //    nothing at all. Without this check, running the harness against such a
  //    build would silently report a false pass instead of catching that the
  //    radar never rendered. 7 sector labels + 3 ring labels render
  //    unconditionally whenever the radar exists, so 10 is a safe floor.
  const textCount = await page.evaluate(() => {
    const svg = document.querySelector('svg[aria-label^="Futures radar"]');
    return svg ? svg.querySelectorAll("text").length : 0;
  });
  check(
    "radar SVG contains a nonzero number of <text> elements",
    textCount >= 10,
    `got ${textCount} <text> elements`,
  );

  // 9. No <text> element's bounding box may extend outside the viewBox. With
  //    blip labels gone this measures the ring and sector titles, which is where
  //    the risk now sits: the sector titles are the longest strings on the
  //    canvas, they sit outside the outer ring, and they were enlarged once the
  //    blip labels stopped competing with them for that space.
  const clipped = await page.evaluate(() => {
    const svg = document.querySelector('svg[aria-label^="Futures radar"]');
    if (!svg) return { size: null, violations: [{ text: "(svg not found)" }] };
    const size = svg.viewBox.baseVal.width;
    const violations = [];
    for (const t of svg.querySelectorAll("text")) {
      const bb = t.getBBox();
      const ok = bb.x >= 0 && bb.x + bb.width <= size && bb.y >= 0 && bb.y + bb.height <= size;
      if (!ok) {
        violations.push({
          text: (t.textContent || "").trim(),
          x: bb.x,
          xEnd: bb.x + bb.width,
          y: bb.y,
          yEnd: bb.y + bb.height,
        });
      }
    }
    return { size, violations };
  });
  check(
    "no <text> element's bounding box extends outside the viewBox",
    clipped.violations.length === 0,
    clipped.violations.length === 0
      ? `size=${clipped.size}`
      : clipped.violations
          .map((v) => `"${v.text}" x=${v.x?.toFixed(1)}..${v.xEnd?.toFixed(1)} y=${v.y?.toFixed(1)}..${v.yEnd?.toFixed(1)}`)
          .join("; "),
  );
  // 10. Axis-aware crowding check. Two <text> boxes that overlap on the y-axis
  //    share a horizontal band and so read as one line if they sit too close
  //    side by side — those need real horizontal clearance. Two boxes on
  //    different lines (no y-overlap) just need to not intersect at all;
  //    tight leading between stacked lines is ordinary typography, not
  //    crowding, and requiring extra vertical clearance there would flag
  //    normal stacked labels (e.g. a blip label sitting one line above a ring
  //    label) as a defect they aren't. This still catches the original bug
  //    the plain overlap check was written for — a genuine intersection
  //    always has y-overlap too, so it always falls into the "same line"
  //    branch and is judged against the horizontal-clearance rule. Labels are
  //    on at this point (check 8 left them on), so blip labels, sector labels
  //    and ring labels are all present together, same as a real reader sees.
  const MIN_CLEAR_PX = 6;
  const overlaps = await page.evaluate((minClear) => {
    const svg = document.querySelector('svg[aria-label^="Futures radar"]');
    if (!svg) return [{ a: "(svg not found)", b: "", detail: "" }];
    const texts = [...svg.querySelectorAll("text")].map((t) => ({
      text: (t.textContent || "").trim(),
      bb: t.getBBox(),
    }));
    const violations = [];
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i].bb;
        const b = texts[j].bb;
        const yOverlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        if (yOverlap > 0) {
          // Same horizontal band: require real side-by-side clearance.
          const xGap = Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width);
          if (xGap < minClear) {
            violations.push({
              a: texts[i].text,
              b: texts[j].text,
              detail: `same line, horizontal gap=${Math.round(xGap * 10) / 10}px`,
            });
          }
        }
        // else: different lines. yOverlap <= 0 already rules out any
        // rectangle intersection (overlap requires both axes to overlap),
        // so no further check is needed — stacked lines pass by construction.
      }
    }
    return violations;
  }, MIN_CLEAR_PX);
  check(
    `text pairs on the same line have ${MIN_CLEAR_PX}px horizontal clearance; stacked lines just don't overlap`,
    overlaps.length === 0,
    overlaps.length === 0
      ? "no violations"
      : overlaps.map((o) => `"${o.a}" × "${o.b}" (${o.detail})`).join("; "),
  );
  // 11. Hover card must stay inside the viewBox for every blip, in both halves
  //     of the radar. It is now the only way a blip's name appears on the
  //     canvas, and its box is sized from the label, so a long name near the rim
  //     is exactly the case that would push it out. It must also paint above
  //     every blip, not only the ones before it in the array.
  const hoverViolations = [];
  const blipHandles = await page.$$('svg[aria-label^="Futures radar"] g[role="button"]');
  for (const handle of blipHandles) {
    const label = await page.evaluate((el) => el.getAttribute("aria-label"), handle);
    await handle.hover();
    await new Promise((r) => setTimeout(r, 150));
    const bad = await page.evaluate((el) => {
      const svg = el.closest("svg");
      const size = svg.viewBox.baseVal.width;
      // The card is drawn in its own layer after every blip, because SVG paints
      // in document order: a card inside its blip's group was hidden behind any
      // blip that came later. So it must exist, and nothing blip-shaped may
      // follow it.
      const card = svg.querySelector("[data-hover-card]");
      if (!card) return [{ tag: "card", text: "missing", x: 0, xEnd: 0, y: 0, yEnd: 0 }];
      const groups = svg.querySelectorAll("g[data-status]");
      const last = groups[groups.length - 1];
      if (last && !(last.compareDocumentPosition(card) & 4 /* DOCUMENT_POSITION_FOLLOWING */)) {
        return [{ tag: "card", text: "painted under a blip", x: 0, xEnd: 0, y: 0, yEnd: 0 }];
      }
      const nodes = [...card.querySelectorAll("rect"), ...card.querySelectorAll("text")];
      const out = [];
      for (const n of nodes) {
        const bb = n.getBBox();
        const ok = bb.x >= 0 && bb.x + bb.width <= size && bb.y >= 0 && bb.y + bb.height <= size;
        if (!ok) {
          out.push({
            tag: n.tagName,
            text: (n.textContent || "").trim(),
            x: bb.x,
            xEnd: bb.x + bb.width,
            y: bb.y,
            yEnd: bb.y + bb.height,
          });
        }
      }
      return out;
    }, handle);
    for (const b of bad) hoverViolations.push({ label, ...b });
  }
  check(
    "hover card for every blip paints on top and stays within the viewBox with labels off",
    hoverViolations.length === 0,
    hoverViolations.length === 0
      ? `no clipping across all ${blips.length} blips`
      : hoverViolations
          .map((v) => `${v.label}: ${v.tag} "${v.text}" x=${v.x.toFixed(1)}..${v.xEnd.toFixed(1)} y=${v.y.toFixed(1)}..${v.yEnd.toFixed(1)}`)
          .join("; "),
  );
  // 12. No two blips may overlap.
  const blipOverlaps = await page.evaluate(() => {
    const svg = document.querySelector('svg[aria-label^="Futures radar"]');
    const circles = [...svg.querySelectorAll("g[data-status] > circle[data-blip]")];
    const out = [];
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const a = circles[i];
        const b = circles[j];
        const ax = +a.getAttribute("cx");
        const ay = +a.getAttribute("cy");
        const ar = +a.getAttribute("r");
        const bx = +b.getAttribute("cx");
        const by = +b.getAttribute("cy");
        const br = +b.getAttribute("r");
        const d = Math.hypot(bx - ax, by - ay);
        if (d < ar + br) out.push(`pair ${i}/${j}: ${d.toFixed(1)} < ${(ar + br).toFixed(1)}`);
      }
    }
    return { count: circles.length, out };
  });
  check(
    "no two blips overlap",
    blipOverlaps.count > 0 && blipOverlaps.out.length === 0,
    blipOverlaps.out.length === 0
      ? `all pairs clear across ${blipOverlaps.count} blips`
      : blipOverlaps.out.join("; "),
  );

  // 13. Every draft phenomenon is drawn as a draft.
  const draftMarks = await page.evaluate(() => {
    const svg = document.querySelector('svg[aria-label^="Futures radar"]');
    const drafts = [...svg.querySelectorAll('g[data-status="draft"]')];
    return {
      count: drafts.length,
      unmarked: drafts.filter(
        (g) => g.querySelector("circle[data-blip]")?.getAttribute("stroke-dasharray") !== "3 2",
      ).length,
    };
  });
  check(
    "every draft blip carries the dashed draft mark",
    draftMarks.unmarked === 0,
    draftMarks.count === 0
      ? "no drafts on the radar, nothing to mark"
      : `${draftMarks.count} draft(s), ${draftMarks.unmarked} unmarked`,
  );

  // 14-15. Size and fade carry what the legend says they carry. Compared pair by
  //    pair from the content rather than against literals: ratings are an
  //    editorial judgment and every blip's age changes daily, so neither can be
  //    fixed here. Drafts are skipped because their faint fill is the draft mark.
  await page.mouse.move(0, 0); // a hovered blip is drawn at full strength
  await new Promise((r) => setTimeout(r, 150));
  const marks = await page.evaluate(() =>
    [...document.querySelectorAll('svg[aria-label^="Futures radar"] g[role="button"]')].map((g) => {
      const c = g.querySelector("circle[data-blip]");
      return {
        ariaLabel: g.getAttribute("aria-label"),
        status: g.getAttribute("data-status"),
        r: +c.getAttribute("r"),
        fade: +(c.getAttribute("fill-opacity") ?? 1),
      };
    }),
  );
  const content = await Promise.all(
    index.items.map((item) =>
      fetch(new URL(`content/phenomena/${item.file}`, BASE)).then((r) => r.json()),
    ),
  );
  const rated = marks
    .filter((m) => m.status === "published")
    .map((m) => ({ ...m, p: content.find((c) => m.ariaLabel.startsWith(c.label)) }));
  const IMPACT_ORDER = ["low", "moderate", "high", "transformative"];
  const rank = (m) => IMPACT_ORDER.indexOf(m.p?.potentialImpact);
  const age = (m) => -new Date(m.p?.latestEvidenceDate ?? 0).getTime();
  const sizeBad = [];
  const fadeBad = [];
  for (const a of rated) {
    for (const b of rated) {
      if (rank(a) > rank(b) && a.r <= b.r) sizeBad.push(`${a.p?.label} (r=${a.r}) vs ${b.p?.label} (r=${b.r})`);
      if (rank(a) === rank(b) && a.r !== b.r) sizeBad.push(`${a.p?.label} (r=${a.r}) vs ${b.p?.label} (r=${b.r})`);
      if (age(a) > age(b) && a.fade > b.fade) fadeBad.push(`${a.p?.label} (${a.fade}) vs ${b.p?.label} (${b.fade})`);
    }
  }
  const missing = rated.filter((m) => !m.p || rank(m) === -1).map((m) => m.ariaLabel);
  const distinctFades = new Set(rated.map((m) => m.fade)).size;
  const oldestDays = (Date.now() + Math.max(...rated.map(age))) / 86400000;
  check(
    "blip size follows potentialImpact",
    missing.length === 0 && sizeBad.length === 0 && new Set(rated.map((m) => m.r)).size > 1,
    missing.length ? `no rating: ${missing.join("; ")}` : sizeBad.slice(0, 3).join("; ") || "all pairs in order",
  );
  check(
    "older evidence is never drawn stronger than newer, and a blip past 92 days has faded",
    fadeBad.length === 0 && (oldestDays <= 92 || distinctFades > 1),
    fadeBad.slice(0, 3).join("; ") || `${distinctFades} fade level(s) in use`,
  );

  // 16. No blip covers a ring label. Blips paint over the labels, and the labels
  //     extend into the next band out, so a large blip beside 12 o'clock can land
  //     on one while staying inside its own cell.
  const labelCovers = await page.evaluate(() => {
    const svg = document.querySelector('svg[aria-label^="Futures radar"]');
    const labels = [...svg.querySelectorAll(":scope > g > rect")].map((r) => ({
      x: +r.getAttribute("x"),
      y: +r.getAttribute("y"),
      w: +r.getAttribute("width"),
      h: +r.getAttribute("height"),
      text: r.parentElement.textContent,
    }));
    const out = [];
    for (const g of svg.querySelectorAll('g[role="button"]')) {
      const c = g.querySelector("circle[data-blip]");
      const cx = +c.getAttribute("cx");
      const cy = +c.getAttribute("cy");
      const r = +c.getAttribute("r");
      for (const q of labels) {
        const nx = Math.max(q.x, Math.min(cx, q.x + q.w));
        const ny = Math.max(q.y, Math.min(cy, q.y + q.h));
        if (Math.hypot(cx - nx, cy - ny) < r) out.push(`${g.getAttribute("aria-label")} covers ${q.text}`);
      }
    }
    return { labels: labels.length, out };
  });
  check(
    "no blip covers a ring label",
    labelCovers.labels === 3 && labelCovers.out.length === 0,
    labelCovers.out.join("; ") || `clear of all ${labelCovers.labels} ring labels`,
  );
} catch (e) {
  check("harness ran without throwing", false, e.stack || e.message);
} finally {
  await browser.close();
}

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  [${r.detail}]` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed > 0 ? 1 : 0);
