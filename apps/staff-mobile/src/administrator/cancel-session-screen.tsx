import {
  boliviaCivilDate,
  colors,
  fontFamilies,
  formatTimeRange,
  IconRow,
  IconRowGroup,
  NoticeRow,
  PrimaryButton,
  Screen,
  SectionTitle,
  spacing,
  StateScreen,
  surfaces,
  TextButton,
  typography,
  useStudioRules,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { BackBar, backBarScroll } from "../ui/back-bar";
import { dayHeading } from "../ui/session-time";
import { ValueRow } from "../ui/value-row";
import { AdministratorApiError, createAdministratorApi } from "./administrator-api";
import type { CancellableSession } from "./cancel-class-screen";

type CancelSessionNavigation = { goBack: () => void };

// Walkthrough 24: the app says the real reason for each refusal.
const cancelProblems: Record<string, string> = {
  booking_access_denied: "Tu cuenta no puede cancelar clases.",
  session_has_no_bookings: "El servidor todavía no deja cancelar una clase sin reservas.",
  session_not_cancellable: "Esta clase ya empezó o ya está cancelada.",
};

function refusal(error: unknown): string {
  if (error instanceof AdministratorApiError) {
    return (
      (error.code === null ? undefined : cancelProblems[error.code]) ??
      "El servidor no aceptó la cancelación. Inténtalo de nuevo en un momento."
    );
  }
  return "No hay conexión con el estudio. Revisa tu internet e inténtalo de nuevo.";
}

// «2 h 30» for the Studio Setting's minutes (BKM-004).
const windowLabel = (minutes: number) =>
  minutes % 60 === 0 ? `${minutes / 60} h` : `${Math.floor(minutes / 60)} h ${minutes % 60}`;

/** S14 Cancelar sesión (v2), with a short confirmation for an empty class. */
export function CancelSessionScreen({
  route,
}: {
  route: { params: { session: CancellableSession } };
}) {
  const navigation = useNavigation<CancelSessionNavigation>();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const api = useMemo(() => createAdministratorApi(fetcher), [fetcher]);
  const rules = useStudioRules(fetcher);
  const { session } = route.params;
  const [submitting, setSubmitting] = useState(false);
  const [affected, setAffected] = useState<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const cancel = async () => {
    setSubmitting(true);
    setFailure(null);
    try {
      const result = await api.cancelSession(session.id);
      await queryClient.invalidateQueries();
      setAffected(result.affectedBookings);
    } catch (error) {
      setFailure(refusal(error));
    } finally {
      setSubmitting(false);
    }
  };

  const day = dayHeading(boliviaCivilDate(new Date(session.startsAt)));
  const time = formatTimeRange(session.startsAt, session.endsAt);
  const header = <BackBar onBack={() => navigation.goBack()} title="Cancelar sesión" />;

  if (affected !== null) {
    return (
      <Screen style={styles.screen}>
        <StateScreen
          icon="check"
          note={
            affected === 0
              ? "La clase no tenía reservas."
              : affected === 1
                ? "Avisamos a la clienta y recuperó su clase."
                : `Avisamos a las ${affected} clientas y cada una recuperó su clase.`
          }
          primaryAction={{ label: "Volver a las clases", onPress: () => navigation.goBack() }}
          title="Sesión cancelada"
        >
          <View style={styles.summary}>
            <IconRowGroup>
              <ValueRow label="Clase" value={session.classTypeName} />
              <ValueRow label="Fecha" value={`${day} · ${time.split(" – ")[0]}`} />
            </IconRowGroup>
          </View>
        </StateScreen>
      </Screen>
    );
  }

  const empty = session.bookedCount === 0;
  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, backBarScroll.content]}
        style={backBarScroll.scroll}
      >
        {header}
        <View style={styles.card}>
          <Text style={styles.title}>{session.classTypeName}</Text>
          <Text style={styles.muted}>{`${day} · ${time}`}</Text>
          <Text style={styles.muted}>{`${session.trainerName} · ${session.branchName}`}</Text>
        </View>
        {empty ? null : (
          <View>
            <SectionTitle>Qué va a pasar</SectionTitle>
            <IconRowGroup>
              <IconRow
                icon="cross"
                label={
                  session.bookedCount === 1
                    ? "Se cancela la reserva"
                    : `Se cancelan las ${session.bookedCount} reservas`
                }
              />
              <IconRow
                icon="check"
                label={
                  rules === undefined
                    ? "Cada clienta recupera su clase, aun dentro del plazo de cancelación"
                    : `Cada clienta recupera su clase, aun fuera del plazo de ${windowLabel(rules.cancellationWindowMinutes)}`
                }
              />
              <IconRow icon="bell" label="Avisamos a cada clienta por notificación" />
            </IconRowGroup>
          </View>
        )}
        <NoticeRow
          message={
            empty
              ? "Esto no se puede deshacer. La clase no tiene reservas."
              : "Esto no se puede deshacer."
          }
        />
        {failure === null ? null : (
          <View accessibilityLabel={failure} accessibilityRole="alert">
            <Text style={styles.failure}>{failure}</Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.actions}>
        <PrimaryButton
          busy={submitting}
          label="Sí, cancelar sesión"
          onPress={() => void cancel()}
          testID="cancel-session-confirm"
          tone="error"
        />
        <TextButton label="Volver" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.xs, paddingBottom: spacing.lg, paddingTop: spacing.md },
  card: { ...surfaces.card, gap: spacing.xs, padding: spacing.lg },
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  failure: { color: colors.errorText, fontFamily: fontFamilies.body, fontSize: typography.body },
  muted: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 14 },
  screen: { paddingHorizontal: spacing.xlSm },
  summary: { alignSelf: "stretch", marginTop: spacing.sm },
  title: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 22 },
});
