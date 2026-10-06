import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
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
      .map((path) => relative(__dirname, path));

    expect(offenders).toEqual([]);
  });
});
