import {
  colors,
  fontFamilies,
  Glyph,
  type GlyphName,
  shadows,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Children, Fragment, isValidElement, type ReactNode, useContext } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

/**
 * Rosa Emma pieces the staff boards repeat (equipo kit `lab`, `lst`, `note`,
 * `footer`): a section label lives inside its white card, never on the 100
 * screen; a fixed footer is a white panel with rounded top corners.
 */

/** The 12 pt uppercase label at the top of a white card («TU CUENTA», «ACCESOS»). */
export function CardLabel({ children, end }: { children: string; end?: string }) {
  return (
    <View style={styles.labelRow}>
      <Text accessibilityRole="header" style={styles.label}>
        {children}
      </Text>
      {end === undefined ? null : <Text style={styles.labelEnd}>{end}</Text>}
    </View>
  );
}

/**
 * One white card of rows split by full hairlines, with an optional label on
 * top (the kit's `lst`). Children are the rows themselves.
 */
export function RowCard({
  children,
  label,
  labelEnd,
  style,
  testID,
}: {
  children: ReactNode;
  label?: string;
  labelEnd?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.card, style]} testID={testID}>
      {label === undefined ? null : (
        <View style={styles.labelBox}>
          <CardLabel end={labelEnd}>{label}</CardLabel>
        </View>
      )}
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index === 0 && label === undefined ? null : <View style={styles.hairline} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/** A quiet aside on 50 with its 1 pt 200 rule and a line glyph (the kit's `note`). */
export function SoftNote({
  icon = "alert",
  message,
  testID,
}: {
  icon?: GlyphName;
  message: string;
  testID?: string;
}) {
  return (
    <View style={styles.note} testID={testID}>
      <Glyph color={colors.text} name={icon} size={20} strokeWidth={1.6} />
      <Text style={styles.noteText}>{message}</Text>
    </View>
  );
}

/**
 * A task's fixed footer: a white panel cast upward with rounded top corners,
 * reaching the screen's sides (`bleed`, the `Screen`'s side padding) and its
 * bottom. The `Screen` leaves its bottom to the panel: `edges={taskEdges}`
 * with `taskScreen` (a task hides the tab bar, so the panel keeps the safe area).
 */
export function FooterPanel({
  bleed = spacing.xlSm,
  children,
  testID,
}: {
  bleed?: number;
  children: ReactNode;
  testID?: string;
}) {
  // Like `Screen`, it also stands outside a safe area provider (in tests).
  const bottom = spacing.lg + (useContext(SafeAreaInsetsContext)?.bottom ?? 0);
  return (
    <View
      style={[styles.footer, { marginHorizontal: -bleed, paddingBottom: bottom }]}
      testID={testID}
    >
      {children}
    </View>
  );
}

/** A task screen whose bottom belongs to its `FooterPanel`. */
export const taskEdges = ["top", "left", "right"] as const;

/** A scroll body under a fixed band: it reaches the screen's sides so card shadows show. */
export const bodyScroll = StyleSheet.create({
  content: {
    gap: spacing.smLg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.md,
  },
  scroll: { marginHorizontal: -spacing.xlSm },
  // For `FormScrollView`, whose scroll lets content overflow: this clips it
  // under the band. Its footer then needs no side bleed (`bleed={0}`).
  clip: { flex: 1, marginHorizontal: -spacing.xlSm, overflow: "hidden" },
  // `taskEdges`' screen: the footer panel pads the bottom itself.
  taskScreen: { paddingBottom: 0 },
});

const styles = StyleSheet.create({
  card: { ...surfaces.card, overflow: "hidden" },
  footer: {
    ...shadows.footer,
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: spacing.smLg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.mdLg,
  },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  label: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
    letterSpacing: typography.label * 0.14,
    textTransform: "uppercase",
  },
  labelBox: {
    paddingBottom: spacing.smLg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.mdLg,
  },
  labelEnd: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.note,
    fontWeight: "700",
  },
  labelRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  note: {
    ...surfaces.soft,
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  noteText: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
