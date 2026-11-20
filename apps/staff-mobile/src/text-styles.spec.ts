// The app's TypeScript setup has no Node types, so the spec types the two
// file-system calls it needs; Jest runs on Node and provides both.
declare const __dirname: string;
const { readdirSync, readFileSync } = jest.requireActual<{
  readdirSync(
    path: string,
    options: { withFileTypes: true },
  ): { isDirectory(): boolean; name: string }[];
  readFileSync(path: string, encoding: "utf8"): string;
}>("fs");

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) && !/\.spec\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

// Every innermost `{ … }` that styles text, with the file it sits in.
function textStyles(): { block: string; file: string }[] {
  return sources(__dirname).flatMap((path) => {
    const file = path.slice(__dirname.length + 1);
    const blocks = readFileSync(path, "utf8").match(/\{[^{}]*\}/g) ?? [];
    return blocks
      .filter((block) => /\b(fontSize|fontWeight):/.test(block) && !block.includes("..."))
      .map((block) => ({ block: block.replace(/\s+/g, " "), file }));
  });
}

// FIX-089: text is always Work Sans or Lora, never the system font; a weight
// takes the family drawn at that weight (no faux bold); nothing under 12 pt.
describe("Staff text styles", () => {
  it("name a font family wherever they set a size or a weight", () => {
    const missing = textStyles().filter(({ block }) => !block.includes("fontFamily"));
    expect(missing).toEqual([]);
  });

  it("pair 600 and 700 with a SemiBold or Bold family and 500 with a Medium one", () => {
    const faux = textStyles().filter(({ block }) => {
      if (/fontWeight: "(600|700)"/.test(block)) {
        return !/(bodyStrong|bodyBold|headingStrong)/.test(block);
      }
      if (/fontWeight: "500"/.test(block)) return !/(bodyMedium|heading\b)/.test(block);
      return false;
    });
    expect(faux).toEqual([]);
  });

  it("never draw text under 12 pt", () => {
    const small = textStyles().filter(({ block }) =>
      /fontSize: (\d\b|1[01]\b|typography\.tabLabel)/.test(block),
    );
    expect(small).toEqual([]);
  });
});
