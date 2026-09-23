// Release-build smoke check (REL-001): builds the production, minified
// Hermes bundles for iOS and Android exactly as EAS Build does before
// compiling native code, and fails if either is missing. Run from an app:
//   EXPO_PUBLIC_API_URL=https://api.example.com pnpm release:smoke
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
if (!apiUrl.startsWith("https://")) {
  console.error(
    JSON.stringify({
      event: "mobile_release_smoke_failed",
      reason: "EXPO_PUBLIC_API_URL must be an https URL for a release build",
    }),
  );
  process.exit(1);
}

const app = JSON.parse(readFileSync("app.json", "utf8")).expo;
const outputDir = mkdtempSync(join(tmpdir(), `${app.slug}-release-`));

try {
  execFileSync(
    "pnpm",
    ["exec", "expo", "export", "--platform", "ios", "--platform", "android", "--output-dir", outputDir],
    { stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } },
  );
  const metadata = JSON.parse(readFileSync(join(outputDir, "metadata.json"), "utf8"));
  const bundles = Object.fromEntries(
    ["ios", "android"].map((platform) => {
      const bundle = metadata.fileMetadata?.[platform]?.bundle;
      if (!bundle) throw new Error(`No ${platform} bundle was exported`);
      return [platform, statSync(join(outputDir, bundle)).size];
    }),
  );
  console.log(
    JSON.stringify({
      event: "mobile_release_smoke_passed",
      slug: app.slug,
      version: app.version,
      runtimeVersion: app.runtimeVersion,
      bundleBytes: bundles,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      event: "mobile_release_smoke_failed",
      slug: app.slug,
      reason: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
