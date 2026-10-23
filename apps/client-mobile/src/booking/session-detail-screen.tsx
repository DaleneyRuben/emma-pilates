import {
  createBooking,
  getGetCurrentClientSubscriptionQueryKey,
  joinSessionWaitlist,
  useGetCurrentClientSubscription,
  useGetSession,
} from "@pilates/api-contracts";
import {
  BodyText,
  ButtonLabel,
  colors,
  Heading,
  initials,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  TextButton,
  typography,
  usePushNotifications,
  weeklyClassesLeftLine,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { CapacityBlock } from "./capacity-block";
import { formatSessionDate, formatSessionMinutes, formatTimeRange } from "@pilates/mobile-core";

export type ConfirmedBooking = {
  bookingId: string;
  classTypeName: string;
  startsAt: string;
  endsAt: string;
};

type DetailNavigation = {
  goBack: () => void;
  navigate: {
    (screen: "Plans"): void;
    (
      screen: "Bookings",
      params: { screen: "MyBookings"; params: { confirmed: ConfirmedBooking } },
    ): void;
  };
};

const bookingProblems: Record<string, string> = {
  booking_overlap: "Ya tienes una reserva a esa hora.",
  active_booking_exists: "Ya tienes una reserva en esta clase.",
  active_waitlist_entry_exists: "Ya estás en la lista de espera.",
  no_eligible_subscription: "No te quedan clases en tu plan.",
  session_has_capacity: "La clase tiene cupos: puedes reservar directamente.",
  weekly_cap_reached: "Ya usaste tus clases de esta semana.",
};

function problemMessage(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const code = (body as { code?: unknown }).code;
  return typeof code === "string" ? (bookingProblems[code] ?? null) : null;
}

export function SessionDetailScreen({ route }: { route: { params: { sessionId: string } } }) {
  const navigation = useNavigation<DetailNavigation>();
  const fetcher = useClientFetcher();
  const { offerPermission: offerPushPermission } = usePushNotifications();
  const queryClient = useQueryClient();
  const session = useGetSession(route.params.sessionId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const subscription = useGetCurrentClientSubscription({ fetcher });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [forcedFull, setForcedFull] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);

  // 04 names where it was opened from, the Reservar tab, instead of a title.
  const header = (
    <ScreenTopBar
      fullBleed
      onBack={() => navigation.goBack()}
      title="Reservar una clase"
      tone="context"
    />
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
  const view = subscription.data?.status === 200 ? subscription.data.data : null;
  const hasAllowance =
    view !== null &&
    (view.status === "active" || view.status === "expiring_soon") &&
    (view.subscription?.remainingClassAllowance ?? 0) > 0;
  const full = forcedFull || detail.availableSeats === 0;
  const classesLeftLine = weeklyClassesLeftLine(detail.classesLeftThisWeek);

  const book = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await createBooking(
        detail.id,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            "idempotency-key": randomUUID(),
          },
        },
        fetcher,
      );

      if (response.status === 201) {
        await queryClient.invalidateQueries({
          queryKey: getGetCurrentClientSubscriptionQueryKey(),
        });
        offerPushPermission();
        navigation.navigate("Bookings", {
          screen: "MyBookings",
          params: {
            confirmed: {
              bookingId: response.data.id,
              classTypeName: detail.classType.name,
              startsAt: detail.startsAt,
              endsAt: detail.endsAt,
            },
          },
        });
        return;
      }

      const code = (response.data as { code?: string }).code;
      if (code === "session_full") {
        setForcedFull(true);
        return;
      }
      setMessage(
        problemMessage(response.data) ?? "No pudimos completar la reserva. Inténtalo de nuevo.",
      );
    } catch {
      setMessage("No pudimos completar la reserva. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const joinWaitlist = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await joinSessionWaitlist(
        detail.id,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            "idempotency-key": randomUUID(),
          },
        },
        fetcher,
      );

      if (response.status === 201) {
        setWaitlisted(true);
        offerPushPermission();
        return;
      }
      if ((response.data as { code?: string }).code === "active_waitlist_entry_exists") {
        setWaitlisted(true);
        return;
      }
      setMessage(
        problemMessage(response.data) ??
          "No pudimos anotarte en la lista de espera. Inténtalo de nuevo.",
      );
    } catch {
      setMessage("No pudimos anotarte en la lista de espera. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <Heading accessibilityLabel={detail.classType.name}>{detail.classType.name}</Heading>
        <View style={styles.trainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(detail.trainerName)}</Text>
          </View>
          <Text style={styles.trainerName}>{detail.trainerName}</Text>
        </View>
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
            <Text style={styles.factValue}>{formatTimeRange(detail.startsAt, detail.endsAt)}</Text>
          </View>
          <View style={styles.factRow}>
            <BodyText style={styles.factLabel}>Duración</BodyText>
            <Text style={styles.factValue}>
              {formatSessionMinutes(detail.startsAt, detail.endsAt)}
            </Text>
          </View>
        </View>
        <CapacityBlock
          availableSeats={detail.availableSeats}
          bookedCount={detail.bookedCount}
          capacity={detail.capacity}
          full={full}
        />
        {classesLeftLine === null ? null : <BodyText>{classesLeftLine}</BodyText>}
        <View style={styles.about}>
          <Text style={styles.sectionTitle}>Sobre la clase</Text>
          <BodyText>{detail.classType.description}</BodyText>
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
            <BodyText style={styles.note}>Ya estás en la lista de espera.</BodyText>
          ) : (
            <>
              <Pressable
                accessibilityLabel="Unirme a la lista de espera"
                accessibilityRole="button"
                accessibilityState={{ busy: submitting, disabled: submitting }}
                disabled={submitting}
                onPress={() => void joinWaitlist()}
                style={styles.outlinedButton}
                testID="session-join-waitlist"
              >
                <ButtonLabel
                  busy={submitting}
                  label="Unirme a la lista de espera"
                  spinnerColor={colors.primaryDeep}
                  style={styles.outlinedLabel}
                />
              </Pressable>
              <BodyText style={styles.note}>
                Clase llena. Te avisaremos si se libera un cupo.
              </BodyText>
            </>
          )
        ) : hasAllowance ? (
          <>
            <PrimaryButton
              busy={submitting}
              label="Reservar"
              onPress={() => void book()}
              testID="session-book"
            />
            <BodyText style={styles.note}>Se descontará 1 clase de tu paquete.</BodyText>
          </>
        ) : (
          <>
            <PrimaryButton disabled label="Reservar" />
            <BodyText style={styles.note}>No te quedan clases en tu plan.</BodyText>
            <TextButton label="Comprar un plan" onPress={() => navigation.navigate("Plans")} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  about: { gap: spacing.sm },
  actions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarText: { color: colors.primaryOnTint, fontSize: typography.note, fontWeight: "600" },
  content: { gap: spacing.lg, paddingBottom: spacing.lg },
  factLabel: { color: colors.textMuted, fontSize: typography.note },
  factRow: { flexDirection: "row", justifyContent: "space-between" },
  factValue: { color: colors.text, fontSize: typography.body },
  facts: {
    ...surfaces.card,
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
  sectionTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  trainer: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  trainerName: { color: colors.text, fontSize: typography.bodyLarge },
});
