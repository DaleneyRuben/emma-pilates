import { useListClassHistory } from "@pilates/api-contracts";
import {
  ClassHistoryList,
  EmptyState,
  LoadingState,
  QueryFailure,
  Screen,
  ScreenTopBar,
  spacing,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { StyleSheet } from "react-native";

import { useClientFetcher } from "../client-fetcher";

export function ClassHistoryScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useClientFetcher();
  const history = useListClassHistory({
    fetcher,
    query: { refetchOnMount: "always" },
  });

  const header = (
    <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Historial de clases" />
  );

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
          label="No pudimos cargar tu historial."
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
          message="Aquí aparecerán tus clases una vez que registremos tu asistencia en el estudio."
          title="Aún no tienes clases en tu historial."
          variant="plain"
        />
      ) : (
        <ClassHistoryList entries={entries} lead="Has asistido a" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
});
