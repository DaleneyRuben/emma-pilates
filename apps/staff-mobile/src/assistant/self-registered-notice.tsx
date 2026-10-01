import {
  BodyText,
  colors,
  formatCountdown,
  PrimaryButton,
  spacing,
  TextButton,
  typography,
  useCountdown,
} from "@pilates/mobile-core";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import { limitedEmailMessage } from "./assistant-format";

const problemOf = (error: unknown) =>
  error instanceof AssistantApiError ? error : null;

/**
 * S05 «Verificación pendiente», also on S06: she registered herself, so only a
 * new verification link is offered, never an activation link.
 */
export function SelfRegisteredNotice({
  clientId,
  email,
  onOpen,
}: {
  clientId: string;
  email: string;
  /** S05's «Ver cliente»; S06 already shows her. */
  onOpen?: () => void;
}) {
  const fetcher = useStaffFetcher();
  const api = useMemo(() => createAssistantApi(fetcher), [fetcher]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);
  const [waitSeconds, startWait] = useCountdown();

  const send = async () => {
    setSending(true);
    setSent(false);
    setFailure(null);
    setLimited(false);
    try {
      await api.sendVerification(clientId);
      setSent(true);
    } catch (error) {
      const problem = problemOf(error);
      if (problem?.code === "email_throttled") {
        startWait(problem.retryAfterSeconds);
        setLimited(true);
      } else {
        setFailure("No pudimos enviar el enlace. Inténtalo de nuevo.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.notice}>
      <BodyText accessibilityRole="alert">
        Este correo ya se registró desde la app y espera verificación. No
        cambiamos sus datos ni su contraseña.
      </BodyText>
      <BodyText style={styles.email}>{email}</BodyText>
      <BodyText style={styles.note}>
        Puedes enviarle un enlace de verificación nuevo, válido por 24 horas.
        Los anteriores dejan de funcionar.
      </BodyText>
      {sent ? (
        <BodyText style={styles.success}>
          Enviamos un enlace de verificación nuevo.
        </BodyText>
      ) : null}
      {failure !== null ? <BodyText style={styles.failure}>{failure}</BodyText> : null}
      {limited ? <BodyText>{limitedEmailMessage}</BodyText> : null}
      {waitSeconds > 0 ? (
        <BodyText style={styles.note}>
          {`Podrás reenviarlo en ${formatCountdown(waitSeconds)}.`}
        </BodyText>
      ) : null}
      <PrimaryButton
        disabled={sending || waitSeconds > 0}
        label="Enviar enlace de verificación"
        onPress={() => void send()}
      />
      {onOpen ? <TextButton label="Ver cliente" onPress={onOpen} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  email: { color: colors.text, fontWeight: "600" },
  failure: { color: colors.errorText },
  note: { color: colors.textMuted, fontSize: typography.note },
  notice: { gap: spacing.md },
  success: { color: colors.successText, fontSize: typography.note },
});
