import type { PropsWithChildren } from "react";

import type { PushPayload } from "./push-payload";
import type { PushPermissionStatus, PushPlatform } from "./push-platform";

export type PushNotificationsState = {
  permissionStatus: PushPermissionStatus | null;
  offerPermission: () => void;
  openSettings: () => void;
};

export function usePushNotifications(): PushNotificationsState {
  return {
    permissionStatus: null,
    offerPermission: () => undefined,
    openSettings: () => undefined,
  };
}

export function PushNotificationsProvider({
  children,
}: PropsWithChildren<{
  fetcher: typeof globalThis.fetch;
  installationId: () => Promise<string>;
  now?: () => number;
  onOpen: (payload: PushPayload) => void;
  permissionReason: string;
  platform?: PushPlatform;
}>) {
  return children;
}
