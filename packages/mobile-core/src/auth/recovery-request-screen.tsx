import { useState } from "react";

import { BodyText } from "../ui/body-text";
import { FormField } from "../ui/form-field";
import { PrimaryButton } from "../ui/primary-button";
import { TextButton } from "../ui/text-button";
import { AuthenticationScreen, authStyles } from "./auth-layout";
import { emailPlaceholder, WaitNotice } from "./auth-parts";
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
    return (
      <AuthenticationScreen brand={false} title="Revisa tu correo" topBar={topBar}>
        <BodyText>
          {`Si hay una cuenta con ${sentTo}, te enviamos un enlace para restablecer tu contraseña.`}
        </BodyText>
        <BodyText style={authStyles.muted}>
          El enlace vence en 30 minutos. Si no llega, revisa tu carpeta de spam.
        </BodyText>
        <TextButton label="Volver a iniciar sesión" onPress={onBack} />
      </AuthenticationScreen>
    );
  }

  return (
    <AuthenticationScreen
      brand={!limited}
      tagline={!teamAccess}
      teamAccess={teamAccess}
      topBar={topBar}
    >
      <BodyText>Te enviaremos un enlace para restablecer tu contraseña.</BodyText>
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
        placeholder={emailPlaceholder(teamAccess)}
        value={email}
      />
      {failure === null ? null : (
        <BodyText accessibilityRole="alert">{failure}</BodyText>
      )}
      <PrimaryButton
        disabled={submitting || limited}
        label="Enviar enlace"
        onPress={submit}
      />
      {limited ? (
        <TextButton label="Volver a iniciar sesión" onPress={onBack} />
      ) : null}
    </AuthenticationScreen>
  );
}
