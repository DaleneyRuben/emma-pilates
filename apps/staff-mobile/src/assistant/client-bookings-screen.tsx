import {
  getGetAssistantClientOverviewQueryKey,
  getListAssistantClientBookingsQueryKey,
  useListAssistantClientBookings,
  type AssistantClientBookingDto,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  BrandToast,
  CardActionRow,
  cardWithActionRow,
  colors,
  ConfirmationSheet,
  dayChipLabel,
  EmptyState,
  fontFamilies,
  formatSessionDate,
  formatTimeRange,
  IconRow,
  IconRowGroup,
  isInsideCancellationWindow,
  LoadingState,
  NoticeRow,
  PrimaryButton,
  QueryFailure,
  Screen,
  spacing,
  surfaces,
  useStickyNotice,
  useStudioRules,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { StatusPill } from "../ui/session-row";
import { createAssistantApi } from "./assistant-api";
import type { ConfirmedBooking } from "./assistant-session-detail-screen";
import { ClientRecordsHeader } from "./client-records-header";
import type { ClientContext } from "./client-overview-screen";

type BookingsNavigation = {
  goBack: () => void;
  setParams: (params: { confirmed?: ConfirmedBooking }) => void;
  navigate: {
    (screen: "BrowseSessions", params: ClientContext): void;
    (screen: "Reschedule", params: ClientContext & { booking: AssistantClientBookingDto }): void;
  };
};

// «2 h 30» for the Studio Setting's 150 minutes (BKM-004).
function windowLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest}`;
}

/** The date disc on the left of a v2 booking card (S21). */
function DateDisc({ startsAt }: { startsAt: string }) {
  const civil = boliviaCivilDate(new Date(startsAt));
  const { weekday, day } = dayChipLabel(civil);
  const today = civil === boliviaCivilDate(new Date());
  return (
    <View style={styles.disc}>
      <Text style={styles.discWeekday}>
        {today ? "Hoy" : weekday.charAt(0).toUpperCase() + weekday.slice(1)}
      </Text>
      <Text style={styles.discDay}>{day}</Text>
    </View>
  );
}

function BookingCard({
  cancellationWindowMinutes,
  item,
  onCancel,
  onLeave,
  onReschedule,
}: {
  cancellationWindowMinutes: number | undefined;
  item: AssistantClientBookingDto;
  onCancel: () => void;
  onLeave: () => void;
  onReschedule: () => void;
}) {
  // The window is a Studio Setting (BKM-004): until it is known, a Booking
  // offers neither Cancelar nor Reprogramar rather than guess.
  const windowKnown = cancellationWindowMinutes !== undefined;
  const insideWindow =
    item.kind === "booking" &&
    windowKnown &&
    isInsideCancellationWindow(item.startsAt, new Date(), cancellationWindowMinutes);
  const locked = !item.actionable;
  const time = formatTimeRange(item.startsAt, item.endsAt);
  const line = insideWindow
    ? `${time} · faltan menos de ${windowLabel(cancellationWindowMinutes)}`
    : `${time} · ${item.trainerName} · ${item.branchName}`;

  return (
    <View style={[styles.card, windowKnown || item.kind === "waitlist" ? styles.withAction : null]}>
      <View style={styles.cardBody}>
        <DateDisc startsAt={item.startsAt} />
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{item.classTypeName}</Text>
          <Text style={styles.line}>{line}</Text>
          {item.kind === "waitlist" ? <StatusPill label="En lista de espera" /> : null}
          {locked ? <Text style={styles.line}>Solo en tus sucursales</Text> : null}
        </View>
      </View>
      {item.kind === "waitlist" ? (
        <CardActionRow disabled={locked} label="Salir de la lista" onPress={onLeave} />
      ) : !windowKnown ? null : insideWindow ? (
        <CardActionRow disabled={locked} label="Reprogramar" onPress={onReschedule} />
      ) : (
        <CardActionRow disabled={locked} label="Cancelar reserva" onPress={onCancel} tone="error" />
      )}
    </View>
  );
}

export function ClientBookingsScreen({
  route,
}: {
  route: { params: ClientContext & { confirmed?: ConfirmedBooking } };
}) {
  const { clientId, clientName } = route.params;
  const navigation = useNavigation<BookingsNavigation>();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const api = useMemo(() => createAssistantApi(fetcher), [fetcher]);
  const studioRules = useStudioRules(fetcher);
  const dismissNotice = () => navigation.setParams({ confirmed: undefined });
  const notice = useStickyNotice(route.params.confirmed, dismissNotice);
  const [cancelling, setCancelling] = useState<AssistantClientBookingDto | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  // Walkthrough n.º 29: a cancellation is confirmed like a booking is.
  const [cancelledShown, setCancelledShown] = useState(false);
  const cancelledNotice = useStickyNotice(cancelledShown ? true : undefined, () =>
    setCancelledShown(false),
  );
  const upcoming = useListAssistantClientBookings(clientId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });

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
      // «Reserva confirmada» no longer holds once a booking is cancelled,
      // often the one it confirmed (MOB-074).
      dismissNotice();
      setCancelledShown(true);
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
      setFailure("No pudimos sacar a la clienta de la lista de espera. Inténtalo de nuevo.");
    } finally {
      await refresh();
    }
  };

  const items = upcoming.data?.status === 200 ? upcoming.data.data : [];
  const context = { clientId, clientName };

  return (
    <Screen style={styles.screen}>
      <ClientRecordsHeader context={context} selected="upcoming" />
      {failure !== null ? (
        <View accessibilityLabel={failure} accessibilityRole="alert">
          <NoticeRow message={failure} />
        </View>
      ) : null}
      {upcoming.isPending ? (
        <LoadingState label="Cargando reservas" />
      ) : upcoming.isError || upcoming.data.status !== 200 ? (
        <QueryFailure
          label="No pudimos cargar las reservas."
          onRetry={() => void upcoming.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          action={
            <PrimaryButton
              label="Reservar una clase"
              onPress={() => navigation.navigate("BrowseSessions", context)}
            />
          }
          icon="calendar"
          message="Puedes reservarle una clase desde el horario del estudio."
          title="No tiene reservas próximas"
          variant="plain"
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((item) => (
            <BookingCard
              cancellationWindowMinutes={studioRules?.cancellationWindowMinutes}
              item={item}
              key={item.bookingId ?? item.waitlistEntryId}
              onCancel={() => setCancelling(item)}
              onLeave={() => void leave(item)}
              onReschedule={() => navigation.navigate("Reschedule", { ...context, booking: item })}
            />
          ))}
        </ScrollView>
      )}
      <ConfirmationSheet
        confirmLabel="Sí, cancelar la reserva"
        dismissLabel="No, volver"
        note="La clase vuelve a su plan y le avisamos."
        onConfirm={() => void confirmCancel()}
        onDismiss={() => setCancelling(null)}
        testID="assistant-cancel-booking-sheet"
        title={`¿Cancelar esta reserva de ${clientName}?`}
        visible={cancelling !== null}
      >
        {cancelling !== null ? (
          <IconRowGroup>
            <IconRow
              icon="calendar"
              label={`${cancelling.classTypeName} · ${formatSessionDate(cancelling.startsAt)}, ${formatTimeRange(cancelling.startsAt, cancelling.endsAt).split(" – ")[0]}`}
            />
          </IconRowGroup>
        ) : null}
      </ConfirmationSheet>
      {notice !== null ? (
        <BrandToast
          note={`${notice.classTypeName} · ${formatSessionDate(notice.startsAt)} · ${formatTimeRange(notice.startsAt, notice.endsAt)}`}
          onClose={dismissNotice}
          title="Reserva confirmada"
        />
      ) : null}
      {cancelledNotice !== null && notice === null ? (
        <BrandToast
          // Every cancellation the API accepts gives the class back.
          note="La clase volvió a su plan"
          onClose={() => setCancelledShown(false)}
          title="Reserva cancelada"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  cardBody: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  cardText: { alignItems: "flex-start", flex: 1, gap: spacing.xs },
  cardTitle: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 20 },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    width: 48,
  },
  discDay: { color: colors.primaryOnTint, fontFamily: fontFamilies.display, fontSize: 18 },
  discWeekday: { color: colors.primaryOnTint, fontFamily: fontFamilies.bodyMedium, fontSize: 11 },
  line: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13 },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  screen: { gap: spacing.lg, paddingHorizontal: spacing.xlSm },
  withAction: cardWithActionRow,
});
