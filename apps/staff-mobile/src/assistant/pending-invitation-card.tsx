import {
  getGetAssistantClientOverviewQueryKey,
  getGetClientInvitationQueryKey,
  useGetClientInvitation,
} from "@pilates/api-contracts";
import {
  colors,
  ConfirmationSheet,
  fontFamilies,
  FormField,
  NoticeRow,
  OutlinedButton,
  PrimaryButton,
  radii,
  spacing,
  TextButton,
  typography,
  useCountdown,
  WaitNotice,
} from "@pilates/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import { accountEmailLimitCode, formatInstantDate, resendLimitNotice } from "./assistant-format";
import { InvitationMenu } from "./invitation-menu";
import { SelfRegisteredNotice } from "./self-registered-notice";
import { StateCard } from "./state-card";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const invitationProblems: Record<string, string> = {
  email_in_use: "Este correo ya pertenece a otra cuenta.",
  invitation_has_activity:
    "La cuenta ya tiene pagos o reservas, así que la invitación se mantiene.",
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** S06's invitation card, above the plan while the Account is pending. */
export function PendingInvitationCard({
  clientId,
  clientEmail,
  clientName,
  onCancelled,
  reopened = false,
}: {
  clientId: string;
  clientEmail: string;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showReopened, setShowReopened] = useState(reopened);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [accountLimited, setAccountLimited] = useState(false);
  const [waitSeconds, startWait] = useCountdown();
  const accountWaiting = accountLimited && waitSeconds > 0;

  // The generated read only types its 200; a problem arrives as data too.
  const answer = invitation.data as { status: number; data: unknown } | undefined;
  if (answer !== undefined && answer.status !== 200) {
    const code = (answer.data as { code?: unknown } | null)?.code;
    // MOB-027: she registered herself, so S05's verification offer applies.
    return code === "client_verification_pending" ? (
      <View style={styles.pendingCard} testID="pending-card">
        <SelfRegisteredNotice clientId={clientId} email={clientEmail} surface="card" />
      </View>
    ) : null;
  }
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
    setAccountLimited(false);
    try {
      await work();
    } catch (error) {
      const problem = error instanceof AssistantApiError ? error : null;
      if (problem?.code === accountEmailLimitCode) {
        startWait(problem.retryAfterSeconds);
        setAccountLimited(true);
        return;
      }
      if (problem?.code === "email_throttled") {
        // S06 «Reenvío limitado»: the clock notice replaces a failure line.
        startWait(problem.retryAfterSeconds);
        return;
      }
      setFailure((problem?.code ? invitationProblems[problem.code] : undefined) ?? fallback);
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

  const more = (
    <Pressable
      accessibilityLabel="Más opciones de la invitación"
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={() => setMenuOpen(true)}
      style={styles.more}
      testID="pending-card-more"
    >
      <Text style={styles.moreDots}>⋯</Text>
    </Pressable>
  );

  return (
    <View style={styles.block}>
      <StateCard
        icon="clock"
        note={
          pending.activationExpiresAt
            ? `El enlace vence el ${formatInstantDate(pending.activationExpiresAt)}`
            : undefined
        }
        testID="pending-card"
        title="Cuenta pendiente de activación"
        trailing={more}
      >
        {showReopened ? (
          <Text style={styles.line}>
            {`${firstName(clientName)} ya estaba pendiente de activación. Le enviamos un enlace nuevo y conservamos sus datos.`}
          </Text>
        ) : null}
        {notice !== null ? <Text style={styles.line}>{notice}</Text> : null}
        {failure !== null ? (
          <View accessibilityLabel={failure} accessibilityRole="alert">
            <NoticeRow message={failure} />
          </View>
        ) : null}
        {waitSeconds > 0 ? (
          <WaitNotice
            {...resendLimitNotice(accountLimited)}
            remainingSeconds={waitSeconds}
            surface="card"
          />
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
              busy={busy}
              disabled={accountWaiting}
              label="Guardar correo"
              onPress={() => void changeEmail()}
            />
            <TextButton label="Cancelar" onPress={() => setEditingEmail(false)} />
          </>
        ) : null}
      </StateCard>
      {editingEmail ? null : (
        <OutlinedButton
          busy={busy && !confirmingCancel}
          disabled={busy || waitSeconds > 0}
          label="Reenviar enlace"
          onPress={() => void resend()}
        />
      )}
      <InvitationMenu
        cancellable={pending.cancellable}
        firstName={firstName(clientName)}
        onCancel={() => {
          setMenuOpen(false);
          setConfirmingCancel(true);
        }}
        onChangeEmail={() => {
          setMenuOpen(false);
          setEditingEmail(true);
        }}
        onClose={() => setMenuOpen(false)}
        visible={menuOpen}
      />
      <ConfirmationSheet
        busy={busy}
        confirmLabel="Sí, cancelar invitación"
        note="Se anularán los enlaces enviados, se liberará el correo y la cuenta pendiente desaparecerá."
        onConfirm={() => void cancel()}
        onDismiss={() => setConfirmingCancel(false)}
        testID="cancel-invitation-sheet"
        title={`¿Cancelar la invitación de ${clientName}?`}
        visible={confirmingCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  line: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  more: { alignItems: "center", height: 36, justifyContent: "center", width: 36 },
  moreDots: { color: colors.textMuted, fontSize: 22, lineHeight: 24 },
  pendingCard: { backgroundColor: colors.card, borderRadius: radii.card, padding: spacing.lg },
});
