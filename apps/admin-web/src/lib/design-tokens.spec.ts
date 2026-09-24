import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const sourceRoot = join(__dirname, "..");

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      return entry === "test" ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry) && !/\.spec\.tsx?$/.test(entry) ? [path] : [];
  });

const offending = (pattern: RegExp): string[] =>
  sourceFiles(sourceRoot)
    .filter((path) => pattern.test(readFileSync(path, "utf8")))
    .map((path) => path.slice(sourceRoot.length + 1));

// The design system's scale is closed like its palette: radii are control,
// panel, tarjeta, marco, or full, and text sizes come from index.css. A
// pixel size the scale lacks is a design follow-up, not a bracket class.
describe("design tokens in the source", () => {
  it("draws every corner with a radius token", () => {
    expect(offending(/\brounded-(?:sm|md|lg|xl)\b/)).toEqual([]);
  });

  it("sets every text size the scale already has through its token", () => {
    expect(offending(/\btext-\[(?:17|14|12|11\.5)px\]/)).toEqual([]);
  });

  it("builds every class list through cn(), never a template literal", () => {
    expect(offending(/className=\{`/)).toEqual([]);
  });
});
