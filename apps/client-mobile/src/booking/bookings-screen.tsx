import {
  cancelBooking,
  getGetCurrentClientSubscriptionQueryKey,
  getListUpcomingBookingsQueryKey,
  formatDateTime,
  formatListDate,
  leaveWaitlist,
  useGetCurrentClientSubscription,
  useListUpcomingBookings,
  type UpcomingBookingDto,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  BrandToast,
  colors,
  ConfirmationSheet,
  Glyph,
  InlineError,
  LoadingState,
  QueryFailure,
  Screen,
  ScreenHeader,
  SegmentedTabs,
  StateScreen,
  spacing,
  surfaces,
  TabletGrid,
  useMountedAt,
  usePullToRefresh,
  useRefetchOnFocus,
  useStudioRules,
  useStickyNotice,
  useWideScreen,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { bookingRejectionMessage, problemCode } from "./booking-rejection-copy";
import { BookingCard, CancelBookingFacts } from "./booking-card";
import { ClassHistoryTab } from "./class-history-tab";
import { NextBookingHero } from "./next-booking-hero";
import { nextBookedClass } from "./next-class-hero";
import type { ConfirmedBooking } from "./session-detail-screen";
import { formatTimeRange } from "@pilates/mobile-core";
import { bookedSubscription, isGuestPass } from "./booked-subscription";
import { usedFreeClass } from "./free-class-notice";

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
  const wide = useWideScreen();
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const dismissConfirmed = () => navigation.setParams({ confirmed: undefined });
  const confirmed = useStickyNotice(route.params?.confirmed, dismissConfirmed);
  const tab = route.params?.tab ?? "upcoming";
  const [cancelling, setCancelling] = useState<UpcomingBookingDto | null>(null);
  const [leaving, setLeaving] = useState<UpcomingBookingDto | null>(null);
  const [cancelInFlight, setCancelInFlight] = useState(false);
  const cancelStarted = useRef(false);
  const [failure, setFailure] = useState<string | null>(null);
  // Walkthrough n.º 29: a cancellation is confirmed like a booking is.
  // FIX-019: with the Subscription the cancelled Booking had consumed.
  const [cancelled, setCancelled] = useState<{ subscriptionId?: string } | undefined>();
  const cancelledNotice = useStickyNotice(cancelled, () => setCancelled(undefined));
  // FIX-090: leaving the waitlist is confirmed afterwards, like a cancel.
  const [leftShown, setLeftShown] = useState(false);
  const leftNotice = useStickyNotice(leftShown ? true : undefined, () => setLeftShown(false));
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
    setCancelled(undefined);
    let accepted = false;
    try {
      const response = await cancelBooking(cancelling.bookingId, undefined, fetcher);
      if (response.status === 204) {
        // «Reserva confirmada · Te quedan N clases» no longer holds once a
        // Booking is cancelled, often the one it confirmed (MOB-074).
        dismissConfirmed();
        accepted = true;
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
      // After the refresh, so the toast's count is the one the cancel left.
      if (accepted) setCancelled({ subscriptionId: cancelling.subscriptionId });
    }
  };

  const leave = async (item: UpcomingBookingDto) => {
    if (item.waitlistEntryId === undefined) return;
    setFailure(null);
    setCancelled(undefined);
    setLeftShown(false);
    try {
      const response = await leaveWaitlist(item.waitlistEntryId, undefined, fetcher);
      if (response.status === 204) {
        setLeftShown(true);
      } else {
        setFailure("No pudimos sacarte de la lista de espera. Inténtalo de nuevo.");
      }
    } catch {
      setFailure("No pudimos sacarte de la lista de espera. Inténtalo de nuevo.");
    } finally {
      await refresh();
    }
  };

  const view = subscription.data?.status === 200 ? subscription.data.data : null;
  // The toasts speak of the Subscription the Booking consumed (FIX-019).
  const booked = bookedSubscription(view, confirmed?.subscriptionId);
  const freed = bookedSubscription(view, cancelledNotice?.subscriptionId);
  const items = upcoming.data?.status === 200 ? upcoming.data.data : [];
  // ClaseE (FIX-089): the first booked class tops the list as the hero.
  const next = nextBookedClass(items);
  const today = boliviaCivilDate(new Date(useMountedAt()));
  const cardProps = (item: UpcomingBookingDto) => ({
    cancellationWindowMinutes: studioRules?.cancellationWindowMinutes,
    item,
    onCancel: () => setCancelling(item),
    onLeave: () => setLeaving(item),
    onReschedule: () => navigation.navigate("Reschedule", { booking: item }),
  });

  const tabs = (
    <SegmentedTabs
      accessibilityLabel="Reservas"
      onSelect={(key) => navigation.setParams({ tab: key })}
      options={[
        { key: "upcoming", label: "Próximas", testID: "bookings-tab-upcoming" },
        { key: "history", label: "Historial", testID: "bookings-tab-history" },
      ]}
      selected={tab}
    />
  );

  return (
    <Screen style={styles.screen}>
      {/* C05: the Próximas and Historial tabs ride in the band; on a tablet
          they sit at the end of the title's row, 340 pt wide (05T, 07T). */}
      <ScreenHeader
        action={
          wide ? (
            <View style={styles.wideTabs} testID="bookings-band-tabs">
              {tabs}
            </View>
          ) : undefined
        }
        testID="bookings-header"
        title="Mis reservas"
      >
        {wide ? null : tabs}
      </ScreenHeader>
      {failure !== null ? (
        // C05i: the refusal on a soft notice with the alert glyph.
        <View style={styles.failureBox} testID="bookings-failure">
          <Glyph color={colors.text} name="alert" size={18} strokeWidth={1.5} />
          <InlineError style={styles.failure}>{failure}</InlineError>
        </View>
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
          contentContainerStyle={[styles.list, wide && styles.wideList]}
          refreshControl={refreshControl}
          testID="bookings-scroll"
        >
          {next === undefined ? null : <NextBookingHero {...cardProps(next)} today={today} />}
          {/* 05T: the other bookings two to a row on a tablet. */}
          <TabletGrid testID="bookings-grid">
            {items
              .filter((item) => item !== next)
              .map((item) => (
                <BookingCard key={item.bookingId ?? item.waitlistEntryId} {...cardProps(item)} />
              ))}
          </TabletGrid>
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
      <ConfirmationSheet
        confirmLabel="Sí, salir de la lista"
        confirmTestID="booking-leave-confirm"
        note="Dejas tu lugar en la lista para que lo tome otra persona."
        onConfirm={() => {
          const entry = leaving;
          setLeaving(null);
          if (entry !== null) void leave(entry);
        }}
        onDismiss={() => setLeaving(null)}
        testID="booking-leave-sheet"
        title="¿Salir de la lista de espera?"
        visible={leaving !== null}
      />
      {confirmed?.rescheduled === true ? (
        <BrandToast
          note={`${confirmed.classTypeName} · ${formatDateTime(confirmed.startsAt)}`}
          onClose={dismissConfirmed}
          title="Clase cambiada"
        />
      ) : confirmed !== null ? (
        <BrandToast
          note={
            isGuestPass(booked)
              ? usedFreeClass(confirmed.startsAt)
              : booked !== null
                ? `Te quedan ${booked.remainingClassAllowance} clases en tu plan`
                : `${confirmed.classTypeName} · ${formatListDate(confirmed.startsAt)} · ${formatTimeRange(confirmed.startsAt, confirmed.endsAt)}`
          }
          onClose={dismissConfirmed}
          title="Reserva confirmada"
        />
      ) : null}
      {cancelledNotice !== null && confirmed === null ? (
        <BrandToast
          // The API accepts a cancellation only outside the window, and every
          // accepted one gives the class back (restoreBookedClass).
          note={
            isGuestPass(freed)
              ? "Tu pase de invitada vuelve a estar disponible."
              : freed === null
                ? "La clase volvió a tu plan"
                : `La clase volvió a tu plan · Te ${freed.remainingClassAllowance === 1 ? "queda 1 clase" : `quedan ${freed.remainingClassAllowance} clases`}`
          }
          onClose={() => setCancelled(undefined)}
          title="Reserva cancelada"
        />
      ) : null}
      {leftNotice !== null && confirmed === null && cancelledNotice === null ? (
        <BrandToast onClose={() => setLeftShown(false)} title="Saliste de la lista de espera" />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { flexGrow: 1, paddingBottom: spacing.xxl },
  failure: { flex: 1 },
  failureBox: {
    ...surfaces.soft,
    alignItems: "flex-start",
    borderColor: colors.borderStrong,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  screen: { gap: spacing.md },
  wideList: { gap: spacing.lg },
  wideTabs: { width: 340 },
});
