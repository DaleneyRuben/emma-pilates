import {
  listSessionAvailability,
  rescheduleBooking,
  useListBranches,
  type SessionAvailabilityDto,
  type UpcomingBookingDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
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
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import type { ConfirmedBooking } from "./session-detail-screen";
import {
  boliviaCivilDate,
  civilDateRange,
  formatTimeRange,
  hasStarted,
} from "@pilates/mobile-core";

type RescheduleNavigation = {
  goBack: () => void;
  navigate: (
    screen: "MyBookings",
    params: { confirmed: ConfirmedBooking },
  ) => void;
};

async function loadSameDayAlternatives(
  fetcher: typeof globalThis.fetch,
  branchIds: string[],
  booking: UpcomingBookingDto,
): Promise<SessionAvailabilityDto[]> {
  const { from, until } = civilDateRange(boliviaCivilDate(new Date(booking.startsAt)));
  const now = new Date();
  const lists = await Promise.all(
    branchIds.map((branchId) =>
      listSessionAvailability({ branchId, from, until, limit: 100 }, undefined, fetcher),
    ),
  );

  return lists
    .flatMap((response) => (response.status === 200 ? response.data : []))
    .filter(
      (session) =>
        session.id !== booking.sessionId &&
        session.availableSeats > 0 &&
        !hasStarted(session.startsAt, now),
    )
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

export function RescheduleScreen({
  route,
}: {
  route: { params: { booking: UpcomingBookingDto } };
}) {
  const { booking } = route.params;
  const navigation = useNavigation<RescheduleNavigation>();
  const fetcher = useClientFetcher();
  const branches = useListBranches({ fetcher });
  const branchIds =
    branches.data?.status === 200 ? branches.data.data.map((b) => b.id) : [];
  const alternatives = useQuery({
    enabled: branchIds.length > 0,
    queryFn: () => loadSameDayAlternatives(fetcher, branchIds, booking),
    queryKey: ["reschedule-alternatives", booking.bookingId, branchIds],
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
      const response = await rescheduleBooking(
        booking.bookingId,
        {
          body: JSON.stringify({ targetSessionId: selectedId }),
          headers: { "Content-Type": "application/json" },
        },
        fetcher,
      );

      if (response.status === 201) {
        navigation.navigate("MyBookings", {
          confirmed: {
            bookingId: response.data.id,
            classTypeName: target.classTypeName,
            startsAt: target.startsAt,
            endsAt: target.endsAt,
          },
        });
        return;
      }
      setFailure("No pudimos reprogramar la reserva. Inténtalo de nuevo.");
    } catch {
      setFailure("No pudimos reprogramar la reserva. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const loading = branches.isPending || alternatives.isPending;
  const failed = branches.isError || alternatives.isError;
  const options = alternatives.data ?? [];

  return (
    <Screen style={styles.screen}>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Reprogramar clase" />
      <View style={styles.current}>
        <BodyText style={styles.currentLabel}>Reserva actual</BodyText>
        <Text style={styles.currentTitle}>{booking.classTypeName}</Text>
        <BodyText>
          {`${booking.trainerName} · ${formatTimeRange(booking.startsAt, booking.endsAt)}`}
        </BodyText>
      </View>
      <BodyText>Puedes cambiar a otra clase disponible el mismo día.</BodyText>
      {loading ? (
        <BodyText accessibilityLabel="Cargando alternativas">Cargando…</BodyText>
      ) : failed ? (
        <QueryFailure
          label="No pudimos cargar las clases del día."
          onRetry={() => void alternatives.refetch()}
        />
      ) : options.length === 0 ? (
        <BodyText>No hay otras clases disponibles hoy.</BodyText>
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
                  {session.availableSeats === 1
                    ? "1 cupo"
                    : `${session.availableSeats} cupos`}
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
      {!loading && !failed && options.length > 0 ? (
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
