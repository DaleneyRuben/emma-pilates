import type { NotificationDto } from "@pilates/api-contracts";
import {
  Chevron,
  colors,
  formatNotificationTime,
  Glyph,
  radii,
  spacing,
  surfaces,
  SwipeToRemove,
  Text,
  useRemoveAction,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, View } from "react-native";

import { reviewLine } from "./review-notices";

// The rows read their swipe's «Borrar» to offer it to screen readers (E-F15).
function PendingRow({
  detail,
  onPress,
  read,
  time,
  title,
}: {
  detail: string;
  onPress: () => void;
  read: boolean;
  time: string;
  title: string;
}) {
  return (
    <Pressable
      {...useRemoveAction()}
      accessibilityLabel={`${title}. ${detail}. ${time}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, styles.divided, pressed && styles.pressed]}
    >
      {read ? <View style={styles.dotSpace} /> : <View style={styles.dot} />}
      <View style={styles.body}>
        <Text variant="titulo-fila">{title}</Text>
        <Text variant="secundario">{detail}</Text>
        <Text variant="secundario">{time}</Text>
      </View>
      <Chevron direction="right" size={16} strokeWidth={1.5} tone="quiet" />
    </Pressable>
  );
}

function DecidedRow({ detail, title }: { detail: string; title: string }) {
  return (
    <View
      {...useRemoveAction()}
      accessibilityLabel={`${title}. ${detail}`}
      accessible
      style={[styles.row, styles.decided]}
    >
      <View style={styles.check}>
        <Glyph color={colors.text} name="check" size={14} strokeWidth={1.8} />
      </View>
      <View style={styles.body}>
        <Text variant="cuerpo">{title}</Text>
        <Text variant="secundario">{detail}</Text>
      </View>
    </View>
  );
}

/**
 * Walkthrough n.º 12 (E-F07): «Por revisar» on a white card, each receipt or
 * Freeze with whose it is and how much, opening its review; «Ya revisados»
 * on the dimmed 50 card with a ✓ and no chevron. Both swipe away (n.º 10).
 */
export function ReviewSections({
  decided,
  now,
  onOpen,
  onRemove,
  pending,
}: {
  decided: readonly NotificationDto[];
  now: Date;
  onOpen: (notification: NotificationDto) => void;
  onRemove: (notification: NotificationDto) => void;
  pending: readonly NotificationDto[];
}) {
  return (
    <>
      {pending.length === 0 ? null : (
        <View style={styles.card} testID="review-pending">
          <Text style={styles.heading} variant="etiqueta">
            Por revisar
          </Text>
          {pending.map((item) => {
            const line = reviewLine(item, now);
            const time = formatNotificationTime(item.createdAt, now);
            return (
              <SwipeToRemove
                key={item.id}
                onRemove={() => onRemove(item)}
                testID={`notification-swipe-${item.id}`}
              >
                <PendingRow
                  detail={line.detail}
                  onPress={() => onOpen(item)}
                  read={Boolean(item.readAt)}
                  time={time}
                  title={line.title}
                />
              </SwipeToRemove>
            );
          })}
        </View>
      )}
      {decided.length === 0 ? null : (
        <View style={styles.soft} testID="review-decided">
          <Text style={styles.heading} variant="etiqueta">
            Ya revisados
          </Text>
          {decided.map((item) => {
            const line = reviewLine(item, now);
            return (
              <SwipeToRemove
                key={item.id}
                onRemove={() => onRemove(item)}
                testID={`notification-swipe-${item.id}`}
              >
                <DecidedRow detail={line.detail} title={line.title} />
              </SwipeToRemove>
            );
          })}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: 2 },
  card: { ...surfaces.card, overflow: "hidden" },
  check: {
    ...surfaces.soft,
    alignItems: "center",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  decided: { backgroundColor: colors.surfaceSubtle, borderTopColor: colors.borderSoft },
  divided: { borderTopColor: colors.hairline },
  dot: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 8,
    marginTop: 7,
    width: 8,
  },
  dotSpace: { width: 8 },
  heading: { paddingBottom: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: 14 },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  soft: { ...surfaces.soft, borderRadius: radii.card, overflow: "hidden" },
});
