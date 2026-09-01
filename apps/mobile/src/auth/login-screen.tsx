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
import { z } from "zod";

import { BiometricLoginButton } from "../ui/biometric-login-button";
import { BodyText } from "../ui/body-text";
import { fontFamilies } from "../ui/fonts";
import { FormField } from "../ui/form-field";
import { PrimaryButton } from "../ui/primary-button";
import { Screen } from "../ui/screen";
import { colors, spacing, typography } from "../ui/tokens";

const loginSchema = z.object({
  email: z.email("Escribe un correo electrónico válido."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

export type LoginValues = z.infer<typeof loginSchema>;

type LoginScreenProps = {
  onBiometricUnlock?: () => void;
  onSubmit?: (values: LoginValues) => Promise<void> | void;
};

export function LoginScreen({
  onBiometricUnlock,
  onSubmit = () => undefined,
}: LoginScreenProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(loginSchema),
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
          <View style={styles.brand}>
            <Text style={styles.wordmark}>Emma</Text>
            <View style={styles.brandRule} />
            <BodyText style={styles.tagline}>
              Movimiento · Equilibrio · Bienestar
            </BodyText>
          </View>

          <View style={styles.form}>
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
                  placeholder="tu@correo.com"
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
              disabled={isSubmitting}
              label="Iniciar sesión"
              onPress={handleSubmit(onSubmit)}
            />
            {onBiometricUnlock === undefined ? null : (
              <BiometricLoginButton onPress={onBiometricUnlock} />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: "center",
    gap: spacing.md,
  },
  brandRule: {
    backgroundColor: colors.borderStrong,
    height: 1,
    width: 36,
  },
  content: {
    flexGrow: 1,
    gap: spacing.xxxl,
    justifyContent: "space-between",
    paddingBottom: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  flex: {
    flex: 1,
  },
  form: {
    gap: spacing.lgXl,
    paddingBottom: spacing.xxxl,
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
