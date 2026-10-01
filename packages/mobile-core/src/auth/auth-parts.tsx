import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "../ui/fonts";
import { colors, spacing, typography } from "../ui/tokens";
import { formatCountdown } from "./countdown";

/** A form-level failure above the fields: never says which field failed. */
export function FormAlert({ children }: PropsWithChildren) {
  return (
    <View accessibilityRole="alert" accessible style={styles.alert}>
      <View style={styles.dot} />
      <Text style={styles.alertText}>{children}</Text>
    </View>
  );
}

/** A neutral server wait with its remaining time, as the throttled frames draw it. */
export function WaitNotice({
  message,
  remainingSeconds,
  waitLabel,
}: {
  message: string;
  remainingSeconds: number;
  /** The start of the countdown line, such as «Podrás intentarlo en». */
  waitLabel: string;
}) {
  return (
    <View style={styles.notice}>
      <Text accessibilityRole="alert" style={styles.noticeText}>
        {message}
      </Text>
      <Text style={styles.noticeWait}>
        {`${waitLabel} ${formatCountdown(remainingSeconds)}.`}
      </Text>
    </View>
  );
}

/** The quiet line under a form that switches mode, such as «¿No tienes una cuenta? Regístrate». */
export function FooterPrompt({
  action,
  onPress,
  prompt,
}: {
  action: string;
  onPress: () => void;
  prompt: string;
}) {
  return (
    <View style={styles.footer}>
      <View style={styles.footerRule} />
      <View style={styles.footerLine}>
        <Text style={styles.footerPrompt}>{prompt}</Text>
        <Pressable
          accessibilityLabel={action}
          accessibilityRole="button"
          hitSlop={spacing.md}
          onPress={onPress}
        >
          <Text style={styles.footerAction}>{action}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: "center",
    gap: spacing.lg,
  },
  footerAction: {
    color: colors.primaryDeep,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
  },
  footerLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
    minHeight: 44,
  },
  footerPrompt: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  footerRule: {
    alignSelf: "stretch",
    backgroundColor: colors.divider,
    height: 1,
  },
  alert: {
    alignItems: "flex-start",
    backgroundColor: colors.errorTint,
    borderColor: colors.error,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  alertText: {
    color: colors.errorText,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    lineHeight: 20,
  },
  dot: {
    backgroundColor: colors.error,
    borderRadius: 3,
    height: 6,
    marginTop: 7,
    width: 6,
  },
  notice: {
    backgroundColor: colors.secondaryTint,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    borderWidth: 1,
    gap: 3,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  noticeText: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 21,
  },
  noticeWait: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    fontVariant: ["tabular-nums"],
    lineHeight: 20,
  },
});
