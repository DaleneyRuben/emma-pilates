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

function basenameFromPiece(piece) {
  const match = /\(\^\|\/\)(.+)\$$/.exec(piece);
  assert.ok(match, `shard piece is not an anchored basename: ${piece}`);
  return match[1].replace(/\\([.^$*+?()[\]{}|\\])/g, "$1");
}

test("the six integration shards cover every spec once, except the backup job", () => {
  const files = specFiles(root);
  const seen = new Map();
  for (let shard = 1; shard <= 6; shard += 1) {
    const pattern = integrationShardPattern(files, shard);
    assert.ok(pattern.length > 0, `shard ${shard} is empty`);
    for (const piece of pattern.split("|")) {
      const name = basenameFromPiece(piece);
      assert.equal(seen.has(name), false, `${name} is in two shards`);
      seen.set(name, shard);
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
  let shortPattern = null;
  for (let shard = 1; shard <= 6; shard += 1) {
    const pattern = integrationShardPattern(files, shard);
    if (pattern.includes(shortName.replace(/\./g, "\\."))) {
      shortPattern = pattern;
      break;
    }
  }
  assert.ok(shortPattern, "short promotions-consent file must land in a shard");
  const regex = new RegExp(shortPattern);
  assert.equal(regex.test(`test/${shortName}`), true);
  assert.equal(regex.test(`test/${longName}`), false);
});
