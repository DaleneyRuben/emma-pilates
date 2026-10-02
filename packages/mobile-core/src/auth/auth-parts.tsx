import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ClockIcon } from "../ui/clock-icon";
import { fontFamilies } from "../ui/fonts";
import { colors, spacing, typography } from "../ui/tokens";
import { formatCountdown } from "./countdown";

/** S01/S18 suggest the studio's own domain to the team (MOB-036). */
export const emailPlaceholder = (teamAccess: boolean) =>
  teamAccess ? "tu@emmapilates.bo" : "tu@correo.com";

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
  surface = "screen",
  waitLabel,
}: {
  message: string;
  remainingSeconds: number;
  /** «card» for a white box on a pending card's tint, as S06 draws it. */
  surface?: "card" | "screen";
  /** The start of the countdown line, such as «Podrás intentarlo en». */
  waitLabel: string;
}) {
  return (
    <View
      style={[styles.notice, surface === "card" && styles.noticeOnCard]}
      testID="wait-notice"
    >
      <ClockIcon testID="wait-notice-clock" />
      <View style={styles.noticeBody}>
        <Text accessibilityRole="alert" style={styles.noticeText}>
          {message}
        </Text>
        <Text style={styles.noticeWait}>
          {`${waitLabel} ${formatCountdown(remainingSeconds)}.`}
        </Text>
      </View>
    </View>
  );
}

/** An outlined action under the primary one, such as «Reenviar correo». */
export function SecondaryButton({
  disabled = false,
  label,
  onPress,
  tone = "neutral",
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: "error" | "neutral";
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.secondary, tone === "error" && styles.secondaryError]}
    >
      <Text
        style={[
          styles.secondaryLabel,
          tone === "error" && styles.secondaryLabelError,
          disabled && styles.disabledLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A discreet action in the muted tone, such as «Cancelar registro». */
export function QuietButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={spacing.sm}
      onPress={onPress}
      style={styles.quiet}
    >
      <Text style={[styles.quietLabel, disabled && styles.disabledLabel]}>
        {label}
      </Text>
    </Pressable>
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
  disabledLabel: {
    color: colors.disabledText,
  },
  quiet: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  quietLabel: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  secondary: {
    alignItems: "center",
    alignSelf: "stretch",
    borderColor: colors.borderStrong,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  secondaryError: {
    borderColor: colors.error,
  },
  secondaryLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.body,
  },
  secondaryLabelError: {
    color: colors.errorText,
  },
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
    alignItems: "flex-start",
    backgroundColor: colors.secondaryTint,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  noticeOnCard: {
    backgroundColor: colors.white,
    gap: 10,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  noticeBody: {
    flex: 1,
    gap: 3,
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
