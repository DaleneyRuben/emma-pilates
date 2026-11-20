import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  AcquisitionChannelField,
  type AcquisitionChannelChoice,
} from "../acquisition/acquisition-channel-field";
import { bolivia, phoneProblem, storedPhone } from "../account/phone-number";
import { fontFamilies } from "../ui/fonts";
import { FormErrorSummary } from "../ui/form-error-summary";
import { FormField } from "../ui/form-field";
import { PhoneField, type PhoneValue } from "../ui/phone-field";
import { PrimaryButton } from "../ui/primary-button";
import { colors, spacing, typography } from "../ui/tokens";
import { AuthenticationScreen } from "./auth-layout";
import { FooterPrompt, FormAlert, WaitNotice } from "./auth-parts";
import { serverWaitSeconds, type AuthenticationApi } from "./authentication-api";
import { useCountdown } from "./countdown";
import { restartPendingWindow, type PendingRegistration } from "./pending-registration-screens";
import { limitKeepsAnyLink } from "./request-limit-copy";

export const minimumPasswordLength = 8;

/** C6 B: the summary's line, «Revisa 2 datos antes de seguir». */
const reviewTitle = (count: number) =>
  count === 1 ? "Revisa 1 dato antes de seguir" : `Revisa ${count} datos antes de seguir`;

const referralProblems = new Set(["referral_code_invalid", "referral_self_reference"]);

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
  const [phone, setPhone] = useState<PhoneValue>({ country: bolivia, digits: "" });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [channel, setChannel] = useState<AcquisitionChannelChoice | null>(null);
  const [referralOpen, setReferralOpen] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [referralError, setReferralError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [waitSeconds, startWait] = useCountdown();

  // C6 B: a short error under each marked field, after a «!».
  const nameError = submitted && name.trim() === "" ? "! Escribe tu nombre" : undefined;
  const emailError = submitted && !email.includes("@") ? "! Escribe un correo válido" : undefined;
  const phoneMistake = phoneProblem(phone.country, phone.digits);
  const phoneError =
    !submitted || phoneMistake === null
      ? undefined
      : phone.digits.trim() === ""
        ? "! Escribe tu número"
        : `! ${phoneMistake}`;
  const passwordError =
    submitted && password.length < minimumPasswordLength
      ? "! Usa al menos 8 caracteres"
      : undefined;
  const confirmationError = !submitted
    ? undefined
    : confirmation === ""
      ? "! Repite la contraseña"
      : passwordError === undefined && password !== confirmation
        ? "! Las contraseñas no coinciden"
        : undefined;
  const channelError = submitted && channel === null ? "! Elige una opción" : undefined;
  const missing = [
    [nameError, "Nombre"],
    [emailError, "Correo electrónico"],
    [phoneError, "Celular"],
    [passwordError, "Contraseña"],
    [confirmationError, "Confirmar contraseña"],
    [channelError, "¿Cómo nos conociste?"],
  ]
    .filter(([problem]) => problem !== undefined)
    .map(([, label]) => label as string);

  async function submit() {
    setSubmitted(true);
    setReferralError(false);
    setError(null);

    if (
      name.trim() === "" ||
      !email.includes("@") ||
      phoneMistake !== null ||
      password.length < minimumPasswordLength ||
      password !== confirmation ||
      channel === null
    ) {
      return;
    }

    setSubmitting(true);
    const code = referralCode.trim();

    try {
      const result = await api.register({
        acquisitionChannel: channel,
        email: email.trim(),
        name: name.trim(),
        password,
        phone: storedPhone(phone.country, phone.digits),
        ...(referralOpen && code !== "" ? { referralCode: code } : {}),
      });
      onRegistered(restartPendingWindow(result));
    } catch (failure) {
      const wait = serverWaitSeconds(failure);

      if (wait !== null) {
        startWait(wait);
      } else if (referralProblems.has(problemCode(failure) ?? "")) {
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
      brand={false}
      footer={
        <>
          <PrimaryButton
            busy={submitting}
            disabled={waitSeconds > 0}
            label="Crear cuenta"
            onPress={submit}
          />
          <FooterPrompt action="Inicia sesión" onPress={onBack} prompt="¿Ya tienes una cuenta?" />
        </>
      }
      topBar={{ onBack, title: "Crea tu cuenta" }}
    >
      {error === null ? null : <FormAlert>{error}</FormAlert>}
      <FormErrorSummary fields={missing} title={reviewTitle} />
      {waitSeconds > 0 ? (
        <WaitNotice
          message={limitKeepsAnyLink}
          remainingSeconds={waitSeconds}
          waitLabel="Podrás intentarlo en"
        />
      ) : null}
      <FormField
        autoCapitalize="words"
        error={nameError}
        hint="Ej.: Lucía Mendoza"
        label="Nombre"
        onChangeText={setName}
        value={name}
      />
      <FormField
        autoCapitalize="none"
        autoComplete="email"
        error={emailError}
        keyboardType="email-address"
        hint="Ej.: tu@correo.com"
        label="Correo electrónico"
        onChangeText={setEmail}
        value={email}
      />
      <PhoneField
        error={phoneError}
        helper="Te escribimos por WhatsApp si hace falta."
        onChange={setPhone}
        value={phone}
      />
      <FormField
        autoComplete="new-password"
        error={passwordError}
        hint="Mínimo 8 caracteres"
        label="Contraseña"
        onChangeText={setPassword}
        secureTextEntry
        value={password}
      />
      <FormField
        autoComplete="new-password"
        error={confirmationError}
        label="Confirmar contraseña"
        onChangeText={setConfirmation}
        secureTextEntry
        value={confirmation}
      />
      <AcquisitionChannelField error={channelError} onChange={setChannel} value={channel} />
      {referralOpen ? (
        <View style={styles.referral}>
          <FormField
            autoCapitalize="characters"
            autoCorrect={false}
            error={referralError ? "! Revisa el código de referido" : undefined}
            hint="Ej.: EMMA-2026"
            label="Código de referido"
            onChangeText={setReferralCode}
            value={referralCode}
          />
          <Text style={styles.referralHelp}>De una amiga o de tu instructora.</Text>
        </View>
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
    </AuthenticationScreen>
  );
}

const styles = StyleSheet.create({
  referral: { gap: spacing.xs },
  referralHelp: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
  },
  referralLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
    fontWeight: "600",
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
