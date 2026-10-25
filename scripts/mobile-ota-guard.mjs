// Refuses a production OTA unless the preview dispatch of this same commit
// recorded a git note. mobile-publish-ota.yml writes that note after a
// successful preview publish and pushes refs/notes/commits.
import { execFileSync } from "node:child_process";

const [app, sha] = process.argv.slice(2);
if (!app || !sha) {
  console.error("usage: mobile-ota-guard.mjs <app> <sha>");
  process.exit(1);
}

let note = "";
try {
  note = execFileSync("git", ["notes", "show", sha], { encoding: "utf8" });
} catch {
  note = "";
}

const mark = `preview-ota:${app}:${sha}`;
if (!note.includes(mark)) {
  console.error(
    `No preview update of ${sha} is recorded for ${app}. Publish the preview channel of this commit first, then record '${mark}' before a production rollout (ADR-0039).`,
  );
  process.exit(1);
}
