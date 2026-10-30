import {
  getGetTodayCashCloseQueryKey,
  recordCashClose,
  useGetTodayCashClose,
  type CashCloseDto,
} from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  fontFamilies,
  FormField,
  FormScrollView,
  Heading,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  surfaces,
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
import { BranchChips, useCashBranches } from "../ui/branch-chips";
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

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>EFECTIVO ESPERADO</Text>
        <Text style={styles.expected}>{formatCashCloseBolivianos(expectedCentavos)}</Text>
        <BodyText style={styles.muted}>{describeCashSales(cashPaymentCount, branch.name)}</BodyText>
        {voidedCashCentavos > 0 ? (
          <BodyText style={styles.muted}>
            {`Ventas anuladas (efectivo en caja): ${formatBolivianos(voidedCashCentavos)}`}
          </BodyText>
        ) : null}
      </View>
      <View style={styles.field}>
        <FormField
          keyboardType="decimal-pad"
          label="Efectivo contado"
          onChangeText={setCounted}
          placeholder="0,00"
          testID="cash-close-counted"
          value={counted}
        />
        <BodyText style={styles.muted}>Cuenta los billetes y monedas de la caja.</BodyText>
      </View>
      {difference === null || countedCentavos === null ? null : (
        <View style={[styles.difference, { backgroundColor: difference.tint }]}>
          <Text style={[styles.differenceText, { color: difference.text }]}>
            {`Diferencia · ${formatSignedBolivianos(countedCentavos - expectedCentavos)} · ${difference.label}`}
          </Text>
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
        <Text style={styles.counter}>{`${note.length}/500`}</Text>
      </View>
      <BodyText style={styles.muted}>
        Solo hay un cierre por día y no se puede corregir después.
      </BodyText>
      {failure === null ? null : (
        <BodyText accessibilityRole="alert" style={styles.failure}>
          {failure}
        </BodyText>
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
  const navigation = useNavigation<{ goBack: () => void }>();
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
          <BodyText accessibilityRole="alert" style={styles.failure}>
            {notice}
          </BodyText>
        )}
        <CashCloseSummary close={day.close} onDone={() => navigation.goBack()} />
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

  return (
    <Screen style={styles.screen}>
      <CenteredCard maxWidth={520}>
        <BackLink onPress={() => navigation.goBack()} />
        <View>
          <Heading accessibilityLabel="Cerrar caja">Cerrar caja</Heading>
          {day === undefined || branches.branch === null ? null : (
            <BodyText style={styles.muted}>
              {`${capitalized(civilDateLong(day.businessDate))} · ${branches.branch.name}`}
            </BodyText>
          )}
        </View>
        <FormScrollView contentContainerStyle={styles.content}>
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
  card: { ...surfaces.card, gap: spacing.xs, padding: spacing.lg },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  counter: { alignSelf: "flex-end", color: colors.textSubtle, fontSize: typography.label },
  difference: { borderRadius: radii.inset, padding: spacing.md },
  differenceText: { fontSize: typography.body, fontVariant: ["tabular-nums"], fontWeight: "500" },
  expected: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: 28,
    fontVariant: ["tabular-nums"],
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: "600",
    letterSpacing: 1.7,
  },
  failure: { color: colors.errorText },
  field: { gap: spacing.xs },
  muted: { color: colors.textMuted, fontSize: typography.note },
  note: { minHeight: 88, paddingTop: spacing.md, textAlignVertical: "top" },
  screen: { gap: spacing.md },
});
