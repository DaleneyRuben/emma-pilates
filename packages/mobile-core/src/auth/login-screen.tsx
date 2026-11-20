import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { useState } from "react";
import { z } from "zod";

import { BrandHeader } from "./auth-layout";
import { emailHint, FooterPrompt, FormAlert, WaitNotice } from "./auth-parts";
import { useCountdown } from "./countdown";
import { BiometricLoginButton } from "../ui/biometric-login-button";
import { FormScrollView } from "../ui/form-scroll-view";
import { FormField } from "../ui/form-field";
import { Glyph } from "../ui/glyph";
import { PrimaryButton } from "../ui/primary-button";
import { Screen } from "../ui/screen";
import { ScreenHeader } from "../ui/screen-header";
import { TextButton } from "../ui/text-button";
import { Text } from "../ui/text";
import { colors, radii, spacing, surfaces } from "../ui/tokens";

const loginSchema = z.object({
  email: z.email("Escribe un correo electrónico válido."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

export type LoginValues = z.infer<typeof loginSchema>;

export type LoginSubmissionResult =
  { status: "rejected" } | { retryAfterSeconds: number; status: "throttled" };

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
      <FormScrollView band contentContainerStyle={styles.content}>
        {/* Rosa Emma C01/E-A01: the wordmark on the band, the form in a white
            card, and «Regístrate» in its own card under it. */}
        <View style={styles.main} testID="login-main">
          <ScreenHeader>
            <View style={styles.band}>
              <BrandHeader teamAccess={teamAccess} />
            </View>
          </ScreenHeader>
          {notice === null ? null : (
            <View accessibilityRole="summary" style={styles.notice}>
              <Glyph color={colors.onEmphasis} name="check" size={20} strokeWidth={1.8} />
              <Text style={styles.noticeText} tone="onDark" variant="cuerpo">
                {notice}
              </Text>
            </View>
          )}
          <View style={styles.form}>
            {rejected ? <FormAlert>El correo o la contraseña no son correctos.</FormAlert> : null}
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
                  hint={emailHint(teamAccess)}
                  testID="login-email"
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
                  secureTextEntry
                  testID="login-password"
                  value={value}
                />
              )}
            />
            <PrimaryButton
              busy={isSubmitting}
              disabled={retryAfterSeconds > 0}
              label="Iniciar sesión"
              onPress={submitLogin}
              testID="login-submit"
            />
            {onBiometricUnlock === undefined ? null : (
              <BiometricLoginButton onPress={onBiometricUnlock} />
            )}
            {onForgotPassword === undefined ? null : (
              <TextButton
                label="¿Olvidaste tu contraseña?"
                onPress={onForgotPassword}
                testID="login-forgot-password"
              />
            )}
          </View>
        </View>
        {onRegister === undefined ? null : (
          <View style={styles.register}>
            <FooterPrompt
              action="Regístrate"
              onPress={onRegister}
              prompt="¿No tienes una cuenta?"
            />
          </View>
        )}
      </FormScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  band: { paddingBottom: spacing.xs, paddingTop: spacing.xl },
  // C01n: the closing message is the screen's one 600 block, said in white.
  notice: {
    alignItems: "center",
    backgroundColor: colors.emphasis,
    borderRadius: radii.button,
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  noticeText: { flex: 1 },
  // A phone-width column, centred on a tablet instead of stretched.
  content: {
    alignSelf: "center",
    flexGrow: 1,
    gap: spacing.md,
    maxWidth: 480,
    paddingBottom: spacing.xxl,
    width: "100%",
  },
  form: {
    ...surfaces.card,
    gap: spacing.mdLg,
    padding: spacing.xlSm,
  },
  main: { gap: spacing.md },
  register: { ...surfaces.card, padding: spacing.mdLg },
  screen: {
    backgroundColor: colors.surface,
  },
});
