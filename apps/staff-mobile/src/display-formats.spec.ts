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

const filesMatching = (pattern: RegExp): string[] =>
  sources(__dirname)
    .filter((path) => pattern.test(readFileSync(path, "utf8")))
    .map((path) => path.slice(__dirname.length + 1));

// FIX-090 (owner 2026-11-19): money reads one way on every surface, «Bs 1.534,90»
// and «Bs 450», through `formatMoney` from @pilates/api-contracts.
describe("Staff display formats", () => {
  it("print money only through formatMoney", () => {
    expect(filesMatching(/formatBolivianos|formatExactBolivianos|exact-bolivianos/)).toEqual([]);
  });
});
