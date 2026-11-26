import {
  getListAdminFeedbackQueryKey,
  useListAdminFeedback,
  type ListAdminFeedbackStatus,
} from "@pilates/api-contracts";
import {
  colors,
  EmptyState,
  Glyph,
  LoadingState,
  OutlinedButton,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  SegmentedTabs,
  spacing,
  surfaces,
  Text,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { bodyScroll } from "../ui/card-pieces";
import {
  commentCount,
  filterCount,
  filterSummary,
  statusTabs,
  type CommentFilters,
} from "./comment-words";
import { CommentsFilterSheet } from "./comments-filter-sheet";
import { CommentsList, FilterButton } from "./comments-list";

// One more page each time «Ver más comentarios» is tapped.
const pageStep = 50;

/**
 * Walkthrough n.º 11 (E-F18, E-F25, E-F26): the Administrator's comments in
 * the Staff app, by status (Nuevos, Revisados, Resueltos), with «Filtrar»
 * by type and app and one removable chip for the filters.
 */
export function CommentsScreen() {
  const navigation = useNavigation<{
    goBack: () => void;
    navigate: (screen: "Comment", params: { feedbackId: string }) => void;
  }>();
  const fetcher = useStaffFetcher();
  const [status, setStatus] = useState<ListAdminFeedbackStatus>("new");
  const [filters, setFilters] = useState<CommentFilters>({});
  const [filtering, setFiltering] = useState(false);
  const [pageSize, setPageSize] = useState(pageStep);
  const params = { page: 1, pageSize, status, ...filters };
  // A new tab or filter keeps the list on screen while it loads (review).
  const comments = useListAdminFeedback(params, {
    fetcher,
    query: { placeholderData: keepPreviousData },
  });
  const queryKeys = [getListAdminFeedbackQueryKey(params)];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);
  const header = <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Comentarios" />;

  if (comments.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando comentarios" />
      </Screen>
    );
  }
  if (comments.isError || comments.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar los comentarios."
          onRetry={() => void comments.refetch()}
        />
      </Screen>
    );
  }

  const page = comments.data.data;
  const counts = { new: page.newCount, resolved: page.resolvedCount, reviewed: page.reviewedCount };
  const summary = filterSummary(filters);
  const filtered = filterCount(filters);
  const now = new Date();

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={bodyScroll.content}
        refreshControl={refreshControl}
        style={bodyScroll.scroll}
      >
        <SegmentedTabs
          onSelect={(next) => {
            setStatus(next);
            setPageSize(pageStep);
          }}
          options={statusTabs.map((tab) => ({
            key: tab.key,
            label: tab.key === status ? `${tab.label} · ${counts[tab.key]}` : tab.label,
          }))}
          selected={status}
        />
        <View style={styles.summary}>
          <View style={styles.summaryHead}>
            <Text variant="titulo-fila">{commentCount(page.totalItems)}</Text>
            <FilterButton count={filtered} onPress={() => setFiltering(true)} />
          </View>
          {summary === null ? null : (
            <View style={styles.chip}>
              <Text variant="compacto">{summary}</Text>
              <Pressable
                accessibilityLabel="Quitar filtro"
                accessibilityRole="button"
                hitSlop={spacing.sm}
                onPress={() => setFilters({})}
                style={styles.chipClose}
              >
                <Glyph color={colors.text} name="cross" size={12} strokeWidth={1.8} />
              </Pressable>
            </View>
          )}
        </View>
        {page.items.length === 0 ? (
          <EmptyState
            icon="message"
            message="Cuando llegue un comentario, lo verás aquí."
            title="No hay comentarios aquí."
            variant="plain"
          />
        ) : (
          <CommentsList
            comments={page.items}
            now={now}
            onOpen={(comment) => navigation.navigate("Comment", { feedbackId: comment.id })}
          />
        )}
        {page.items.length < page.totalItems ? (
          <OutlinedButton
            label="Ver más comentarios"
            onPress={() => setPageSize((current) => current + pageStep)}
          />
        ) : null}
      </ScrollView>
      <CommentsFilterSheet
        filters={filters}
        onApply={(next) => {
          setFilters(next);
          setPageSize(pageStep);
          setFiltering(false);
        }}
        onClose={() => setFiltering(false)}
        status={status}
        visible={filtering}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: {
    ...surfaces.soft,
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 32,
    paddingLeft: spacing.md,
    paddingRight: 6,
  },
  chipClose: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  screen: { paddingHorizontal: spacing.lg },
  summary: { ...surfaces.card, gap: spacing.smd, padding: spacing.sm, paddingLeft: spacing.lg },
  summaryHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});
