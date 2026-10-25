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

test("the six integration shards cover every spec once, except the backup job", () => {
  const files = specFiles(root);
  const seen = new Map();
  for (let shard = 1; shard <= 6; shard += 1) {
    const pattern = integrationShardPattern(files, shard);
    assert.ok(pattern.length > 0, `shard ${shard} is empty`);
    for (const name of pattern.split("|")) {
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
