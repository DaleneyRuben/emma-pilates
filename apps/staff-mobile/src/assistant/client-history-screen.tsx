import { useListAssistantClientHistory } from "@pilates/api-contracts";
import {
  ClassHistoryList,
  EmptyState,
  LoadingState,
  QueryFailure,
  Screen,
  spacing,
} from "@pilates/mobile-core";
import { StyleSheet } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { ClientRecordsHeader } from "./client-records-header";
import type { ClientContext } from "./client-overview-screen";

export function ClientHistoryScreen({ route }: { route: { params: ClientContext } }) {
  const { clientId, clientName } = route.params;
  const fetcher = useStaffFetcher();
  const history = useListAssistantClientHistory(clientId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });

  const header = <ClientRecordsHeader context={{ clientId, clientName }} selected="history" />;

  if (history.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando historial" />
      </Screen>
    );
  }
  if (history.isError || history.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar el historial."
          onRetry={() => void history.refetch()}
        />
      </Screen>
    );
  }

  const entries = history.data.data;

  return (
    <Screen style={styles.screen}>
      {header}
      {entries.length === 0 ? (
        <EmptyState
          icon="clock"
          message="Aquí verás las clases a las que asistió."
          title="Todavía no tomó clases"
          variant="plain"
        />
      ) : (
        <ClassHistoryList entries={entries} lead="Asistió a" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingHorizontal: spacing.xlSm },
});
