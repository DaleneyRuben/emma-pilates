import {
  getGetAssistantClientOverviewQueryKey,
  getListAssistantClientBookingsQueryKey,
  useListAssistantClientBookings,
  type AssistantClientBookingDto,
} from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  formatSessionDate,
  formatTimeRange,
  Heading,
  isInsideCancellationWindow,
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
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { createAssistantApi } from "./assistant-api";
import type { ConfirmedBooking } from "./assistant-session-detail-screen";
import { ClientBanner } from "./client-banner";
import type { ClientContext } from "./client-overview-screen";

const noticeVisibleMs = 8_000;

type BookingsNavigation = {
  goBack: () => void;
  setParams: (params: { confirmed?: ConfirmedBooking }) => void;
  navigate: {
    (screen: "BrowseSessions", params: ClientContext): void;
    (
      screen: "Reschedule",
      params: ClientContext & { booking: AssistantClientBookingDto },
    ): void;
  };
};

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function OutlinedAction({
  disabled = false,
  label,
  onPress,
  tone = "neutral",
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: "neutral" | "error";
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.action,
        tone === "error" && styles.actionError,
        disabled && styles.actionDisabled,
      ]}
    >
      <Text style={[styles.actionLabel, tone === "error" && styles.actionLabelError]}>
        {label}
      </Text>
    </Pressable>
  );
}

function BookingCard({
  item,
  onCancel,
  onLeave,
  onReschedule,
}: {
  item: AssistantClientBookingDto;
  onCancel: () => void;
  onLeave: () => void;
  onReschedule: () => void;
}) {
  const insideWindow =
    item.kind === "booking" && isInsideCancellationWindow(item.startsAt, new Date());
  const locked = !item.actionable;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.classTypeName}</Text>
        {item.kind === "waitlist" ? (
          <Badge label="En lista de espera" />
        ) : insideWindow ? (
          <Badge label="No cancelable" />
        ) : null}
      </View>
      <BodyText>{`${item.trainerName} · ${item.branchName}`}</BodyText>
      <BodyText>
        {`${formatSessionDate(item.startsAt)} · ${formatTimeRange(item.startsAt, item.endsAt)}`}
      </BodyText>
      {item.kind === "waitlist" ? (
        <OutlinedAction
          disabled={locked}
          label="Salir de la lista de espera"
          onPress={onLeave}
        />
      ) : insideWindow ? (
        <OutlinedAction disabled={locked} label="Reprogramar" onPress={onReschedule} />
      ) : (
        <OutlinedAction disabled={locked} label="Cancelar" onPress={onCancel} />
      )}
      {locked ? <BodyText style={styles.lockedNote}>Solo en tus sucursales</BodyText> : null}
    </View>
  );
}

export function ClientBookingsScreen({
  route,
}: {
  route: { params: ClientContext & { confirmed?: ConfirmedBooking } };
}) {
  const { clientId, clientName, confirmed } = route.params;
  const navigation = useNavigation<BookingsNavigation>();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const api = useMemo(() => createAssistantApi(fetcher), [fetcher]);
  const [notice, setNotice] = useState<ConfirmedBooking | null>(null);
  const [cancelling, setCancelling] = useState<AssistantClientBookingDto | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const upcoming = useListAssistantClientBookings(clientId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });

  useEffect(() => {
    if (confirmed === undefined) return undefined;
    setNotice(confirmed);
    navigation.setParams({ confirmed: undefined });
    const timer = setTimeout(() => setNotice(null), noticeVisibleMs);
    return () => clearTimeout(timer);
  }, [confirmed, navigation]);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: getListAssistantClientBookingsQueryKey(clientId),
      }),
      queryClient.invalidateQueries({
        queryKey: getGetAssistantClientOverviewQueryKey(clientId),
      }),
    ]);

  const confirmCancel = async () => {
    if (cancelling === null || cancelling.bookingId === undefined) return;
    setFailure(null);
    try {
      await api.cancelBooking(cancelling.bookingId);
    } catch {
      setFailure("No pudimos cancelar la reserva. Inténtalo de nuevo.");
    } finally {
      setCancelling(null);
      await refresh();
    }
  };

  const leave = async (item: AssistantClientBookingDto) => {
    if (item.waitlistEntryId === undefined) return;
    setFailure(null);
    try {
      await api.leaveWaitlist(item.waitlistEntryId);
    } catch {
      setFailure("No pudimos sacar al cliente de la lista de espera. Inténtalo de nuevo.");
    } finally {
      await refresh();
    }
  };

  const items = upcoming.data?.status === 200 ? upcoming.data.data : [];
  const context = { clientId, clientName };

  return (
    <Screen style={styles.screen}>
      <BackLink onPress={() => navigation.goBack()} />
      <Heading accessibilityLabel="Reservas de la clienta">Reservas de la clienta</Heading>
      <ClientBanner action="Viendo reservas de" clientName={clientName} />
      {notice !== null ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Reserva confirmada</Text>
          <BodyText style={styles.noticeBody}>
            {`${notice.classTypeName} · ${formatSessionDate(notice.startsAt)} · ${formatTimeRange(notice.startsAt, notice.endsAt)}`}
          </BodyText>
        </View>
      ) : null}
      {failure !== null ? (
        <BodyText accessibilityRole="alert" style={styles.failure}>
          {failure}
        </BodyText>
      ) : null}
      {upcoming.isPending ? (
        <BodyText accessibilityLabel="Cargando reservas">Cargando…</BodyText>
      ) : upcoming.isError || upcoming.data.status !== 200 ? (
        <QueryFailure
          label="No pudimos cargar las reservas."
          onRetry={() => void upcoming.refetch()}
        />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <BodyText>Esta clienta no tiene reservas próximas.</BodyText>
          <PrimaryButton
            label="Reservar una clase"
            onPress={() => navigation.navigate("BrowseSessions", context)}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((item) => (
            <BookingCard
              item={item}
              key={item.bookingId ?? item.waitlistEntryId}
              onCancel={() => setCancelling(item)}
              onLeave={() => void leave(item)}
              onReschedule={() =>
                navigation.navigate("Reschedule", { ...context, booking: item })
              }
            />
          ))}
        </ScrollView>
      )}
      <Modal
        animationType="slide"
        onRequestClose={() => setCancelling(null)}
        transparent
        visible={cancelling !== null}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{`¿Cancelar esta reserva de ${clientName}?`}</Text>
            {cancelling !== null ? (
              <BodyText>
                {`${cancelling.classTypeName} · ${formatSessionDate(cancelling.startsAt)} · ${formatTimeRange(cancelling.startsAt, cancelling.endsAt)}`}
              </BodyText>
            ) : null}
            <BodyText>La clase vuelve al saldo del plan y el cupo se libera.</BodyText>
            <OutlinedAction
              label="Sí, cancelar reserva"
              onPress={() => void confirmCancel()}
              tone="error"
            />
            <TextButton label="Volver" onPress={() => setCancelling(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: spacing.xs,
    minHeight: 44,
  },
  actionDisabled: { opacity: 0.45 },
  actionError: { borderColor: colors.error },
  actionLabel: { color: colors.text, fontSize: typography.body },
  actionLabelError: { color: colors.errorText },
  badge: {
    backgroundColor: "rgba(201,154,78,0.16)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.smLg,
    paddingVertical: spacing.xs,
  },
  badgeText: { color: colors.warningText, fontSize: typography.label, fontWeight: "600" },
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
  empty: { gap: spacing.lg, paddingTop: spacing.xl },
  failure: { color: colors.errorText },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  lockedNote: { color: colors.textMuted, fontSize: typography.label, textAlign: "center" },
  notice: {
    backgroundColor: "rgba(124,148,115,0.14)",
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  noticeBody: { color: colors.successText, fontSize: typography.note },
  noticeTitle: { color: colors.successText, fontSize: typography.bodyLarge, fontWeight: "600" },
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
});
