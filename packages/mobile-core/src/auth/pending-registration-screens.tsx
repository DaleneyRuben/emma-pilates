import { useEffect, useEffectEvent, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "../ui/text";
import { FormField } from "../ui/form-field";
import { PrimaryButton } from "../ui/primary-button";
import { TextButton } from "../ui/text-button";
import { spacing, surfaces } from "../ui/tokens";
import { AuthenticationScreen, authStyles } from "./auth-layout";
import { SecondaryButton, WaitNotice } from "./auth-parts";
import { CheckEmailSheet, type CheckEmailSheetKind } from "./check-email-sheet";
import { serverWaitSeconds, type AuthenticationApi } from "./authentication-api";
import { useMountedAt } from "../time/mounted-at";
import { formatCountdown, useCountdown } from "./countdown";
import { limitKeepsCurrentLink } from "./request-limit-copy";
import { BouncedEmailCard } from "./unconfirmed-email-card";
import { useRegistrationConfirmed } from "./use-registration-confirmed";

// ADR-0029: the pending registration is removed after 7 days without a
// verification, correction, or resend; each correction or resend restarts it.
export const pendingRegistrationLifetimeMilliseconds = 7 * 24 * 60 * 60 * 1_000;

export type PendingRegistration = {
  email: string;
  /** When this device expects the pending registration to be removed. */
  pendingExpiresAt: number;
  registrationContinuation: string;
};

export function restartPendingWindow(
  pending: Omit<PendingRegistration, "pendingExpiresAt">,
): PendingRegistration {
  return {
    ...pending,
    pendingExpiresAt: Date.now() + pendingRegistrationLifetimeMilliseconds,
  };
}

function RegistrationLapsed({
  onBack,
  onRegisterAgain,
}: {
  onBack: () => void;
  onRegisterAgain: () => void;
}) {
  return (
    <AuthenticationScreen
      actions={
        <>
          <PrimaryButton label="Registrarme de nuevo" onPress={onRegisterAgain} />
          <TextButton label="Volver a iniciar sesión" onPress={onBack} style={authStyles.pill} />
        </>
      }
      badge={{ icon: "clock", tone: "primary" }}
      brand={false}
      title="El registro venció"
    >
      <Text variant="cuerpo">
        Pasaron 7 días sin verificar el correo, así que eliminamos el registro pendiente. Puedes
        registrarte de nuevo.
      </Text>
    </AuthenticationScreen>
  );
}

// Walkthrough 2026-11-04 n.º 18 (DES-012, proposal A «Lo esencial»): the
// address, one line of what to do, and two buttons; correcting, cancelling
// and the deadlines live in the options sheet. The screen reads the same
// whether or not the address could register (ADR-0029).
type Sheet = CheckEmailSheetKind;

export function CheckEmailScreen({
  api,
  onBack,
  onCancelled,
  onConfirmed,
  onCorrect,
  onRegisterAgain,
  onResent,
  pending,
  resendOnOpen = false,
}: {
  api: AuthenticationApi;
  onBack: () => void;
  onCancelled: () => void;
  /** The email was confirmed elsewhere meanwhile (C01c2). */
  onConfirmed: () => void;
  onCorrect: () => void;
  onRegisterAgain: () => void;
  /** A resend restarts the 7-day window, whatever the neutral answer hides. */
  onResent: () => void;
  pending: PendingRegistration;
  /** Login's «Reenviar correo» (C01e2) opens this screen already sending. */
  resendOnOpen?: boolean;
}) {
  const [resent, setResent] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [waitSeconds, startWait] = useCountdown();
  const shownAt = useMountedAt();
  const { bounced } = useRegistrationConfirmed(api, pending.registrationContinuation, onConfirmed);
  const resendNow = useEffectEvent(() => void resend());
  useEffect(() => {
    if (resendOnOpen) resendNow();
  }, [resendOnOpen]);

  if (shownAt >= pending.pendingExpiresAt) {
    return <RegistrationLapsed onBack={onBack} onRegisterAgain={onRegisterAgain} />;
  }

  async function resend() {
    setSubmitting(true);
    setResent(false);
    setFailure(null);

    try {
      await api.resendRegistrationVerification(pending.registrationContinuation);
      setResent(true);
      onResent();
    } catch (error) {
      const wait = serverWaitSeconds(error);

      if (wait === null) {
        setFailure("No pudimos reenviar el correo. Inténtalo de nuevo.");
      } else {
        startWait(wait);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel() {
    setSubmitting(true);

    try {
      await api.cancelRegistration(pending.registrationContinuation);
      setSheet(null);
      onCancelled();
    } catch {
      setSheet(null);
      setFailure("No pudimos cancelar el registro. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  function correct() {
    setSheet(null);
    onCorrect();
  }

  const waiting = waitSeconds > 0;

  if (bounced) {
    return (
      <AuthenticationScreen
        actions={
          <>
            <PrimaryButton label="Cambiar correo" onPress={onCorrect} />
            <TextButton label="Volver a iniciar sesión" onPress={onBack} style={authStyles.pill} />
          </>
        }
        badge={{ icon: "mail", tone: "primary" }}
        bare
        brand={false}
        title="Revisa tu correo"
      >
        <BouncedEmailCard email={pending.email} />
      </AuthenticationScreen>
    );
  }

  return (
    <AuthenticationScreen
      actions={
        <>
          <PrimaryButton disabled={submitting} label="Iniciar sesión" onPress={onBack} />
          <SecondaryButton
            busy={submitting && sheet === null}
            disabled={submitting || waiting}
            label={waiting ? `Reenviar en ${formatCountdown(waitSeconds)}` : "Reenviar correo"}
            onPress={resend}
          />
          <TextButton
            disabled={submitting}
            label="¿Correo equivocado? Ver opciones"
            onPress={() => setSheet("options")}
            style={authStyles.pill}
          />
        </>
      }
      badge={{ icon: "mail", tone: "primary" }}
      brand={false}
      title="Revisa tu correo"
    >
      <View style={styles.lines}>
        <Text style={authStyles.centered} variant="cuerpo">
          Te enviamos un enlace a
        </Text>
        <Text style={authStyles.centered} variant="titulo-fila">
          {pending.email}
        </Text>
      </View>
      <Text variant="cuerpo" style={authStyles.centered}>
        Ábrelo para activar tu cuenta y después inicia sesión.
      </Text>
      {resent && !waiting ? (
        <View accessibilityLiveRegion="polite" style={styles.resent} testID="resent-notice">
          <Text variant="cuerpo">Te enviamos otro correo. Usa el enlace más reciente.</Text>
        </View>
      ) : null}
      {failure === null ? null : (
        <Text variant="cuerpo" accessibilityRole="alert">
          {failure}
        </Text>
      )}
      {waiting ? (
        <WaitNotice
          message="Ya te enviamos uno hace poco. El enlace que tienes sigue sirviendo."
          remainingSeconds={waitSeconds}
          waitLabel="Podrás reenviarlo en"
        />
      ) : null}
      <CheckEmailSheet
        kind={sheet}
        onAskCancel={() => setSheet("cancel")}
        onCancel={cancel}
        onClose={() => setSheet(null)}
        onCorrect={correct}
        submitting={submitting}
      />
    </AuthenticationScreen>
  );
}

export function CorrectEmailScreen({
  api,
  onBack,
  onCorrected,
  pending,
}: {
  api: AuthenticationApi;
  onBack: () => void;
  onCorrected: (pending: PendingRegistration) => void;
  pending: PendingRegistration;
}) {
  const [email, setEmail] = useState(pending.email);
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [waitSeconds, startWait] = useCountdown();
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setFailure(null);

    if (!email.includes("@")) {
      setError("Escribe un correo electrónico válido.");
      return;
    }

    setError(undefined);
    setSubmitting(true);

    try {
      const result = await api.correctRegistrationEmail({
        email: email.trim(),
        registrationContinuation: pending.registrationContinuation,
      });
      onCorrected(restartPendingWindow({ ...pending, email: result.email }));
    } catch (failed) {
      const wait = serverWaitSeconds(failed);

      if (wait === null) {
        setFailure("No pudimos cambiar el correo. Inténtalo de nuevo.");
      } else {
        startWait(wait);
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthenticationScreen brand={false} topBar={{ onBack, title: "Cambiar correo" }}>
      <Text variant="cuerpo">Escribe el correo correcto y te enviamos un enlace nuevo.</Text>
      <FormField
        autoCapitalize="none"
        error={error}
        keyboardType="email-address"
        label="Correo electrónico"
        onChangeText={setEmail}
        value={email}
      />
      {failure === null ? null : (
        <Text variant="cuerpo" accessibilityRole="alert">
          {failure}
        </Text>
      )}
      {waitSeconds > 0 ? (
        <WaitNotice
          message={limitKeepsCurrentLink}
          remainingSeconds={waitSeconds}
          waitLabel="Podrás intentarlo en"
        />
      ) : null}
      <PrimaryButton
        busy={submitting}
        disabled={waitSeconds > 0}
        label="Enviar enlace"
        onPress={submit}
      />
      <TextButton label="Volver" onPress={onBack} style={styles.centered} />
    </AuthenticationScreen>
  );
}

const styles = StyleSheet.create({
  centered: { alignSelf: "center" },
  lines: { gap: spacing.xs },
  // C01c: the resend's confirmation on the soft inset inside the card.
  resent: { ...surfaces.soft, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
