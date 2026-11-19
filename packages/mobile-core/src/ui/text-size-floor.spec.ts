// The package has no Node types; Jest runs the spec in Node all the same.
declare const __dirname: string;
type Entry = { isDirectory: () => boolean; name: string };
const { readdirSync, readFileSync } = jest.requireActual<{
  readdirSync: (path: string, options: { withFileTypes: true }) => Entry[];
  readFileSync: (path: string, encoding: "utf8") => string;
}>("fs");

const root = __dirname.slice(0, __dirname.lastIndexOf("/"));

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith(".tsx") && !entry.name.includes(".spec.") ? [path] : [];
  });
}

// FIX-090 (base audit B11, FIX-089's client scan): no text in the shared
// screens of either app is drawn under 12 pt.
describe("mobile-core text styles", () => {
  it("never write under 12 pt", () => {
    const small = sourceFiles(root).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return [...source.matchAll(/(\w+):\s*\{([^{}]*)\}/g)]
        .filter((match) => {
          const size = /fontSize:\s*(\d+)/.exec(match[2]!)?.[1];
          return (
            /typography\.tabLabel/.test(match[2]!) || (size !== undefined && Number(size) < 12)
          );
        })
        .map((match) => {
          const line = source.slice(0, match.index).split("\n").length;
          return `${file.slice(root.length + 1)}:${line} ${match[1]}`;
        });
    });

    expect(small).toEqual([]);
  });
});
