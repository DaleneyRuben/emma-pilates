export type PushPermissionStatus = "granted" | "denied" | "undetermined";

// The device's notification capabilities, so the app logic stays testable;
// expo-push-platform.ts is the real one.
export type PushPlatform = {
  os: "ios" | "android";
  getPermissionStatus: () => Promise<PushPermissionStatus>;
  requestPermission: () => Promise<PushPermissionStatus>;
  /** Android channels must exist before the permission prompt can appear. */
  prepareChannels: () => Promise<void>;
  getPushToken: () => Promise<string>;
  onPushTokenChange: (listener: () => void) => () => void;
  onNotificationReceived: (listener: () => void) => () => void;
  onNotificationTap: (listener: (data: unknown) => void) => () => void;
  /** The tap that launched the app, once; later calls answer null. */
  takeLaunchTap: () => Promise<unknown>;
  setBadgeCount: (count: number) => Promise<void>;
  openSettings: () => Promise<void>;
};
