import {
  listSessionAvailability,
  type AssistantClientBookingDto,
  type SessionAvailabilityDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  boliviaCivilDate,
  civilDateRange,
  colors,
  formatTimeRange,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import { ClientBanner } from "./client-banner";
import { useShowClientBookings } from "./show-client-bookings";
import type { ClientContext } from "./client-overview-screen";

type RescheduleNavigation = {
  goBack: () => void;
};

// Same-day alternatives at the Booking's own Branch: an Assistant may only
// reschedule between Sessions at Branches assigned to them, and the current
// Branch is the one they are already acting at.
async function loadSameDayAlternatives(
  fetcher: typeof globalThis.fetch,
  booking: AssistantClientBookingDto,
): Promise<SessionAvailabilityDto[]> {
  const { from, until } = civilDateRange(boliviaCivilDate(new Date(booking.startsAt)));
  const now = Date.now();
  const response = await listSessionAvailability(
    { branchId: booking.branchId, from, until, limit: 100 },
    undefined,
    fetcher,
  );
  return (response.status === 200 ? response.data : [])
    .filter(
      (session) =>
        session.id !== booking.sessionId &&
        session.availableSeats > 0 &&
        new Date(session.startsAt).getTime() > now,
    )
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

export function AssistantRescheduleScreen({
  route,
}: {
  route: { params: ClientContext & { booking: AssistantClientBookingDto } };
}) {
  const { booking, clientId, clientName } = route.params;
  const showClientBookings = useShowClientBookings();
  const navigation = useNavigation<RescheduleNavigation>();
  const fetcher = useStaffFetcher();
  const api = useMemo(() => createAssistantApi(fetcher), [fetcher]);
  const alternatives = useQuery({
    queryFn: () => loadSameDayAlternatives(fetcher, booking),
    queryKey: ["assistant-reschedule-alternatives", booking.bookingId],
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const confirm = async () => {
    if (selectedId === null || booking.bookingId === undefined) return;
    const target = alternatives.data?.find((session) => session.id === selectedId);
    if (target === undefined) return;
    setSubmitting(true);
    setFailure(null);
    try {
      const rescheduled = await api.rescheduleBooking(booking.bookingId, selectedId);
      showClientBookings({
        clientId,
        clientName,
        confirmed: {
          bookingId: rescheduled.id,
          classTypeName: target.classTypeName,
          startsAt: target.startsAt,
          endsAt: target.endsAt,
        },
      });
    } catch (error) {
      setFailure(
        error instanceof AssistantApiError && error.code === "booking_access_denied"
          ? "Solo puedes reprogramar entre tus sucursales."
          : "No pudimos reprogramar la reserva. Inténtalo de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const options = alternatives.data ?? [];

  return (
    <Screen style={styles.screen}>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Reprogramar clase" />
      <ClientBanner action="Viendo reservas de" clientName={clientName} />
      <View style={styles.current}>
        <BodyText style={styles.currentLabel}>Reserva actual</BodyText>
        <Text style={styles.currentTitle}>{booking.classTypeName}</Text>
        <BodyText>
          {`${booking.trainerName} · ${formatTimeRange(booking.startsAt, booking.endsAt)}`}
        </BodyText>
      </View>
      <BodyText>Puedes cambiarla por otra clase disponible el mismo día.</BodyText>
      {alternatives.isPending ? (
        <BodyText accessibilityLabel="Cargando alternativas">Cargando…</BodyText>
      ) : alternatives.isError ? (
        <QueryFailure
          label="No pudimos cargar las clases del día."
          onRetry={() => void alternatives.refetch()}
        />
      ) : options.length === 0 ? (
        <BodyText>No hay otras clases disponibles ese día.</BodyText>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {options.map((session) => {
            const selected = session.id === selectedId;
            return (
              <Pressable
                accessibilityLabel={`${session.classTypeName} ${formatTimeRange(session.startsAt, session.endsAt)}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={session.id}
                onPress={() => setSelectedId(session.id)}
                style={[styles.card, selected && styles.cardSelected]}
              >
                <Text style={styles.time}>
                  {formatTimeRange(session.startsAt, session.endsAt)}
                </Text>
                <Text style={styles.cardTitle}>{session.classTypeName}</Text>
                <BodyText>{session.trainerName}</BodyText>
                <BodyText style={styles.seats}>
                  {session.availableSeats === 1 ? "1 cupo" : `${session.availableSeats} cupos`}
                </BodyText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {failure !== null ? (
        <BodyText accessibilityRole="alert" style={styles.failure}>
          {failure}
        </BodyText>
      ) : null}
      {!alternatives.isPending && !alternatives.isError && options.length > 0 ? (
        <PrimaryButton
          disabled={selectedId === null || submitting}
          label="Confirmar cambio"
          onPress={() => void confirm()}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaces.card,
    gap: spacing.xxs,
    padding: spacing.lg,
  },
  cardSelected: { borderColor: colors.primary, borderWidth: 2 },
  cardTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  current: {
    backgroundColor: colors.divider,
    borderRadius: radii.inset,
    gap: spacing.xxs,
    opacity: 0.85,
    padding: spacing.lg,
  },
  currentLabel: { color: colors.textMuted, fontSize: typography.label },
  currentTitle: { color: colors.textSecondary, fontSize: typography.bodyLarge },
  failure: { color: colors.errorText },
  list: { gap: spacing.md, paddingBottom: spacing.lg },
  screen: { gap: spacing.md },
  seats: { color: colors.primaryDeep, fontSize: typography.note },
  time: { color: colors.primaryDeep, fontSize: typography.body, fontWeight: "600" },
});
