import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "./fonts";
import { Glyph, type GlyphName } from "./glyph";
import { PrimaryButton } from "./primary-button";
import { TextButton } from "./text-button";
import { colors, spacing, surfaces, typography } from "./tokens";

type Action = { label: string; onPress: () => void; testID?: string };

export type StateScreenProps = {
  /** Extra content under the note, such as a details group or a custom action. */
  children?: ReactNode;
  icon?: GlyphName;
  /**
   * Every layout draws the white state card (Rosa Emma). `centred` (the
   * default) fills the space under the header and keeps the card at its top;
   * `inList` and `card` place it in the flow of a list.
   */
  layout?: "card" | "centred" | "inList";
  /** One note; keep it to two lines of copy. */
  note?: string;
  primaryAction?: Action;
  testID?: string;
  /** The prefix of the disc and glyph ids, `state-screen` unless told otherwise. */
  testIDPrefix?: string;
  textAction?: Action;
  title: string;
  /** Kept for callers: every glyph is plain since FIX-089. */
  plainIcon?: boolean;
  /** Kept for callers: an error is said in words, never in colour (FIX-089). */
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
}: StateScreenProps) {
  const hasActions = primaryAction !== undefined || textAction !== undefined;
  const block = (
    <View
      style={[styles.block, styles.card, layout === "inList" && styles.inList]}
      testID={layout === "centred" ? undefined : testID}
    >
      {icon === undefined ? null : (
        <View style={styles.disc} testID={`${testIDPrefix}-disc`}>
          <Glyph
            color={colors.text}
            name={icon}
            size={28}
            strokeWidth={1.6}
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
  if (layout !== "centred") return block;
  // The full-screen state keeps its card at the top of the space it fills.
  return (
    <View style={styles.centred} testID={testID}>
      {block}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { alignSelf: "stretch", gap: spacing.xs, marginTop: spacing.xs },
  block: { alignItems: "center", gap: spacing.md },
  // Rosa Emma: every state is a white card, its glyph on a 50 disc.
  card: {
    ...surfaces.card,
    paddingHorizontal: spacing.xlSm,
    paddingVertical: spacing.xl + spacing.xs,
  },
  centred: { flex: 1 },
  disc: {
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderSoft,
    borderRadius: 32,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  inList: { alignSelf: "stretch" },
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
    fontSize: typography.section,
    lineHeight: 29,
    textAlign: "center",
  },
});
