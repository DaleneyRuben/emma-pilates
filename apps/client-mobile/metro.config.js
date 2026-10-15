// EXT-013: Sentry's serializer injects the debug ids that tie an error's
// minified frames to the source map an EAS release build uploads.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

module.exports = getSentryExpoConfig(__dirname);
