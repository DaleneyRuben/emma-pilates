import { capacityLabel } from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  formatTimeRange,
  IconRow,
  InlineError,
  NoticeRow,
  PrimaryButton,
  Screen,
  spacing,
  StateScreen,
  surfaces,
  Text,
  TextButton,
  useStudioRules,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { bodyScroll, FooterPanel, RowCard, taskEdges } from "../ui/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
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

/** S14 Cancelar clase (v2), with a short confirmation for an empty class. */
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
  const header = <BackBar onBack={() => navigation.goBack()} title="Cancelar clase" />;

  // E-D15: the state card, what was cancelled, and the way back on the footer.
  if (affected !== null) {
    return (
      <Screen edges={taskEdges} style={[styles.screen, bodyScroll.taskScreen]}>
        <BackBar onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={bodyScroll.content} style={bodyScroll.scroll}>
          <StateScreen
            icon="check"
            layout="card"
            note={
              affected === 0
                ? "La clase no tenía reservas."
                : affected === 1
                  ? "Avisamos a la clienta y recuperó su clase."
                  : `Avisamos a las ${affected} clientas y cada una recuperó su clase.`
            }
            title="Clase cancelada"
          />
          <RowCard>
            <ValueRow label="Clase" value={session.classTypeName} />
            <ValueRow label="Fecha" value={`${day} · ${time.split(" – ")[0]}`} />
          </RowCard>
        </ScrollView>
        <FooterPanel>
          <PrimaryButton label="Volver a las clases" onPress={() => navigation.goBack()} />
        </FooterPanel>
      </Screen>
    );
  }

  const empty = session.bookedCount === 0;
  return (
    <Screen edges={taskEdges} style={[styles.screen, bodyScroll.taskScreen]}>
      {header}
      <ScrollView contentContainerStyle={bodyScroll.content} style={bodyScroll.scroll}>
        <View style={styles.card}>
          <Text variant="titulo-bloque">{session.classTypeName}</Text>
          <Text variant="cuerpo">{`${day} · ${time}`}</Text>
          <Text variant="cuerpo">{`${session.trainerName} · ${session.branchName}`}</Text>
          <Text variant="cuerpo">{capacityLabel(session.bookedCount, session.capacity)}</Text>
        </View>
        {empty ? null : (
          <RowCard label="Qué va a pasar">
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
          </RowCard>
        )}
        <NoticeRow
          message={
            empty
              ? "Esto no se puede deshacer. La clase no tiene reservas."
              : "Esto no se puede deshacer."
          }
        />
      </ScrollView>
      <FooterPanel>
        {failure === null ? null : (
          <View accessibilityLabel={failure} accessibilityRole="alert">
            <InlineError style={styles.failure}>{failure}</InlineError>
          </View>
        )}
        <PrimaryButton
          busy={submitting}
          label="Sí, cancelar clase"
          onPress={() => void cancel()}
          testID="cancel-session-confirm"
          tone="error"
        />
        <TextButton label="Volver" onPress={() => navigation.goBack()} />
      </FooterPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.smd, padding: spacing.lg },
  failure: { textAlign: "center" },
  screen: { paddingHorizontal: spacing.lg },
});
