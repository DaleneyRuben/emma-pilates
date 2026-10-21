// EXT-019: the public pages (apps/public-site, Cloudflare Pages, WEB-021)
// have no build, so nothing checked them before they published. This checks
// what a broken page would break: `_headers` is present and names the
// security headers, every page is a complete HTML document in Spanish with
// a title and a description, and every site-relative link, stylesheet, and
// image resolves to a file in the folder. Run from anywhere:
// node .github/scripts/check-public-site.mjs
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const site = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../apps/public-site",
);
const problems = [];

function pages(folder) {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) return pages(path);
    return name.endsWith(".html") ? [path] : [];
  });
}

function resolves(target) {
  const path = join(site, target);
  return (
    existsSync(path) &&
    (statSync(path).isFile() || existsSync(join(path, "index.html")))
  );
}

const headers = join(site, "_headers");
if (!existsSync(headers)) {
  problems.push("_headers is missing");
} else {
  const text = readFileSync(headers, "utf8");
  for (const header of [
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "Strict-Transport-Security",
  ]) {
    if (!text.includes(`${header}:`)) problems.push(`_headers lacks ${header}`);
  }
}

const found = pages(site);
if (found.length === 0) problems.push("no .html page found");

for (const page of found) {
  const name = relative(site, page);
  const html = readFileSync(page, "utf8");
  const checks = [
    [/^<!doctype html>/i, "does not start with <!doctype html>"],
    [/<html lang="es">/, 'is not <html lang="es">'],
    [/<meta charset="utf-8"/i, "has no utf-8 charset"],
    [/<meta name="viewport"/, "has no viewport meta"],
    [/<title>[^<]+<\/title>/, "has no title"],
    [/<meta\s+name="description"\s+content="[^"]+"/, "has no description"],
    [/<\/body>\s*<\/html>\s*$/, "does not end with </body></html>"],
  ];
  for (const [pattern, message] of checks) {
    if (!pattern.test(html)) problems.push(`${name} ${message}`);
  }
  for (const [, target] of html.matchAll(/\b(?:href|src)="(\/[^"#?]*)/g)) {
    if (!resolves(target))
      problems.push(`${name} links to ${target}, which does not exist`);
  }
}

if (problems.length > 0) {
  for (const problem of problems)
    console.error(`::error::public site: ${problem}`);
  process.exit(1);
}
console.log(`public site: ${found.length} pages and _headers checked`);
