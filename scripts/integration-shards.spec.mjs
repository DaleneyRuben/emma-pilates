import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { integrationShardPattern } from "./integration-shards.mjs";

const root = path.resolve(import.meta.dirname, "../apps/backend");

function specFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) return specFiles(full);
    return entry.endsWith(".integration-spec.ts")
      ? [path.relative(root, full).split(path.sep).join("/")]
      : [];
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("the six integration shards cover every spec once, except the backup job", () => {
  const files = specFiles(root);
  const seen = new Map();
  for (let shard = 1; shard <= 6; shard += 1) {
    const pattern = integrationShardPattern(files, shard);
    assert.ok(pattern.length > 0, `shard ${shard} is empty`);
    const regex = new RegExp(pattern);
    for (const file of files) {
      const base = file.split("/").pop();
      if (base === "s3-backup-store.integration-spec.ts") continue;
      if (!regex.test(file)) continue;
      assert.equal(seen.has(base), false, `${base} is in two shards`);
      seen.set(base, shard);
    }
  }
  const missing = files
    .map((file) => file.split("/").pop())
    .filter((name) => name !== "s3-backup-store.integration-spec.ts" && !seen.has(name));
  assert.deepEqual(missing, []);
  assert.equal(seen.has("s3-backup-store.integration-spec.ts"), false);
});

test("a longer basename does not match another file's anchored shard pattern", () => {
  const shortName = "promotions-consent.integration-spec.ts";
  const longName = "account-closure-promotions-consent.integration-spec.ts";
  const shortPiece = `(^|/)${escapeRegExp(shortName)}$`;
  // The unanchored basename is a suffix of the longer name, so a bare pattern
  // would pull the longer file into the shorter file's shard.
  assert.equal(new RegExp(escapeRegExp(shortName)).test(longName), true);
  assert.equal(new RegExp(shortPiece).test(`test/${shortName}`), true);
  assert.equal(new RegExp(shortPiece).test(`test/${longName}`), false);

  const files = [
    `test/${shortName}`,
    `test/${longName}`,
    "test/alpha.integration-spec.ts",
    "test/bravo.integration-spec.ts",
    "test/charlie.integration-spec.ts",
    "test/delta.integration-spec.ts",
    "test/echo.integration-spec.ts",
    "test/foxtrot.integration-spec.ts",
  ];
  let matchedShort = false;
  for (let shard = 1; shard <= 6; shard += 1) {
    const pattern = integrationShardPattern(files, shard);
    const regex = new RegExp(pattern);
    if (!regex.test(`test/${shortName}`)) continue;
    matchedShort = true;
    // The short file's shard may also list the long file; the short piece alone
    // must still refuse the long path (proven above). The combined pattern must
    // include the anchored short piece so Jest cannot treat it as a substring.
    assert.equal(pattern.includes(shortPiece), true);
  }
  assert.equal(matchedShort, true);
});
