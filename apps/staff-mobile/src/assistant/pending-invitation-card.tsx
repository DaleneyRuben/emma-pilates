import {
  getGetAssistantClientOverviewQueryKey,
  getGetClientInvitationQueryKey,
  useGetClientInvitation,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  formatCountdown,
  FormField,
  PrimaryButton,
  radii,
  spacing,
  TextButton,
  typography,
  useCountdown,
} from "@pilates/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import { formatInstantDate, limitedEmailMessage } from "./assistant-format";
import { OutlinedButton } from "./outlined-button";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const invitationProblems: Record<string, string> = {
  email_in_use: "Este correo ya pertenece a otra cuenta.",
  email_throttled: limitedEmailMessage,
  invitation_has_activity:
    "La cuenta ya tiene pagos o reservas, así que la invitación se mantiene.",
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** S06's invitation card, above the plan while the Account is pending. */
export function PendingInvitationCard({
  clientId,
  clientName,
  onCancelled,
  reopened = false,
}: {
  clientId: string;
  clientName: string;
  onCancelled: () => void;
  /** S05 reopened this pending invitation with the same email. */
  reopened?: boolean;
}) {
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const api = useMemo(() => createAssistantApi(fetcher), [fetcher]);
  const invitation = useGetClientInvitation(clientId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const [editingEmail, setEditingEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showReopened, setShowReopened] = useState(reopened);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [waitSeconds, startWait] = useCountdown();

  if (invitation.data?.status !== 200) return null;
  const pending = invitation.data.data;

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: getGetClientInvitationQueryKey(clientId),
      }),
      queryClient.invalidateQueries({
        queryKey: getGetAssistantClientOverviewQueryKey(clientId),
      }),
    ]);

  const run = async (work: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setFailure(null);
    setNotice(null);
    setShowReopened(false);
    try {
      await work();
    } catch (error) {
      const problem = error instanceof AssistantApiError ? error : null;
      if (problem?.code === "email_throttled") {
        startWait(problem.retryAfterSeconds);
      }
      setFailure(
        (problem?.code ? invitationProblems[problem.code] : undefined) ?? fallback,
      );
    } finally {
      setBusy(false);
    }
  };

  const resend = () =>
    run(async () => {
      await api.resendInvitation(clientId);
      await refresh();
      setNotice("Enviamos un nuevo enlace de activación.");
    }, "No pudimos reenviar el enlace. Inténtalo de nuevo.");

  const changeEmail = () => {
    if (!emailPattern.test(email.trim())) {
      setFailure("Escribe un correo válido.");
      return Promise.resolve();
    }
    return run(async () => {
      await api.correctInvitationEmail(clientId, email.trim());
      await refresh();
      setEditingEmail(false);
      setNotice("Enviamos el enlace de activación al nuevo correo.");
    }, "No pudimos cambiar el correo. Inténtalo de nuevo.");
  };

  const cancel = () =>
    run(async () => {
      await api.cancelInvitation(clientId);
      setConfirmingCancel(false);
      onCancelled();
    }, "No pudimos cancelar la invitación. Inténtalo de nuevo.");

  return (
    <View style={styles.pendingCard}>
      {showReopened ? (
        <BodyText style={styles.success}>
          {`${firstName(clientName)} ya estaba pendiente de activación. Le enviamos un enlace nuevo y conservamos sus datos.`}
        </BodyText>
      ) : null}
      <Text style={styles.cardTitle}>Cuenta pendiente de activación</Text>
      <View style={styles.emailLine}>
        <BodyText style={styles.email}>{pending.email}</BodyText>
        {editingEmail ? null : (
          <TextButton label="Cambiar correo" onPress={() => setEditingEmail(true)} />
        )}
      </View>
      {pending.activationExpiresAt ? (
        <BodyText style={styles.muted}>
          {`El enlace de activación vence el ${formatInstantDate(pending.activationExpiresAt)}.`}
        </BodyText>
      ) : null}
      <BodyText style={styles.muted}>
        La invitación se elimina a los 30 días sin activación, cambio de correo
        o reenvío.
      </BodyText>
      {notice !== null ? <BodyText style={styles.success}>{notice}</BodyText> : null}
      {failure !== null ? (
        <BodyText
          accessibilityRole="alert"
          style={failure === limitedEmailMessage ? undefined : styles.failure}
        >
          {failure}
        </BodyText>
      ) : null}
      {waitSeconds > 0 ? (
        <BodyText style={styles.muted}>
          {`Podrás reenviarlo en ${formatCountdown(waitSeconds)}.`}
        </BodyText>
      ) : null}
      {editingEmail ? (
        <>
          <FormField
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            label="Nuevo correo"
            onChangeText={setEmail}
            value={email}
          />
          <PrimaryButton
            disabled={busy}
            label="Guardar correo"
            onPress={() => void changeEmail()}
          />
          <TextButton label="Cancelar" onPress={() => setEditingEmail(false)} />
        </>
      ) : (
        <View style={styles.pendingActions}>
          <OutlinedButton
            disabled={busy || waitSeconds > 0}
            label="Reenviar enlace"
            onPress={() => void resend()}
          />
          {pending.cancellable ? (
            <TextButton
              label="Cancelar invitación"
              onPress={() => setConfirmingCancel(true)}
            />
          ) : (
            <BodyText style={styles.muted}>
              La cuenta ya tiene pagos o reservas, así que la invitación se
              mantiene.
            </BodyText>
          )}
        </View>
      )}
      <Modal
        animationType="slide"
        onRequestClose={() => setConfirmingCancel(false)}
        transparent
        visible={confirmingCancel}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{`¿Cancelar la invitación de ${clientName}?`}</Text>
            <BodyText>
              Se anularán los enlaces enviados, se liberará el correo y la
              cuenta pendiente desaparecerá.
            </BodyText>
            <OutlinedButton
              label="Sí, cancelar invitación"
              onPress={() => void cancel()}
              tone="error"
            />
            <TextButton label="Volver" onPress={() => setConfirmingCancel(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  email: { color: colors.text, flexShrink: 1 },
  emailLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  failure: { color: colors.errorText },
  muted: { color: colors.textMuted, fontSize: typography.note },
  pendingActions: { gap: spacing.sm },
  pendingCard: {
    backgroundColor: colors.warningTint,
    borderRadius: radii.card,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.frame,
    borderTopRightRadius: radii.frame,
    gap: spacing.md,
    padding: spacing.xl,
  },
  sheetBackdrop: {
    backgroundColor: "rgba(74,58,48,0.22)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetTitle: { color: colors.text, fontSize: typography.titleSecondary, fontWeight: "500" },
  success: { color: colors.successText, fontSize: typography.note },
});
