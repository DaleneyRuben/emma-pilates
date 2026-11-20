import type { NutritionistAgendaEntryDto } from "@pilates/api-contracts";
import {
  CardActionRow,
  cardWithActionRow,
  colors,
  fontFamilies,
  spacing,
  surfaces,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { isCancellable, laterAppointmentMeta } from "./agenda-copy";
import { clockTime } from "./nutritionist-format";

/**
 * A «Después» appointment (E5 B): the Lora time and its length, the Client
 * over her day, kind and payment, and «Cancelar evaluación» while it can be.
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
    <View style={[styles.card, cancellable && cardWithActionRow]}>
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
        <CardActionRow
          label="Cancelar evaluación"
          onPress={onCancel}
          testID={`cancel-evaluation-${entry.evaluationId}`}
          tone="error"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  cardBody: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  client: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 16 },
  quiet: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13 },
  time: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 20,
    fontVariant: ["tabular-nums"],
  },
  // «07:00» in Lora 20 runs wider than 56 pt on both platforms (more so on
  // Android): a fixed width wrapped it, so 56 is only the floor.
  timeColumn: { flexShrink: 0, minWidth: 56 },
  who: { flex: 1, gap: spacing.xxs },
});
