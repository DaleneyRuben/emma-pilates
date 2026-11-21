import { useState } from "react";

import { Text } from "../ui/text";
import { FormField } from "../ui/form-field";
import { PrimaryButton } from "../ui/primary-button";
import { TextButton } from "../ui/text-button";
import { AuthenticationScreen, authStyles } from "./auth-layout";
import { emailHint, WaitNotice } from "./auth-parts";
import { serverWaitSeconds, type AuthenticationApi } from "./authentication-api";
import { useCountdown } from "./countdown";
import { limitKeepsAnyLink } from "./request-limit-copy";

/** 20 and S18: asks only for the link; the new password is set where it opens. */
export function RecoveryRequestScreen({
  api,
  onBack,
  teamAccess = false,
}: {
  api: AuthenticationApi;
  onBack: () => void;
  teamAccess?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [waitSeconds, startWait] = useCountdown();
  const limited = waitSeconds > 0;

  async function submit() {
    setFailure(null);

    if (!email.includes("@")) {
      setError("Escribe un correo electrónico válido.");
      return;
    }

    setError(undefined);
    setSubmitting(true);

    try {
      await api.requestPasswordRecovery(email.trim());
      setSentTo(email.trim());
    } catch (failed) {
      const wait = serverWaitSeconds(failed);

      if (wait === null) {
        setFailure("No pudimos enviar el enlace. Inténtalo de nuevo.");
      } else {
        startWait(wait);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const topBar = { onBack, title: "Recuperar contraseña" };

  if (sentTo !== null) {
    const back = (
      <TextButton
        label="Volver a iniciar sesión"
        onPress={onBack}
        style={teamAccess ? undefined : authStyles.pill}
        testID="recovery-back"
      />
    );
    return (
      <AuthenticationScreen
        actions={back}
        badge={{ icon: "check", tone: "success" }}
        brand={false}
        staff={teamAccess}
        title="Revisa tu correo"
        topBar={topBar}
      >
        <Text variant="cuerpo" style={teamAccess ? authStyles.centered : undefined}>
          {`Si hay una cuenta con ${sentTo}, te enviamos un enlace para restablecer tu contraseña.`}
        </Text>
        <Text style={teamAccess ? authStyles.centered : undefined} variant="secundario">
          El enlace vence en 30 minutos. Si no llega, revisa tu carpeta de spam.
        </Text>
      </AuthenticationScreen>
    );
  }

  return (
    // FIX-090: the bar names the screen; no wordmark repeats a title under it.
    <AuthenticationScreen brand={false} teamAccess={teamAccess} topBar={topBar}>
      <Text variant="cuerpo">Te enviaremos un enlace para restablecer tu contraseña.</Text>
      {limited ? (
        <WaitNotice
          message={limitKeepsAnyLink}
          remainingSeconds={waitSeconds}
          waitLabel="Podrás pedirlo en"
        />
      ) : null}
      <FormField
        autoCapitalize="none"
        autoComplete="email"
        error={error}
        keyboardType="email-address"
        label="Correo electrónico"
        onChangeText={setEmail}
        hint={emailHint(teamAccess)}
        testID="recovery-email"
        value={email}
      />
      {failure === null ? null : (
        <Text variant="cuerpo" accessibilityRole="alert">
          {failure}
        </Text>
      )}
      <PrimaryButton
        busy={submitting}
        disabled={limited}
        label="Enviar enlace"
        onPress={submit}
        testID="recovery-submit"
      />
      {limited ? (
        <TextButton label="Volver a iniciar sesión" onPress={onBack} style={authStyles.pill} />
      ) : null}
    </AuthenticationScreen>
  );
}
