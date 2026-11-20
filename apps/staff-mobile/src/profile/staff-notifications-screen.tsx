import {
  getGetUnreadNotificationCountQueryKey,
  getListNotificationsQueryKey,
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  type NotificationDto,
} from "@pilates/api-contracts";
import {
  colors,
  EmptyState,
  fontFamilies,
  LoadingState,
  OutlinedButton,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  spacing,
  useMobileIdentity,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import {
  staffNotificationDestination,
  type StaffNotificationRoute,
} from "../notifications/notification-destinations";
import { groupNotifications } from "../notifications/notification-groups";
import { DeniedNotice, NotificationEntries } from "../notifications/notification-entries";
import { useStaffFetcher } from "../staff-fetcher";
import { bodyScroll } from "./card-pieces";

const params = { limit: 50 };
const queryKeys = [getListNotificationsQueryKey(params), getGetUnreadNotificationCountQueryKey()];

/**
 * S20 for the team (FIX-083, Notificaciones pick A): one list where notices
 * of the same kind collapse into one row, unread marked by a dot only.
 */
export function StaffNotificationsScreen() {
  const navigation = useNavigation<{
    goBack: () => void;
    navigate: {
      (...route: StaffNotificationRoute): void;
      (tab: "AgendaTab"): void;
    };
  }>();
  const fetcher = useStaffFetcher();
  const role = useMobileIdentity().session?.role;
  const queryClient = useQueryClient();
  const notifications = useListNotifications(params, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);
  const invalidate = () =>
    Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  const markRead = useMarkNotificationRead({
    fetcher,
    mutation: { onSuccess: () => void invalidate() },
  });
  const markAllRead = useMarkAllNotificationsRead({
    fetcher,
    mutation: { onSuccess: () => void invalidate() },
  });

  const header = (action?: ReactNode) => (
    <ScreenTopBar
      action={action}
      fullBleed
      onBack={() => navigation.goBack()}
      title="Notificaciones"
    />
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

  const { items } = notifications.data.data;
  if (items.length === 0) {
    const back =
      role === "trainer" || role === "nutritionist"
        ? { label: "Volver a mi agenda", onPress: () => navigation.navigate("AgendaTab") }
        : { label: "Volver", onPress: () => navigation.goBack() };
    return (
      <Screen style={styles.screen}>
        {header()}
        <ScrollView contentContainerStyle={bodyScroll.content} style={bodyScroll.scroll}>
          <DeniedNotice />
          <EmptyState
            action={<OutlinedButton label={back.label} onPress={back.onPress} />}
            icon="bell"
            message="Te avisaremos aquí cuando haya algo que necesite tu atención."
            title="No tienes notificaciones."
            variant="plain"
          />
        </ScrollView>
      </Screen>
    );
  }

  const open = (notification: NotificationDto) => {
    if (!notification.readAt) markRead.mutate({ notificationId: notification.id });
    if (role === undefined || role === "client") return;
    const route = staffNotificationDestination(
      role,
      notification.destinationType ?? null,
      notification.destinationId ?? null,
    );
    if (route !== null) navigation.navigate(...route);
  };

  const anyUnread = items.some((item) => !item.readAt);
  return (
    <Screen style={styles.screen}>
      {header(
        anyUnread ? (
          // E-F06: a white capsule on the band, never small text on 200.
          <Pressable
            accessibilityLabel="Marcar todo leído"
            accessibilityRole="button"
            accessibilityState={{ disabled: markAllRead.isPending }}
            disabled={markAllRead.isPending}
            onPress={() => markAllRead.mutate()}
            style={({ pressed }) => [styles.markAll, pressed && styles.pressed]}
          >
            <Text style={styles.markAllLabel}>Marcar todo leído</Text>
          </Pressable>
        ) : undefined,
      )}
      <ScrollView
        contentContainerStyle={bodyScroll.content}
        refreshControl={refreshControl}
        style={bodyScroll.scroll}
        testID="notifications-scroll"
      >
        <DeniedNotice />
        <NotificationEntries entries={groupNotifications(items)} onOpen={open} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  markAll: {
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.mdLg,
  },
  markAllLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: { opacity: 0.7 },
  screen: { paddingHorizontal: spacing.xlSm },
});
