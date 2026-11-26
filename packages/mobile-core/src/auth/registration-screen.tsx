import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AcquisitionChannelField,
  type AcquisitionChannelChoice,
} from "../acquisition/acquisition-channel-field";
import { bolivia, phoneProblem, storedPhone } from "../account/phone-number";
import { Chevron } from "../ui/chevron";
import { FormErrorSummary } from "../ui/form-error-summary";
import { FormField } from "../ui/form-field";
import { Glyph } from "../ui/glyph";
import { PhoneField, type PhoneValue } from "../ui/phone-field";
import { PrimaryButton } from "../ui/primary-button";
import { Text } from "../ui/text";
import { colors, spacing } from "../ui/tokens";
import { AuthenticationScreen } from "./auth-layout";
import { FooterPrompt, FormAlert, WaitNotice } from "./auth-parts";
import { serverWaitSeconds, type AuthenticationApi } from "./authentication-api";
import { useCountdown } from "./countdown";
import { restartPendingWindow, type PendingRegistration } from "./pending-registration-screens";
import { limitKeepsAnyLink } from "./request-limit-copy";
import { useReferralCodeCheck } from "./use-referral-code-check";
import { ClipboardInviteSheet, useClipboardInvite } from "./clipboard-invite";

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
  initialReferralCode = null,
  onBack,
  onRegistered,
  readClipboardCode,
}: {
  api: AuthenticationApi;
  /** A friend's code it was given (invite link, install referrer, n.º 13). */
  initialReferralCode?: string | null;
  onBack: () => void;
  onRegistered: (registration: PendingRegistration) => void;
  /** iPhone only: the copied invite code, read once (n.º 13, C01b8). */
  readClipboardCode?: () => Promise<string | null>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<PhoneValue>({ country: bolivia, digits: "" });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [channel, setChannel] = useState<AcquisitionChannelChoice | null>(null);
  const [referralOpen, setReferralOpen] = useState(initialReferralCode !== null);
  const [referralCode, setReferralCode] = useState(initialReferralCode ?? "");
  const [codeFocused, setCodeFocused] = useState(false);
  // A code that arrives while the form is open (the install referrer answers
  // late) fills an empty field.
  const [givenCode, setGivenCode] = useState(initialReferralCode);
  if (initialReferralCode !== givenCode) {
    setGivenCode(initialReferralCode);
    if (initialReferralCode !== null && referralCode.trim() === "") {
      setReferralOpen(true);
      setReferralCode(initialReferralCode);
    }
  }
  const [submitted, setSubmitted] = useState(false);
  const [referralError, setReferralError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [waitSeconds, startWait] = useCountdown();
  const clipboard = useClipboardInvite(
    api,
    initialReferralCode === null ? readClipboardCode : undefined,
  );
  // n.º 18: whose code it is, and the channel it marked by itself.
  const codeCheck = useReferralCodeCheck(api, referralOpen ? referralCode : "");
  const [markedBy, setMarkedBy] = useState<string | null>(null);
  // Adjusted while rendering when a new code is confirmed (React's pattern
  // for state that follows a value), so the chip is marked in the same frame.
  const [seenCheck, setSeenCheck] = useState(codeCheck);
  if (codeCheck !== seenCheck) {
    setSeenCheck(codeCheck);
    if (codeCheck.status === "valid") {
      setChannel(codeCheck.holderKind === "client" ? "friend" : "trainer");
      setMarkedBy(codeCheck.holderFirstName);
    }
  }
  const unknownCode =
    codeCheck.status === "unknown"
      ? `No encontramos el código ${codeCheck.code}. Revisa cómo lo escribiste.`
      : undefined;

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
      channel === null ||
      codeCheck.status === "unknown"
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
      // n.º 6 (C01b3, C01b4): the button ends the form and scrolls with it.
      actions={
        <>
          <PrimaryButton
            busy={submitting}
            disabled={waitSeconds > 0}
            label="Crear cuenta"
            onPress={submit}
          />
          <FooterPrompt
            action="Inicia sesión"
            onPress={onBack}
            pill
            prompt="¿Ya tienes una cuenta?"
          />
        </>
      }
      brand={false}
      // C01b3: the code field ends the form, so the form scrolls to its end.
      revealEndWithKeyboard={referralOpen && codeFocused}
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
      <AcquisitionChannelField
        error={channelError}
        note={
          markedBy !== null && codeCheck.status === "valid"
            ? `La marcamos por el código de ${markedBy}.`
            : undefined
        }
        onChange={setChannel}
        value={channel}
      />
      {/* C01b5/C01b6: the row stays above the open field, its chevron up. */}
      <Pressable
        accessibilityLabel="¿Tienes un código de referido?"
        accessibilityRole="button"
        accessibilityState={{ expanded: referralOpen }}
        onPress={() => setReferralOpen((open) => !open)}
        style={styles.referralToggle}
      >
        <Text style={styles.referralQuestion} variant="titulo-fila">
          ¿Tienes un código de referido?
        </Text>
        <Chevron
          direction={referralOpen ? "up" : "down"}
          size={18}
          strokeWidth={1.7}
          testID="referral-toggle-chevron"
        />
      </Pressable>
      {referralOpen ? (
        <View style={styles.referral}>
          <FormField
            autoCapitalize="characters"
            autoCorrect={false}
            error={unknownCode ?? (referralError ? "! Revisa el código de referido" : undefined)}
            errorIcon={unknownCode === undefined ? undefined : "alert"}
            hint="Ej.: LUCIA"
            label="Código de referido"
            onBlur={() => setCodeFocused(false)}
            onChangeText={setReferralCode}
            onFocus={() => setCodeFocused(true)}
            value={referralCode}
          />
          {codeCheck.status === "valid" ? (
            <View style={styles.holder}>
              <Glyph color={colors.text} name="check" size={18} strokeWidth={1.7} />
              <Text variant="compacto-600">{`Código de ${codeCheck.holderFirstName}`}</Text>
            </View>
          ) : (
            <Text variant="secundario">De una amiga o de tu instructora.</Text>
          )}
        </View>
      ) : null}
      <ClipboardInviteSheet
        offer={clipboard.offer}
        onDismiss={clipboard.dismiss}
        onUse={(code) => {
          clipboard.dismiss();
          setReferralOpen(true);
          setReferralCode(code);
        }}
      />
    </AuthenticationScreen>
  );
}

const styles = StyleSheet.create({
  holder: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  referral: { gap: spacing.xs },
  referralQuestion: { flex: 1 },
  referralToggle: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 44,
  },
});
