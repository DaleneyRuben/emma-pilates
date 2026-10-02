import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useState } from "react";
import { z } from "zod";

import { TeamAccessBadge } from "./auth-layout";
import { emailPlaceholder, FooterPrompt, FormAlert, WaitNotice } from "./auth-parts";
import { useCountdown } from "./countdown";
import { BiometricLoginButton } from "../ui/biometric-login-button";
import { BodyText } from "../ui/body-text";
import { fontFamilies } from "../ui/fonts";
import { FormField } from "../ui/form-field";
import { PrimaryButton } from "../ui/primary-button";
import { Screen } from "../ui/screen";
import { TextButton } from "../ui/text-button";
import { colors, spacing, typography } from "../ui/tokens";

const loginSchema = z.object({
  email: z.email("Escribe un correo electrónico válido."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

export type LoginValues = z.infer<typeof loginSchema>;

export type LoginSubmissionResult =
  | { status: "rejected" }
  | { retryAfterSeconds: number; status: "throttled" };

type LoginScreenProps = {
  /** A one-time message, such as the one left by closing the Account. */
  notice?: string | null;
  onBiometricUnlock?: () => void;
  onForgotPassword?: () => void;
  onRegister?: () => void;
  /** The Staff app marks its Login as the team's entrance (S01). */
  teamAccess?: boolean;
  onSubmit?: (
    values: LoginValues,
  ) => Promise<LoginSubmissionResult | void> | LoginSubmissionResult | void;
};

export function LoginScreen({
  notice = null,
  onBiometricUnlock,
  onForgotPassword,
  onRegister,
  onSubmit = () => undefined,
  teamAccess = false,
}: LoginScreenProps) {
  const [rejected, setRejected] = useState(false);
  const [retryAfterSeconds, startRetryWait] = useCountdown();
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(loginSchema),
  });
  const submitLogin = handleSubmit(async (values) => {
    setRejected(false);
    const result = await onSubmit(values);

    if (result?.status === "rejected") {
      setRejected(true);
    }

    if (result?.status === "throttled") {
      startRetryWait(result.retryAfterSeconds);
    }
  });

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {notice === null ? null : (
            <View accessibilityRole="summary" style={styles.notice}>
              <BodyText style={styles.noticeText}>{notice}</BodyText>
            </View>
          )}
          <View style={styles.brand}>
            <Text style={styles.wordmark}>Emma</Text>
            <View style={styles.brandRule} />
            <BodyText style={styles.tagline}>
              Movimiento · Equilibrio · Bienestar
            </BodyText>
            {teamAccess ? <TeamAccessBadge /> : null}
          </View>

          <View style={styles.form}>
            {rejected ? (
              <FormAlert>El correo o la contraseña no son correctos.</FormAlert>
            ) : null}
            {retryAfterSeconds > 0 ? (
              <WaitNotice
                message="Demasiados intentos. Intenta de nuevo en un momento."
                remainingSeconds={retryAfterSeconds}
                waitLabel="Podrás intentarlo en"
              />
            ) : null}
            <Controller
              control={control}
              name="email"
              render={({ field: { onBlur, onChange, value } }) => (
                <FormField
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email?.message}
                  keyboardType="email-address"
                  label="Correo electrónico"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder={emailPlaceholder(teamAccess)}
                  value={value}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onBlur, onChange, value } }) => (
                <FormField
                  autoComplete="current-password"
                  error={errors.password?.message}
                  label="Contraseña"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="••••••••"
                  secureTextEntry
                  value={value}
                />
              )}
            />
            <PrimaryButton
              disabled={isSubmitting || retryAfterSeconds > 0}
              label="Iniciar sesión"
              onPress={submitLogin}
            />
            {onBiometricUnlock === undefined ? null : (
              <BiometricLoginButton onPress={onBiometricUnlock} />
            )}
            {onForgotPassword === undefined ? null : (
              <TextButton
                label="¿Olvidaste tu contraseña?"
                onPress={onForgotPassword}
              />
            )}
          </View>
          {onRegister === undefined ? null : (
            <FooterPrompt
              action="Regístrate"
              onPress={onRegister}
              prompt="¿No tienes una cuenta?"
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: colors.successTint,
    borderColor: "rgba(124,148,115,0.30)",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  noticeText: { color: colors.successText },
  brand: {
    alignItems: "center",
    gap: spacing.md,
  },
  brandRule: {
    backgroundColor: colors.borderStrong,
    height: 1,
    width: 36,
  },
  // A phone-width column, centred on a tablet instead of stretched.
  content: {
    alignSelf: "center",
    flexGrow: 1,
    gap: spacing.xxxl,
    maxWidth: 480,
    width: "100%",
    justifyContent: "space-between",
    paddingBottom: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  flex: {
    flex: 1,
  },
  form: {
    gap: spacing.lgXl,
  },
  screen: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xlLg,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: typography.label,
    letterSpacing: 2,
    textAlign: "center",
    textTransform: "uppercase",
  },
  wordmark: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 52,
    lineHeight: 56,
  },
});
