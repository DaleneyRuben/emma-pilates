import { StyleSheet, Text, View } from "react-native";
import { Circle, Line, Path, Rect } from "react-native-svg";

import { fontFamilies } from "./fonts";
import { LineIcon } from "./line-icon";
import { colors, radii, spacing, typography } from "./tokens";

const icons = {
  card: (
    <>
      <Rect height={15} rx={2.5} width={17} x={3.5} y={5.5} />
      <Line x1={3.5} x2={20.5} y1={10} y2={10} />
    </>
  ),
  person: (
    <>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" />
    </>
  ),
} as const;

export type EmptyStateProps = {
  icon: keyof typeof icons;
  message: string;
  title: string;
  /** `framed` is the dashed tinted box of S06; `panel` the bare tablet panel. */
  variant?: "framed" | "panel";
};

/** A centred Palo de rosa icon, Lora title, and muted note (MOB-039). */
export function EmptyState({ icon, message, title, variant = "framed" }: EmptyStateProps) {
  const panel = variant === "panel";
  const glyph = (
    <LineIcon color={colors.primary} size={26} strokeWidth={1.2} testID={`empty-state-icon-${icon}`}>
      {icons[icon]}
    </LineIcon>
  );
  return (
    <View style={panel ? styles.panel : styles.framed}>
      {panel ? (
        <View style={styles.circle} testID="empty-state-circle">
          {glyph}
        </View>
      ) : (
        glyph
      )}
      <Text style={panel ? styles.panelTitle : styles.framedTitle}>{title}</Text>
      <Text style={panel ? styles.panelMessage : styles.framedMessage}>{message}</Text>
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
});
