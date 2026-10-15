const { withMainActivity } = require("expo/config-plugins");

const classHeader = "class MainActivity : ReactActivity() {\n";
const marker = "// launch-tap-plugin";

// A push tapped while the app's process is dead but its task is still in
// Recents reaches MainActivity through onNewIntent, right after onCreate.
// Expo's ReactActivityDelegateWrapper drops any intent that arrives before
// the app has loaded (expo-updates delays the load), so the tap never reaches
// expo-notifications. Forward its FCM extras directly: NotificationManager
// keeps them until the JS emitter registers, and JS ignores a message id it
// has already handled when the wrapper delivers the same tap.
const override = `  ${marker}: hands a cold-start push tap to expo-notifications (NOT-002).
  override fun onNewIntent(intent: android.content.Intent) {
    super.onNewIntent(intent)
    val extras = intent.extras
    if (extras != null && extras.containsKey("google.message_id")) {
      expo.modules.notifications.notifications.NotificationManager.onNotificationResponseFromExtras(extras)
    }
  }

`;

function addLaunchTapForwarding(source) {
  if (source.includes(marker)) return source;
  if (!source.includes(classHeader)) {
    throw new Error("launch-tap-plugin: MainActivity class not found");
  }
  if (source.includes("fun onNewIntent(")) {
    throw new Error("launch-tap-plugin: MainActivity already overrides onNewIntent");
  }
  return source.replace(classHeader, `${classHeader}${override}`);
}

function withLaunchTapForwarding(config) {
  return withMainActivity(config, (activity) => {
    if (activity.modResults.language !== "kt") {
      throw new Error("launch-tap-plugin: MainActivity must be Kotlin");
    }
    return {
      ...activity,
      modResults: {
        ...activity.modResults,
        contents: addLaunchTapForwarding(activity.modResults.contents),
      },
    };
  });
}

module.exports = withLaunchTapForwarding;
module.exports.addLaunchTapForwarding = addLaunchTapForwarding;
