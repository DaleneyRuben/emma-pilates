import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { fontFamilies } from "../ui/fonts";
import { FormField } from "../ui/form-field";
import { PrimaryButton } from "../ui/primary-button";
import { colors, spacing } from "../ui/tokens";
import { AuthenticationScreen } from "./auth-layout";
import { FooterPrompt, FormAlert } from "./auth-parts";
import type { AuthenticationApi } from "./authentication-api";

export type PendingRegistration = {
  email: string;
  registrationContinuation: string;
};

export const minimumPasswordLength = 8;

const referralProblems = new Set([
  "referral_code_invalid",
  "referral_self_reference",
]);

function problemCode(error: unknown): string | null {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : null;
}

export function RegistrationScreen({
  api,
  onBack,
  onRegistered,
}: {
  api: AuthenticationApi;
  onBack: () => void;
  onRegistered: (registration: PendingRegistration) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [referralOpen, setReferralOpen] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [referralError, setReferralError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameError =
    submitted && name.trim() === "" ? "Escribe tu nombre." : undefined;
  const emailError =
    submitted && !email.includes("@")
      ? "Escribe un correo electrónico válido."
      : undefined;
  const passwordError =
    submitted && password.length < minimumPasswordLength
      ? "Mínimo 8 caracteres."
      : undefined;
  const confirmationError =
    submitted && passwordError === undefined && password !== confirmation
      ? "Las contraseñas no coinciden."
      : undefined;

  async function submit() {
    setSubmitted(true);
    setReferralError(false);
    setError(null);

    if (
      name.trim() === "" ||
      !email.includes("@") ||
      password.length < minimumPasswordLength ||
      password !== confirmation
    ) {
      return;
    }

    setSubmitting(true);
    const code = referralCode.trim();

    try {
      const result = await api.register({
        email: email.trim(),
        name: name.trim(),
        password,
        ...(referralOpen && code !== "" ? { referralCode: code } : {}),
      });
      onRegistered(result);
    } catch (failure) {
      if (referralProblems.has(problemCode(failure) ?? "")) {
        setReferralError(true);
      } else {
        setError("No pudimos crear la cuenta. Inténtalo de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthenticationScreen
      footer={
        <FooterPrompt
          action="Inicia sesión"
          onPress={onBack}
          prompt="¿Ya tienes una cuenta?"
        />
      }
      tagline
    >
      {error === null ? null : <FormAlert>{error}</FormAlert>}
      <FormField
        autoCapitalize="words"
        error={nameError}
        label="Nombre"
        onChangeText={setName}
        placeholder="Tu nombre y apellido"
        value={name}
      />
      <FormField
        autoCapitalize="none"
        autoComplete="email"
        error={emailError}
        keyboardType="email-address"
        label="Correo electrónico"
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        value={email}
      />
      <FormField
        autoComplete="new-password"
        error={passwordError}
        label="Contraseña"
        onChangeText={setPassword}
        placeholder="Mínimo 8 caracteres"
        secureTextEntry
        value={password}
      />
      <FormField
        autoComplete="new-password"
        error={confirmationError}
        label="Confirmar contraseña"
        onChangeText={setConfirmation}
        placeholder="Repite la contraseña"
        secureTextEntry
        value={confirmation}
      />
      {referralOpen ? (
        <FormField
          autoCapitalize="characters"
          autoCorrect={false}
          error={referralError ? "Revisa el código de referido." : undefined}
          label="Código de referido"
          onChangeText={setReferralCode}
          placeholder="Ej. EMMA-2026"
          value={referralCode}
        />
      ) : (
        <Pressable
          accessibilityLabel="¿Tienes un código de referido?"
          accessibilityRole="button"
          onPress={() => setReferralOpen(true)}
          style={styles.referralToggle}
        >
          <Text style={styles.referralLabel}>¿Tienes un código de referido?</Text>
          <Text style={styles.referralLabel}>⌄</Text>
        </Pressable>
      )}
      <PrimaryButton
        disabled={submitting}
        label="Crear cuenta"
        onPress={submit}
      />
    </AuthenticationScreen>
  );
}

const styles = StyleSheet.create({
  referralLabel: {
    color: colors.primaryDeep,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  referralToggle: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.xxs,
  },
});
