import { formatMoney } from "@pilates/api-contracts";
import {
  Chevron,
  colors,
  fontFamilies,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PayGroup, PayGroupKey } from "./pay-groups";

/**
 * E2 B: the proportions bar, then one Crema row per concept with its count
 * and sum; tapping a row opens that concept by day (board E2C).
 */
export function PayGroupRows({
  groups,
  onOpen,
}: {
  groups: PayGroup[];
  onOpen: (key: PayGroupKey) => void;
}) {
  const whole = groups.reduce((total, group) => total + Math.max(group.centavos, 0), 0);
  return (
    <View style={styles.section}>
      {whole <= 0 ? null : (
        <View style={styles.bar} testID="pay-proportions">
          {groups.map((group) =>
            group.centavos <= 0 ? null : (
              <View
                key={group.key}
                style={{ backgroundColor: group.color, flex: group.centavos }}
              />
            ),
          )}
        </View>
      )}
      <View style={styles.group}>
        {groups.map((group, index) => (
          <Pressable
            accessibilityLabel={`${group.label}, ${group.note === null ? "" : `${group.note}, `}${formatMoney(group.centavos)}`}
            accessibilityRole="button"
            key={group.key}
            onPress={() => onOpen(group.key)}
            style={({ pressed }) => [
              styles.row,
              index > 0 && styles.divider,
              pressed && styles.pressed,
            ]}
            testID="pay-group-row"
          >
            <View style={[styles.dot, { backgroundColor: group.color }]} />
            <View style={styles.body}>
              <Text style={styles.label}>{group.label}</Text>
              {group.note === null ? null : <Text style={styles.note}>{group.note}</Text>}
            </View>
            <Text style={styles.amount}>{formatMoney(group.centavos)}</Text>
            <Chevron size={16} strokeWidth={1.5} tone="muted" />
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>Toca un grupo para ver cada clase con su fecha.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  bar: { borderRadius: radii.pill, flexDirection: "row", gap: 2, height: 8, overflow: "hidden" },
  body: { flex: 1, gap: 2 },
  divider: { borderTopColor: colors.hairline, borderTopWidth: 1 },
  dot: { borderRadius: 4, height: 8, width: 8 },
  group: { ...surfaces.flatCard, overflow: "hidden" },
  hint: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  label: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: 15 },
  note: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  pressed: { backgroundColor: colors.background },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    paddingVertical: spacing.md,
  },
  section: { gap: spacing.md },
});
