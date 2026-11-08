import type { FreezeReviewDto } from "@pilates/api-contracts";
import { Chevron, ClientFace, colors, fontFamilies, spacing } from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { freezeDays, freezeRange } from "./freeze-format";

/**
 * A freeze in the Congelamientos list: the Client's face and name over the
 * dates and days, which wrap rather than truncate, then a second quiet line
 * (the reason, or how it was decided). `PersonRow` keeps a single ellipsized
 * line, which cut the dates (walkthrough finding 52); this mirrors its look.
 */
export function FreezeRow({
  accessibilityLabel,
  freeze,
  note,
  onPress,
}: {
  accessibilityLabel: string;
  freeze: FreezeReviewDto;
  note: string;
  onPress: () => void;
}) {
  const fetcher = useStaffFetcher();
  const period = `${freezeRange(freeze.startsOn, freeze.endsOn, "short")} · ${freezeDays(freeze.startsOn, freeze.endsOn)}`;
  return (
    <Pressable
      accessibilityHint={`${period} · ${note}`}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <ClientFace fetcher={fetcher} name={freeze.clientName} photo={freeze.clientPhoto} size={36} />
      <View style={styles.body}>
        <Text style={styles.name}>{freeze.clientName}</Text>
        <Text style={styles.detail}>{period}</Text>
        <Text ellipsizeMode="tail" numberOfLines={2} style={styles.detail}>
          {note}
        </Text>
      </View>
      <Chevron size={16} strokeWidth={1.5} tone="muted" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  detail: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13 },
  name: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 16 },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
