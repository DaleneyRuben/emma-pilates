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

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.spec\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

// MOB-038: `Screen` paints Superficie, as every mobile frame does, so a card
// filled with it would vanish into the screen; the frames draw cards on Blanco.
describe("screen surfaces", () => {
  it("never fills a card or panel with the screen's own Superficie", () => {
    const offenders = sourceFiles(__dirname)
      .filter((path) => /backgroundColor: colors\.surface\b/.test(readFileSync(path, "utf8")))
      .map((path) => path.slice(__dirname.length + 1));

    expect(offenders).toEqual([]);
  });
});

// MOB-039: the frames draw every card the same way (Blanco, 1 px Borde fuerte,
// radius 16), so a card comes from mobile-core's `surfaces`, never from a
// screen's own white box.
describe("card surfaces", () => {
  it("draws every white card through the shared card surface", () => {
    const offenders = sourceFiles(__dirname).filter((path) =>
      readFileSync(path, "utf8")
        .split("\n  },")
        .some(
          (block) =>
            /backgroundColor: colors\.white\b/.test(block) &&
            /borderRadius: radii\.card\b/.test(block),
        ),
    );

    expect(offenders.map((path) => path.slice(__dirname.length + 1))).toEqual([]);
  });
});
