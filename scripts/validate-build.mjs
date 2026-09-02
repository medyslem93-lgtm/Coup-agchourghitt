import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const htmlFiles = ["index.html", "admin/index.html", "admin/login.html"];
const errors = [];

for (const relativePath of htmlFiles) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  const ids = [...source.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) errors.push(`${relativePath}: duplicate ids: ${[...new Set(duplicates)].join(", ")}`);

  for (const match of source.matchAll(/(?:src|href)=["']([^"'#?]+)(?:\?[^"']*)?["']/g)) {
    const reference = match[1];
    if (/^(?:https?:|data:|mailto:)/.test(reference) || reference === "../" || reference === "./") continue;

    const target = reference.startsWith("/")
      ? resolve(root, reference.slice(1))
      : resolve(dirname(resolve(root, relativePath)), reference);

    if (!existsSync(target)) errors.push(`${relativePath}: missing referenced file ${reference}`);
  }
}

JSON.parse(readFileSync(resolve(root, "manifest.webmanifest"), "utf8"));

const adminHtml = readFileSync(resolve(root, "admin/index.html"), "utf8");
if (adminHtml.includes("link-access.js")) {
  errors.push("admin/index.html: legacy link-access must not override Supabase Auth");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Static build validation passed.");
