import type { NotificationDto } from "@pilates/api-contracts";
import {
  formatNotificationTime,
  spacing,
  surfaces,
  Text,
  TextButton,
  usePushNotifications,
} from "@pilates/mobile-core";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { PlainRow, PlainRowGroup } from "../ui/plain-rows";
import type { NotificationEntry } from "./notification-groups";

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
}: {
  indent?: boolean;
  notification: NotificationDto;
  now: Date;
  onOpen: (notification: NotificationDto) => void;
}) {
  const unread = !notification.readAt;
  return (
    <PlainRow
      accessibilityLabel={unread ? `${notification.message}, sin leer` : notification.message}
      detail={formatNotificationTime(notification.createdAt, now)}
      dot={unread}
      indent={indent}
      label={notification.message}
      onPress={() => onOpen(notification)}

      testID={`notification-row-${notification.id}`}
    />
  );
}

/** Every entry in one card: a group opens in place to list its notices. */
export function NotificationEntries({
  entries,
  now = new Date(),
  onOpen,
}: {
  entries: NotificationEntry[];
  now?: Date;
  onOpen: (notification: NotificationDto) => void;
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
                <NoticeRow indent key={item.id} notification={item} now={now} onOpen={onOpen} />
              ))
            : []),
        ];
      })}
    </PlainRowGroup>
  );
}

const styles = StyleSheet.create({
  // E-F07: a white card above the list.
  notice: {
    ...surfaces.card,
    alignItems: "flex-start",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
});
