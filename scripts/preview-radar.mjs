#!/usr/bin/env node
/**
 * One command to look at the radar as the preview deployment will serve it:
 * build with drafts on, serve the result, run the radar checks, and stay up so
 * a person can actually look at it.
 *
 * Usage:
 *   npm run preview:radar              build, serve, verify, stay up
 *   npm run preview:radar -- --no-build    serve an existing dist/
 *   npm run preview:radar -- --no-verify   skip the harness
 *   npm run preview:radar -- --port 4200
 *
 * Why this exists rather than a documented sequence of three commands: on
 * Windows the sequence is where people lose an afternoon. `--base=/FoSW/preview/`
 * is rewritten by MSYS in Git Bash, and on the *build* that failure is silent —
 * exit 0, wrong base, assets 404 at runtime. PowerShell avoids MSYS but a
 * locked-down execution policy blocks npm's .ps1 shim on some machines here.
 *
 * Node spawns the build through the platform's own shell, and serves over its
 * own HTTP server rather than `vite preview --base`, so neither trap is
 * reachable: there is no `--base` argument for MSYS to rewrite, and no
 * PowerShell in the path. The base is read back off the built bundle.
 */
import { spawn, spawnSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { detectBase } from "./lib/prerender-base.mjs";
import { startStaticServer, LOOPBACK } from "./lib/static-server.mjs";

const DIST_DIR = resolve("dist");

const USAGE = `
Look at the radar as the preview deployment will serve it.

  npm run preview:radar              build with drafts on, serve, verify, stay up
  preview.bat                        the same thing on Windows, double-clickable

Options
  --no-build     serve the existing dist/ instead of rebuilding
  --no-verify    skip the 15 radar checks
  --port N       port to serve on (default 4180)
  --help         this text

Drafts are visible here and in \`npm run dev\`, and nowhere else. You do not need
to accept a phenomenon to look at it.

The server stays up until Ctrl+C. A failing check does not stop it — the point is
to look at what failed.
`;

function flag(name) {
  return process.argv.includes(name);
}

if (flag("--help") || flag("-h")) {
  console.log(USAGE.trim());
  process.exit(0);
}

function value(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  if (!v || v.startsWith("--")) {
    console.error(`preview:radar: ${name} needs a value`);
    process.exit(1);
  }
  return v;
}

// Deliberately not 4173: that is prerender.mjs's port, and leaving this server
// up must never be able to disturb a later `npm run build`. Binding 127.0.0.1
// (see static-server.mjs) is what makes a genuine clash loud rather than silent;
// a separate port is just good manners on top of it.
const port = Number(value("--port", "4180"));
if (!Number.isFinite(port) || port <= 0) {
  console.error("preview:radar: --port must be a positive number");
  process.exit(1);
}

// npm is a .cmd on Windows, which Node refuses to spawn without a shell. Going
// through the platform shell is also what keeps MSYS out of the argument list.
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

if (!flag("--no-build")) {
  console.log("preview:radar: building with drafts on…\n");
  const build = spawnSync(npm, ["run", "build:preview"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, VITE_RADAR_PREVIEW: "1" },
  });
  if (build.status !== 0) {
    console.error("\npreview:radar: build failed — nothing to serve");
    process.exit(build.status ?? 1);
  }
}

if (!existsSync(join(DIST_DIR, "index.html"))) {
  console.error(
    "preview:radar: dist/index.html is missing. Drop --no-build, or run the build first.",
  );
  process.exit(1);
}

const route = detectBase(readFileSync(join(DIST_DIR, "index.html"), "utf-8"));

// The whole point of this command is the preview build. A production bundle
// has no drafts in it and, below the ten-phenomenon gate, no radar to look at.
if (!route.includes("/preview/")) {
  console.error(
    `preview:radar: dist/ was built with base '${route}', which is a production build.\n` +
      "  Its radar is hidden below the ten-phenomenon launch gate and it carries no drafts.\n" +
      "  Rebuild without --no-build, or run: npm run build:preview",
  );
  process.exit(1);
}

let server;
try {
  server = await startStaticServer({ distDir: DIST_DIR, route, port });
} catch (err) {
  const hint =
    err.code === "EADDRINUSE"
      ? `port ${port} is already in use — pass --port <n> for another`
      : err.message;
  console.error(`preview:radar: could not start the server: ${hint}`);
  process.exit(1);
}

const url = `http://${LOOPBACK}:${port}${route}`;
console.log(`\npreview:radar: serving ${DIST_DIR} at\n\n    ${url}\n`);

let failed = false;
if (!flag("--no-verify")) {
  // spawn, never spawnSync: the server lives in THIS process, and spawnSync
  // blocks this event loop until the child exits. The harness would then wait on
  // a server that cannot answer until the harness exits — a deadlock that
  // surfaces as a navigation timeout against a URL curl can fetch perfectly well
  // once this process is idle again.
  const status = await new Promise((resolveExit) => {
    const child = spawn(process.execPath, ["scripts/verify-radar.mjs", url], {
      stdio: "inherit",
    });
    child.on("error", () => resolveExit(1));
    child.on("close", (code) => resolveExit(code ?? 1));
  });
  failed = status !== 0;
  console.log("");
}

console.log(
  `preview:radar: still serving ${url}\n` +
    "  Open it in a browser. Drafts are visible here and only here.\n" +
    "  Press Ctrl+C to stop.",
);
if (failed) {
  // Not fatal: the server stays up precisely so a failure can be looked at.
  console.log("\n  ! the radar checks reported failures above.");
}

const stop = () => {
  server.close();
  process.exit(failed ? 1 : 0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
