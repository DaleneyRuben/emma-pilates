import { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";

import { BodyText } from "../ui/body-text";
import { fontFamilies } from "../ui/fonts";
import { FormField } from "../ui/form-field";
import { PrimaryButton } from "../ui/primary-button";
import { TextButton } from "../ui/text-button";
import { colors, radii, spacing, typography } from "../ui/tokens";
import { AuthenticationScreen, authStyles } from "./auth-layout";
import { QuietButton, SecondaryButton, WaitNotice } from "./auth-parts";
import { serverWaitSeconds, type AuthenticationApi } from "./authentication-api";
import { useMountedAt } from "../time/mounted-at";
import { useCountdown } from "./countdown";
import { limitKeepsCurrentLink } from "./request-limit-copy";

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
    <AuthenticationScreen brand={false} title="El registro venció">
      <BodyText>
        Pasaron 7 días sin verificar el correo, así que eliminamos el registro pendiente. Puedes
        registrarte de nuevo.
      </BodyText>
      <PrimaryButton label="Registrarme de nuevo" onPress={onRegisterAgain} />
      <TextButton label="Volver a iniciar sesión" onPress={onBack} />
    </AuthenticationScreen>
  );
}

export function CheckEmailScreen({
  api,
  onBack,
  onCancelled,
  onCorrect,
  onRegisterAgain,
  onResent,
  pending,
}: {
  api: AuthenticationApi;
  onBack: () => void;
  onCancelled: () => void;
  onCorrect: () => void;
  onRegisterAgain: () => void;
  /** A resend restarts the 7-day window, whatever the neutral answer hides. */
  onResent: () => void;
  pending: PendingRegistration;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [waitSeconds, startWait] = useCountdown();
  const shownAt = useMountedAt();

  if (shownAt >= pending.pendingExpiresAt) {
    return <RegistrationLapsed onBack={onBack} onRegisterAgain={onRegisterAgain} />;
  }

  async function resend() {
    setSubmitting(true);
    setNotice(null);
    setFailure(null);

    try {
      await api.resendRegistrationVerification(pending.registrationContinuation);
      setNotice(
        "Si el envío está disponible, recibirás un correo nuevo. Solo funciona el enlace más reciente.",
      );
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
      setConfirmingCancel(false);
      onCancelled();
    } catch {
      setConfirmingCancel(false);
      setFailure("No pudimos cancelar el registro. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <AuthenticationScreen brand={false} title="Revisa tu correo">
      <BodyText>Si el registro puede continuar, enviamos las instrucciones a este correo:</BodyText>
      <View style={styles.emailLine}>
        <BodyText style={[authStyles.emphasized, styles.email]}>{pending.email}</BodyText>
        <TextButton disabled={submitting} label="Cambiar correo" onPress={onCorrect} />
      </View>
      <BodyText>
        Abre el enlace más reciente para verificar tu cuenta y luego inicia sesión aquí. El enlace
        no inicia sesión por ti.
      </BodyText>
      <BodyText style={authStyles.muted}>
        El enlace vence en 24 horas; el correo indica la fecha y hora exactas.
      </BodyText>
      {notice === null ? null : <BodyText>{notice}</BodyText>}
      {failure === null ? null : (
        <BodyText accessibilityRole="alert" style={styles.failure}>
          {failure}
        </BodyText>
      )}
      {waitSeconds > 0 ? (
        <WaitNotice
          message={limitKeepsCurrentLink}
          remainingSeconds={waitSeconds}
          waitLabel="Podrás reenviarlo en"
        />
      ) : null}
      <SecondaryButton
        busy={submitting && !confirmingCancel}
        disabled={submitting || waitSeconds > 0}
        label="Reenviar correo"
        onPress={resend}
      />
      <TextButton label="Volver a iniciar sesión" onPress={onBack} />
      <View style={styles.cleanup}>
        <BodyText style={[authStyles.muted, styles.centered]}>
          Si en 7 días no verificas, corriges el correo ni pides otro envío, el registro pendiente
          se elimina.
        </BodyText>
        <QuietButton
          disabled={submitting}
          label="Cancelar registro"
          onPress={() => setConfirmingCancel(true)}
        />
      </View>
      <Modal
        animationType="slide"
        onRequestClose={() => setConfirmingCancel(false)}
        transparent
        visible={confirmingCancel}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>¿Cancelar tu registro?</Text>
            <BodyText>
              Los enlaces enviados dejarán de funcionar y el correo quedará libre. Si quieres,
              podrás registrarte de nuevo desde cero.
            </BodyText>
            <SecondaryButton
              busy={submitting}
              label="Sí, cancelar registro"
              onPress={cancel}
              tone="error"
            />
            <TextButton label="Volver" onPress={() => setConfirmingCancel(false)} />
          </View>
        </View>
      </Modal>
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
      <BodyText>
        {`Escribe el correo correcto. Te enviaremos un enlace nuevo de 24 horas y los enlaces enviados a ${pending.email} dejarán de funcionar.`}
      </BodyText>
      <FormField
        autoCapitalize="none"
        error={error}
        keyboardType="email-address"
        label="Correo electrónico"
        onChangeText={setEmail}
        value={email}
      />
      {failure === null ? null : (
        <BodyText accessibilityRole="alert" style={styles.failure}>
          {failure}
        </BodyText>
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
        label="Guardar correo"
        onPress={submit}
      />
      <TextButton label="Volver" onPress={onBack} />
    </AuthenticationScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    textAlign: "center",
  },
  cleanup: {
    alignItems: "center",
    gap: spacing.xs,
  },
  email: {
    flexShrink: 1,
  },
  emailLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  failure: {
    color: colors.errorText,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.frame,
    borderTopRightRadius: radii.frame,
    gap: spacing.md,
    padding: spacing.xl,
  },
  sheetBackdrop: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.titleSecondary,
  },
});
