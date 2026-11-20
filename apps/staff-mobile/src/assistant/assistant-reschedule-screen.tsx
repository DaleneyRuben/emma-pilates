import {
  listSessionAvailability,
  type AssistantClientBookingDto,
  type SessionAvailabilityDto,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  civilDateRange,
  ClassRow,
  colors,
  ExceptionPill,
  formatTimeRange,
  hasStarted,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  StaffFace,
  surfaces,
  typography,
  fontFamilies,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { bodyScroll, CardLabel, FooterPanel, taskEdges } from "../profile/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import { BackBar } from "../ui/back-bar";
import { startTime } from "../ui/session-time";
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
  const now = new Date();
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
        !hasStarted(session.startsAt, now),
    )
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

export function AssistantRescheduleScreen({
  route,
}: {
  route: { params: ClientContext & { booking: AssistantClientBookingDto } };
}) {
  const { booking, clientId, clientName, clientPhoto } = route.params;
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
        clientPhoto,
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
  const offered = !alternatives.isPending && !alternatives.isError && options.length > 0;

  // E-R12: the band and the white footer stay put; the choice scrolls between.
  return (
    <Screen
      edges={offered ? taskEdges : undefined}
      style={[styles.screen, offered && bodyScroll.taskScreen]}
    >
      <BackBar onBack={() => navigation.goBack()} title="Reprogramar clase" />
      <ScrollView contentContainerStyle={bodyScroll.content} style={bodyScroll.scroll}>
        <ClientBanner
          action="Viendo reservas de"
          clientName={clientName}
          clientPhoto={clientPhoto}
        />
        <View style={styles.current}>
          <CardLabel>Reserva actual</CardLabel>
          <Text style={styles.currentTitle}>{booking.classTypeName}</Text>
          <Text style={styles.currentLine}>
            {`${booking.trainerName} · ${formatTimeRange(booking.startsAt, booking.endsAt)}`}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.lead}>Puedes cambiarla por otra clase disponible el mismo día.</Text>
        </View>
        {alternatives.isPending ? (
          <LoadingState label="Cargando alternativas" />
        ) : alternatives.isError ? (
          <QueryFailure
            label="No pudimos cargar las clases del día."
            onRetry={() => void alternatives.refetch()}
          />
        ) : options.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.quiet}>No hay otras clases disponibles ese día.</Text>
          </View>
        ) : (
          options.map((session) => (
            <RescheduleOption
              fetcher={fetcher}
              key={session.id}
              onPress={() => setSelectedId(session.id)}
              selected={session.id === selectedId}
              session={session}
            />
          ))
        )}
        {failure !== null && !offered ? (
          <Text accessibilityRole="alert" style={styles.failure}>
            {failure}
          </Text>
        ) : null}
      </ScrollView>
      {offered ? (
        <FooterPanel>
          {failure !== null ? (
            <Text accessibilityRole="alert" style={styles.failure}>
              {failure}
            </Text>
          ) : null}
          <PrimaryButton
            busy={submitting}
            disabled={selectedId === null}
            label="Confirmar cambio"
            onPress={() => void confirm()}
          />
        </FooterPanel>
      ) : null}
    </Screen>
  );
}

/**
 * One same-day class to move to (E-R12): the class row with its type bar and
 * Lora time, the free seats as a pill, ringed in 600 once chosen.
 */
function RescheduleOption({
  fetcher,
  onPress,
  selected,
  session,
}: {
  fetcher: typeof globalThis.fetch;
  onPress: () => void;
  selected: boolean;
  session: SessionAvailabilityDto;
}) {
  return (
    <Pressable
      accessibilityLabel={`${session.classTypeName} ${formatTimeRange(session.startsAt, session.endsAt)}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <ClassRow
        detail={session.trainerName}
        detailLead={
          <StaffFace
            fetcher={fetcher}
            name={session.trainerName}
            photo={session.trainerPhoto}
            size={20}
          />
        }
        end={
          <ExceptionPill>
            {session.availableSeats === 1
              ? "1 lugar libre"
              : `${session.availableSeats} lugares libres`}
          </ExceptionPill>
        }
        standalone
        time={startTime(session.startsAt, session.endsAt)}
        title={session.classTypeName}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  // The booking she leaves: a soft 50 inset, not a card to tap.
  current: {
    ...surfaces.soft,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  currentLine: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14 },
  currentTitle: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.bodyMedium,
    fontWeight: "700",
  },
  failure: {
    color: colors.errorText,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.note,
    fontWeight: "700",
    textAlign: "center",
  },
  lead: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
    lineHeight: 21,
  },
  option: { borderColor: "transparent", borderRadius: radii.card + 2, borderWidth: 2 },
  optionSelected: { borderColor: colors.primary },
  quiet: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
  screen: { paddingHorizontal: spacing.xlSm },
});
