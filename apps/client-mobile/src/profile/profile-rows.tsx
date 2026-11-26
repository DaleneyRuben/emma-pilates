import {
  Chevron,
  colors,
  Glyph,
  type GlyphName,
  radii,
  rosa,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

/**
 * One Perfil row (C18, Rosa Emma): the line glyph on a 36 pt 50 disc, the
 * label in `titulo-fila`, an optional value in `pastilla` (a state on a 50
 * pill, or a count in words) and the chevron.
 */
export function ProfileRow({
  chevron = true,
  icon,
  label,
  onPress,
  pill = false,
  subtitle,
  value,
}: {
  chevron?: boolean;
  icon: GlyphName;
  label: string;
  onPress: () => void;
  /** The value is a state, such as «Activo», drawn on the soft pill. */
  pill?: boolean;
  /** A line under the label, such as Soporte's «Contacto y WhatsApp del estudio». */
  subtitle?: string;
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
      {subtitle === undefined ? (
        <Text style={styles.label} variant="titulo-fila">
          {label}
        </Text>
      ) : (
        <View style={styles.label}>
          <Text variant="titulo-fila">{label}</Text>
          <Text variant="secundario">{subtitle}</Text>
        </View>
      )}
      {value === undefined ? null : pill ? (
        <View style={styles.pill}>
          <Text variant="pastilla">{value}</Text>
        </View>
      ) : (
        <Text variant="pastilla">{value}</Text>
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
  label: { flex: 1 },
  pill: {
    backgroundColor: rosa[50],
    borderColor: colors.borderSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: spacing.md,
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
});
