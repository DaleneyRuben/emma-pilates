import {
  getGetCurrentClientSubscriptionQueryKey,
  requestFreeze,
  useGetCurrentClientSubscription,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  Calendar,
  colors,
  footerEdges,
  FooterPanel,
  FormErrorSummary,
  FormField,
  Glyph,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  TabletColumn,
  Text,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AccessibilityInfo, ScrollView, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { freezeRequestFailure } from "./freeze-refusal-copy";
import { dayMonth, freezeRefusal, freezeSummary, freezeWindow } from "./freeze-window";

const genericRefusal =
  "No pudimos congelar tu plan con esas fechas. Revisa las fechas e inténtalo de nuevo.";

/**
 * Walkthrough finding 51 (DES-015, follow-up 259 A): pick the first and the
 * last frozen day on a month calendar. Days the backend would refuse are
 * muted and say why when tapped; the summary shows the days and the plan's
 * moved end before sending.
 */
export function FreezePlanScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const view = useGetCurrentClientSubscription({ fetcher });
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // FormB (FIX-089): what is missing shows only once she tries to send.
  const [attempted, setAttempted] = useState(false);
  const header = (
    <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Congelar plan" />
  );

  if (view.isPending) {
    return (
      <Screen>
        {header}
        <LoadingState label="Cargando plan" />
      </Screen>
    );
  }
  const data = view.data?.status === 200 ? view.data.data : null;
  const subscription = data?.subscription ?? null;
  if (view.isError || data === null || subscription === null) {
    return (
      <Screen>
        {header}
        <TabletColumn width={560}>
          <QueryFailure label="No pudimos cargar tu plan." onRetry={() => void view.refetch()} />
        </TabletColumn>
      </Screen>
    );
  }

  const today = boliviaCivilDate(new Date());
  const term = {
    today,
    termStartsOn: subscription.startsOn,
    termEndsOn: subscription.endsOn,
    queuedPlanStartsOn: data.queuedPlanStartsOn ?? null,
  };
  const window = freezeWindow(term);
  // Review: reached by a stale back stack or a link, the screen checks what
  // Mi plan checked before offering the row.
  const blocked =
    data.canRequestFreeze === true
      ? window.unavailableReason
      : data.freeze?.state === "requested" || data.freeze?.state === "approved"
        ? "Ya pediste un congelamiento para este plan."
        : "Solo los planes de 90 días se pueden congelar.";
  const open = window.available && data.canRequestFreeze === true;
  const choosingEnd = start !== null && end === null;
  const summary =
    start !== null && end !== null ? freezeSummary(subscription.endsOn, start, end) : null;
  const prompt =
    start === null
      ? "Toca el primer día."
      : end === null
        ? `Ahora toca el último día: puede ser hasta el ${dayMonth(
            addDays(start, window.maxDays(start) - 1),
          )}. Toca el mismo día para congelar solo uno.`
        : null;

  const pressDay = (day: string) => {
    const off = window.whyOff(day, choosingEnd ? start : null);
    setMessage(null);
    if (off !== null) {
      setWhy(off);
      // The muted day only says «no disponible»: read the reason out too.
      AccessibilityInfo.announceForAccessibility(off);
      return;
    }
    setWhy(null);
    if (start === null || end !== null || day < start) {
      setStart(day);
      setEnd(null);
    } else {
      setEnd(day);
    }
  };

  const submit = async () => {
    if (start === null || end === null || reason.trim().length === 0) {
      setAttempted(true);
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await requestFreeze(
        { subscriptionId: subscription.id, startsOn: start, endsOn: end, reason: reason.trim() },
        undefined,
        fetcher,
      );
      if (response.status === 201) {
        await queryClient.invalidateQueries({
          queryKey: getGetCurrentClientSubscriptionQueryKey(),
        });
        navigation.goBack();
        return;
      }
      const code = (response.data as { code?: unknown } | null)?.code;
      if (code !== "freeze_not_allowed") {
        setMessage(freezeRequestFailure(response.data));
        return;
      }
      // The API answers one code for every refusal: read the plan again and
      // name what changed (a next plan bought meanwhile, a request already
      // sent, a day that passed).
      const fresh = await view.refetch();
      const again = fresh.data?.status === 200 ? fresh.data.data : null;
      const explained =
        again?.subscription == null
          ? null
          : freezeRefusal(
              {
                today: boliviaCivilDate(new Date()),
                termStartsOn: again.subscription.startsOn,
                termEndsOn: again.subscription.endsOn,
                queuedPlanStartsOn: again.queuedPlanStartsOn ?? null,
                freezeState: again.freeze?.state ?? null,
              },
              start,
              end,
            );
      setMessage(explained ?? genericRefusal);
    } catch {
      setMessage("No pudimos enviar la solicitud. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const missing = [
    ...(summary === null ? ["Fechas"] : []),
    ...(reason.trim().length === 0 ? ["Motivo"] : []),
  ];

  return (
    <Screen edges={footerEdges} style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* A tablet keeps the form in a centred 560 pt column. */}
        <TabletColumn gap={spacing.md} width={560}>
          {attempted && open ? <FormErrorSummary fields={missing} /> : null}
          <View style={styles.leadCard}>
            <Text variant="cuerpo">
              Elige el primer y el último día. Puedes congelar hasta 15 días, una vez por plan.
            </Text>
          </View>
          {open ? (
            // Audit d4, d5: the calendar and its prompt on a white card, never
            // straight on the 100 screen (follow-up 285, rule 3).
            <View style={styles.calendarCard} testID="freeze-calendar-card">
              <Calendar
                firstMonth={window.firstDay.slice(0, 7)}
                isOff={(day) => window.whyOff(day, choosingEnd ? start : null) !== null}
                lastMonth={window.lastDay.slice(0, 7)}
                onPressDay={pressDay}
                rangeEnd={end}
                rangeStart={start}
                today={today}
              />
              {why === null ? null : <Reason live text={why} />}
              {prompt === null ? null : <Text variant="cuerpo">{prompt}</Text>}
            </View>
          ) : (
            message === null && <Reason text={blocked ?? genericRefusal} />
          )}
          {summary === null ? null : (
            <View style={styles.summary} testID="freeze-summary">
              <Text variant="titulo-bloque">{summary.range}</Text>
              <View style={styles.summaryRows}>
                <SummaryRow label="Días congelados" value={summary.days} />
                <View style={styles.hairline} />
                <SummaryRow label="Tu plan vencerá el" value={summary.newEnd} />
              </View>
              <Text style={styles.was} variant="secundario">
                {summary.was}
              </Text>
            </View>
          )}
          <View style={styles.reasonCard}>
            <FormField
              error={attempted && reason.trim().length === 0 ? "Falta este dato" : undefined}
              label="Motivo"
              maxLength={300}
              onChangeText={setReason}
              placeholder="Cuéntale a la administración por qué"
              value={reason}
            />
            <View style={styles.info}>
              <Glyph color={colors.primary} name="alert" size={18} strokeWidth={1.7} />
              <Text style={styles.infoText} variant="secundario">
                Si tienes reservas esos días, se cancelan al aprobarse y las clases vuelven a tu
                plan.
              </Text>
            </View>
          </View>
          {message === null ? null : <Reason alert text={message} />}
        </TabletColumn>
      </ScrollView>
      {/* Rosa Emma C12i: the button on a white panel cast upward. */}
      <FooterPanel testID="freeze-footer">
        <TabletColumn width={480}>
          <PrimaryButton
            busy={submitting}
            disabled={!open || submitting}
            label="Enviar solicitud"
            onPress={() => void submit()}
          />
        </TabletColumn>
      </FooterPanel>
    </Screen>
  );
}

function addDays(civil: string, days: number): string {
  const date = new Date(`${civil}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel} variant="cuerpo">
        {label}
      </Text>
      <Text variant="titulo-fila">{value}</Text>
    </View>
  );
}

function Reason({
  alert = false,
  live = false,
  text,
}: {
  alert?: boolean;
  live?: boolean;
  text: string;
}) {
  return (
    <View
      accessibilityLiveRegion={live ? "polite" : undefined}
      accessibilityRole={alert ? "alert" : undefined}
      accessible={alert}
      style={styles.reason}
    >
      <Glyph color={colors.errorText} name="alert" size={16} strokeWidth={1.5} />
      <Text style={styles.reasonText} variant="cuerpo">
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarCard: { ...surfaces.card, gap: spacing.md, padding: spacing.md },
  content: { gap: spacing.md, paddingBottom: spacing.lg },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  info: { alignItems: "flex-start", flexDirection: "row", gap: spacing.smLg },
  infoText: { flex: 1 },
  leadCard: { ...surfaces.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.mdLg },
  reason: {
    alignItems: "flex-start",
    backgroundColor: colors.errorSurface,
    borderColor: colors.borderSoft,
    borderRadius: radii.inset,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  reasonCard: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  reasonText: { flex: 1 },
  screen: { gap: spacing.lg, paddingBottom: 0 },
  summary: { ...surfaces.card, gap: spacing.sm, padding: spacing.lg },
  summaryLabel: { flex: 1 },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  summaryRows: { backgroundColor: colors.card, borderRadius: radii.card, overflow: "hidden" },
  was: { textAlign: "right" },
});
