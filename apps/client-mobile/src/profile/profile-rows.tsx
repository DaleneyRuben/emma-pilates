import {
  Chevron,
  colors,
  fontFamilies,
  Glyph,
  type GlyphName,
  radii,
  rosa,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * One Perfil row (C18, Rosa Emma): the line glyph on a 36 pt 50 disc, the
 * label in Work Sans 16 semibold, an optional value (a state on a 50 pill,
 * or a count in words) and the chevron.
 */
export function ProfileRow({
  chevron = true,
  icon,
  label,
  onPress,
  pill = false,
  value,
}: {
  chevron?: boolean;
  icon: GlyphName;
  label: string;
  onPress: () => void;
  /** The value is a state, such as «Activo», drawn on the soft pill. */
  pill?: boolean;
  value?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={value === undefined ? label : `${label}, ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.disc} testID="profile-row-disc">
        <Glyph color={colors.text} name={icon} size={18} strokeWidth={1.6} />
      </View>
      <Text style={styles.label}>{label}</Text>
      {value === undefined ? null : pill ? (
        <View style={styles.pill}>
          <Text style={styles.pillText}>{value}</Text>
        </View>
      ) : (
        <Text style={styles.value}>{value}</Text>
      )}
      {chevron ? <Chevron size={16} strokeWidth={1.5} /> : null}
    </Pressable>
  );
}

/** A Perfil section's rows on one white card, split by 100 hairlines. */
export function ProfileRowCard({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.card}>
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index === 0 ? null : <View style={styles.hairline} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, overflow: "hidden" },
  disc: {
    alignItems: "center",
    backgroundColor: rosa[50],
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  label: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.bodyMedium,
    fontWeight: "600",
  },
  pill: {
    backgroundColor: rosa[50],
    borderColor: colors.borderSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: spacing.md,
  },
  pillText: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
  },
  pressed: { backgroundColor: colors.rowHover },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  value: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.note,
    fontWeight: "600",
  },
});
