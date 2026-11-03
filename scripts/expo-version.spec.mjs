import assert from "node:assert/strict";
import test from "node:test";

import { releaseVersion } from "./expo-version.mjs";

// ADR-0107 and the mobile-release skill: a native release picks patch
// (the default), minor or major, and the version follows semver.
test("patch is the default and raises the last number", () => {
  assert.equal(releaseVersion("1.0.2"), "1.0.3");
  assert.equal(releaseVersion("1.0.2", ""), "1.0.3");
  assert.equal(releaseVersion("1.9.9", "patch"), "1.9.10");
});

test("minor raises the middle number and resets the patch", () => {
  assert.equal(releaseVersion("1.0.3", "minor"), "1.1.0");
  assert.equal(releaseVersion("1.9.9", "minor"), "1.10.0");
});

test("major raises the first number and resets the others", () => {
  assert.equal(releaseVersion("1.4.2", "major"), "2.0.0");
});

test("refuses an unknown bump or a malformed current version", () => {
  assert.throws(() => releaseVersion("1.0.2", "1.1.0"), /patch, minor or major/);
  assert.throws(() => releaseVersion("1.0", "patch"), /x\.y\.z/);
});
