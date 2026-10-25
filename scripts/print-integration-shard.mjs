import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { integrationShardPattern } from "./integration-shards.mjs";

const shard = Number(process.argv[2]);
if (!Number.isInteger(shard) || shard < 1 || shard > 6) {
  throw new Error("pass a shard from 1 to 6");
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../apps/backend");

function specFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) return specFiles(full);
    return entry.endsWith(".integration-spec.ts")
      ? [path.relative(root, full).split(path.sep).join("/")]
      : [];
  });
}

process.stdout.write(integrationShardPattern(specFiles(root), shard));
