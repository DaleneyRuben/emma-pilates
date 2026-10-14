import {
  getGetUnreadNotificationCountQueryKey,
  getListNotificationsQueryKey,
  markNotificationRead,
  useGetUnreadNotificationCount,
} from "@pilates/api-contracts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { parsePushPayload, type PushPayload } from "./push-payload";
import { PushPermissionSheet } from "./push-permission-sheet";
import type { PushPermissionStatus, PushPlatform } from "./push-platform";
import { syncPushRegistration } from "./push-registration";

export type PushNotificationsState = {
  /** Null until known, and always without a push platform (tests, web). */
  permissionStatus: PushPermissionStatus | null;
  /** Offers the explanation sheet after an action that makes push useful. */
  offerPermission: () => void;
  openSettings: () => void;
};

const inactive: PushNotificationsState = {
  permissionStatus: null,
  offerPermission: () => undefined,
  openSettings: () => undefined,
};

const PushNotificationsContext = createContext<PushNotificationsState>(inactive);

export function usePushNotifications(): PushNotificationsState {
  return useContext(PushNotificationsContext);
}

const snoozeKey = "pilates-push-permission-snoozed-until";
const snoozeMs = 30 * 24 * 60 * 60 * 1000;

type PushNotificationsProviderProps = PropsWithChildren<{
  fetcher: typeof globalThis.fetch;
  installationId: () => Promise<string>;
  now?: () => number;
  /** Routes a tapped notification once its entry is marked read. */
  onOpen: (payload: PushPayload) => void;
  permissionReason: string;
  platform?: PushPlatform;
}>;

// Mounted only while an Account is signed in (NOT-002): registers this
// installation, routes taps, and keeps the app badge on the unread count.
export function PushNotificationsProvider({
  children,
  fetcher,
  installationId,
  now = Date.now,
  onOpen,
  permissionReason,
  platform,
}: PushNotificationsProviderProps) {
  const queryClient = useQueryClient();
  const [permissionStatus, setPermissionStatus] = useState<PushPermissionStatus | null>(null);
  const [offering, setOffering] = useState(false);
  const onOpenRef = useRef(onOpen);
  useLayoutEffect(() => {
    onOpenRef.current = onOpen;
  });

  const sync = useCallback(
    () =>
      platform
        ?.getPermissionStatus()
        .then((status) => {
          setPermissionStatus(status);
          return syncPushRegistration({ fetcher, installationId, platform });
        })
        .catch(() => undefined),
    [fetcher, installationId, platform],
  );

  const refreshInbox = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
      ]),
    [queryClient],
  );

  // Registration follows the token and any permission change made in Settings.
  useEffect(() => {
    if (platform === undefined) return undefined;
    void sync();
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void sync();
    });
    const removeTokenListener = platform.onPushTokenChange(() => void sync());
    return () => {
      appState.remove();
      removeTokenListener();
    };
  }, [platform, sync]);

  // ADR-0036: a tap is parsed strictly and marked read before it routes; an
  // entry another Account owns (404) opens nothing.
  useEffect(() => {
    if (platform === undefined) return undefined;
    let mounted = true;
    const open = async (data: unknown) => {
      const payload = parsePushPayload(data);
      if (payload === null) return;
      const status = await markNotificationRead(payload.notificationId, undefined, fetcher).then(
        (response): number => response.status,
        () => null,
      );
      void refreshInbox();
      if (mounted && status !== 404) onOpenRef.current(payload);
    };
    const removeTapListener = platform.onNotificationTap((data) => void open(data));
    const removeReceivedListener = platform.onNotificationReceived(() => void refreshInbox());
    void platform.takeLaunchTap().then((data) => (data == null ? undefined : open(data)));
    return () => {
      mounted = false;
      removeTapListener();
      removeReceivedListener();
    };
  }, [fetcher, platform, refreshInbox]);

  // ADR-0069: the badge is the Account's authoritative unread count.
  const unread = useGetUnreadNotificationCount({
    fetcher,
    query: { enabled: platform !== undefined },
  });
  const unreadCount = unread.data?.status === 200 ? unread.data.data.unread : null;
  useEffect(() => {
    if (platform !== undefined && unreadCount !== null) void platform.setBadgeCount(unreadCount);
  }, [platform, unreadCount]);
  useEffect(
    () => () => {
      void platform?.setBadgeCount(0);
    },
    [platform],
  );

  const offerPermission = useCallback(() => {
    if (platform === undefined) return;
    void (async () => {
      if ((await platform.getPermissionStatus()) !== "undetermined") return;
      const snoozedUntil = Number((await AsyncStorage.getItem(snoozeKey)) ?? 0);
      if (snoozedUntil > now()) return;
      setOffering(true);
    })();
  }, [now, platform]);

  const accept = useCallback(async () => {
    setOffering(false);
    if (platform === undefined) return;
    await platform.prepareChannels();
    setPermissionStatus(await platform.requestPermission());
    await syncPushRegistration({ fetcher, installationId, platform });
  }, [fetcher, installationId, platform]);

  const decline = useCallback(async () => {
    setOffering(false);
    await AsyncStorage.setItem(snoozeKey, String(now() + snoozeMs));
  }, [now]);

  const value = useMemo(
    () => ({
      permissionStatus,
      offerPermission,
      openSettings: () => void platform?.openSettings(),
    }),
    [offerPermission, permissionStatus, platform],
  );

  return (
    <PushNotificationsContext.Provider value={value}>
      {children}
      <PushPermissionSheet
        onAccept={() => void accept()}
        onDecline={() => void decline()}
        reason={permissionReason}
        visible={offering}
      />
    </PushNotificationsContext.Provider>
  );
}
