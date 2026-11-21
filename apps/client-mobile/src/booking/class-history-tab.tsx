import { getListClassHistoryQueryKey, useListClassHistory } from "@pilates/api-contracts";
import {
  ClassHistoryList,
  EmptyState,
  LoadingState,
  QueryFailure,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";

import { useClientFetcher } from "../client-fetcher";

/** Mis reservas' «Historial» tab (walkthrough n.º 8): the old 07 screen, as a tab. */
export function ClassHistoryTab() {
  const fetcher = useClientFetcher();
  const history = useListClassHistory({ fetcher, query: { refetchOnMount: "always" } });
  const queryKeys = [getListClassHistoryQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);

  if (history.isPending) return <LoadingState label="Cargando historial" />;
  if (history.isError || history.data.status !== 200) {
    return (
      <QueryFailure
        label="No pudimos cargar tu historial."
        onRetry={() => void history.refetch()}
      />
    );
  }
  const entries = history.data.data;
  if (entries.length === 0) {
    return <EmptyState icon="clock" title="Todavía no tomaste clases" variant="plain" />;
  }
  return (
    <ClassHistoryList entries={entries} lead="Has asistido a" refreshControl={refreshControl} />
  );
}
