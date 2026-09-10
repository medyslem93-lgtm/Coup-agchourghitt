import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
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
  "breaking-news-live.js",
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

// The public ticker is database-driven. Keep the existing HTML as an immediate fallback,
// then let this module replace it from site_settings and listen for Realtime updates.
const publicIndexPath = resolve(output, "index.html");
let publicIndex = await readFile(publicIndexPath, "utf8");
if (!publicIndex.includes("breaking-news-live.js")) {
  publicIndex = publicIndex.replace("</body>", '<script src="breaking-news-live.js?v=20260910-1"></script></body>');
  await writeFile(publicIndexPath, publicIndex);
}

// Expose the breaking-news editor inside the existing Settings section of the admin.
const adminIndexPath = resolve(output, "admin/index.html");
let adminIndex = await readFile(adminIndexPath, "utf8");
if (!adminIndex.includes("breaking-news-admin.js")) {
  adminIndex = adminIndex.replace("</body>", '<script src="/admin/breaking-news-admin.js?v=20260910-1"></script></body>');
  await writeFile(adminIndexPath, adminIndex);
}

await cp(adminIndexPath, resolve(output, "admin-dashboard.html"));
await mkdir(resolve(output, "vendor"), { recursive: true });
await cp(resolve(root, "node_modules/@supabase/supabase-js/dist/umd/supabase.js"),resolve(output, "vendor/supabase.js"));
console.log("Production bundle prepared in dist/ (including admin-managed breaking news).");