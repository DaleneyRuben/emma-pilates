import {
  PushNotificationsProvider,
  type PushPayload,
  type PushPlatform,
  usePendingUntilReady,
  usePushNotifications,
} from "@pilates/mobile-core";
import { type ParamListBase, useNavigationContainerRef } from "@react-navigation/native";
import { type ReactNode, useCallback, useEffect } from "react";

import { staffNotificationDestination, type StaffRole } from "./notification-destinations";

const unavailableInstallation = () => Promise.reject(new Error("No installation identifier"));

type NavigationHandle = {
  ref: ReturnType<typeof useNavigationContainerRef<ParamListBase>>;
  onReady: () => void;
};

// ADR-0067: Staff meet the explanation when their role's home first loads.
function OfferOnHome() {
  const { offerPermission } = usePushNotifications();
  useEffect(() => {
    offerPermission();
  }, [offerPermission]);
  return null;
}

// NOT-002: a tapped push opens the screen the inbox would open for it.
export function StaffPushNotifications({
  children,
  fetcher,
  installationIdentifier = unavailableInstallation,
  platform,
  role,
}: {
  children: (navigation: NavigationHandle) => ReactNode;
  fetcher: typeof globalThis.fetch;
  installationIdentifier?: () => Promise<string>;
  platform?: PushPlatform;
  role: StaffRole;
}) {
  const ref = useNavigationContainerRef<ParamListBase>();
  const open = useCallback(
    (payload: PushPayload) => {
      const route = staffNotificationDestination(
        role,
        payload.destinationType,
        payload.destinationId,
      );
      if (route !== null) ref.navigate(...route);
    },
    [ref, role],
  );
  const opener = usePendingUntilReady(open);

  return (
    <PushNotificationsProvider
      fetcher={fetcher}
      installationId={installationIdentifier}
      onOpen={opener.deliver}
      permissionReason="Activa las notificaciones para enterarte al momento de cambios en tu agenda y de lo que necesite tu atención."
      platform={platform}
    >
      <OfferOnHome />
      {children({ ref, onReady: opener.onReady })}
    </PushNotificationsProvider>
  );
}
