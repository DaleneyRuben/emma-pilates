import {
  getGetAssistantClientOverviewQueryKey,
  getListAssistantClientBookingsQueryKey,
  useGetAssistantClientOverview,
  useGetSession,
} from "@pilates/api-contracts";
import {
  BodyText,
  boliviaCivilDate,
  colors,
  formatSessionMinutes,
  formatTimeRange,
  IconRow,
  IconRowGroup,
  LoadingState,
  NoticeRow,
  PrimaryButton,
  QueryFailure,
  Screen,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { dayHeading } from "../ui/session-time";
import { CenteredCard } from "./assistant-layout";
import { CapacitySummary } from "./capacity-summary";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import { formatCivilDate } from "./assistant-format";
import { ClientBanner } from "./client-banner";
import { useClientBookedSessionIds } from "./client-booked-sessions";
import { useShowClientBookings } from "./show-client-bookings";
import type { ClientContext } from "./client-overview-screen";

export type ConfirmedBooking = {
  bookingId: string;
  classTypeName: string;
  startsAt: string;
  endsAt: string;
};

type DetailNavigation = {
  goBack: () => void;
  navigate: (screen: "SelectPlan", params: ClientContext) => void;
};

const bookingProblems: Record<string, string> = {
  booking_overlap: "La clienta ya tiene una reserva a esa hora.",
  active_booking_exists: "La clienta ya tiene una reserva en esta clase.",
  active_waitlist_entry_exists: "La clienta ya está en la lista de espera.",
  no_eligible_subscription: "La clienta no tiene clases disponibles en su plan.",
  booking_access_denied: "Solo puedes reservar en tus sucursales.",
  weekly_cap_reached: "Ya usaste tus clases de esta semana.",
  booking_window_exceeded: "Esa clase todavía no abre para reservar.",
};

const fallback = "No pudimos completar la reserva. Inténtalo de nuevo.";

export function AssistantSessionDetailScreen({
  route,
}: {
  route: { params: ClientContext & { sessionId: string } };
}) {
  const { clientId, clientName, sessionId } = route.params;
  const showClientBookings = useShowClientBookings();
  const navigation = useNavigation<DetailNavigation>();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const api = useMemo(() => createAssistantApi(fetcher), [fetcher]);
  const session = useGetSession(sessionId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const overview = useGetAssistantClientOverview(clientId, { fetcher });
  const bookedSessionIds = useClientBookedSessionIds(clientId);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [forcedFull, setForcedFull] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);

  const firstName = clientName.trim().split(/\s+/)[0] ?? clientName;
  const left =
    overview.data?.status === 200
      ? overview.data.data.subscription.subscription?.remainingClassAllowance
      : undefined;
  const header = (
    <>
      <BackBar back="Reservar una clase" onBack={() => navigation.goBack()} />
      <ClientBanner
        action="Reservando para"
        clientName={clientName}
        detail={
          left === undefined ? undefined : `${left} ${left === 1 ? "clase" : "clases"} en su plan`
        }
      />
    </>
  );

  if (session.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando clase" />
      </Screen>
    );
  }
  if (session.isError || session.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar la clase." onRetry={() => void session.refetch()} />
      </Screen>
    );
  }

  const detail = session.data.data;
  const view = overview.data?.status === 200 ? overview.data.data.subscription : null;
  const hasAllowance =
    view !== null &&
    (view.status === "active" || view.status === "expiring_soon") &&
    (view.subscription?.remainingClassAllowance ?? 0) > 0;
  const full = forcedFull || detail.availableSeats === 0;
  const booked = bookedSessionIds.has(detail.id);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: getGetAssistantClientOverviewQueryKey(clientId),
      }),
      queryClient.invalidateQueries({
        queryKey: getListAssistantClientBookingsQueryKey(clientId),
      }),
    ]);

  const describe = (error: unknown): string => {
    if (error instanceof AssistantApiError && error.code === "booking_during_freeze") {
      const date =
        error.detail === null ? null : /until (\d{4}-\d{2}-\d{2})$/.exec(error.detail)?.[1];
      if (date !== undefined && date !== null) {
        return `Tu plan está congelado hasta el ${formatCivilDate(date)}.`;
      }
    }
    if (error instanceof AssistantApiError && error.code === "booking_before_start_date") {
      const date = error.detail === null ? null : /: (\d{4}-\d{2}-\d{2})$/.exec(error.detail)?.[1];
      if (date !== undefined && date !== null) {
        return `Podrás reservar a partir del ${formatCivilDate(date)}.`;
      }
    }
    const code = error instanceof AssistantApiError ? error.code : null;
    return (code !== null ? bookingProblems[code] : undefined) ?? fallback;
  };

  const book = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const booking = await api.bookForClient(detail.id, clientId);
      await refresh();
      showClientBookings({
        clientId,
        clientName,
        confirmed: {
          bookingId: booking.id,
          classTypeName: detail.classType.name,
          startsAt: detail.startsAt,
          endsAt: detail.endsAt,
        },
      });
    } catch (error) {
      if (error instanceof AssistantApiError && error.code === "session_full") {
        setForcedFull(true);
        return;
      }
      setMessage(describe(error));
    } finally {
      setSubmitting(false);
    }
  };

  const joinWaitlist = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      await api.waitlistForClient(detail.id, clientId);
      await refresh();
      setWaitlisted(true);
    } catch (error) {
      if (error instanceof AssistantApiError && error.code === "active_waitlist_entry_exists") {
        setWaitlisted(true);
        return;
      }
      setMessage(describe(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <CenteredCard maxWidth={640}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <CapacitySummary
            availableSeats={detail.availableSeats}
            capacity={detail.capacity}
            full={full}
            title={detail.classType.name}
            waitlistCount={detail.waitlistCount}
            when={`${dayHeading(boliviaCivilDate(new Date(detail.startsAt)))} · ${formatTimeRange(detail.startsAt, detail.endsAt).split(" – ")[0]}`}
          />
          <IconRowGroup>
            <IconRow icon="person" label={detail.trainerName} value="Entrenadora" />
            <IconRow icon="pin" label={`Sucursal ${detail.branch.name}`} />
            <IconRow
              icon="clock"
              label={formatTimeRange(detail.startsAt, detail.endsAt)}
              value={formatSessionMinutes(detail.startsAt, detail.endsAt)}
            />
          </IconRowGroup>
        </ScrollView>
        <View style={styles.actions}>
          {message !== null ? (
            <View accessibilityLabel={message} accessibilityRole="alert">
              <NoticeRow message={message} />
            </View>
          ) : null}
          {booked ? (
            <BodyText style={styles.note}>La clienta ya tiene esta clase reservada.</BodyText>
          ) : full ? (
            waitlisted ? (
              <BodyText style={styles.note}>La clienta ya está en la lista de espera.</BodyText>
            ) : (
              <>
                <BodyText style={styles.note}>
                  {`Si se libera un cupo, le avisamos a ${firstName}.`}
                </BodyText>
                <PrimaryButton
                  busy={submitting}
                  label="Anotarla en la lista de espera"
                  onPress={() => void joinWaitlist()}
                  testID="session-join-waitlist"
                />
              </>
            )
          ) : hasAllowance ? (
            <>
              <BodyText style={styles.note}>
                Se descuenta 1 clase de su plan. Le avisamos por notificación.
              </BodyText>
              <PrimaryButton
                busy={submitting}
                label={`Reservar para ${firstName}`}
                onPress={() => void book()}
                testID="session-book"
              />
            </>
          ) : (
            <>
              <PrimaryButton disabled label={`Reservar para ${firstName}`} />
              <BodyText style={styles.note}>
                La clienta no tiene clases disponibles en su plan.
              </BodyText>
              <TextButton
                label="Registrar pago"
                onPress={() => navigation.navigate("SelectPlan", { clientId, clientName })}
              />
            </>
          )}
        </View>
      </CenteredCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm, paddingBottom: spacing.lg, paddingTop: spacing.md },
  content: { gap: spacing.lg, paddingBottom: spacing.lg },
  note: { color: colors.textMuted, fontSize: typography.note, textAlign: "center" },
  screen: { gap: spacing.md, paddingHorizontal: spacing.xlSm },
});
