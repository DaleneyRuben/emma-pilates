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
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, View } from "react-native";

import { reviewLine } from "./review-notices";

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
                <Pressable
                  accessibilityLabel={`${line.title}. ${line.detail}. ${time}`}
                  accessibilityRole="button"
                  onPress={() => onOpen(item)}
                  style={({ pressed }) => [styles.row, styles.divided, pressed && styles.pressed]}
                >
                  {item.readAt ? <View style={styles.dotSpace} /> : <View style={styles.dot} />}
                  <View style={styles.body}>
                    <Text variant="titulo-fila">{line.title}</Text>
                    <Text variant="secundario">{line.detail}</Text>
                    <Text variant="secundario">{time}</Text>
                  </View>
                  <Chevron direction="right" size={16} strokeWidth={1.5} tone="quiet" />
                </Pressable>
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
                <View
                  accessibilityLabel={`${line.title}. ${line.detail}`}
                  accessible
                  style={[styles.row, styles.decided]}
                >
                  <View style={styles.check}>
                    <Glyph color={colors.text} name="check" size={14} strokeWidth={1.8} />
                  </View>
                  <View style={styles.body}>
                    <Text variant="cuerpo">{line.title}</Text>
                    <Text variant="secundario">{line.detail}</Text>
                  </View>
                </View>
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
