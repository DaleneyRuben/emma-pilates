import {
  getGetTodayCashCloseQueryKey,
  useGetTodayCashClose,
  type CashCloseDto,
  formatTitleDate,
} from "@pilates/api-contracts";
import { LoadingState, NoticeRow, QueryFailure, Screen, spacing } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { CenteredCard } from "../assistant/assistant-layout";
import { BranchCard } from "../assistant/branch-card";
import { bodyScroll, taskEdges } from "../profile/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { useCashBranches } from "../ui/branch-chips";
import { RootHeader } from "../ui/root-header";
import { useIsStackRoot } from "../ui/use-is-stack-root";
import { CashCloseForm } from "./cash-close-form";
import { CashCloseFrame } from "./cash-close-frame";
import { CashCloseNoCash } from "./cash-close-no-cash";
import { CashCloseSummary } from "./cash-close-summary";

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

  // E-S04: the Branch chips lead the body on their own white card.
  const lead = (
    <BranchCard
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
  );
  const plain = (content: ReactNode) => (
    <CashCloseFrame root={root}>
      {lead}
      {content}
    </CashCloseFrame>
  );

  let body;
  if (branches.isError) {
    body = plain(
      <QueryFailure label="No pudimos cargar la caja de hoy." onRetry={() => branches.refetch()} />,
    );
  } else if (branches.isPending || branches.branch === null || today.isPending) {
    body = plain(<LoadingState label="Cargando la caja de hoy" />);
  } else if (today.isError || day === undefined) {
    body = plain(
      <QueryFailure
        label="No pudimos cargar la caja de hoy."
        onRetry={() => {
          branches.refetch();
          void today.refetch();
        }}
      />,
    );
  } else if (day.close !== null) {
    body = (
      <CashCloseSummary
        close={day.close}
        doneLabel={root ? "Ir a Clientas" : "Volver"}
        lead={
          <>
            {lead}
            {notice === null ? null : (
              <View accessibilityLabel={notice} accessibilityRole="alert">
                <NoticeRow message={notice} />
              </View>
            )}
          </>
        }
        onDone={() => (root ? navigation.navigate("ClientsTab") : navigation.goBack())}
        root={root}
      />
    );
  } else if (day.cashPaymentCount === 0 && !countAnyway) {
    body = (
      <CashCloseNoCash
        branch={branches.branch}
        fetcher={fetcher}
        key={branchId}
        lead={lead}
        onClosed={refresh}
        onHasCash={() => setCountAnyway(true)}
        root={root}
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
        lead={lead}
        onClosed={refresh}
        root={root}
        voidedCashCentavos={day.voidedCashCentavos ?? 0}
      />
    );
  }

  const where =
    day === undefined || branches.branch === null
      ? undefined
      : `${formatTitleDate(day.businessDate)} · ${branches.branch.name}`;
  const title = day?.close ? "Caja" : "Cerrar caja";

  // The band stays put above the body (E-S04); from Pagos the screen is a task
  // whose footer panel keeps the bottom safe area (E-S08).
  return (
    <Screen
      edges={root ? undefined : taskEdges}
      style={[styles.screen, !root && bodyScroll.taskScreen]}
    >
      <CenteredCard maxWidth={520} style={styles.column}>
        {root ? (
          <RootHeader eyebrow={where} label="Cerrar caja" title={title} />
        ) : (
          <BackBar back="Pagos" onBack={() => navigation.goBack()} subtitle={where} title={title} />
        )}
        {body}
      </CenteredCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  column: { gap: 0 },
  screen: { paddingHorizontal: spacing.xlSm },
});
