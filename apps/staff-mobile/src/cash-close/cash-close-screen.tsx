import {
  getGetTodayCashCloseQueryKey,
  useGetTodayCashClose,
  type CashCloseDto,
} from "@pilates/api-contracts";
import {
  FormScrollView,
  LoadingState,
  NoticeRow,
  QueryFailure,
  Screen,
  spacing,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { CenteredCard } from "../assistant/assistant-layout";
import { civilDateLong } from "../nutritionist/nutritionist-format";
import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { BranchChips, useCashBranches } from "../ui/branch-chips";
import { RootHeader } from "../ui/root-header";
import { useIsStackRoot } from "../ui/use-is-stack-root";
import { CashCloseForm } from "./cash-close-form";
import { CashCloseNoCash } from "./cash-close-no-cash";
import { CashCloseSummary } from "./cash-close-summary";

const capitalized = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

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
  // Pick C's «Sí hay efectivo en la caja» opens the count after all.
  const [countAnyway, setCountAnyway] = useState(false);
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
  } else if (day.cashPaymentCount === 0 && !countAnyway) {
    body = (
      <CashCloseNoCash
        branch={branches.branch}
        fetcher={fetcher}
        key={branchId}
        onClosed={refresh}
        onHasCash={() => setCountAnyway(true)}
      />
    );
  } else {
    body = (
      <CashCloseForm
        branch={branches.branch}
        cashPaymentCount={day.cashPaymentCount}
        expectedCentavos={day.expectedCentavos}
        fetcher={fetcher}
        key={branchId}
        onClosed={refresh}
        voidedCashCentavos={day.voidedCashCentavos ?? 0}
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
              setCountAnyway(false);
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
  content: { gap: spacing.lgXl, paddingBottom: spacing.xxl },
  screen: { gap: spacing.md, paddingHorizontal: spacing.xlSm },
});
