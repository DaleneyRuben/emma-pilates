import type { NotificationDto } from "@pilates/api-contracts";
import { Fragment } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "../ui/fonts";
import { Glyph } from "../ui/glyph";
import { colors, radii, spacing, surfaces, typography } from "../ui/tokens";
import { formatNotificationTime } from "./notification-time";
import { notificationTopicIcon } from "./notification-topic";

/** A notice's direct action on the app's own screens, such as «Ver factura» (C2 C). */
export type NotificationAction = { label: string; onPress: () => void };

export type NotificationActionFor = (notification: NotificationDto) => NotificationAction | null;

const isoDayFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/**
 * FIX-082: notices stored before the backend formatted its dates still hold
 * «2026-11-15»; they read «15 de noviembre» like the rest.
 */
export function readableNotificationMessage(message: string): string {
  return message.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (iso) =>
    isoDayFormatter.format(new Date(`${iso}T00:00:00.000Z`)),
  );
}

const iconSize = 40;

function ActionLink({ action }: { action: NotificationAction }) {
  return (
    <Pressable
      accessibilityLabel={action.label}
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={action.onPress}
      style={styles.action}
    >
      <Text style={styles.actionLabel}>{action.label}</Text>
    </Pressable>
  );
}

function NotificationRow({
  action,
  notification,
  now,
  onPress,
}: {
  action: NotificationAction | null;
  notification: NotificationDto;
  now: Date;
  onPress: () => void;
}) {
  const unread = !notification.readAt;
  const message = readableNotificationMessage(notification.message);
  const icon = notificationTopicIcon(notification);
  // The action is a sibling of the row's button, never nested in it, so
  // VoiceOver and TalkBack reach both.
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={`${notification.title}. ${message}`}
        accessibilityRole="button"
        onPress={onPress}
        style={styles.main}
      >
        <View
          style={[styles.icon, unread ? styles.iconNew : styles.iconRead]}
          testID={`notification-icon-${notification.id}`}
        >
          <Glyph
            color={unread ? colors.onEmphasis : colors.text}
            name={icon}
            size={20}
            strokeWidth={1.8}
            testID={`notification-glyph-${icon}`}
          />
        </View>
        <View style={styles.body}>
          <View style={styles.headline}>
            <Text style={[styles.title, unread && styles.titleNew]}>{notification.title}</Text>
            <View style={styles.when}>
              <Text style={styles.time}>{formatNotificationTime(notification.createdAt, now)}</Text>
              {unread ? <View style={styles.dot} testID="notification-new-dot" /> : null}
            </View>
          </View>
          <Text style={styles.message}>{message}</Text>
        </View>
      </Pressable>
      {action === null ? null : <ActionLink action={action} />}
    </View>
  );
}

/** C19: one section's notices on a white card, rows split by 100 hairlines. */
export function NotificationGroup({
  actionFor,
  items,
  now,
  onAction,
  onOpen,
}: {
  actionFor?: NotificationActionFor;
  items: readonly NotificationDto[];
  now: Date;
  /** Runs before a notice's action, so the screen can mark it read. */
  onAction?: (notification: NotificationDto) => void;
  onOpen: (notification: NotificationDto) => void;
}) {
  return (
    <View style={styles.group} testID="notification-group">
      {items.map((item, index) => {
        const action = actionFor?.(item) ?? null;
        return (
          <Fragment key={item.id}>
            {index === 0 ? null : <View style={styles.divider} testID="notification-divider" />}
            <NotificationRow
              action={
                action === null
                  ? null
                  : {
                      label: action.label,
                      onPress: () => {
                        onAction?.(item);
                        action.onPress();
                      },
                    }
              }
              notification={item}
              now={now}
              onPress={() => onOpen(item)}
            />
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { alignSelf: "flex-start", marginLeft: iconSize + spacing.md, paddingVertical: 2 },
  actionLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    fontWeight: "700",
    textDecorationColor: colors.text,
    textDecorationLine: "underline",
  },
  body: { flex: 1, gap: 3 },
  divider: { backgroundColor: colors.hairline, height: 1 },
  dot: { backgroundColor: colors.primary, borderRadius: radii.pill, height: 8, width: 8 },
  group: { ...surfaces.card, overflow: "hidden" },
  headline: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  icon: {
    alignItems: "center",
    borderRadius: iconSize / 2,
    flexShrink: 0,
    height: iconSize,
    justifyContent: "center",
    width: iconSize,
  },
  iconNew: { backgroundColor: colors.emphasis },
  iconRead: { backgroundColor: colors.primaryTint },
  main: { flexDirection: "row", gap: spacing.md },
  message: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.body - 1,
    lineHeight: 20,
  },
  row: { gap: spacing.sm, minHeight: 60, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  time: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.label },
  title: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.body,
    fontWeight: "500",
  },
  // New notices say it in weight as well as the dot (FIX-089: no tinted row).
  titleNew: { fontFamily: fontFamilies.bodyBold, fontWeight: "700" },
  when: { alignItems: "center", flexDirection: "row", flexShrink: 0, gap: spacing.smd },
});
