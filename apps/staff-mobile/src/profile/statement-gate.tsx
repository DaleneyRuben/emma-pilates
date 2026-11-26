import type { OwnSalaryPaymentDto, PayStatementDto } from "@pilates/api-contracts";
import { LoadingState, QueryFailure, Screen, spacing, StateScreen } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import type { ReactElement, ReactNode } from "react";
import { StyleSheet } from "react-native";

import type { useOwnPay } from "./use-own-pay";

/**
 * A statement's screens (S29 and a concept by day) open from the cached «Mis
 * pagos» lists; this draws their loading, failure and gone states.
 */
export function StatementGate({
  children,
  header,
  pay,
  statementId,
}: {
  children: (statement: PayStatementDto, payments: OwnSalaryPaymentDto[]) => ReactElement;
  header: ReactNode;
  pay: ReturnType<typeof useOwnPay>;
  statementId: string;
}) {
  const navigation = useNavigation();
  if (pay.pending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando la liquidación" />
      </Screen>
    );
  }
  if (pay.loaded === null) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar la liquidación." onRetry={pay.retry} />
      </Screen>
    );
  }
  const statement = pay.loaded.statements.find((candidate) => candidate.id === statementId);
  if (statement === undefined) {
    return (
      <Screen style={styles.screen}>
        {header}
        <StateScreen
          icon="card"
          note="Puede que administración la haya vuelto a calcular."
          primaryAction={{ label: "Volver a Mis pagos", onPress: () => navigation.goBack() }}
          title="Esta liquidación ya no está"
        />
      </Screen>
    );
  }
  return children(statement, pay.loaded.payments);
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.lg },
});
