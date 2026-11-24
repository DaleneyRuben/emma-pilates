import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { useContext, useEffect, useEffectEvent, useRef, useState } from "react";
import { z } from "zod";

import logo from "../../assets/emma-logo.png";
import { TeamAccessBadge } from "./auth-layout";
import { FooterPrompt, FormAlert, WaitNotice } from "./auth-parts";
import { useCountdown } from "./countdown";
import { BiometricWelcome } from "../ui/biometric-login-button";
import { FormScrollView } from "../ui/form-scroll-view";
import { FormField } from "../ui/form-field";
import { Glyph } from "../ui/glyph";
import { PrimaryButton } from "../ui/primary-button";
import { Screen } from "../ui/screen";
import { tabletPageMargin, useWideScreen } from "../ui/tablet-layout";
import { TextButton } from "../ui/text-button";
import { Text } from "../ui/text";
import { colors, radii, shadows, spacing } from "../ui/tokens";

const loginSchema = z.object({
  email: z.email("Escribe un correo electrónico válido."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

// The logo is 1312 × 565 (the owner's file, background removed), as in LoadingState.
const logoAspect = 565 / 1312;
const logoMaxWidth = 380;

export type LoginValues = z.infer<typeof loginSchema>;

/** Set while a biometric key waits on this phone (ADR-0112). */
export type BiometricLock = {
  /** The launch's first look: the prompt opens by itself over the bare logo. */
  autoPrompt: boolean;
  error: string | null;
  onUnlock: () => Promise<void> | void;
  onUseAnotherAccount: () => Promise<void> | void;
};

export type LoginSubmissionResult =
  { status: "rejected" } | { retryAfterSeconds: number; status: "throttled" };

type LoginScreenProps = {
  /** A one-time message, such as the one left by closing the Account. */
  notice?: string | null;
  /** Set while a biometric key waits: the sheet greets instead of the form. */
  biometricLock?: BiometricLock;
  onForgotPassword?: () => void;
  onRegister?: () => void;
  /** The Staff app marks its Login as the team's entrance (S01). */
  teamAccess?: boolean;
  onSubmit?: (
    values: LoginValues,
  ) => Promise<LoginSubmissionResult | void> | LoginSubmissionResult | void;
};

export function LoginScreen({
  biometricLock,
  notice = null,
  onForgotPassword,
  onRegister,
  onSubmit = () => undefined,
  teamAccess = false,
}: LoginScreenProps) {
  const [rejected, setRejected] = useState(false);
  // Until the launch's own prompt answers, only the logo shows (canvas Main, iOS-1).
  const [autoPrompting, setAutoPrompting] = useState(biometricLock?.autoPrompt === true);
  // A development build mounts effects twice; the phone takes one prompt at a time.
  const prompted = useRef(false);
  const promptOnce = useEffectEvent(() => {
    if (biometricLock?.autoPrompt !== true || prompted.current) return;
    prompted.current = true;
    void Promise.resolve(biometricLock.onUnlock()).finally(() => setAutoPrompting(false));
  });
  useEffect(() => {
    promptOnce();
  }, []);
  const { width } = useWindowDimensions();
  // Follow-up 289 (`01T`): the tablet sheet pads 32 pt over and 40 pt beside its form.
  const wide = useWideScreen();
  // The sheet reaches the bottom edge and keeps the home indicator clear itself.
  const bottomInset = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  const logoWidth = Math.min(Math.round(width * 0.7), logoMaxWidth);
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
    <Screen edges={sheetEdges} style={styles.screen}>
      {/* White under the sheet, so dragging the form up never shows the band
          beneath it; the opaque hero covers it at rest. */}
      <View pointerEvents="none" style={styles.underlay}>
        <View style={styles.underlaySheet} />
      </View>
      <FormScrollView contentContainerStyle={styles.content}>
        {/* Follow-up 288 A: the logo on the 200 band fills the top, and the form
            sits in a white sheet anchored to the bottom edge. */}
        <View style={styles.hero} testID="login-hero">
          <Image
            accessibilityLabel="Emma Pilates Studio"
            accessibilityRole="image"
            accessible
            resizeMode="contain"
            source={logo}
            style={{ height: Math.round(logoWidth * logoAspect), width: logoWidth }}
          />
          {teamAccess ? <TeamAccessBadge /> : null}
        </View>
        {autoPrompting ? null : (
          <View
            style={[
              styles.sheet,
              wide && styles.wideSheet,
              { paddingBottom: (wide ? spacing.xxxl : spacing.xl) + bottomInset },
            ]}
            testID="login-sheet"
          >
            {notice === null ? null : (
              <View accessibilityRole="summary" style={styles.notice}>
                <Glyph color={colors.onEmphasis} name="check" size={20} strokeWidth={1.8} />
                <Text style={styles.noticeText} tone="onDark" variant="cuerpo">
                  {notice}
                </Text>
              </View>
            )}
            {biometricLock === undefined ? (
              <>
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
                {onForgotPassword === undefined ? null : (
                  <TextButton
                    label="¿Olvidaste tu contraseña?"
                    onPress={onForgotPassword}
                    testID="login-forgot-password"
                  />
                )}
                {onRegister === undefined ? null : (
                  <View style={styles.register}>
                    <FooterPrompt
                      action="Regístrate"
                      onPress={onRegister}
                      prompt="¿No tienes una cuenta?"
                    />
                  </View>
                )}
              </>
            ) : (
              <BiometricWelcome
                error={biometricLock.error}
                onUnlock={biometricLock.onUnlock}
                onUseAnotherAccount={biometricLock.onUseAnotherAccount}
              />
            )}
          </View>
        )}
      </FormScrollView>
    </Screen>
  );
}

/** The sheet owns the bottom edge, so the Screen keeps only the others. */
const sheetEdges = ["top", "left", "right"] as const;

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  hero: {
    alignItems: "center",
    backgroundColor: colors.band,
    flexGrow: 1,
    gap: spacing.md,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
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
  register: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  screen: { backgroundColor: colors.band, padding: 0 },
  // A phone-width sheet, centred on a tablet instead of stretched.
  sheet: {
    ...shadows.sheet,
    alignSelf: "center",
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.band,
    borderTopRightRadius: radii.band,
    gap: spacing.mdLg,
    maxWidth: 560,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.xl,
    width: "100%",
  },
  wideSheet: { paddingHorizontal: tabletPageMargin, paddingTop: spacing.xxl },
  underlay: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "flex-end" },
  underlaySheet: { backgroundColor: colors.card, height: "50%", maxWidth: 560, width: "100%" },
});
