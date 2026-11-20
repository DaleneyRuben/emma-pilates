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
    return /\.tsx$/.test(entry.name) && !/\.spec\.tsx$/.test(entry.name) ? [path] : [];
  });
}

// A QR code's frame, the time wheel's band and the round white discs on the
// header band (the bell) are not cards.
const notCards = new Set(["band", "bell", "qrBox"]);

// Rosa Emma: a card is white with the soft rosa shadow (surfaces.card), so a
// rounded white block never stands without its shadow or an outline.
describe("Staff cards", () => {
  it("carry the card shadow or an outline", () => {
    const bare = sources(__dirname).flatMap((path) =>
      [...readFileSync(path, "utf8").matchAll(/(\w+): \{([^{}]*)\}/g)]
        .filter(
          ([, name, body]) =>
            !notCards.has(name) &&
            /backgroundColor: colors\.(card|surface|white)\b/.test(body) &&
            /borderRadius/.test(body) &&
            !/radii\.pill/.test(body) &&
            !/borderWidth|\.\.\.(surfaces|shadows)\./.test(body),
        )
        .map(([, name]) => `${path.slice(__dirname.length + 1)} ${name}`),
    );
    expect(bare).toEqual([]);
  });
});
