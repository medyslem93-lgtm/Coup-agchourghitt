import { existsSync } from "node:fs";
import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");
const files = [
  "index.html",
  "styles.css",
  "public-app.js",
  "scorers-showcase.js",
  "scorers-showcase.css",
  "fan-experience.js",
  "fan-experience.css",
  "fan-route-guard.js",
  "fan-account-v1.js",
  "tournament-experience.js",
  "tournament-experience.css",
  "site-directory.js",
  "site-directory.css",
  "app-structure-v2.js",
  "app-structure-v2.css",
  "watch-center-v2.js",
  "watch-match-overlay-v1.js",
  "watch-overlay-polish-v3.js",
  "match-media-score-fix.js",
  "match-media-ui-fix.js",
  "welcome-screen.js",
  "referee-system-v2.js",
  "live-stream.js",
  "livekit-viewer.js",
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
  "news-center.css",
  "news-center.js",
  "visit-tracker.js",
  "live-match-clock.js",
  "featured-final-hotfix.js",
  "team-background-live-v10.js",
  "team-calendar-v2.js",
  "team-calendar-v2.css",
  "road-to-cup.js",
  "road-to-cup.css",
  "road-to-cup-final-hotfix.js",
  "road-to-cup-opponent-hotfix.js",
  "team-of-week-v6.js",
  "team-of-week-v6.css",
  "goal-of-round-v7.js",
  "goal-of-round-v7.css",
  "standings-fairplay-v9.js",
  "standings-fairplay-v9.css",
  "team-cards-events-hotfix.js",
  "retired-dual-champions.js",
  "player-of-tournament.js",
  "player-of-tournament.css",
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(files.map((entry) => cp(resolve(root, entry), resolve(output, entry), { recursive: true })));

const publicIndexPath = resolve(output, "index.html");
let publicIndex = await readFile(publicIndexPath, "utf8");
publicIndex = publicIndex
  .replace(/<style>html\.agh-welcome-pending[\s\S]*?<\/style>\s*/i, "")
  .replace(/<script>try\{if\(localStorage\.getItem\('agh_welcome_2026_v1'\)[\s\S]*?<\/script>\s*/i, "")
  .replace(/<script src=["']welcome-screen\.js[^"']*["']><\/script>\s*/i, "")
  .replace(/<meta name=["']release["'] content=["'][^"']+["']>/i, '<meta name="release" content="fan-account-auth-v1">')
  .replace(/sw\.js\?v=[^"']+/g, "sw.js?v=20260919-app2")
  .replace(/player-of-tournament\.css\?v=[^"']+/g, "player-of-tournament.css?v=20260920-rank1")
  .replace(/player-of-tournament\.js\?v=[^"']+/g, "player-of-tournament.js?v=20260920-rank1")
  .replace(/fan-experience\.css\?v=[^"']+/g, "fan-experience.css?v=20260919-1")
  .replace(/fan-experience\.js\?v=[^"']+/g, "fan-experience.js?v=20260919-1")
  .replace(/fan-route-guard\.js\?v=[^"']+/g, "fan-route-guard.js?v=20260919-1")
  .replace(/fan-account-v1\.js\?v=[^"']+/g, "fan-account-v1.js?v=20260920-1")
  .replace(/tournament-experience\.css\?v=[^"']+/g, "tournament-experience.css?v=20260919-2")
  .replace(/tournament-experience\.js\?v=[^"']+/g, "tournament-experience.js?v=20260919-2")
  .replace(/site-directory\.css\?v=[^"']+/g, "site-directory.css?v=20260919-1")
  .replace(/site-directory\.js\?v=[^"']+/g, "site-directory.js?v=20260919-1")
  .replace(/app-structure-v2\.css\?v=[^"']+/g, "app-structure-v2.css?v=20260919-1")
  .replace(/app-structure-v2\.js\?v=[^"']+/g, "app-structure-v2.js?v=20260919-1")
  .replace(/watch-center-v2\.js\?v=[^"']+/g, "watch-center-v2.js?v=20260920-1")
  .replace(/watch-match-overlay-v1\.js\?v=[^"']+/g, "watch-match-overlay-v1.js?v=20260920-2")
  .replace(/watch-overlay-polish-v3\.js\?v=[^"']+/g, "watch-overlay-polish-v3.js?v=20260920-1");
if (!publicIndex.includes("breaking-news-live.js")) {
  publicIndex = publicIndex.replace("</body>", '<script src="breaking-news-live.js?v=20260910-1"></script></body>');
}
if (!publicIndex.includes("player-of-tournament.css")) {
  publicIndex = publicIndex.replace("</head>", '<link rel="stylesheet" href="player-of-tournament.css?v=20260920-rank1"></head>');
}
if (!publicIndex.includes("player-of-tournament.js")) {
  publicIndex = publicIndex.replace("</body>", '<script src="player-of-tournament.js?v=20260920-rank1"></script></body>');
}
if (!publicIndex.includes("fan-account-v1.js")) {
  publicIndex = publicIndex.replace("</body>", '<script src="fan-account-v1.js?v=20260920-1"></script></body>');
}
if (!publicIndex.includes("watch-match-overlay-v1.js")) {
  publicIndex = publicIndex.replace("</body>", '<script src="watch-match-overlay-v1.js?v=20260920-2"></script></body>');
}
if (!publicIndex.includes("watch-overlay-polish-v3.js")) {
  publicIndex = publicIndex.replace("</body>", '<script src="watch-overlay-polish-v3.js?v=20260920-1"></script></body>');
}
await writeFile(publicIndexPath, publicIndex);

const adminIndexPath = resolve(output, "admin/index.html");
let adminIndex = await readFile(adminIndexPath, "utf8");
if (!adminIndex.includes("breaking-news-admin.js")) {
  adminIndex = adminIndex.replace("</body>", '<script src="/admin/breaking-news-admin.js?v=20260910-1"></script></body>');
}
if (!adminIndex.includes("retired-category.js")) {
  adminIndex = adminIndex.replace("</body>", '<script src="/admin/retired-category.js?v=20260918-1"></script></body>');
}
if (!adminIndex.includes("visitors-panel.js")) {
  adminIndex = adminIndex.replace("</body>", '<script src="/admin/visitors-panel.js?v=20260919-1"></script></body>');
}
if (!adminIndex.includes("player-of-tournament-admin.css")) {
  adminIndex = adminIndex.replace("</head>", '<link rel="stylesheet" href="/admin/player-of-tournament-admin.css?v=20260919-2"></head>');
}
if (!adminIndex.includes("player-of-tournament-admin.js")) {
  adminIndex = adminIndex.replace("</body>", '<script src="/admin/player-of-tournament-admin.js?v=20260919-2"></script></body>');
}
await writeFile(adminIndexPath, adminIndex);

await mkdir(resolve(output, "vendor"), { recursive: true });
await cp(resolve(root, "node_modules/@supabase/supabase-js/dist/umd/supabase.js"),resolve(output, "vendor/supabase.js"));
await cp(resolve(root, "node_modules/tus-js-client/dist/tus.min.js"),resolve(output, "vendor/tus.js"));

const deployedHtmlFiles = ["index.html", "admin/index.html", "admin/login.html", "visitors/index.html"];
const missingReferences = [];
for (const relativePath of deployedHtmlFiles) {
  const source = await readFile(resolve(output, relativePath), "utf8");
  for (const match of source.matchAll(/(?:src|href)=["']([^"'#?]+)(?:\?[^"']*)?["']/g)) {
    const reference = match[1];
    if (/^(?:https?:|data:|mailto:)/.test(reference) || reference === "../" || reference === "./") continue;
    const target = reference.startsWith("/")
      ? resolve(output, reference.slice(1))
      : resolve(dirname(resolve(output, relativePath)), reference);
    if (!existsSync(target)) missingReferences.push(`${relativePath}: ${reference}`);
  }
}

if (missingReferences.length) {
  throw new Error(`Production bundle has missing assets:\n${missingReferences.join("\n")}`);
}
console.log("Production bundle prepared in dist/ (admin available only under /admin).");
