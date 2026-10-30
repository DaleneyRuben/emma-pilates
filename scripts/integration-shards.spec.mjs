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

test("every integration spec lands in exactly one place", () => {
  const files = specFiles(root);
  const places = new Map();
  const note = (file, place) => {
    const seen = places.get(file) ?? [];
    seen.push(place);
    places.set(file, seen);
  };
  for (let shard = 1; shard <= 6; shard += 1) {
    const regex = new RegExp(integrationShardPattern(files, shard));
    for (const file of files) {
      if (regex.test(file)) note(file, `shard ${shard}`);
    }
  }
  // The backup job's argument is the unanchored basename Jest receives.
  for (const file of files) {
    if (/s3-backup-store/.test(file)) note(file, "backup job");
  }
  const doubled = [...places.entries()].filter(([, seen]) => seen.length !== 1);
  const missing = files.filter((file) => !places.has(file));
  assert.deepEqual(
    doubled.map(([file, seen]) => `${file} → ${seen.join(", ")}`),
    [],
  );
  assert.deepEqual(missing, []);
});

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
  // The backup spec runs in its own job: no shard pattern may match it.
  const backup = files.find((file) => file.endsWith("/s3-backup-store.integration-spec.ts"));
  if (backup !== undefined) {
    for (let shard = 1; shard <= 6; shard += 1) {
      const regex = new RegExp(integrationShardPattern(files, shard));
      assert.equal(regex.test(backup), false, `shard ${shard} runs the backup spec`);
    }
  }
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
