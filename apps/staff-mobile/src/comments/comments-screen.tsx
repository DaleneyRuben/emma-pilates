import {
  getListAdminFeedbackQueryKey,
  useListAdminFeedback,
  type AdminFeedbackDto,
  type ListAdminFeedbackStatus,
} from "@pilates/api-contracts";
import {
  AvatarCircle,
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
  appWords,
  commentCount,
  commentTime,
  filterCount,
  filterSummary,
  statusTabs,
  typeWords,
  type CommentFilters,
} from "./comment-words";
import { CommentsFilterSheet } from "./comments-filter-sheet";

// One more page each time «Ver más comentarios» is tapped.
const pageStep = 50;

function CommentCard({
  comment,
  now,
  onOpen,
}: {
  comment: AdminFeedbackDto;
  now: Date;
  onOpen: () => void;
}) {
  const time = commentTime(comment.createdAt, now);
  const kind = `${typeWords[comment.type]} · ${appWords[comment.app]}`;
  return (
    <Pressable
      accessibilityLabel={`${comment.senderName}, ${time}. ${kind}. ${comment.text}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <AvatarCircle name={comment.senderName} size={36} />
      <View style={styles.cardBody}>
        <View style={styles.cardHead}>
          <Text style={styles.name} variant="titulo-fila">
            {comment.senderName}
          </Text>
          <Text variant="secundario">{time}</Text>
        </View>
        <Text variant="secundario">{kind}</Text>
        <Text numberOfLines={3} variant="cuerpo">
          {comment.text}
        </Text>
      </View>
    </Pressable>
  );
}

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
            <Pressable
              accessibilityLabel={filtered === 0 ? "Filtrar" : `Filtrar · ${filtered}`}
              accessibilityRole="button"
              onPress={() => setFiltering(true)}
              style={[styles.filter, filtered > 0 && styles.filterOn]}
            >
              <Text tone={filtered > 0 ? "onDark" : "ink"} variant="boton-chico">
                {filtered === 0 ? "Filtrar" : `Filtrar · ${filtered}`}
              </Text>
            </Pressable>
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
          page.items.map((comment) => (
            <CommentCard
              comment={comment}
              key={comment.id}
              now={now}
              onOpen={() => navigation.navigate("Comment", { feedbackId: comment.id })}
            />
          ))
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
  card: {
    ...surfaces.card,
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cardBody: { flex: 1, gap: 3, minWidth: 0 },
  cardHead: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
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
  filter: {
    borderColor: colors.primary,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  filterOn: { backgroundColor: colors.primary },
  name: { flex: 1 },
  pressed: { opacity: 0.7 },
  screen: { paddingHorizontal: spacing.lg },
  summary: { ...surfaces.card, gap: spacing.smd, padding: spacing.sm, paddingLeft: spacing.lg },
  summaryHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});
