import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

    // Root-relative links are resolved from the project root, while ordinary
    // relative links are resolved from the directory containing the HTML file.
    const cleanReference = reference.startsWith("/") ? reference.slice(1) : reference;
    const base = reference.startsWith("/")
      ? root
      : resolve(root, relativePath.startsWith("admin/") ? "admin" : ".");
    const target = resolve(base, cleanReference);

    if (!existsSync(target)) errors.push(`${relativePath}: missing referenced file ${reference}`);
  }
}

JSON.parse(readFileSync(resolve(root, "manifest.webmanifest"), "utf8"));

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Static build validation passed.");
