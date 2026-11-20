import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ClockIcon } from "../ui/clock-icon";
import { Glyph } from "../ui/glyph";
import { OutlinedButton } from "../ui/outlined-button";
import { Text } from "../ui/text";
import { colors, radii, spacing, surfaces } from "../ui/tokens";
import { formatCountdown } from "./countdown";

/** S01/S18 suggest the studio's own domain to the team (MOB-036). */
/** The email example, given under the field (FormB, FIX-089). */
export const emailHint = (teamAccess: boolean) =>
  `Ej.: ${teamAccess ? "tu@emmapilates.bo" : "tu@correo.com"}`;

/** A form-level failure above the fields: never says which field failed. */
export function FormAlert({ children }: PropsWithChildren) {
  return (
    <View accessibilityRole="alert" accessible style={styles.alert} testID="form-alert">
      <Glyph color={colors.text} name="alert" size={18} strokeWidth={1.6} />
      <Text style={styles.alertText} variant="cuerpo">
        {children}
      </Text>
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
    <View style={[styles.notice, surface === "card" && styles.noticeOnCard]} testID="wait-notice">
      <ClockIcon testID="wait-notice-clock" />
      <View style={styles.noticeBody}>
        <Text accessibilityRole="alert" variant="cuerpo">
          {message}
        </Text>
        {/* The time is the sentence's key datum: in weight, the rest regular. */}
        <Text variant="cuerpo">
          {`${waitLabel} `}
          <Text variant="titulo-fila">{formatCountdown(remainingSeconds)}</Text>.
        </Text>
      </View>
    </View>
  );
}

/** An outlined action under the primary one, such as «Reenviar correo» (C01c, C01x). */
export function SecondaryButton({
  busy = false,
  disabled = false,
  label,
  onPress,
}: {
  busy?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  /** Kept for callers: a confirmation guards the destructive one, never red. */
  tone?: "error" | "neutral";
}) {
  return <OutlinedButton busy={busy} disabled={disabled} label={label} onPress={onPress} />;
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
      <Text variant="enlace">{label}</Text>
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
      <View style={styles.footerLine}>
        <Text variant="cuerpo">{prompt}</Text>
        <Pressable
          accessibilityLabel={action}
          accessibilityRole="button"
          hitSlop={spacing.md}
          onPress={onPress}
        >
          <Text variant="enlace-cuerpo">{action}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quiet: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  footer: {
    alignItems: "center",
  },
  footerLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.smd,
    justifyContent: "center",
    minHeight: 24,
  },
  // C01e: the failure on 50 with a 1.5 pt 400 rule, said in words.
  alert: {
    alignItems: "flex-start",
    backgroundColor: colors.errorTint,
    borderColor: colors.borderStrong,
    borderRadius: radii.inset,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  alertText: { flex: 1 },
  // C01t, C20l: the wait on the soft inset, its time in weight.
  notice: {
    ...surfaces.soft,
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  noticeOnCard: {
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    gap: 10,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  noticeBody: {
    flex: 1,
    gap: 2,
  },
});
