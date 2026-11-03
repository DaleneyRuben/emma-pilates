import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "./fonts";
import { Glyph, type GlyphName } from "./glyph";
import { PrimaryButton } from "./primary-button";
import { TextButton } from "./text-button";
import { colors, radii, spacing, typography } from "./tokens";

type Action = { label: string; onPress: () => void; testID?: string };

export type StateScreenProps = {
  /** Extra content under the note, such as a details group or a custom action. */
  children?: ReactNode;
  icon?: GlyphName;
  /**
   * `centred` (the default) fills the space between the top bar and the tab
   * bar and centres the block both ways; `inList` is the same block without
   * the vertical centring; `card` draws it on Lino, as the system board does.
   */
  layout?: "card" | "centred" | "inList";
  /** One Texto tenue note; keep it to two lines of copy. */
  note?: string;
  primaryAction?: Action;
  testID?: string;
  /** The prefix of the disc and glyph ids, `state-screen` unless told otherwise. */
  testIDPrefix?: string;
  textAction?: Action;
  title: string;
  /** `error` puts the glyph in Error on #F7E5E0. */
  tone?: "brand" | "error";
};

/** An empty, pending, success, or error state (follow-up 225 §6). */
export function StateScreen({
  children,
  icon,
  layout = "centred",
  note,
  primaryAction,
  testID,
  testIDPrefix = "state-screen",
  textAction,
  title,
  tone = "brand",
}: StateScreenProps) {
  const error = tone === "error";
  const hasActions = primaryAction !== undefined || textAction !== undefined;
  return (
    <View style={[styles.block, layouts[layout]]} testID={testID}>
      {icon === undefined ? null : (
        <View style={[styles.disc, error && styles.errorDisc]} testID={`${testIDPrefix}-disc`}>
          <Glyph
            color={error ? colors.error : colors.emphasis}
            name={icon}
            size={32}
            strokeWidth={1.5}
            testID={`${testIDPrefix}-icon-${icon}`}
          />
        </View>
      )}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {note === undefined ? null : <Text style={styles.note}>{note}</Text>}
      {children}
      {hasActions ? (
        <View style={styles.actions} testID={`${testIDPrefix}-actions`}>
          {primaryAction === undefined ? null : <PrimaryButton {...primaryAction} />}
          {textAction === undefined ? null : <TextButton {...textAction} />}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.xs, marginTop: spacing.sm, minWidth: 220 },
  block: { alignItems: "center", gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  centred: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.lg },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  errorDisc: { backgroundColor: colors.errorSurface },
  inList: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xxl },
  note: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    lineHeight: 22,
    textAlign: "center",
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
  },
});

const layouts = { card: styles.card, centred: styles.centred, inList: styles.inList } as const;
