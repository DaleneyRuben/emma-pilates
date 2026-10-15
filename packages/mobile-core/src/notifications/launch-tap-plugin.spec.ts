import withLaunchTapForwarding, { addLaunchTapForwarding } from "./launch-tap-plugin";

// The shape `expo prebuild` generates for both apps (SDK 57).
const mainActivity = `package com.emmapilates.client

import android.os.Bundle

import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme);
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "main"
}
`;

describe("addLaunchTapForwarding", () => {
  it("hands a push tap's FCM extras to expo-notifications from onNewIntent", () => {
    const patched = addLaunchTapForwarding(mainActivity);

    expect(patched).toContain("override fun onNewIntent(intent: android.content.Intent) {");
    expect(patched).toContain("super.onNewIntent(intent)");
    expect(patched).toContain('extras.containsKey("google.message_id")');
    expect(patched).toContain(
      "expo.modules.notifications.notifications.NotificationManager.onNotificationResponseFromExtras(extras)",
    );
    expect(patched.indexOf("onNewIntent")).toBeGreaterThan(
      patched.indexOf("class MainActivity : ReactActivity() {"),
    );
  });

  it("patches only once", () => {
    const once = addLaunchTapForwarding(mainActivity);

    expect(addLaunchTapForwarding(once)).toBe(once);
  });

  it("fails the prebuild when the template has no MainActivity class to patch", () => {
    expect(() => addLaunchTapForwarding("class Other : Activity() {}")).toThrow(
      "launch-tap-plugin: MainActivity class not found",
    );
  });

  it("fails the prebuild when MainActivity already overrides onNewIntent", () => {
    const overridden = mainActivity.replace(
      "  override fun getMainComponentName",
      "  override fun onNewIntent(intent: Intent) { super.onNewIntent(intent) }\n\n  override fun getMainComponentName",
    );

    expect(() => addLaunchTapForwarding(overridden)).toThrow(
      "launch-tap-plugin: MainActivity already overrides onNewIntent",
    );
  });
});

describe("withLaunchTapForwarding", () => {
  it("registers an Android MainActivity mod", () => {
    const config = withLaunchTapForwarding({ name: "Emma Pilates", slug: "emma-pilates" });

    expect(config).toHaveProperty(["mods", "android", "mainActivity"], expect.any(Function));
  });
});
