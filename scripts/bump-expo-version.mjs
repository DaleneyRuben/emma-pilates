import { readFileSync, writeFileSync } from "node:fs";

import { releaseVersion } from "./expo-version.mjs";

// Prints the version it wrote. A blank or missing version is the next patch.
const [file, requested = ""] = process.argv.slice(2);
if (!file) {
  console.error("usage: bump-expo-version.mjs <app.json> [x.y.z]");
  process.exit(1);
}

const app = JSON.parse(readFileSync(file, "utf8"));
if (typeof app.expo?.version !== "string") {
  console.error(`${file} has no expo.version`);
  process.exit(1);
}
try {
  app.expo.version = releaseVersion(app.expo.version, requested);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
writeFileSync(file, `${JSON.stringify(app, null, 2)}\n`);
console.log(app.expo.version);
