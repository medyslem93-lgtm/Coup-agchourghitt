import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");
const files = [
  "index.html",
  "styles.css",
  "public-app.js",
  "config.js",
  "manifest.webmanifest",
  "sw.js",
  "assets",
  "admin",
  "visitors",
  "referees-section.js",
  "referees-section.css",
  "middle-round-three-draw.js",
  "middle-round-three-draw.css",
  "team-background-live-v10.js",
  "team-calendar-v2.js",
  "team-calendar-v2.css",
  "road-to-cup.js",
  "road-to-cup.css",
  "road-to-cup-final-hotfix.js",
  "road-to-cup-opponent-hotfix.js",
  "motm-v5.js",
  "motm-v5.css",
  "team-of-week-v6.js",
  "team-of-week-v6.css",
  "goal-of-round-v7.js",
  "goal-of-round-v7.css",
  "standings-fairplay-v9.js",
  "standings-fairplay-v9.css",
  "team-cards-events-hotfix.js",
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(files.map((entry) => cp(resolve(root, entry), resolve(output, entry), { recursive: true })));
await cp(resolve(root, "admin/index.html"), resolve(output, "admin-dashboard.html"));
await mkdir(resolve(output, "vendor"), { recursive: true });
await cp(resolve(root, "node_modules/@supabase/supabase-js/dist/umd/supabase.js"),resolve(output, "vendor/supabase.js"));
console.log("Production bundle prepared in dist/ (including physical admin-dashboard.html).");