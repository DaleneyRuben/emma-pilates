import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { preProcessFile } from "typescript";

// Vercel compiles the routing middleware and each Function alone and keeps
// import paths as written, so a local import only fails once deployed
// (500 MIDDLEWARE_INVOCATION_FAILED). Without previews (ADR-0091) this check
// is what stops it before production.
const appRoot = join(__dirname, "..", "..");

const functionFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return functionFiles(path);
    }
    return entry.name.endsWith(".ts") ? [path] : [];
  });

const vercelFiles = [
  join(appRoot, "middleware.ts"),
  ...functionFiles(join(appRoot, "api")),
];

const localImports = (path: string): string[] =>
  preProcessFile(readFileSync(path, "utf8"), true, true)
    .importedFiles.map(({ fileName }) => fileName)
    .filter((specifier) => specifier.startsWith("."));

describe("Vercel-compiled files", () => {
  it("include the middleware and at least one Function", () => {
    expect(vercelFiles.map((path) => relative(appRoot, path))).toEqual(
      expect.arrayContaining(["middleware.ts", "api/monitoring/envelope.ts"]),
    );
  });

  it.each(vercelFiles.map((path) => [relative(appRoot, path), path]))(
    "%s imports nothing local",
    (_name, path) => {
      expect(localImports(path)).toEqual([]);
    },
  );
});
