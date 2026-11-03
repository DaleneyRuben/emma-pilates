import {
  PushNotificationsProvider,
  type PushPayload,
  type PushPlatform,
  usePendingUntilReady,
} from "@pilates/mobile-core";
import { type ParamListBase, useNavigationContainerRef } from "@react-navigation/native";
import { type ReactNode, useCallback } from "react";

import { clientNotificationDestination } from "./notification-destinations";

const unavailableInstallation = () => Promise.reject(new Error("No installation identifier"));

type NavigationHandle = {
  ref: ReturnType<typeof useNavigationContainerRef<ParamListBase>>;
  onReady: () => void;
};

// NOT-002: a tapped push opens the screen the inbox would open for it.
export function ClientPushNotifications({
  children,
  fetcher,
  installationIdentifier = unavailableInstallation,
  platform,
}: {
  children: (navigation: NavigationHandle) => ReactNode;
  fetcher: typeof globalThis.fetch;
  installationIdentifier?: () => Promise<string>;
  platform?: PushPlatform;
}) {
  const ref = useNavigationContainerRef<ParamListBase>();
  const open = useCallback(
    (payload: PushPayload) => {
      const route = clientNotificationDestination(payload.destinationType);
      if (route !== null) ref.navigate(...route);
    },
    [ref],
  );
  const opener = usePendingUntilReady(open);

  return (
    <PushNotificationsProvider
      fetcher={fetcher}
      installationId={installationIdentifier}
      onOpen={opener.deliver}
      permissionReason="Te avisamos antes de cada clase y cuando haya novedades sobre tus reservas, tu plan o tus pagos."
      permissionTitle="No te pierdas ninguna clase"
      platform={platform}
    >
      {children({ ref, onReady: opener.onReady })}
    </PushNotificationsProvider>
  );
}
