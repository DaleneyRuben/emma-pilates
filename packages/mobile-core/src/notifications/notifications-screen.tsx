import {
  getGetUnreadNotificationCountQueryKey,
  getListNotificationsQueryKey,
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  type NotificationDto,
} from "@pilates/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { BodyText } from "../ui/body-text";
import { EmptyState } from "../ui/empty-state";
import { PrimaryButton } from "../ui/primary-button";
import { QueryFailure } from "../ui/query-failure";
import { Screen } from "../ui/screen";
import { ScreenTopBar } from "../ui/screen-top-bar";
import { SectionTitle } from "../ui/section-title";
import { TextButton } from "../ui/text-button";
import { colors, radii, spacing } from "../ui/tokens";
import { NotificationGroup, type NotificationActionFor } from "./notification-row";
import { usePushNotifications } from "./push-notifications";
import { LoadingState } from "../ui/loading-state";
import { usePullToRefresh } from "../query/pull-to-refresh";
import { useRefetchOnFocus } from "../query/refetch-on-focus";

export {
  readableNotificationMessage,
  type NotificationAction,
  type NotificationActionFor,
} from "./notification-row";

const pageSize = 50;

export type NotificationsScreenProps = {
  /** C2 C: a notice's direct action, which only the app knows how to open. */
  actionFor?: NotificationActionFor;
  /** The empty state's button, such as the client's «Volver al inicio» (C19b). */
  emptyAction?: { label: string; onPress: () => void };
  emptySupport: string;
  fetcher: typeof globalThis.fetch;
  now?: () => Date;
  onBack: () => void;
  onOpen?: (notification: NotificationDto) => void;
};

// ADR-0067: once permission is denied the app never asks again; the inbox
// offers a deliberate way to the system settings instead.
function DeniedNotice() {
  const { permissionStatus, openSettings } = usePushNotifications();

  if (permissionStatus !== "denied") {
    return null;
  }

  return (
    <View style={styles.notice}>
      <BodyText>
        Las notificaciones están desactivadas en este dispositivo. Actívalas para enterarte a tiempo
        de cambios y recordatorios.
      </BodyText>
      <TextButton label="Abrir Ajustes" onPress={openSettings} />
    </View>
  );
}

/**
 * The Client inbox (C2 C, owner 2026-11-19): «Nuevas · N» and «Anteriores»
 * on Crema cards, each notice with its topic icon and, where the app gives
 * one, a direct action.
 */
export function NotificationsScreen({
  actionFor,
  emptyAction,
  emptySupport,
  fetcher,
  now = () => new Date(),
  onBack,
  onOpen,
}: NotificationsScreenProps) {
  const queryClient = useQueryClient();
  const params = { limit: pageSize };
  const notifications = useListNotifications(params, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: getListNotificationsQueryKey(params),
      }),
      queryClient.invalidateQueries({
        queryKey: getGetUnreadNotificationCountQueryKey(),
      }),
    ]);
  const queryKeys = [getListNotificationsQueryKey(params), getGetUnreadNotificationCountQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);
  const markRead = useMarkNotificationRead({
    fetcher,
    mutation: { onSuccess: () => void invalidate() },
  });
  const markAllRead = useMarkAllNotificationsRead({
    fetcher,
    mutation: { onSuccess: () => void invalidate() },
  });

  const header = (action?: ReactNode) => (
    <ScreenTopBar action={action} fullBleed onBack={onBack} title="Notificaciones" />
  );

  if (notifications.isPending) {
    return (
      <Screen style={styles.screen}>
        {header()}
        <LoadingState label="Cargando notificaciones" />
      </Screen>
    );
  }

  if (notifications.isError || notifications.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header()}
        <QueryFailure
          label="No pudimos cargar tus notificaciones."
          onRetry={() => void notifications.refetch()}
        />
      </Screen>
    );
  }

  const items = notifications.data.data.items;
  const unread = items.filter((item) => !item.readAt);
  const earlier = items.filter((item) => Boolean(item.readAt));
  const currentTime = now();

  const read = (notification: NotificationDto) => {
    if (!notification.readAt) {
      markRead.mutate({ notificationId: notification.id });
    }
  };
  const open = (notification: NotificationDto) => {
    read(notification);
    onOpen?.(notification);
  };
  const section = (title: string, sectionItems: readonly NotificationDto[]) => (
    <View>
      <SectionTitle>{title}</SectionTitle>
      <NotificationGroup
        actionFor={actionFor}
        items={sectionItems}
        now={currentTime}
        onAction={read}
        onOpen={open}
      />
    </View>
  );

  if (items.length === 0) {
    return (
      <Screen style={styles.screen}>
        {header()}
        <DeniedNotice />
        <EmptyState
          action={
            emptyAction === undefined ? undefined : (
              <PrimaryButton label={emptyAction.label} onPress={emptyAction.onPress} />
            )
          }
          icon="bell"
          message={emptySupport}
          title="No tienes notificaciones."
          variant="plain"
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      {header(
        unread.length > 0 ? (
          <TextButton
            disabled={markAllRead.isPending}
            label="Marcar leídas"
            onPress={() => markAllRead.mutate()}
          />
        ) : undefined,
      )}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
        testID="notifications-scroll"
      >
        <DeniedNotice />
        {unread.length > 0 ? section(`Nuevas · ${unread.length}`, unread) : null}
        {earlier.length > 0 ? section("Anteriores", earlier) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  notice: {
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.inset,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  screen: { gap: spacing.lg },
});
