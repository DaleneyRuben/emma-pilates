import {
  getGetAssistantClientOverviewQueryKey,
  getListAssistantClientBookingsQueryKey,
  useGetAssistantClientOverview,
  useGetSession,
} from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  formatSessionDate,
  formatTimeRange,
  Heading,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import {
  type NavigationProp,
  type ParamListBase,
  useNavigation,
} from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import { ClientBanner } from "./client-banner";
import { showClientBookings } from "./show-client-bookings";
import type { ClientContext } from "./client-overview-screen";

export type ConfirmedBooking = {
  bookingId: string;
  classTypeName: string;
  startsAt: string;
  endsAt: string;
};

type DetailNavigation = Pick<NavigationProp<ParamListBase>, "dispatch"> & {
  goBack: () => void;
  navigate: (screen: "SelectPlan", params: ClientContext) => void;
};

const bookingProblems: Record<string, string> = {
  booking_overlap: "El cliente ya tiene una reserva a esa hora.",
  active_booking_exists: "El cliente ya tiene una reserva en esta clase.",
  active_waitlist_entry_exists: "El cliente ya está en la lista de espera.",
  no_eligible_subscription: "El cliente no tiene clases disponibles en su plan.",
  booking_access_denied: "Solo puedes reservar en tus sucursales.",
};

const fallback = "No pudimos completar la reserva. Inténtalo de nuevo.";

export function AssistantSessionDetailScreen({
  route,
}: {
  route: { params: ClientContext & { sessionId: string } };
}) {
  const { clientId, clientName, sessionId } = route.params;
  const navigation = useNavigation<DetailNavigation>();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const api = useMemo(() => createAssistantApi(fetcher), [fetcher]);
  const session = useGetSession(sessionId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const overview = useGetAssistantClientOverview(clientId, { fetcher });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [forcedFull, setForcedFull] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);

  const header = (
    <>
      <BackLink onPress={() => navigation.goBack()} />
      <ClientBanner action="Reservando para" clientName={clientName} />
    </>
  );

  if (session.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText accessibilityLabel="Cargando clase">Cargando…</BodyText>
      </Screen>
    );
  }
  if (session.isError || session.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar la clase."
          onRetry={() => void session.refetch()}
        />
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
  const fill = detail.capacity === 0 ? 0 : detail.bookedCount / detail.capacity;

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
    const code = error instanceof AssistantApiError ? error.code : null;
    return (code !== null ? bookingProblems[code] : undefined) ?? fallback;
  };

  const book = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const booking = await api.bookForClient(detail.id, clientId);
      await refresh();
      showClientBookings(navigation, {
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
      if (
        error instanceof AssistantApiError &&
        error.code === "active_waitlist_entry_exists"
      ) {
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
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <Heading accessibilityLabel={detail.classType.name}>
          {detail.classType.name}
        </Heading>
        <Text style={styles.trainerName}>{detail.trainerName}</Text>
        <View style={styles.facts}>
          <View style={styles.factRow}>
            <BodyText style={styles.factLabel}>Sucursal</BodyText>
            <Text style={styles.factValue}>{detail.branch.name}</Text>
          </View>
          <View style={styles.factRow}>
            <BodyText style={styles.factLabel}>Fecha</BodyText>
            <Text style={styles.factValue}>{formatSessionDate(detail.startsAt)}</Text>
          </View>
          <View style={styles.factRow}>
            <BodyText style={styles.factLabel}>Horario</BodyText>
            <Text style={styles.factValue}>
              {formatTimeRange(detail.startsAt, detail.endsAt)}
            </Text>
          </View>
          <View style={styles.factRow}>
            <BodyText style={styles.factLabel}>Duración</BodyText>
            <Text style={styles.factValue}>{`${detail.classType.durationMinutes} minutos`}</Text>
          </View>
        </View>
        <View style={styles.capacity}>
          <BodyText style={styles.factLabel}>Cupos disponibles</BodyText>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ max: detail.capacity, min: 0, now: detail.bookedCount }}
            style={styles.capacityTrack}
          >
            <View style={[styles.capacityFill, { flex: fill }, full && styles.capacityFillFull]} />
            <View style={{ flex: 1 - fill }} />
          </View>
          <Text style={styles.factValue}>
            {full
              ? "Lleno"
              : `${detail.availableSeats} de ${detail.capacity} cupos disponibles`}
          </Text>
        </View>
      </ScrollView>
      <View style={styles.actions}>
        {message !== null ? (
          <BodyText accessibilityRole="alert" style={styles.message}>
            {message}
          </BodyText>
        ) : null}
        {full ? (
          waitlisted ? (
            <BodyText style={styles.note}>El cliente ya está en la lista de espera.</BodyText>
          ) : (
            <>
              <Pressable
                accessibilityLabel="Unirme a la lista de espera"
                accessibilityRole="button"
                accessibilityState={{ disabled: submitting }}
                disabled={submitting}
                onPress={() => void joinWaitlist()}
                style={styles.outlinedButton}
              >
                <Text style={styles.outlinedLabel}>Unirme a la lista de espera</Text>
              </Pressable>
              <BodyText style={styles.note}>
                Clase llena. Se avisará al cliente si se libera un cupo.
              </BodyText>
            </>
          )
        ) : hasAllowance ? (
          <>
            <PrimaryButton disabled={submitting} label="Reservar" onPress={() => void book()} />
            <BodyText style={styles.note}>Se descontará 1 clase de su plan.</BodyText>
          </>
        ) : (
          <>
            <PrimaryButton disabled label="Reservar" />
            <BodyText style={styles.note}>
              El cliente no tiene clases disponibles en su plan.
            </BodyText>
            <TextButton
              label="Registrar pago"
              onPress={() => navigation.navigate("SelectPlan", { clientId, clientName })}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  capacity: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  capacityFill: { backgroundColor: colors.primary, borderRadius: radii.pill },
  capacityFillFull: { backgroundColor: colors.textSubtle },
  capacityTrack: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    flexDirection: "row",
    height: 8,
    overflow: "hidden",
  },
  content: { gap: spacing.lg, paddingBottom: spacing.lg },
  factLabel: { color: colors.textMuted, fontSize: typography.note },
  factRow: { flexDirection: "row", justifyContent: "space-between" },
  factValue: { color: colors.text, fontSize: typography.body },
  facts: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    gap: spacing.md,
    padding: spacing.lg,
  },
  message: { color: colors.errorText },
  note: { color: colors.textMuted, fontSize: typography.note, textAlign: "center" },
  outlinedButton: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  outlinedLabel: { color: colors.primaryDeep, fontSize: typography.body, fontWeight: "500" },
  screen: { gap: spacing.md },
  trainerName: { color: colors.text, fontSize: typography.bodyLarge },
});
