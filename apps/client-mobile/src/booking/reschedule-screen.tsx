import {
  listSessionAvailability,
  rescheduleBooking,
  useGetCurrentClientSubscription,
  useListBranches,
  type SessionAvailabilityDto,
  type UpcomingBookingDto,
} from "@pilates/api-contracts";
import {
  colors,
  footerEdges,
  FooterPanel,
  formatStartTime,
  InlineError,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  SectionTitle,
  spacing,
  StateScreen,
  surfaces,
  TabletColumn,
  TabletColumns,
  Text,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { bookingRejectionMessage, problemCode } from "./booking-rejection-copy";
import { DayTile } from "./booking-card";
import { RescheduleOption, RescheduleOptions } from "./reschedule-option";
import type { ConfirmedBooking } from "./session-detail-screen";
import {
  boliviaCivilDate,
  civilDateRange,
  formatTimeRange,
  hasStarted,
} from "@pilates/mobile-core";

type RescheduleNavigation = {
  goBack: () => void;
  navigate: (screen: "MyBookings", params: { confirmed: ConfirmedBooking }) => void;
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
  const subscription = useGetCurrentClientSubscription({ fetcher });
  const branches = useListBranches({ fetcher });
  const branchIds = branches.data?.status === 200 ? branches.data.data.map((b) => b.id) : [];
  const alternatives = useQuery({
    enabled: branchIds.length > 0,
    queryFn: () => loadSameDayAlternatives(fetcher, branchIds, booking),
    queryKey: ["reschedule-alternatives", booking.bookingId, branchIds],
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // One key per confirmation screen, so a second tap replays the same move.
  const idempotencyKey = useRef(randomUUID());

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
          headers: {
            "Content-Type": "application/json",
            "idempotency-key": idempotencyKey.current,
          },
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
            rescheduled: true,
            planName:
              subscription.data?.status === 200
                ? subscription.data.data.subscription?.planName
                : undefined,
          },
        });
        return;
      }
      setFailure(
        bookingRejectionMessage(problemCode(response.data)) ??
          "No pudimos reprogramar la reserva. Inténtalo de nuevo.",
      );
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
    <Screen edges={footerEdges} style={styles.screen}>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Reprogramar clase" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* 06T: the booking on a 300 pt column, today's other classes beside it. */}
        <TabletColumns
          left={
            <View>
              <SectionTitle>Tu reserva actual</SectionTitle>
              <View style={styles.current}>
                <View style={styles.currentRow}>
                  <DayTile startsAt={booking.startsAt} today={boliviaCivilDate(new Date())} />
                  <View style={styles.currentBody}>
                    <Text variant="titulo-fila">{booking.classTypeName}</Text>
                    <Text variant="secundario">
                      {`${formatTimeRange(booking.startsAt, booking.endsAt)} · ${booking.trainerName}`}
                    </Text>
                  </View>
                </View>
                {options.length === 0 ? null : (
                  <View style={styles.replaced}>
                    <Text variant="pastilla">Se reemplaza</Text>
                  </View>
                )}
              </View>
            </View>
          }
          leftWidth={300}
          right={
            <>
              {loading ? (
                <LoadingState label="Cargando alternativas" />
              ) : failed ? (
                <QueryFailure
                  label="No pudimos cargar las clases del día."
                  onRetry={() => void alternatives.refetch()}
                />
              ) : options.length === 0 ? (
                <StateScreen
                  icon="calendar"
                  layout="inList"
                  note="Tu reserva sigue en pie. Si no puedes asistir, escríbenos al estudio."
                  primaryAction={{
                    label: "Volver a mis reservas",
                    onPress: () => navigation.goBack(),
                  }}
                  title="No hay otras clases hoy"
                />
              ) : (
                <View>
                  <SectionTitle>Otras clases de hoy</SectionTitle>
                  <RescheduleOptions>
                    {options.map((session) => (
                      <RescheduleOption
                        key={session.id}
                        onPress={() => setSelectedId(session.id)}
                        selected={session.id === selectedId}
                        session={session}
                      />
                    ))}
                  </RescheduleOptions>
                </View>
              )}
              {failure !== null ? (
                <View style={styles.failureBox}>
                  <InlineError>{failure}</InlineError>
                </View>
              ) : null}
            </>
          }
        />
      </ScrollView>
      {!loading && !failed && options.length > 0 ? (
        // C06: the line and the button sit on the white footer.
        <FooterPanel testID="reschedule-footer">
          <TabletColumn gap={spacing.sm} width={480}>
            <Text style={styles.note} variant="secundario">
              {`Tu lugar de las ${formatStartTime(booking.startsAt)} se libera al confirmar`}
            </Text>
            <PrimaryButton
              busy={submitting}
              disabled={selectedId === null}
              // FIX-089: an off button says why on its own line.
              disabledReason="Elige una clase para continuar"
              label="Confirmar cambio"
              onPress={() => void confirm()}
              testID="reschedule-confirm"
            />
          </TabletColumn>
        </FooterPanel>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.lg },
  current: {
    ...surfaces.card,
    gap: spacing.smLg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  currentBody: { flex: 1, gap: spacing.xxs },
  currentRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  failureBox: {
    ...surfaces.soft,
    borderColor: colors.borderStrong,
    borderWidth: 1.5,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  note: { textAlign: "center" },
  replaced: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryTint,
    borderColor: colors.borderSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: spacing.md,
  },
  screen: { gap: spacing.md, paddingBottom: 0 },
});
