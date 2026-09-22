import {
  getGetAssistantClientOverviewQueryKey,
  getGetClientInvitationQueryKey,
  useGetAssistantClientOverview,
  useGetClientInvitation,
  type ClientOverviewDto,
} from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  formatSessionDate,
  formatTimeRange,
  FormField,
  Heading,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { useInClientPanel } from "./assistant-workspace";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import {
  describeClasses,
  formatCivilDate,
  formatInstantDate,
} from "./assistant-format";

export type ClientContext = { clientId: string; clientName: string };

type OverviewNavigation = {
  goBack: () => void;
  popToTop: () => void;
  navigate: {
    (screen: "BrowseSessions", params: ClientContext): void;
    (screen: "SelectPlan", params: ClientContext): void;
    (screen: "ClientBookings", params: ClientContext): void;
    (screen: "ClientHistory", params: ClientContext): void;
  };
};

const invitationProblems: Record<string, string> = {
  email_in_use: "Este correo ya pertenece a otra cuenta.",
  email_throttled:
    "Ya enviamos un correo a esa dirección hace poco. Inténtalo en unos minutos.",
  invitation_has_activity:
    "La cuenta ya tiene pagos o reservas, así que la invitación se mantiene.",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function problemMessage(error: unknown, fallback: string): string {
  const code = error instanceof AssistantApiError ? error.code : null;
  return (code !== null ? invitationProblems[code] : undefined) ?? fallback;
}

function OutlinedButton({
  label,
  onPress,
  tone = "primary",
}: {
  label: string;
  onPress: () => void;
  tone?: "primary" | "error";
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.outlined, tone === "error" && styles.outlinedError]}
    >
      <Text style={[styles.outlinedLabel, tone === "error" && styles.outlinedLabelError]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SubscriptionCard({
  view,
}: {
  view: ClientOverviewDto["subscription"];
}) {
  const subscription = view.subscription;
  if (subscription === null || subscription === undefined) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sin plan activo</Text>
        <BodyText style={styles.muted}>
          Registra un pago en efectivo para activar un plan.
        </BodyText>
      </View>
    );
  }
  const active = view.status === "active" || view.status === "expiring_soon";
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{subscription.planName}</Text>
        <View style={[styles.badge, active ? styles.badgeActive : styles.badgeExpired]}>
          <Text style={[styles.badgeLabel, active ? styles.badgeLabelActive : styles.badgeLabelExpired]}>
            {active ? "Activa" : "Vencida"}
          </Text>
        </View>
      </View>
      <BodyText>{`${subscription.remainingClassAllowance} clases restantes`}</BodyText>
      <BodyText style={styles.muted}>
        {`${active ? "Vence el" : "Venció el"} ${formatCivilDate(subscription.endsOn)}`}
      </BodyText>
    </View>
  );
}

function PendingInvitationCard({
  clientId,
  clientName,
  onCancelled,
}: {
  clientId: string;
  clientName: string;
  onCancelled: () => void;
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
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

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
    try {
      await work();
    } catch (error) {
      setFailure(problemMessage(error, fallback));
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

  const changeEmail = () =>
    run(async () => {
      if (!emailPattern.test(email.trim())) {
        throw new AssistantApiError(400, "invalid_email");
      }
      await api.correctInvitationEmail(clientId, email.trim());
      await refresh();
      setEditingEmail(false);
      setNotice("Enviamos el enlace de activación al nuevo correo.");
    }, "Escribe un correo válido.");

  const cancel = () =>
    run(async () => {
      await api.cancelInvitation(clientId);
      setConfirmingCancel(false);
      onCancelled();
    }, "No pudimos cancelar la invitación. Inténtalo de nuevo.");

  return (
    <View style={styles.pendingCard}>
      <Text style={styles.cardTitle}>Cuenta pendiente de activación</Text>
      <BodyText>{pending.email}</BodyText>
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
        <BodyText accessibilityRole="alert" style={styles.failure}>
          {failure}
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
          <OutlinedButton label="Cambiar correo" onPress={() => setEditingEmail(true)} />
          <OutlinedButton label="Reenviar enlace" onPress={() => void resend()} />
          {pending.cancellable ? (
            <TextButton
              label="Cancelar invitación"
              onPress={() => setConfirmingCancel(true)}
            />
          ) : null}
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

export function ClientOverviewScreen({
  route,
}: {
  route: { params: { clientId: string } };
}) {
  const { clientId } = route.params;
  const navigation = useNavigation<OverviewNavigation>();
  const fetcher = useStaffFetcher();
  const overview = useGetAssistantClientOverview(clientId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });

  // Beside the search on a tablet there is nowhere to go back to.
  const inPanel = useInClientPanel();
  const back = inPanel ? null : <BackLink onPress={() => navigation.goBack()} />;

  if (overview.isPending) {
    return (
      <Screen style={styles.screen}>
        {back}
        <BodyText accessibilityLabel="Cargando cliente">Cargando…</BodyText>
      </Screen>
    );
  }
  if (overview.isError || overview.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {back}
        <QueryFailure
          label="No pudimos cargar al cliente."
          onRetry={() => void overview.refetch()}
        />
      </Screen>
    );
  }

  const data = overview.data.data;
  const { client } = data;
  const context: ClientContext = { clientId: client.id, clientName: client.name };
  const canBook =
    (data.subscription.status === "active" ||
      data.subscription.status === "expiring_soon") &&
    (data.subscription.subscription?.remainingClassAllowance ?? 0) > 0;
  const hasActiveSubscription =
    data.subscription.status === "active" ||
    data.subscription.status === "expiring_soon";

  return (
    <Screen style={styles.screen}>
      {back}
      <ScrollView contentContainerStyle={styles.content}>
        <Heading accessibilityLabel={client.name}>{client.name}</Heading>
        <BodyText style={styles.muted}>
          {client.phone ? `${client.phone} · ${client.email}` : client.email}
        </BodyText>
        {client.accountStatus === "pending" ? (
          <PendingInvitationCard
            clientId={client.id}
            clientName={client.name}
            onCancelled={() => navigation.popToTop()}
          />
        ) : null}
        <SubscriptionCard view={data.subscription} />
        {data.nextBooking ? (
          <View style={styles.card}>
            <BodyText style={styles.label}>Próxima reserva</BodyText>
            <Text style={styles.cardTitle}>{data.nextBooking.classTypeName}</Text>
            <BodyText>
              {`${formatSessionDate(data.nextBooking.startsAt)} · ${formatTimeRange(data.nextBooking.startsAt, data.nextBooking.endsAt)}`}
            </BodyText>
          </View>
        ) : null}
        <View style={styles.actions}>
          <PrimaryButton
            disabled={!canBook}
            label="Reservar clase"
            onPress={() => navigation.navigate("BrowseSessions", context)}
          />
          <OutlinedButton
            label="Registrar pago en efectivo"
            onPress={() => navigation.navigate("SelectPlan", context)}
          />
          {hasActiveSubscription ? (
            <TextButton
              label="Ver reservas"
              onPress={() => navigation.navigate("ClientBookings", context)}
            />
          ) : null}
        </View>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Historial</Text>
            <TextButton
              label="Ver historial completo"
              onPress={() => navigation.navigate("ClientHistory", context)}
            />
          </View>
          {data.recentHistory.length === 0 ? (
            <BodyText style={styles.muted}>
              Aún no tiene clases en su historial.
            </BodyText>
          ) : (
            data.recentHistory.map((entry) => (
              <View key={entry.bookingId} style={styles.historyRow}>
                <Text style={styles.historyTitle}>{entry.classTypeName}</Text>
                <BodyText style={styles.muted}>
                  {`${entry.trainerName} · ${entry.branchName}`}
                </BodyText>
                <BodyText style={styles.muted}>
                  {formatSessionDate(entry.startsAt)}
                </BodyText>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  badge: { borderRadius: radii.pill, paddingHorizontal: spacing.smLg, paddingVertical: spacing.xs },
  badgeActive: { backgroundColor: "rgba(124,148,115,0.16)" },
  badgeExpired: { backgroundColor: "rgba(184,84,80,0.14)" },
  badgeLabel: { fontSize: typography.label, fontWeight: "600" },
  badgeLabelActive: { color: colors.successText },
  badgeLabelExpired: { color: colors.errorText },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  cardTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  failure: { color: colors.errorText },
  historyRow: { gap: spacing.xxs, paddingTop: spacing.sm },
  historyTitle: { color: colors.text, fontSize: typography.body, fontWeight: "500" },
  label: { color: colors.textMuted, fontSize: typography.label, textTransform: "uppercase" },
  muted: { color: colors.textMuted, fontSize: typography.note },
  outlined: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  outlinedError: { borderColor: colors.error },
  outlinedLabel: { color: colors.primaryDeep, fontSize: typography.body, fontWeight: "500" },
  outlinedLabelError: { color: colors.errorText },
  pendingActions: { gap: spacing.sm },
  pendingCard: {
    backgroundColor: "rgba(201,154,78,0.12)",
    borderRadius: radii.card,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  screen: { gap: spacing.md },
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
