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
  colors,
  Heading,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  surfaces,
  TextButton,
  typography,
  useTransientNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import type { ConfirmedBooking } from "./session-detail-screen";
import {
  formatSessionDate,
  formatTimeRange,
  isInsideCancellationWindow,
} from "@pilates/mobile-core";

const noticeVisibleMs = 8_000;

type BookingsNavigation = {
  navigate: {
    (screen: "Booking"): void;
    (screen: "History"): void;
    (screen: "Reschedule", params: { booking: UpcomingBookingDto }): void;
  };
  setParams: (params: { confirmed?: ConfirmedBooking }) => void;
};

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function OutlinedAction({
  label,
  onPress,
  tone = "neutral",
}: {
  label: string;
  onPress: () => void;
  tone?: "neutral" | "error";
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.action, tone === "error" && styles.actionError]}
    >
      <Text style={[styles.actionLabel, tone === "error" && styles.actionLabelError]}>{label}</Text>
    </Pressable>
  );
}

function BookingCard({
  item,
  onCancel,
  onLeave,
  onReschedule,
}: {
  item: UpcomingBookingDto;
  onCancel: () => void;
  onLeave: () => void;
  onReschedule: () => void;
}) {
  const insideWindow =
    item.kind === "booking" && isInsideCancellationWindow(item.startsAt, new Date());

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
        <OutlinedAction label="Salir de la lista de espera" onPress={onLeave} />
      ) : insideWindow ? (
        <OutlinedAction label="Reprogramar" onPress={onReschedule} />
      ) : (
        <OutlinedAction label="Cancelar" onPress={onCancel} />
      )}
    </View>
  );
}

export function BookingsScreen({
  route,
}: {
  route: { params?: { confirmed?: ConfirmedBooking } };
}) {
  const navigation = useNavigation<BookingsNavigation>();
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const confirmed = useTransientNotice(route.params?.confirmed, noticeVisibleMs, () =>
    navigation.setParams({ confirmed: undefined }),
  );
  const [cancelling, setCancelling] = useState<UpcomingBookingDto | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const upcoming = useListUpcomingBookings({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const subscription = useGetCurrentClientSubscription({
    fetcher,
    query: { refetchOnMount: "always" },
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getListUpcomingBookingsQueryKey() }),
      queryClient.invalidateQueries({
        queryKey: getGetCurrentClientSubscriptionQueryKey(),
      }),
    ]);

  const confirmCancel = async () => {
    if (cancelling === null || cancelling.bookingId === undefined) return;
    setFailure(null);
    try {
      const response = await cancelBooking(cancelling.bookingId, undefined, fetcher);
      if (response.status !== 204) {
        setFailure("No pudimos cancelar la reserva. Inténtalo de nuevo.");
      }
    } catch {
      setFailure("No pudimos cancelar la reserva. Inténtalo de nuevo.");
    } finally {
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
      <View style={styles.header}>
        <Heading accessibilityLabel="Mis reservas">Mis reservas</Heading>
        <TextButton label="Ver historial" onPress={() => navigation.navigate("History")} />
      </View>
      {confirmed !== null ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Reserva confirmada</Text>
          <BodyText style={styles.noticeBody}>
            {`${confirmed.classTypeName} · ${formatSessionDate(confirmed.startsAt)} · ${formatTimeRange(confirmed.startsAt, confirmed.endsAt)}`}
          </BodyText>
          {remaining !== undefined ? (
            <BodyText style={styles.balance}>{`Te quedan ${remaining} clases en tu plan`}</BodyText>
          ) : null}
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
          label="No pudimos cargar tus reservas."
          onRetry={() => void upcoming.refetch()}
        />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <BodyText>Aún no tienes reservas próximas.</BodyText>
          <PrimaryButton
            label="Reservar una clase"
            onPress={() => navigation.navigate("Booking")}
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
              onReschedule={() => navigation.navigate("Reschedule", { booking: item })}
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
            <Text style={styles.sheetTitle}>¿Cancelar esta reserva?</Text>
            {cancelling !== null ? (
              <BodyText>
                {`${cancelling.classTypeName} · ${formatSessionDate(cancelling.startsAt)} · ${formatTimeRange(cancelling.startsAt, cancelling.endsAt)} · ${cancelling.trainerName} · ${cancelling.branchName}`}
              </BodyText>
            ) : null}
            <BodyText>
              La clase vuelve al saldo de tu plan y el cupo se libera; volver a reservar depende de
              que siga habiendo lugar.
            </BodyText>
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
  balance: { color: colors.textMuted, fontSize: typography.note },
  card: {
    ...surfaces.card,
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
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  notice: {
    backgroundColor: "rgba(124,148,115,0.14)",
    borderRadius: radii.inset,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  noticeBody: { color: colors.successText, fontSize: typography.note },
  noticeTitle: { color: colors.successText, fontSize: typography.bodyLarge, fontWeight: "600" },
  screen: { gap: spacing.lg },
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
