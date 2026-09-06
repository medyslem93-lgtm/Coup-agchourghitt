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
  "referees-section.js",
  "referees-section.css",
  "team-calendar-v2.js",
  "team-calendar-v2.css",
  "road-to-cup.js",
  "road-to-cup.css",
  "road-to-cup-final-hotfix.js",
  "motm-v5.js",
  "motm-v5.css",
  "team-of-week-v6.js",
  "team-of-week-v6.css",
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(files.map((entry) => cp(resolve(root, entry), resolve(output, entry), { recursive: true })));
console.log("Production bundle prepared in dist/.");
