import type { NutritionistAgendaEntryDto } from "@pilates/api-contracts";
import { colors, fontFamilies, spacing, surfaces, TextButton } from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { isCancellable, laterAppointmentMeta } from "./agenda-copy";
import { clockTime } from "./nutritionist-format";

/**
 * A «Después» appointment (E5 B, board N01): the Lora time over its length,
 * the Client over her day, kind and payment, and «Cancelar evaluación» on
 * its own row under a hairline while it can be.
 */
export function LaterAppointmentCard({
  entry,
  onCancel,
  today,
}: {
  entry: NutritionistAgendaEntryDto;
  onCancel: () => void;
  today: string;
}) {
  const cancellable = isCancellable(entry);
  return (
    <View style={[styles.card, cancellable && styles.withAction]}>
      <View
        accessibilityLabel={`${clockTime(entry.startsAt)} ${entry.clientName}`}
        accessible
        style={styles.cardBody}
      >
        <View style={styles.timeColumn}>
          <Text numberOfLines={1} style={styles.time}>
            {clockTime(entry.startsAt)}
          </Text>
          <Text style={styles.quiet}>{`${entry.durationMinutes} min`}</Text>
        </View>
        <View style={styles.who}>
          <Text style={styles.client}>{entry.clientName}</Text>
          <Text style={styles.quiet}>{laterAppointmentMeta(entry, today)}</Text>
        </View>
      </View>
      {cancellable ? (
        <View style={styles.action}>
          <TextButton
            label="Cancelar evaluación"
            onPress={onCancel}
            style={styles.actionButton}
            testID={`cancel-evaluation-${entry.evaluationId}`}
            tone="error"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Board N01: the action spans the card under a 100 hairline, at its start.
  action: {
    alignItems: "flex-start",
    borderTopColor: colors.hairline,
    borderTopWidth: 1,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  actionButton: { paddingHorizontal: 0 },
  card: {
    ...surfaces.card,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cardBody: { alignItems: "center", flexDirection: "row", gap: spacing.mdLg },
  client: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 16,
    fontWeight: "600",
  },
  quiet: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 13 },
  time: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 22,
    fontVariant: ["tabular-nums"],
  },
  // «07:00» in Lora runs wider than 56 pt on both platforms (more so on
  // Android): a fixed width wrapped it, so 56 is only the floor.
  timeColumn: { alignItems: "center", flexShrink: 0, minWidth: 56 },
  who: { flex: 1, gap: spacing.xxs },
  withAction: { paddingBottom: 0 },
});
