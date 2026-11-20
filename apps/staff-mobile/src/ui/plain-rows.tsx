import {
  Chevron,
  colors,
  fontFamilies,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type AccessibilityState } from "react-native";

/**
 * FIX-083: one Lino card of rows split by full hairlines, with no icon discs
 * (the 2026-11-18 design audit). Notificaciones and the Client's file use it.
 */
export function PlainRowGroup({ children, testID }: { children: ReactNode; testID?: string }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.group} testID={testID}>
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index === 0 ? null : <View style={styles.hairline} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/**
 * A row with a label, an optional quiet line under it, an optional value on
 * the right, and a chevron. `dot` draws the unread mark in the screen's one
 * accent; `indent` sets a row inside an opened group.
 */
export function PlainRow({
  accessibilityLabel,
  accessibilityState,
  chevron = "right",
  detail,
  dot,
  indent = false,
  label,
  onPress,
  strong = false,
  testID,
  value,
}: {
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  chevron?: "right" | "down" | "up" | "none";
  detail?: string;
  /** Leaves the dot's room empty when false, so labels line up. */
  dot?: boolean;
  indent?: boolean;
  label: string;
  onPress?: () => void;
  strong?: boolean;
  testID?: string;
  value?: string;
}) {
  const content = (
    <>
      {dot === undefined ? null : dot ? (
        <View style={styles.dot} testID="notification-unread-dot" />
      ) : (
        <View style={styles.dotSpace} />
      )}
      <View style={styles.body}>
        <Text style={[styles.label, strong && styles.strong]}>{label}</Text>
        {detail === undefined ? null : <Text style={styles.detail}>{detail}</Text>}
      </View>
      {value === undefined ? null : <Text style={styles.value}>{value}</Text>}
      {chevron === "none" || onPress === undefined ? null : (
        <Chevron direction={chevron} size={16} strokeWidth={1.5} tone="quiet" />
      )}
    </>
  );
  const a11yLabel = accessibilityLabel ?? [label, value].filter(Boolean).join(", ");
  if (onPress === undefined) {
    return (
      <View
        accessibilityLabel={a11yLabel}
        accessible
        style={[styles.row, indent && styles.indent]}
        testID={testID}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityLabel={a11yLabel}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      onPress={onPress}
      style={({ pressed }) => [styles.row, indent && styles.indent, pressed && styles.pressed]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  detail: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  dot: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 8,
    marginTop: spacing.smd,
    width: 8,
  },
  dotSpace: { width: 8 },
  group: { ...surfaces.card, overflow: "hidden" },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  indent: { paddingLeft: spacing.xl + spacing.lg },
  label: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.bodyMedium,
    fontWeight: "600",
  },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  strong: { fontFamily: fontFamilies.bodyMedium },
  value: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
    fontWeight: "600",
  },
});
