import { readFileSync, writeFileSync } from "node:fs";

const [file, version] = process.argv.slice(2);
if (!file || !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version ?? "")) {
  console.error("usage: bump-expo-version.mjs <app.json> <x.y.z>");
  process.exit(1);
}

const app = JSON.parse(readFileSync(file, "utf8"));
if (typeof app.expo?.version !== "string") {
  console.error(`${file} has no expo.version`);
  process.exit(1);
}
app.expo.version = version;
writeFileSync(file, `${JSON.stringify(app, null, 2)}\n`);
