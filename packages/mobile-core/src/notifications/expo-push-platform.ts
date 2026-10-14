import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

import type { PushPermissionStatus, PushPlatform } from "./push-platform";

const toStatus = (status: Notifications.PermissionStatus): PushPermissionStatus =>
  status === Notifications.PermissionStatus.GRANTED
    ? "granted"
    : status === Notifications.PermissionStatus.DENIED
      ? "denied"
      : "undetermined";

// A launch tap can reach both the listener and the last-response read.
const handledResponses = new Set<string>();

const tapData = (response: Notifications.NotificationResponse): unknown => {
  const identifier = response.notification.request.identifier;
  if (
    response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER ||
    handledResponses.has(identifier)
  ) {
    return null;
  }
  handledResponses.add(identifier);
  return response.notification.request.content.data;
};

let handlerInstalled = false;

// The real device capabilities (expo-notifications, ADR-0025).
export function createExpoPushPlatform(): PushPlatform {
  if (!handlerInstalled) {
    handlerInstalled = true;
    // While the app is open a push still shows, with its own sound or none
    // (ADR-0070), and the badge follows its count.
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: Boolean(notification.request.content.sound),
        shouldSetBadge: true,
      }),
    });
  }

  return {
    os: Platform.OS === "ios" ? "ios" : "android",
    getPermissionStatus: async () => toStatus((await Notifications.getPermissionsAsync()).status),
    requestPermission: async () => toStatus((await Notifications.requestPermissionsAsync()).status),
    // ADR-0070: standard sound for actionable pushes, none for updates; the
    // backend picks the channel per notification type.
    prepareChannels: async () => {
      if (Platform.OS !== "android") return;
      await Notifications.setNotificationChannelAsync("actionable", {
        name: "Avisos importantes",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });
      await Notifications.setNotificationChannelAsync("updates", {
        name: "Novedades",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: null,
      });
    },
    getPushToken: async () => (await Notifications.getExpoPushTokenAsync()).data,
    onPushTokenChange: (listener) => {
      const subscription = Notifications.addPushTokenListener(() => listener());
      return () => subscription.remove();
    },
    onNotificationReceived: (listener) => {
      const subscription = Notifications.addNotificationReceivedListener(() => listener());
      return () => subscription.remove();
    },
    onNotificationTap: (listener) => {
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = tapData(response);
        if (data !== null) listener(data);
      });
      return () => subscription.remove();
    },
    takeLaunchTap: async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response === null) return null;
      await Notifications.clearLastNotificationResponseAsync();
      return tapData(response);
    },
    setBadgeCount: async (count) => {
      await Notifications.setBadgeCountAsync(count);
    },
    openSettings: () => Linking.openSettings(),
  };
}
