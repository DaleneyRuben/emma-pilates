import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Circle, Line, Path, Rect } from "react-native-svg";

import { fontFamilies } from "./fonts";
import { LineIcon } from "./line-icon";
import { colors, radii, spacing, typography } from "./tokens";

const icons = {
  bell: (
    <>
      <Path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10z" />
      <Path d="M10.5 18.5a2 2 0 0 0 3 0" />
    </>
  ),
  calendar: (
    <>
      <Rect height={15} rx={2.5} width={17} x={3.5} y={5.5} />
      <Line x1={3.5} x2={20.5} y1={10} y2={10} />
      <Line x1={8} x2={8} y1={3.5} y2={7} />
      <Line x1={16} x2={16} y1={3.5} y2={7} />
    </>
  ),
  card: (
    <>
      <Rect height={15} rx={2.5} width={17} x={3.5} y={5.5} />
      <Line x1={3.5} x2={20.5} y1={10} y2={10} />
    </>
  ),
  clock: (
    <>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7.5V12l3.5 2" />
    </>
  ),
  person: (
    <>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" />
    </>
  ),
} as const;

type IconName = keyof typeof icons;

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
      <LineIcon
        color={colors.iconQuiet}
        size={34}
        strokeWidth={1.1}
        testID={`empty-state-icon-${icon}`}
      >
        {icons[icon]}
      </LineIcon>
    ) : (
      <LineIcon color={colors.primary} size={26} strokeWidth={1.2} testID={`empty-state-icon-${icon}`}>
        {icons[icon]}
      </LineIcon>
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
