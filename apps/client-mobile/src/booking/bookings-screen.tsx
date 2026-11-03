import {
  cancelBooking,
  getGetCurrentClientSubscriptionQueryKey,
  getListUpcomingBookingsQueryKey,
  leaveWaitlist,
  useGetCurrentClientSubscription,
  useListUpcomingBookings,
  type UpcomingBookingDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  BrandToast,
  colors,
  ConfirmationSheet,
  Heading,
  LoadingState,
  QueryFailure,
  Screen,
  SegmentedTabs,
  StateScreen,
  spacing,
  usePullToRefresh,
  useRefetchOnFocus,
  useStudioRules,
  useStickyNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { bookingRejectionMessage, problemCode } from "./booking-rejection-copy";
import { BookingCard, CancelBookingFacts } from "./booking-card";
import { ClassHistoryTab } from "./class-history-tab";
import type { ConfirmedBooking } from "./session-detail-screen";
import { formatSessionDate, formatTimeRange } from "@pilates/mobile-core";

type BookingsTab = "history" | "upcoming";

type BookingsNavigation = {
  navigate: {
    (screen: "Booking"): void;
    (screen: "Reschedule", params: { booking: UpcomingBookingDto }): void;
  };
  setParams: (params: { confirmed?: ConfirmedBooking; tab?: BookingsTab }) => void;
};

export function BookingsScreen({
  route,
}: {
  route: { params?: { confirmed?: ConfirmedBooking; tab?: BookingsTab } };
}) {
  const navigation = useNavigation<BookingsNavigation>();
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const dismissConfirmed = () => navigation.setParams({ confirmed: undefined });
  const confirmed = useStickyNotice(route.params?.confirmed, dismissConfirmed);
  const tab = route.params?.tab ?? "upcoming";
  const [cancelling, setCancelling] = useState<UpcomingBookingDto | null>(null);
  const [cancelInFlight, setCancelInFlight] = useState(false);
  const cancelStarted = useRef(false);
  const [failure, setFailure] = useState<string | null>(null);
  const upcoming = useListUpcomingBookings({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const subscription = useGetCurrentClientSubscription({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const studioRules = useStudioRules(fetcher);
  const queryKeys = [getListUpcomingBookingsQueryKey(), getGetCurrentClientSubscriptionQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getListUpcomingBookingsQueryKey() }),
      queryClient.invalidateQueries({
        queryKey: getGetCurrentClientSubscriptionQueryKey(),
      }),
    ]);

  const confirmCancel = async () => {
    if (
      cancelStarted.current ||
      cancelInFlight ||
      cancelling === null ||
      cancelling.bookingId === undefined
    ) {
      return;
    }
    cancelStarted.current = true;
    setCancelInFlight(true);
    setFailure(null);
    try {
      const response = await cancelBooking(cancelling.bookingId, undefined, fetcher);
      if (response.status === 204) {
        // «Reserva confirmada» no longer holds once a Booking is cancelled.
        dismissConfirmed();
      } else {
        setFailure(
          bookingRejectionMessage(problemCode(response.data)) ??
            "No pudimos cancelar la reserva. Inténtalo de nuevo.",
        );
      }
    } catch {
      setFailure("No pudimos cancelar la reserva. Inténtalo de nuevo.");
    } finally {
      cancelStarted.current = false;
      setCancelInFlight(false);
      setCancelling(null);
      await refresh();
    }
  };

  const leave = async (item: UpcomingBookingDto) => {
    if (item.waitlistEntryId === undefined) return;
    setFailure(null);
    try {
      const response = await leaveWaitlist(item.waitlistEntryId, undefined, fetcher);
      if (response.status !== 204) {
        setFailure("No pudimos sacarte de la lista de espera. Inténtalo de nuevo.");
      }
    } catch {
      setFailure("No pudimos sacarte de la lista de espera. Inténtalo de nuevo.");
    } finally {
      await refresh();
    }
  };

  const remaining =
    subscription.data?.status === 200
      ? subscription.data.data.subscription?.remainingClassAllowance
      : undefined;
  const items = upcoming.data?.status === 200 ? upcoming.data.data : [];

  return (
    <Screen style={styles.screen}>
      <Heading accessibilityLabel="Mis reservas" accessibilityRole="header">
        Mis reservas
      </Heading>
      <SegmentedTabs
        accessibilityLabel="Reservas"
        onSelect={(key) => navigation.setParams({ tab: key })}
        options={[
          { key: "upcoming", label: "Próximas", testID: "bookings-tab-upcoming" },
          { key: "history", label: "Historial", testID: "bookings-tab-history" },
        ]}
        selected={tab}
      />
      {failure !== null ? (
        <BodyText accessibilityRole="alert" style={styles.failure}>
          {failure}
        </BodyText>
      ) : null}
      {tab === "history" ? (
        <ClassHistoryTab />
      ) : upcoming.isPending ? (
        <LoadingState label="Cargando reservas" />
      ) : upcoming.isError || upcoming.data.status !== 200 ? (
        <QueryFailure
          label="No pudimos cargar tus reservas."
          onRetry={() => void upcoming.refetch()}
        />
      ) : items.length === 0 ? (
        <ScrollView contentContainerStyle={styles.empty} refreshControl={refreshControl}>
          <StateScreen
            icon="calendar"
            note="Cuando reserves una clase, aparecerá aquí."
            primaryAction={{
              label: "Reservar una clase",
              onPress: () => navigation.navigate("Booking"),
            }}
            title="Aún no tienes reservas"
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={refreshControl}
          testID="bookings-scroll"
        >
          {items.map((item) => (
            <BookingCard
              cancellationWindowMinutes={studioRules?.cancellationWindowMinutes}
              item={item}
              key={item.bookingId ?? item.waitlistEntryId}
              onCancel={() => setCancelling(item)}
              onLeave={() => void leave(item)}
              onReschedule={() => navigation.navigate("Reschedule", { booking: item })}
            />
          ))}
        </ScrollView>
      )}
      <ConfirmationSheet
        confirmLabel="Sí, cancelar reserva"
        confirmTestID="booking-cancel-confirm"
        onConfirm={() => {
          if (cancelInFlight) return;
          void confirmCancel();
        }}
        onDismiss={() => setCancelling(null)}
        testID="booking-cancel-sheet"
        title="¿Cancelar esta reserva?"
        visible={cancelling !== null}
      >
        {cancelling !== null ? <CancelBookingFacts booking={cancelling} /> : null}
      </ConfirmationSheet>
      {confirmed !== null ? (
        <BrandToast
          note={
            confirmed.planName === "Pase de invitada"
              ? "Tu pase de invitada ya se usó."
              : remaining !== undefined
                ? `Te quedan ${remaining} clases en tu plan`
                : `${confirmed.classTypeName} · ${formatSessionDate(confirmed.startsAt)} · ${formatTimeRange(confirmed.startsAt, confirmed.endsAt)}`
          }
          onClose={dismissConfirmed}
          title="Reserva confirmada"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { flexGrow: 1 },
  failure: { color: colors.errorText },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  screen: { gap: spacing.lg },
});
