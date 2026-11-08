import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Chevron } from "./chevron";
import { fontFamilies } from "./fonts";
import { Glyph, type GlyphName } from "./glyph";
import { colors, radii, spacing, typography } from "./tokens";

export type IconRowProps = {
  /** A quiet chevron at the end, for a row that opens something. */
  chevron?: boolean;
  icon: GlyphName;
  label: string;
  /** Makes the whole row one button. */
  onPress?: () => void;
  testID?: string;
  /** «error» for «Cerrar sesión», the Error last row (follow-up 256 § 2). */
  tone?: "default" | "error";
  /** A Texto tenue value on the right, such as «Activadas». */
  value?: string;
};

/**
 * A fact as a row instead of a paragraph (follow-up 225 §3): an 18 pt Palo de
 * rosa line glyph in a 36 pt Rosa tinte disc, the label in Work Sans 16, an
 * optional value and chevron; «error» draws it in Error. Put rows in an
 * `IconRowGroup`.
 */
export function IconRow({
  chevron = false,
  icon,
  label,
  onPress,
  testID,
  tone = "default",
  value,
}: IconRowProps) {
  const error = tone === "error";
  const content = (
    <>
      <View style={[styles.disc, error && styles.errorDisc]} testID="icon-row-disc">
        <Glyph
          color={error ? colors.error : colors.primary}
          name={icon}
          size={18}
          strokeWidth={1.5}
        />
      </View>
      <Text
        style={[styles.label, value === undefined && styles.labelAlone, error && styles.errorLabel]}
      >
        {label}
      </Text>
      {value === undefined ? null : <Text style={styles.value}>{value}</Text>}
      {chevron && !error ? <Chevron size={16} strokeWidth={1.5} tone="muted" /> : null}
    </>
  );
  if (onPress === undefined) {
    return (
      <View style={styles.row} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityLabel={value === undefined ? label : `${label}, ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

/** Lino rows at radius 16 with an Arena hairline inset 64 between them (follow-up 225 §2). */
export function IconRowGroup({
  children,
  style,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.group, style]} testID={testID}>
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index === 0 ? null : <View style={styles.hairline} testID="icon-row-hairline" />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  errorDisc: { backgroundColor: colors.errorSurface },
  errorLabel: { color: colors.error, fontFamily: fontFamilies.bodyMedium, fontWeight: "500" },
  group: { backgroundColor: colors.card, borderRadius: radii.card },
  // 16 side padding + 36 disc + 12 gap.
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: 64 },
  // The label keeps its width; a long value wraps under itself instead.
  label: {
    color: colors.text,
    flexGrow: 1,
    flexShrink: 0,
    fontFamily: fontFamilies.body,
    fontSize: typography.bodyMedium,
  },
  // Without a value the label is the row's note: it wraps instead of running off.
  labelAlone: { flexShrink: 1 },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  value: {
    color: colors.textMuted,
    flexShrink: 1,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    textAlign: "right",
  },
});
