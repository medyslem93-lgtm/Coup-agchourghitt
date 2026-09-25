import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const htmlFiles = ["index.html", "admin/index.html", "admin/login.html", "visitors/index.html"];
const generatedReferences = new Set(["vendor/supabase.js", "../vendor/supabase.js"]);
const errors = [];

for (const relativePath of htmlFiles) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  const ids = [...source.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) errors.push(`${relativePath}: duplicate ids: ${[...new Set(duplicates)].join(", ")}`);

  for (const match of source.matchAll(/(?:src|href)=["']([^"'#?]+)(?:\?[^"']*)?["']/g)) {
    const reference = match[1];
    if (/^(?:https?:|data:|mailto:)/.test(reference) || reference === "../" || reference === "./") continue;
    if (generatedReferences.has(reference)) continue;

    const target = reference.startsWith("/")
      ? resolve(root, reference.slice(1))
      : resolve(dirname(resolve(root, relativePath)), reference);

    if (!existsSync(target)) errors.push(`${relativePath}: missing referenced file ${reference}`);
  }
}

JSON.parse(readFileSync(resolve(root, "manifest.webmanifest"), "utf8"));

const publicIndex = readFileSync(resolve(root, "index.html"), "utf8");
const componentBundles = [
  ["referees-section.js", "referees-section.css"],
  ["team-calendar-v2.js", "team-calendar-v2.css"],
  ["road-to-cup.js", "road-to-cup.css"],
  ["motm-v5.js", "motm-v5.css"],
  ["team-of-week-v6.js", "team-of-week-v6.css"],
  ["goal-of-round-v7.js", "goal-of-round-v7.css"],
  ["standings-fairplay-v9.js", "standings-fairplay-v9.css"],
];
for (const [script, stylesheet] of componentBundles) {
  if (publicIndex.includes(script) && !publicIndex.includes(stylesheet)) {
    errors.push(`index.html: ${script} is loaded without its stylesheet ${stylesheet}`);
  }
}

const publicApp = readFileSync(resolve(root, "public-app.js"), "utf8");
const publicStyles = readFileSync(resolve(root, "styles.css"), "utf8");
if (!publicApp.includes("function patchLiveEvent") || !publicApp.includes("showBroadcastEvent(incoming)")) {
  errors.push("public-app.js: live match events are not connected to the broadcast overlay");
}
const liveStateApi = readFileSync(resolve(root, "api/live-match-state.js"), "utf8");
if (!publicApp.includes("/api/live-match-state") || !publicApp.includes("patchLiveEvent({ eventType: 'INSERT'") || !liveStateApi.includes("match_events?select=*")) {
  errors.push("Live match events are not connected to the shared live feed");
}
if (!publicStyles.includes(".broadcast-event-layer") || !publicStyles.includes(".broadcast-event-card")) {
  errors.push("styles.css: cinematic broadcast event styles are missing");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Static build validation passed.");
