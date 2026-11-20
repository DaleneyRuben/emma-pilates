import {
  getGetAssistantClientOverviewQueryKey,
  getGetClientInvitationQueryKey,
  useGetClientInvitation,
  formatListDate,
} from "@pilates/api-contracts";
import {
  colors,
  ConfirmationSheet,
  fontFamilies,
  FormField,
  NoticeRow,
  OutlinedButton,
  radii,
  spacing,
  surfaces,
  TextButton,
  typography,
  useCountdown,
  WaitNotice,
} from "@pilates/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SoftNote } from "../profile/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import { accountEmailLimitCode, resendLimitNotice } from "./assistant-format";
import { InvitationMenu } from "./invitation-menu";
import { SelfRegisteredNotice } from "./self-registered-notice";
import { StateCard } from "./state-card";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const invitationProblems: Record<string, string> = {
  email_in_use: "Este correo ya pertenece a otra cuenta.",
  invitation_has_activity:
    "La cuenta ya tiene pagos o reservas, así que la invitación se mantiene.",
};

// Walkthrough finding 95: a lapsed link «venció»; «Reenviar enlace» stays.
const activationNote = (expiresAt: string | null | undefined): string | undefined => {
  if (!expiresAt) return undefined;
  const verb = new Date(expiresAt).getTime() <= Date.now() ? "venció" : "vence";
  return `El enlace ${verb} el ${formatListDate(expiresAt)}`;
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
        note={activationNote(pending.activationExpiresAt)}
        testID="pending-card"
        title="Cuenta pendiente de activación"
        trailing={more}
      >
        {showReopened ? (
          <SoftNote
            icon="check"
            message={`${firstName(clientName)} ya estaba pendiente de activación. Le enviamos un enlace nuevo y conservamos sus datos.`}
          />
        ) : null}
        {notice !== null ? <SoftNote icon="check" message={notice} /> : null}
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
            {/* «Reservar clase» stays the screen's one solid button (FIX-089). */}
            <OutlinedButton
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
  block: { gap: spacing.smLg },
  // E-C12: the menu's way in, a 40 pt circle ringed in 400.
  more: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  moreDots: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.titleSmall,
    fontWeight: "700",
    lineHeight: 22,
  },
  pendingCard: { ...surfaces.card, padding: spacing.lg },
});
