import type { NotificationDto } from "@pilates/api-contracts";
import {
  formatNotificationTime,
  spacing,
  surfaces,
  SwipeToRemove,
  Text,
  TextButton,
  usePushNotifications,
} from "@pilates/mobile-core";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { PlainRow, PlainRowGroup } from "../ui/plain-rows";
import type { NotificationEntry } from "./notification-groups";
import { feedbackLine } from "./review-notices";

// ADR-0067: once permission is denied the app never asks again; the inbox
// offers a deliberate way to the system settings instead.
export function DeniedNotice() {
  const { permissionStatus, openSettings } = usePushNotifications();
  if (permissionStatus !== "denied") return null;
  return (
    <View style={styles.notice}>
      <Text variant="cuerpo">
        Las notificaciones están desactivadas en este dispositivo. Actívalas para enterarte a tiempo
        de cambios y recordatorios.
      </Text>
      <TextButton label="Abrir Ajustes" onPress={openSettings} />
    </View>
  );
}

function NoticeRow({
  indent = false,
  notification,
  now,
  onOpen,
  onRemove,
}: {
  indent?: boolean;
  notification: NotificationDto;
  now: Date;
  onOpen: (notification: NotificationDto) => void;
  onRemove?: (notification: NotificationDto) => void;
}) {
  const unread = !notification.readAt;
  // Walkthrough n.º 11 (E-F20): a comment says who wrote it and how it begins.
  const line =
    notification.feedback === undefined || notification.feedback === null
      ? {
          title: notification.message,
          detail: formatNotificationTime(notification.createdAt, now),
        }
      : feedbackLine(notification, now);
  const row = (
    <PlainRow
      accessibilityLabel={unread ? `${line.title}, sin leer` : line.title}
      detail={line.detail}
      dot={unread}
      indent={indent}
      label={line.title}
      onPress={() => onOpen(notification)}
      testID={`notification-row-${notification.id}`}
    />
  );
  // Walkthrough n.º 10 (E-F15): one notice at a time swipes away.
  return onRemove === undefined ? (
    row
  ) : (
    <SwipeToRemove
      onRemove={() => onRemove(notification)}
      testID={`notification-swipe-${notification.id}`}
    >
      {row}
    </SwipeToRemove>
  );
}

/** Every entry in one card: a group opens in place to list its notices. */
export function NotificationEntries({
  entries,
  now = new Date(),
  onOpen,
  onRemove,
  onSeeAllComments,
}: {
  entries: NotificationEntry[];
  now?: Date;
  onOpen: (notification: NotificationDto) => void;
  onRemove?: (notification: NotificationDto) => void;
  /** E-F20: the comments group ends with «Ver todos los comentarios». */
  onSeeAllComments?: () => void;
}) {
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string) =>
    setOpened((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <PlainRowGroup testID="notification-entries">
      {entries.flatMap((entry) => {
        if (entry.kind === "single") {
          return [
            <NoticeRow
              key={entry.key}
              notification={entry.notification}
              now={now}
              onOpen={onOpen}
              onRemove={onRemove}
            />,
          ];
        }
        const open = opened.has(entry.key);
        const newest = entry.items[0];
        const unread = entry.unreadCount > 0 ? `, ${entry.unreadCount} sin leer` : "";
        return [
          <PlainRow
            accessibilityLabel={`${entry.label}${unread}`}
            accessibilityState={{ expanded: open }}
            chevron={open ? "up" : "down"}
            detail={[
              entry.unreadCount > 0 ? `${entry.unreadCount} sin leer` : null,
              newest === undefined ? null : formatNotificationTime(newest.createdAt, now),
            ]
              .filter(Boolean)
              .join(" · ")}
            dot={entry.unreadCount > 0}
            key={entry.key}
            label={entry.label}
            onPress={() => toggle(entry.key)}
            testID={`notification-group-${entry.key}`}
          />,
          ...(open
            ? entry.items.map((item) => (
                <NoticeRow
                  indent
                  key={item.id}
                  notification={item}
                  now={now}
                  onOpen={onOpen}
                  onRemove={onRemove}
                />
              ))
            : []),
          ...(open && entry.key === "feedback_received" && onSeeAllComments !== undefined
            ? [
                <View key="see-all-comments" style={styles.seeAll}>
                  <TextButton label="Ver todos los comentarios" onPress={onSeeAllComments} />
                </View>,
              ]
            : []),
        ];
      })}
    </PlainRowGroup>
  );
}

const styles = StyleSheet.create({
  seeAll: { alignItems: "flex-start", paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  // E-F07: a white card above the list.
  notice: {
    ...surfaces.card,
    alignItems: "flex-start",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
});
