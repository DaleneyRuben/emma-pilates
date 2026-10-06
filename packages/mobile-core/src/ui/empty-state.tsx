import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fontFamilies } from "./fonts";
import { Glyph, type GlyphName } from "./glyph";
import { colors, radii, spacing, typography } from "./tokens";

type IconName = GlyphName;

export type EmptyStateProps =
  | {
      icon: IconName;
      message: string;
      title: string;
      /** `framed` is the dashed tinted box of S06; `panel` the bare tablet panel. */
      variant?: "framed" | "panel";
    }
  | {
      /** S21's «Reservar una clase», 6 pt under the note (MOB-041). */
      action?: ReactNode;
      /** The quiet 34 pt glyph of 07's and S22's empty history; S22 may omit it. */
      icon?: IconName;
      message?: string;
      title: string;
      /** `plain` is the bare centred block of 07, 19, S20, S21, and S22 (MOB-040). */
      variant: "plain";
    };

/** A centred icon, Lora title, and muted note (MOB-039, MOB-040). */
export function EmptyState(props: EmptyStateProps) {
  const { icon, message, title, variant = "framed" } = props;
  const action = props.variant === "plain" ? props.action : undefined;
  const glyph =
    icon === undefined ? null : variant === "plain" ? (
      <Glyph
        color={colors.iconQuiet}
        name={icon}
        size={34}
        strokeWidth={1.1}
        testID={`empty-state-icon-${icon}`}
      />
    ) : (
      <Glyph name={icon} size={26} strokeWidth={1.2} testID={`empty-state-icon-${icon}`} />
    );
  const look = looks[variant];
  return (
    <View style={look.box}>
      {variant === "panel" ? (
        <View style={styles.circle} testID="empty-state-circle">
          {glyph}
        </View>
      ) : (
        glyph
      )}
      <Text style={look.title}>{title}</Text>
      {message === undefined ? null : <Text style={look.message}>{message}</Text>}
      {action === undefined ? null : (
        <View style={styles.plainAction} testID="empty-state-action">
          {action}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    backgroundColor: colors.neutralWash,
    borderColor: colors.borderStrong,
    borderRadius: 32,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  framed: {
    alignItems: "center",
    backgroundColor: colors.neutralTint,
    borderColor: colors.borderStrong,
    borderRadius: radii.card,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.xlLg,
    paddingVertical: spacing.xlLg,
  },
  framedMessage: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    lineHeight: 20,
    textAlign: "center",
  },
  framedTitle: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: typography.titleSmall,
    textAlign: "center",
  },
  panel: { alignItems: "center", gap: spacing.mdLg },
  panelMessage: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 340,
    textAlign: "center",
  },
  panelTitle: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.titleSecondary,
    textAlign: "center",
  },
  plainAction: { marginTop: spacing.smd, minWidth: 220 },
  plain: {
    alignItems: "center",
    flex: 1,
    gap: spacing.lg,
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  plainMessage: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 260,
    textAlign: "center",
  },
  plainTitle: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: 21,
    lineHeight: 28,
    textAlign: "center",
  },
});

const looks = {
  framed: { box: styles.framed, message: styles.framedMessage, title: styles.framedTitle },
  panel: { box: styles.panel, message: styles.panelMessage, title: styles.panelTitle },
  plain: { box: styles.plain, message: styles.plainMessage, title: styles.plainTitle },
} as const;
