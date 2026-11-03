import assert from "node:assert/strict";
import test from "node:test";

import { releaseVersion } from "./expo-version.mjs";

// ADR-0107: a blank version releases the next patch of the current one.
test("a blank version is the next patch", () => {
  assert.equal(releaseVersion("1.0.2", ""), "1.0.3");
  assert.equal(releaseVersion("1.9.9", "  "), "1.9.10");
});

test("a typed version wins when it is later than the current one", () => {
  assert.equal(releaseVersion("1.0.2", "1.1.0"), "1.1.0");
  assert.equal(releaseVersion("1.0.2", "2.0.0"), "2.0.0");
});

test("refuses a malformed, equal or earlier version", () => {
  assert.throws(() => releaseVersion("1.0.2", "1.0"), /x\.y\.z/);
  assert.throws(() => releaseVersion("1.0.2", "1.0.2"), /later than 1\.0\.2/);
  assert.throws(() => releaseVersion("1.0.2", "1.0.1"), /later than 1\.0\.2/);
  assert.throws(() => releaseVersion("1.0", ""), /x\.y\.z/);
});
