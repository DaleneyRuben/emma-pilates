// The app has no Node types; Jest runs the spec in Node all the same.
declare const __dirname: string;
type Entry = { isDirectory: () => boolean; name: string };
const { readdirSync, readFileSync } = jest.requireActual<{
  readdirSync: (path: string, options: { withFileTypes: true }) => Entry[];
  readFileSync: (path: string, encoding: "utf8") => string;
}>("fs");

const root = __dirname;
const join = (directory: string, name: string) => `${directory}/${name}`;
const relative = (from: string, path: string) => path.slice(from.length + 1);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith(".tsx") && !entry.name.includes(".spec.") ? [path] : [];
  });
}

/** Each flat `name: { … }` style that sets a size or a weight. */
function textStyles(): { body: string; where: string }[] {
  return sourceFiles(root).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return [...source.matchAll(/(\w+):\s*\{([^{}]*)\}/g)]
      .filter((match) => /fontSize|fontWeight/.test(match[2]!))
      .map((match) => ({
        body: match[2]!,
        where: `${relative(root, file)}:${source.slice(0, match.index).split("\n").length} ${match[1]}`,
      }));
  });
}

// FIX-089 (palette B, audit §4): a style without a family falls back to the
// system font, and a weight on the regular family is faux bold on Android.
describe("Client text styles", () => {
  it("set a family on every style with a size or a weight", () => {
    const missing = textStyles()
      .filter(({ body }) => !/fontFamily/.test(body))
      .map(({ where }) => where);

    expect(missing).toEqual([]);
  });

  it("pair a weight with the family drawn in it", () => {
    const strong = /fontFamilies\.(bodyStrong|heading|headingStrong|display)\b/;
    const medium = /fontFamilies\.(bodyMedium|heading|headingStrong|display)\b/;
    const mismatched = textStyles()
      .filter(({ body }) => {
        const weight = /fontWeight:\s*"(\d+)"/.exec(body)?.[1];
        if (weight === "600" || weight === "700") return !strong.test(body);
        if (weight === "500") return !medium.test(body);
        return false;
      })
      .map(({ where }) => where);

    expect(mismatched).toEqual([]);
  });

  it("never write under 12 pt", () => {
    const small = textStyles()
      .filter(({ body }) => {
        const size = /fontSize:\s*(\d+)/.exec(body)?.[1];
        return /typography\.tabLabel/.test(body) || (size !== undefined && Number(size) < 12);
      })
      .map(({ where }) => where);

    expect(small).toEqual([]);
  });
});
