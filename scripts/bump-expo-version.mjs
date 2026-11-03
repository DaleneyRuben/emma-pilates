import { readFileSync, writeFileSync } from "node:fs";

import { releaseVersion } from "./expo-version.mjs";

// Prints the version it wrote. The bump is patch (the default), minor or major.
const [file, bump = "patch"] = process.argv.slice(2);
if (!file) {
  console.error("usage: bump-expo-version.mjs <app.json> [patch|minor|major]");
  process.exit(1);
}

const app = JSON.parse(readFileSync(file, "utf8"));
if (typeof app.expo?.version !== "string") {
  console.error(`${file} has no expo.version`);
  process.exit(1);
}
try {
  app.expo.version = releaseVersion(app.expo.version, bump);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
writeFileSync(file, `${JSON.stringify(app, null, 2)}\n`);
console.log(app.expo.version);
