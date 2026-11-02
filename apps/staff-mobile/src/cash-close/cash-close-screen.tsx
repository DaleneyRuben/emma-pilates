import {
  getGetTodayCashCloseQueryKey,
  recordCashClose,
  useGetTodayCashClose,
  type CashCloseDto,
} from "@pilates/api-contracts";
import {
  colors,
  EmphasisCard,
  fontFamilies,
  FormField,
  FormScrollView,
  Glyph,
  LoadingState,
  NoticeRow,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CenteredCard } from "../assistant/assistant-layout";
import { civilDateLong } from "../nutritionist/nutritionist-format";
import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { BranchChips, useCashBranches } from "../ui/branch-chips";
import { RootHeader } from "../ui/root-header";
import { useIsStackRoot } from "../ui/use-is-stack-root";
import {
  cashCloseFailure,
  cashCloseProblems,
  describeCashSales,
  describeDifference,
  formatCashCloseBolivianos,
  formatSignedBolivianos,
  parseCountedCentavos,
} from "./cash-close-format";
import { CashCloseSummary } from "./cash-close-summary";

const capitalized = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const problemCode = (body: unknown): string | null => {
  const code = (body as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : null;
};

function CashCloseForm({
  branch,
  expectedCentavos,
  cashPaymentCount,
  voidedCashCentavos,
  onClosed,
}: {
  branch: { id: string; name: string };
  expectedCentavos: number;
  cashPaymentCount: number;
  voidedCashCentavos: number;
  onClosed: (close: CashCloseDto | null, failure: string | null) => Promise<void>;
}) {
  const fetcher = useStaffFetcher();
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  // One key per attempt at this Branch's close, so a lost response replays.
  const [idempotencyKey] = useState(() => randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const countedCentavos = parseCountedCentavos(counted);
  const difference =
    countedCentavos === null ? null : describeDifference(countedCentavos - expectedCentavos);

  const close = async () => {
    if (countedCentavos === null) return;
    setSubmitting(true);
    setFailure(null);
    try {
      const response = await recordCashClose(
        { branchId: branch.id, countedCentavos, note: note.trim() === "" ? null : note.trim() },
        { headers: { "idempotency-key": idempotencyKey } },
        fetcher,
      );
      if (response.status === 201) {
        await onClosed(response.data, null);
        return;
      }
      const code = problemCode(response.data);
      const message = (code === null ? undefined : cashCloseProblems[code]) ?? cashCloseFailure;
      setFailure(message);
      if (code === "cash_close_already_recorded") await onClosed(null, message);
    } catch {
      setFailure(cashCloseFailure);
    } finally {
      setSubmitting(false);
    }
  };

  const signed =
    countedCentavos === null ? null : formatSignedBolivianos(countedCentavos - expectedCentavos);
  const short = countedCentavos !== null && countedCentavos < expectedCentavos;

  return (
    <>
      <EmphasisCard
        eyebrow="Efectivo esperado"
        note={describeCashSales(cashPaymentCount, branch.name)}
      >
        <Text style={styles.expected}>{formatCashCloseBolivianos(expectedCentavos)}</Text>
        {voidedCashCentavos > 0 ? (
          <Text style={styles.onEmphasis}>
            {`Ventas anuladas (efectivo en caja): ${formatCashCloseBolivianos(voidedCashCentavos)}`}
          </Text>
        ) : null}
      </EmphasisCard>
      <FormField
        keyboardType="decimal-pad"
        label="Efectivo contado"
        onChangeText={setCounted}
        placeholder="0,00"
        testID="cash-close-counted"
        value={counted}
      />
      {difference === null || signed === null ? null : (
        <View
          accessibilityLabel={`Diferencia · ${signed} · ${difference.label}`}
          accessibilityRole="summary"
          style={styles.difference}
        >
          <View style={[styles.disc, short && styles.errorDisc]}>
            <Glyph
              color={short ? colors.error : colors.primary}
              name={short ? "alert" : "check"}
              size={18}
              strokeWidth={1.6}
            />
          </View>
          <Text style={styles.differenceLabel}>{difference.label}</Text>
          <Text style={[styles.differenceAmount, short && styles.short]}>{signed}</Text>
        </View>
      )}
      <View style={styles.field}>
        <FormField
          label="Nota (opcional)"
          maxLength={500}
          multiline
          numberOfLines={3}
          onChangeText={setNote}
          placeholder="Ej.: faltó cambio para un billete de 200"
          style={styles.note}
          testID="cash-close-note"
          value={note}
        />
        <Text style={styles.counter}>{`${note.length} / 500`}</Text>
      </View>
      <Text style={styles.muted}>Hay un solo cierre por día y no se corrige después.</Text>
      {failure === null ? null : (
        <View accessibilityLabel={failure} accessibilityRole="alert">
          <NoticeRow message={failure} />
        </View>
      )}
      <PrimaryButton
        busy={submitting}
        disabled={countedCentavos === null}
        label="Cerrar caja"
        onPress={() => void close()}
        testID="cash-close-submit"
      />
    </>
  );
}

// S25: the Assistant's (or the Administrator's) daily Cash Close (BKO-003).
export function CashCloseScreen() {
  const navigation = useNavigation<{ goBack: () => void; navigate: (tab: "ClientsTab") => void }>();
  // The Assistant's Caja tab; the Administrator opens it from Pagos.
  const root = useIsStackRoot();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const branches = useCashBranches();
  const branchId = branches.branch?.id ?? "";
  const today = useGetTodayCashClose(
    { branchId },
    { fetcher, query: { enabled: branchId !== "", refetchOnMount: "always" } },
  );
  const [notice, setNotice] = useState<string | null>(null);
  const day = today.data?.status === 200 ? today.data.data : undefined;

  const refresh = async (close: CashCloseDto | null, failure: string | null) => {
    setNotice(failure);
    if (close !== null && day !== undefined) {
      queryClient.setQueryData(getGetTodayCashCloseQueryKey({ branchId }), {
        ...today.data,
        data: { ...day, close },
      });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: getGetTodayCashCloseQueryKey({ branchId }) });
  };

  let body;
  if (branches.isError) {
    body = (
      <QueryFailure label="No pudimos cargar la caja de hoy." onRetry={() => branches.refetch()} />
    );
  } else if (branches.isPending || branches.branch === null || today.isPending) {
    body = <LoadingState label="Cargando la caja de hoy" />;
  } else if (today.isError || day === undefined) {
    body = (
      <QueryFailure
        label="No pudimos cargar la caja de hoy."
        onRetry={() => {
          branches.refetch();
          void today.refetch();
        }}
      />
    );
  } else if (day.close !== null) {
    body = (
      <>
        {notice === null ? null : (
          <View accessibilityLabel={notice} accessibilityRole="alert">
            <NoticeRow message={notice} />
          </View>
        )}
        <CashCloseSummary
          close={day.close}
          doneLabel={root ? "Ir a Clientes" : "Volver"}
          onDone={() => (root ? navigation.navigate("ClientsTab") : navigation.goBack())}
        />
      </>
    );
  } else {
    body = (
      <CashCloseForm
        branch={branches.branch}
        cashPaymentCount={day.cashPaymentCount}
        expectedCentavos={day.expectedCentavos}
        voidedCashCentavos={day.voidedCashCentavos ?? 0}
        key={branchId}
        onClosed={refresh}
      />
    );
  }

  const where =
    day === undefined || branches.branch === null
      ? undefined
      : `${capitalized(civilDateLong(day.businessDate))} · ${branches.branch.name}`;
  const title = day?.close ? "Caja" : "Cerrar caja";

  return (
    <Screen style={styles.screen}>
      <CenteredCard maxWidth={520}>
        <FormScrollView contentContainerStyle={styles.content}>
          {root ? (
            <RootHeader eyebrow={where} label="Cerrar caja" title={title} />
          ) : (
            <BackBar
              back="Pagos"
              onBack={() => navigation.goBack()}
              subtitle={where}
              title={title}
            />
          )}
          <BranchChips
            label="Sucursal"
            onSelect={(id) => {
              setNotice(null);
              branches.select(id);
            }}
            options={branches.options}
            selectedId={branches.branch?.id ?? null}
            testIDPrefix="cash-close-branch"
          />
          {body}
        </FormScrollView>
      </CenteredCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  counter: { alignSelf: "flex-end", color: colors.textMuted, fontSize: typography.label },
  difference: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.card,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  differenceAmount: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 20,
    fontVariant: ["tabular-nums"],
  },
  differenceLabel: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 16,
  },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  errorDisc: { backgroundColor: colors.errorSurface },
  expected: {
    color: colors.white,
    fontFamily: fontFamilies.display,
    fontSize: 32,
    fontVariant: ["tabular-nums"],
  },
  field: { gap: spacing.xs },
  muted: { color: colors.textMuted, fontSize: typography.note, textAlign: "center" },
  note: { minHeight: 88, paddingTop: spacing.md, textAlignVertical: "top" },
  onEmphasis: { color: "rgba(255,255,255,0.85)", fontSize: typography.note },
  screen: { gap: spacing.md, paddingHorizontal: spacing.xlSm },
  short: { color: colors.error },
});
