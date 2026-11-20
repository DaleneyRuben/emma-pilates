import {
  cancelNutritionistEvaluation,
  getListNutritionistAgendaQueryKey,
  useGetCurrentStaffMemberProfile,
  useListNutritionistAgenda,
  type NutritionistAgendaEntryDto,
} from "@pilates/api-contracts";
import {
  BrandToast,
  ConfirmationSheet,
  IconRow,
  LoadingState,
  NoticeRow,
  QueryFailure,
  Screen,
  spacing,
  StateScreen,
  usePullToRefresh,
  useRefetchOnFocus,
  useStickyNotice,
  SectionTitle,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { bodyScroll } from "../profile/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { RootHeader } from "../ui/root-header";
import { dayHeading } from "../ui/session-time";
import { useIsTablet } from "../ui/use-is-tablet";
import { LaterAppointmentCard } from "./agenda-later-card";
import { NextAppointment } from "./agenda-next-appointment";
import { agendaDayLabel, boliviaToday, civilDateOf, clockTime } from "./nutritionist-format";

const agendaPageSize = 50;

export function NutritionistAgendaScreen() {
  const navigation = useNavigation<{ navigate: (tab: "AvailabilityTab") => void }>();
  const fetcher = useStaffFetcher();
  const tablet = useIsTablet();
  const queryClient = useQueryClient();
  const profile = useGetCurrentStaffMemberProfile({ fetcher });
  const agenda = useListNutritionistAgenda(
    { limit: agendaPageSize },
    { fetcher, query: { refetchOnMount: "always" } },
  );
  const queryKeys = [getListNutritionistAgendaQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);
  const [cancelling, setCancelling] = useState<NutritionistAgendaEntryDto | null>(null);
  const [cancelledNotice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  // The «Evaluación cancelada» toast stays until closed or the screen changes.
  const clearNotice = () => setNotice(null);
  const notice = useStickyNotice(cancelledNotice ?? undefined, clearNotice);

  const firstName = profile.data?.status === 200 ? profile.data.data.name.split(" ")[0] : undefined;
  const title = firstName === undefined ? "Hola" : `Hola, ${firstName}`;
  const header = (
    <RootHeader
      bell
      eyebrow={`Nutricionista · ${dayHeading(boliviaToday())}`}
      label="Mi agenda"
      title={title}
    />
  );

  const confirmCancel = async () => {
    if (cancelling === null) return;
    const target = cancelling;
    setFailure(null);
    setNotice(null);
    let cancelled = false;
    try {
      const response = await cancelNutritionistEvaluation(target.evaluationId, undefined, fetcher);
      cancelled = response.status === 204;
      if (!cancelled) {
        setFailure("No pudimos cancelar la evaluación. Inténtalo de nuevo.");
      }
    } catch {
      setFailure("No pudimos cancelar la evaluación. Inténtalo de nuevo.");
    } finally {
      setCancelling(null);
      await queryClient.invalidateQueries({
        queryKey: getListNutritionistAgendaQueryKey({ limit: agendaPageSize }),
      });
    }
    // Announce the cancellation only once the refreshed agenda no longer lists it.
    if (cancelled) {
      setNotice(`${target.clientName} · ${clockTime(target.startsAt)}`);
    }
  };

  if (agenda.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando agenda" />
      </Screen>
    );
  }

  if (agenda.isError || agenda.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar tu agenda." onRetry={() => void agenda.refetch()} />
      </Screen>
    );
  }

  const today = boliviaToday();
  const [next, ...later] = agenda.data.data.items;

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={bodyScroll.content}
        refreshControl={refreshControl}
        style={bodyScroll.scroll}
      >
        {failure !== null ? (
          <View accessibilityLabel={failure} accessibilityRole="alert">
            <NoticeRow message={failure} />
          </View>
        ) : null}
        {next === undefined ? (
          <StateScreen
            icon="calendar"
            layout="inList"
            note="Revisa tu disponibilidad para que las clientas puedan reservar."
            primaryAction={{
              label: "Ver mi disponibilidad",
              onPress: () => navigation.navigate("AvailabilityTab"),
            }}
            title="No tienes evaluaciones"
          />
        ) : (
          <View style={[styles.column, tablet && styles.tablet]}>
            <NextAppointment entry={next} onCancel={() => setCancelling(next)} today={today} />
            {later.length === 0 ? null : (
              <View>
                <SectionTitle>Después</SectionTitle>
                <View style={styles.cards}>
                  {later.map((entry) => (
                    <LaterAppointmentCard
                      entry={entry}
                      key={entry.evaluationId}
                      onCancel={() => setCancelling(entry)}
                      today={today}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
      <ConfirmationSheet
        confirmLabel="Sí, cancelar evaluación"
        note="Esto no se puede deshacer."
        onConfirm={() => void confirmCancel()}
        onDismiss={() => setCancelling(null)}
        testID="cancel-evaluation-sheet"
        title="¿Cancelar esta evaluación?"
        visible={cancelling !== null}
      >
        {cancelling !== null ? (
          <View style={styles.sheetRows}>
            <IconRow
              icon="calendar"
              label={`${agendaDayLabel(civilDateOf(cancelling.startsAt), today).split(" · ")[0]}, ${clockTime(cancelling.startsAt)} · ${cancelling.clientName}`}
            />
            <IconRow icon="bell" label="Le avisamos y el horario queda libre" />
            {cancelling.paymentConfirmed === true ? (
              <IconRow
                icon="receipt"
                label={`El pago de ${cancelling.clientName.split(" ")[0]} sigue vigente; ella elige otro turno.`}
              />
            ) : null}
          </View>
        ) : null}
      </ConfirmationSheet>
      {notice !== null ? (
        <BrandToast note={notice} onClose={clearNotice} title="Evaluación cancelada" />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cards: { gap: spacing.md },
  // iPad: the block and the rows keep a phone-like column instead of stretching.
  column: { gap: spacing.md },
  screen: { paddingHorizontal: spacing.xlSm },
  // Board N02: the facts are plain lines on the white sheet, not a card.
  sheetRows: { marginHorizontal: -spacing.lg },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
});
