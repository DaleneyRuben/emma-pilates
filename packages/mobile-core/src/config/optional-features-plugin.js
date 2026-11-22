const { withAndroidManifest } = require("expo/config-plugins");

// Google Play implies a required hardware feature from some manifest entries
// and hides the app from devices without it: the portrait lock
// (`orientation: "portrait"` → android:screenOrientation) implies
// screen.portrait, and @react-native-community/netinfo's ACCESS_WIFI_STATE
// implies wifi. Neither is needed to run the app, so declare both optional;
// the portrait lock itself stays.
const optionalFeatures = ["android.hardware.screen.portrait", "android.hardware.wifi"];

function addOptionalFeatures(androidManifest) {
  const existing = androidManifest.manifest["uses-feature"] ?? [];
  const features = existing.map((feature) =>
    optionalFeatures.includes(feature.$["android:name"])
      ? { $: { ...feature.$, "android:required": "false" } }
      : feature,
  );
  optionalFeatures.forEach((name) => {
    if (!features.some((feature) => feature.$["android:name"] === name)) {
      features.push({ $: { "android:name": name, "android:required": "false" } });
    }
  });
  return {
    ...androidManifest,
    manifest: { ...androidManifest.manifest, "uses-feature": features },
  };
}

function withOptionalAndroidFeatures(config) {
  return withAndroidManifest(config, (manifestConfig) => ({
    ...manifestConfig,
    modResults: addOptionalFeatures(manifestConfig.modResults),
  }));
}

module.exports = withOptionalAndroidFeatures;
module.exports.addOptionalFeatures = addOptionalFeatures;
module.exports.optionalFeatures = optionalFeatures;
