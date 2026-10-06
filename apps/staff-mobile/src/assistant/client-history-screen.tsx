import { useListAssistantClientHistory } from "@pilates/api-contracts";
import {
  BodyText,
  ClassHistoryList,
  EmptyState,
  QueryFailure,
  Screen,
  ScreenTopBar,
  spacing,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { StyleSheet } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { ClientBanner } from "./client-banner";
import type { ClientContext } from "./client-overview-screen";

export function ClientHistoryScreen({ route }: { route: { params: ClientContext } }) {
  const { clientId, clientName } = route.params;
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useStaffFetcher();
  const history = useListAssistantClientHistory(clientId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });

  const header = (
    <>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Historial de clases" />
      <ClientBanner action="Viendo historial de" clientName={clientName} />
    </>
  );

  if (history.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText accessibilityLabel="Cargando historial">Cargando…</BodyText>
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
          title="Esta clienta aún no tiene clases en su historial."
          variant="plain"
        />
      ) : (
        <ClassHistoryList entries={entries} lead="Ha asistido a" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md },
});
