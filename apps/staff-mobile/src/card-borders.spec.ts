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

// A QR code's frame and the time wheel's band are not cards.
const notCards = new Set(["band", "qrBox"]);

// FIX-089: a card is Crema with a 1 pt Arcilla border (surfaces.card), so a
// rounded Crema block never stands without its outline.
describe("Staff cards", () => {
  it("draw their Arcilla border", () => {
    const bare = sources(__dirname).flatMap((path) =>
      [...readFileSync(path, "utf8").matchAll(/(\w+): \{([^{}]*)\}/g)]
        .filter(
          ([, name, body]) =>
            !notCards.has(name) &&
            /backgroundColor: colors\.(card|surface|white)\b/.test(body) &&
            /borderRadius/.test(body) &&
            !/radii\.pill/.test(body) &&
            !/borderWidth/.test(body),
        )
        .map(([, name]) => `${path.slice(__dirname.length + 1)} ${name}`),
    );
    expect(bare).toEqual([]);
  });
});
