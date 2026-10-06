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
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BodyText } from "../ui/body-text";
import { QueryFailure } from "../ui/query-failure";
import { Screen } from "../ui/screen";
import { ScreenTopBar } from "../ui/screen-top-bar";
import { TextButton } from "../ui/text-button";
import { colors, radii, spacing, typography } from "../ui/tokens";
import { formatNotificationTime } from "./notification-time";

const pageSize = 50;

type NotificationsScreenProps = {
  emptySupport: string;
  fetcher: typeof globalThis.fetch;
  now?: () => Date;
  onBack: () => void;
  onOpen?: (notification: NotificationDto) => void;
};

function NotificationRow({
  notification,
  now,
  onPress,
}: {
  notification: NotificationDto;
  now: Date;
  onPress: () => void;
}) {
  const unread = !notification.readAt;
  return (
    <Pressable
      accessibilityLabel={notification.message}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.row, unread && styles.rowUnread]}
    >
      {unread ? <View style={styles.dot} /> : <View style={styles.dotSpace} />}
      <View style={styles.rowBody}>
        <Text style={[styles.message, !unread && styles.messageRead]}>
          {notification.message}
        </Text>
        <BodyText style={styles.time}>
          {formatNotificationTime(notification.createdAt, now)}
        </BodyText>
      </View>
    </Pressable>
  );
}

export function NotificationsScreen({
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
        <BodyText accessibilityLabel="Cargando notificaciones">
          Cargando…
        </BodyText>
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

  const open = (notification: NotificationDto) => {
    if (!notification.readAt) {
      markRead.mutate({ notificationId: notification.id });
    }
    onOpen?.(notification);
  };

  if (items.length === 0) {
    return (
      <Screen style={styles.screen}>
        {header()}
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No tienes notificaciones.</Text>
          <BodyText style={styles.emptySupport}>{emptySupport}</BodyText>
        </View>
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
      <ScrollView contentContainerStyle={styles.content}>
        {unread.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Sin leer</Text>
            {unread.map((item) => (
              <NotificationRow
                key={item.id}
                notification={item}
                now={currentTime}
                onPress={() => open(item)}
              />
            ))}
          </>
        ) : null}
        {earlier.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Anteriores</Text>
            {earlier.map((item) => (
              <NotificationRow
                key={item.id}
                notification={item}
                now={currentTime}
                onPress={() => open(item)}
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  dot: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 8,
    marginTop: spacing.smd,
    width: 8,
  },
  dotSpace: { width: 8 },
  empty: {
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  emptySupport: { textAlign: "center" },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
    textAlign: "center",
  },
  message: { color: colors.text, fontSize: typography.body, lineHeight: 22 },
  messageRead: { color: colors.textSecondary },
  row: {
    alignItems: "flex-start",
    borderRadius: radii.inset,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 60,
    padding: spacing.lg,
  },
  rowBody: { flex: 1, gap: spacing.xs },
  rowUnread: {
    backgroundColor: colors.secondaryTint,
    borderColor: colors.border,
    borderWidth: 1,
  },
  screen: { gap: spacing.lg },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.54,
    textTransform: "uppercase",
  },
  time: { color: colors.textMuted, fontSize: typography.note },
});
