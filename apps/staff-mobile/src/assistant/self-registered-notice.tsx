import {
  BodyText,
  colors,
  Glyph,
  PrimaryButton,
  spacing,
  surfaces,
  TextButton,
  typography,
  useCountdown,
  WaitNotice,
  fontFamilies,
} from "@pilates/mobile-core";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import { accountEmailLimitCode, resendLimitNotice } from "./assistant-format";

const problemOf = (error: unknown) => (error instanceof AssistantApiError ? error : null);

/**
 * S05 «Verificación pendiente», also on S06: she registered herself, so only a
 * new verification link is offered, never an activation link.
 */
export function SelfRegisteredNotice({
  clientId,
  email,
  onOpen,
  surface = "screen",
}: {
  clientId: string;
  email: string;
  /** S05's «Ver clienta»; S06 already shows her. */
  onOpen?: () => void;
  /** «card» inside S06's pending card, «screen» on S05's form. */
  surface?: "card" | "screen";
}) {
  const fetcher = useStaffFetcher();
  const api = useMemo(() => createAssistantApi(fetcher), [fetcher]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);
  const [accountLimited, setAccountLimited] = useState(false);
  const [waitSeconds, startWait] = useCountdown();

  const send = async () => {
    setSending(true);
    setSent(false);
    setFailure(null);
    setLimited(false);
    setAccountLimited(false);
    try {
      await api.sendVerification(clientId);
      setSent(true);
    } catch (error) {
      const problem = problemOf(error);
      if (problem?.code === accountEmailLimitCode) {
        startWait(problem.retryAfterSeconds);
        setAccountLimited(true);
      } else if (problem?.code === "email_throttled") {
        startWait(problem.retryAfterSeconds);
        setLimited(true);
      } else {
        setFailure("No pudimos enviar el enlace. Inténtalo de nuevo.");
      }
    } finally {
      setSending(false);
    }
  };

  // E-C07: on S05 the notice is its own white card, an alert glyph on top.
  return (
    <View style={[styles.notice, surface === "screen" && styles.card]}>
      {surface === "screen" ? (
        <Glyph color={colors.text} name="alert" size={26} strokeWidth={1.6} />
      ) : null}
      <BodyText accessibilityRole="alert" style={surface === "screen" ? styles.lead : undefined}>
        Este correo ya se registró desde la app y espera verificación. No cambiamos sus datos ni su
        contraseña.
      </BodyText>
      <BodyText style={styles.email}>{email}</BodyText>
      <BodyText style={[styles.note, surface === "screen" && styles.screenNote]}>
        Puedes enviarle un enlace de verificación nuevo, válido por 24 horas. Los anteriores dejan
        de funcionar.
      </BodyText>
      {sent ? (
        <BodyText style={styles.success}>Enviamos un enlace de verificación nuevo.</BodyText>
      ) : null}
      {failure !== null ? <BodyText style={styles.failure}>{failure}</BodyText> : null}
      {(limited || accountLimited) && waitSeconds > 0 ? (
        <WaitNotice
          {...resendLimitNotice(accountLimited)}
          remainingSeconds={waitSeconds}
          surface={surface}
        />
      ) : null}
      <PrimaryButton
        busy={sending}
        disabled={waitSeconds > 0}
        label="Enviar enlace de verificación"
        onPress={() => void send()}
        size={surface === "card" ? "compact" : "regular"}
      />
      {onOpen ? <TextButton label="Ver clienta" onPress={onOpen} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, padding: spacing.xlSm },
  email: { color: colors.text, fontFamily: fontFamilies.bodyBold, fontWeight: "700" },
  failure: { color: colors.errorText },
  lead: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.bodyLarge,
    lineHeight: 24,
  },
  note: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  screenNote: { fontFamily: fontFamilies.body, fontSize: typography.body, lineHeight: 22 },
  notice: { gap: spacing.md },
  success: { color: colors.successText, fontFamily: fontFamilies.body, fontSize: typography.note },
});
