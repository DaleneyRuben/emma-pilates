import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { BodyText } from "../ui/body-text";
import { fontFamilies } from "../ui/fonts";
import { FormField } from "../ui/form-field";
import { PrimaryButton } from "../ui/primary-button";
import { TextButton } from "../ui/text-button";
import { colors, radii, spacing, typography } from "../ui/tokens";
import { AuthenticationScreen, authStyles } from "./auth-layout";
import { SecondaryButton, WaitNotice } from "./auth-parts";
import { serverWaitSeconds, type AuthenticationApi } from "./authentication-api";
import { useMountedAt } from "../time/mounted-at";
import { formatCountdown, useCountdown } from "./countdown";
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

// Walkthrough 2026-11-04 n.º 18 (DES-012, proposal A «Lo esencial»): the
// address, one line of what to do, and two buttons; correcting, cancelling
// and the deadlines live in the options sheet. The screen reads the same
// whether or not the address could register (ADR-0029).
type Sheet = "cancel" | "options" | null;

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
  const [resent, setResent] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [waitSeconds, startWait] = useCountdown();
  const shownAt = useMountedAt();

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

  return (
    <AuthenticationScreen
      badge={{ icon: "mail", tone: "primary" }}
      brand={false}
      title="Revisa tu correo"
    >
      <View style={styles.lines}>
        <BodyText style={[authStyles.muted, authStyles.centered]}>Te enviamos un enlace a</BodyText>
        <BodyText style={[authStyles.emphasized, authStyles.centered]}>{pending.email}</BodyText>
      </View>
      <BodyText style={authStyles.centered}>
        Ábrelo para activar tu cuenta y después inicia sesión.
      </BodyText>
      {resent && !waiting ? (
        <View accessibilityRole="text" style={styles.resent} testID="resent-notice">
          <BodyText>Te enviamos otro correo. Usa el enlace más reciente.</BodyText>
        </View>
      ) : null}
      {failure === null ? null : (
        <BodyText accessibilityRole="alert" style={styles.failure}>
          {failure}
        </BodyText>
      )}
      {waiting ? (
        <WaitNotice
          message="Ya te enviamos uno hace poco. El enlace que tienes sigue sirviendo."
          remainingSeconds={waitSeconds}
          waitLabel="Podrás reenviarlo en"
        />
      ) : null}
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
        style={styles.centeredButton}
      />
      <Modal
        animationType="slide"
        onRequestClose={() => {
          if (!submitting) setSheet(null);
        }}
        transparent
        visible={sheet !== null}
      >
        <View style={styles.sheetBackdrop}>
          {sheet === "cancel" ? (
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>¿Cancelar tu registro?</Text>
              <BodyText style={authStyles.muted}>
                El enlace deja de funcionar y el correo queda libre para registrarte de nuevo.
              </BodyText>
              <SecondaryButton
                busy={submitting}
                label="Sí, cancelar registro"
                onPress={cancel}
                tone="error"
              />
              <TextButton
                disabled={submitting}
                label="Volver"
                onPress={() => setSheet(null)}
                style={styles.centeredButton}
              />
            </View>
          ) : (
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Opciones</Text>
              <OptionRow hint="Si lo escribiste mal" label="Cambiar correo" onPress={correct} />
              <OptionRow
                hint="Libera el correo para empezar de nuevo"
                label="Cancelar registro"
                onPress={() => setSheet("cancel")}
                tone="error"
              />
              <BodyText style={[authStyles.muted, authStyles.centered, styles.small]}>
                El enlace vence en 24 horas. Si no lo abres en 7 días, borramos el registro.
              </BodyText>
              <TextButton
                label="Cerrar"
                onPress={() => setSheet(null)}
                style={styles.centeredButton}
              />
            </View>
          )}
        </View>
      </Modal>
    </AuthenticationScreen>
  );
}

function OptionRow({
  hint,
  label,
  onPress,
  tone = "default",
}: {
  hint: string;
  label: string;
  onPress: () => void;
  tone?: "default" | "error";
}) {
  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.option}
    >
      <Text style={[styles.optionLabel, tone === "error" && styles.failure]}>{label}</Text>
      <Text style={styles.optionHint}>{hint}</Text>
    </Pressable>
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
      <BodyText>Escribe el correo correcto y te enviamos un enlace nuevo.</BodyText>
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
        label="Enviar enlace"
        onPress={submit}
      />
      <TextButton label="Volver" onPress={onBack} />
    </AuthenticationScreen>
  );
}

const styles = StyleSheet.create({
  centeredButton: {
    alignSelf: "center",
  },
  failure: {
    color: colors.errorText,
  },
  lines: {
    gap: spacing.xs,
  },
  option: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    minHeight: 56,
    paddingVertical: spacing.sm,
  },
  optionHint: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
  },
  optionLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.bodyMedium,
  },
  resent: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  sheet: {
    backgroundColor: colors.card,
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
  small: {
    fontSize: typography.note,
  },
});
