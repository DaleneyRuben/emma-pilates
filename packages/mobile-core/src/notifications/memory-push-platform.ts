import type { PushPermissionStatus, PushPlatform } from "./push-platform";

type Listener<Argument = void> = (argument: Argument) => void;

// An in-memory device for specs and previews: it records what the app asks of
// it and lets a caller deliver a token change, a received push, or a tap.
export function createMemoryPushPlatform(
  status: PushPermissionStatus = "granted",
  { launchTap = null }: { launchTap?: unknown } = {},
) {
  const listeners = {
    received: new Set<Listener>(),
    tap: new Set<Listener<unknown>>(),
    token: new Set<Listener>(),
  };
  const state = {
    status,
    launchTap,
    badgeCounts: [] as number[],
    permissionRequests: 0,
    settingsOpened: 0,
  };
  const subscribe =
    <Item>(set: Set<Item>) =>
    (listener: Item) => {
      set.add(listener);
      return () => void set.delete(listener);
    };

  const platform: PushPlatform = {
    os: "ios",
    getPermissionStatus: () => Promise.resolve(state.status),
    requestPermission: () => {
      state.permissionRequests += 1;
      state.status = "granted";
      return Promise.resolve(state.status);
    },
    prepareChannels: () => Promise.resolve(),
    getPushToken: () => Promise.resolve("ExponentPushToken[memory]"),
    onPushTokenChange: subscribe(listeners.token),
    onNotificationReceived: subscribe(listeners.received),
    onNotificationTap: subscribe(listeners.tap),
    takeLaunchTap: () => {
      const tap = state.launchTap;
      state.launchTap = null;
      return Promise.resolve(tap);
    },
    setBadgeCount: (count) => {
      state.badgeCounts.push(count);
      return Promise.resolve();
    },
    openSettings: () => {
      state.settingsOpened += 1;
      return Promise.resolve();
    },
  };

  return {
    platform,
    state,
    tap: (data: unknown) => listeners.tap.forEach((listener) => listener(data)),
    receive: () => listeners.received.forEach((listener) => listener()),
    changeToken: () => listeners.token.forEach((listener) => listener()),
  };
}
