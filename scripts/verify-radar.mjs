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
 *   1-7   Structural/behavioural checks on blip count, ring placement,
 *         contested bolts, drawer open, URL, reload stability, filtering and
 *         the labels toggle — ordinary DOM assertions.
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
 *         never exercised by anything above.
 */
/* global document, MouseEvent -- this file runs in Node, but the callbacks
   passed to page.evaluate()/page.$eval() are serialised and executed inside
   the browser page, where `document` and `MouseEvent` are real globals. */
import puppeteer from "puppeteer";

const BASE = process.argv[2] || "http://localhost:5199/FoSW/";
const results = [];
const check = (name, pass, detail = "") =>
  results.push({ name, pass, detail });

const browser = await puppeteer.launch({ headless: true });
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

  // 1. Exactly 6 blips render.
  let blips = await getBlips();
  check("exactly 6 blips render", blips && blips.length === 6, `got ${blips ? blips.length : "null"}`);

  // 2. Ring placement by distance from centre.
  const bandOf = (d) => (d <= 90 ? "field-level-shift" : d <= 165 ? "gaining-traction" : d <= 250 ? "early-manifestations" : "outside");
  const spend = blips.find((b) => b.label.startsWith("Managing machine spend"));
  const evals = blips.find((b) => b.label.startsWith("Evals become the spec"));
  check(
    "Managing machine spend is in the innermost ring",
    spend && bandOf(spend.dist) === "field-level-shift",
    spend ? `dist=${spend.dist.toFixed(1)} band=${bandOf(spend.dist)}` : "not found",
  );
  check(
    "Evals become the spec is at the rim",
    evals && bandOf(evals.dist) === "early-manifestations",
    evals ? `dist=${evals.dist.toFixed(1)} band=${bandOf(evals.dist)}` : "not found",
  );

  // 3. Contested bolts: teams-get-smaller and the-vanishing-apprenticeship are
  //    contested; the other four are not.
  const contestedLabels = ["Teams get smaller", "The vanishing apprenticeship"];
  const boltMismatch = blips.filter((b) => {
    const shouldHaveBolt = contestedLabels.some((c) => b.label.startsWith(c));
    return shouldHaveBolt !== b.hasBolt;
  });
  check(
    "exactly the two contested phenomena render a bolt",
    boltMismatch.length === 0,
    boltMismatch.map((b) => `${b.label}: hasBolt=${b.hasBolt}`).join("; ") || "all match",
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
  check(
    "URL becomes /FoSW/phenomena/<id>/",
    /\/FoSW\/phenomena\/[a-z0-9-]+\/?$/.test(page.url()),
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

  // 6. Filtering by skills-knowledge-and-learning leaves 4 blips undimmed.
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
    "filtering by skills-knowledge-and-learning leaves 4 blips undimmed",
    legendClicked && undimmed.length === 4,
    `legendClicked=${legendClicked}, undimmed=${undimmed.length} [${undimmed.map((b) => b.label).join(", ")}]`,
  );

  // Unfilter for cleanliness.
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button[aria-pressed]")];
    const btn = btns.find((b) => /skills, knowledge & learning/i.test(b.textContent || ""));
    btn && btn.click();
  });
  await new Promise((r) => setTimeout(r, 300));

  // 7. Labels toggle changes whether label <text> elements are present.
  const labelsOnCount = (await getBlips()).filter((b) => b.hasText).length;
  const toggled = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button[aria-pressed]")].find((b) =>
      /^Labels (on|off)$/.test((b.textContent || "").trim()),
    );
    if (!btn) return null;
    const before = btn.textContent.trim();
    btn.click();
    return before;
  });
  await new Promise((r) => setTimeout(r, 300));
  const labelsOffCount = (await getBlips()).filter((b) => b.hasText).length;
  check(
    "labels toggle changes whether label <text> elements are present",
    toggled !== null && labelsOnCount !== labelsOffCount,
    `toggleBtn was "${toggled}", before=${labelsOnCount} after=${labelsOffCount}`,
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

  // 9. No <text> element's bounding box may extend outside the viewBox. Labels
  //    were on after the previous toggle click, so turn them back on to cover
  //    the blip-label case too, then measure every <text> in the radar SVG.
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button[aria-pressed]")].find((b) =>
      /^Labels (on|off)$/.test((b.textContent || "").trim()),
    );
    if (btn && btn.textContent.trim() === "Labels off") btn.click();
  });
  await new Promise((r) => setTimeout(r, 300));

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
  //     of the radar. Labels must be off — the hover card only renders when
  //     `isHovered && !showLabels`.
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button[aria-pressed]")].find((b) =>
      /^Labels (on|off)$/.test((b.textContent || "").trim()),
    );
    if (btn && btn.textContent.trim() === "Labels on") btn.click();
  });
  await new Promise((r) => setTimeout(r, 300));

  const hoverViolations = [];
  const blipHandles = await page.$$('svg[aria-label^="Futures radar"] g[role="button"]');
  for (const handle of blipHandles) {
    const label = await page.evaluate((el) => el.getAttribute("aria-label"), handle);
    await handle.hover();
    await new Promise((r) => setTimeout(r, 150));
    const bad = await page.evaluate((el) => {
      const svg = el.closest("svg");
      const size = svg.viewBox.baseVal.width;
      const nodes = [...el.querySelectorAll("rect"), ...el.querySelectorAll("text")];
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
    "hover card for every blip stays within the viewBox with labels off",
    hoverViolations.length === 0,
    hoverViolations.length === 0
      ? "no clipping across all 6 blips"
      : hoverViolations
          .map((v) => `${v.label}: ${v.tag} "${v.text}" x=${v.x.toFixed(1)}..${v.xEnd.toFixed(1)} y=${v.y.toFixed(1)}..${v.yEnd.toFixed(1)}`)
          .join("; "),
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
