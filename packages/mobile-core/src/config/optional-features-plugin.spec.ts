import type { AndroidManifest } from "expo/config-plugins";

import withOptionalAndroidFeatures, {
  addOptionalFeatures,
  optionalFeatures,
} from "./optional-features-plugin";

function featuresOf(manifest: AndroidManifest) {
  return manifest.manifest["uses-feature"] ?? [];
}

const generatedManifest = (): AndroidManifest => ({
  manifest: {
    $: { "xmlns:android": "http://schemas.android.com/apk/res/android" },
    "uses-permission": [{ $: { "android:name": "android.permission.INTERNET" } }],
    queries: [],
  },
});

describe("addOptionalFeatures", () => {
  it("covers the portrait lock and the Wi-Fi state permission Play implies features from", () => {
    expect(optionalFeatures).toEqual(["android.hardware.screen.portrait", "android.hardware.wifi"]);
  });

  it("declares each implied feature as not required", () => {
    const patched = addOptionalFeatures(generatedManifest());

    expect(featuresOf(patched)).toEqual([
      { $: { "android:name": "android.hardware.screen.portrait", "android:required": "false" } },
      { $: { "android:name": "android.hardware.wifi", "android:required": "false" } },
    ]);
  });

  it("marks an existing required declaration of the same feature as not required", () => {
    const manifest = generatedManifest();
    manifest.manifest["uses-feature"] = [
      { $: { "android:name": "android.hardware.wifi", "android:required": "true" } },
      { $: { "android:name": "android.hardware.camera", "android:required": "false" } },
    ];

    const patched = addOptionalFeatures(manifest);

    expect(featuresOf(patched)).toEqual([
      { $: { "android:name": "android.hardware.wifi", "android:required": "false" } },
      { $: { "android:name": "android.hardware.camera", "android:required": "false" } },
      { $: { "android:name": "android.hardware.screen.portrait", "android:required": "false" } },
    ]);
  });

  it("leaves the permissions untouched and patches only once", () => {
    const once = addOptionalFeatures(generatedManifest());

    expect(once.manifest["uses-permission"]).toEqual(
      generatedManifest().manifest["uses-permission"],
    );
    expect(addOptionalFeatures(once)).toEqual(once);
  });
});

describe("withOptionalAndroidFeatures", () => {
  it("registers an Android manifest mod", () => {
    const config = withOptionalAndroidFeatures({ name: "Emma Pilates", slug: "emma-pilates" });

    expect(config).toHaveProperty(["mods", "android", "manifest"], expect.any(Function));
  });
});
