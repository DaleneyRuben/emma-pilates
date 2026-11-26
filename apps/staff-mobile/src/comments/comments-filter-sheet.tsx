import {
  useListAdminFeedback,
  type ListAdminFeedbackApp,
  type ListAdminFeedbackStatus,
  type ListAdminFeedbackType,
} from "@pilates/api-contracts";
import {
  Chip,
  colors,
  PrimaryButton,
  SheetTitle,
  spacing,
  Text,
  TextButton,
} from "@pilates/mobile-core";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { appFilterWords, commentCount, typeWords, type CommentFilters } from "./comment-words";

const types: readonly ListAdminFeedbackType[] = ["problem", "suggestion", "other"];
const apps: readonly ListAdminFeedbackApp[] = ["client", "staff"];

/**
 * Walkthrough n.º 11 (E-F25): «Filtrar comentarios» with Tipo and App, the
 * count the choice would show, and «Quitar filtros». The tab's status stays.
 */
export function CommentsFilterSheet({
  filters,
  onApply,
  onClose,
  status,
  visible,
}: {
  filters: CommentFilters;
  onApply: (filters: CommentFilters) => void;
  onClose: () => void;
  status: ListAdminFeedbackStatus;
  visible: boolean;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      {visible ? (
        <SheetBody filters={filters} onApply={onApply} onClose={onClose} status={status} />
      ) : null}
    </Modal>
  );
}

function SheetBody({
  filters,
  onApply,
  onClose,
  status,
}: {
  filters: CommentFilters;
  onApply: (filters: CommentFilters) => void;
  onClose: () => void;
  status: ListAdminFeedbackStatus;
}) {
  const fetcher = useStaffFetcher();
  const [draft, setDraft] = useState<CommentFilters>(filters);
  const preview = useListAdminFeedback({ page: 1, pageSize: 1, status, ...draft }, { fetcher });
  const count = preview.data?.status === 200 ? preview.data.data.totalItems : undefined;

  const choice = <Value extends string>(
    label: string,
    value: Value | undefined,
    selected: Value | undefined,
    pick: (value: Value | undefined) => void,
  ) => (
    <Chip
      key={label}
      label={label}
      onPress={() => pick(value)}
      role="radio"
      selected={selected === value}
    />
  );

  return (
    <View style={styles.backdrop}>
      <Pressable accessibilityLabel="Cerrar" onPress={onClose} style={styles.dismiss} />
      <View style={styles.sheet} testID="comments-filter-sheet">
        <View style={styles.grab} />
        <SheetTitle>Filtrar comentarios</SheetTitle>
        <View style={styles.group}>
          <Text variant="titulo-fila">Tipo</Text>
          <View style={styles.chips}>
            {choice("Todos", undefined, draft.type, (type) => setDraft({ ...draft, type }))}
            {types.map((type) =>
              choice(typeWords[type], type, draft.type, (picked) =>
                setDraft({ ...draft, type: picked }),
              ),
            )}
          </View>
        </View>
        <View style={styles.group}>
          <Text variant="titulo-fila">App</Text>
          <View style={styles.chips}>
            {choice("Las dos", undefined, draft.app, (app) => setDraft({ ...draft, app }))}
            {apps.map((app) =>
              choice(appFilterWords[app], app, draft.app, (picked) =>
                setDraft({ ...draft, app: picked }),
              ),
            )}
          </View>
        </View>
        <PrimaryButton
          label={count === undefined ? "Ver comentarios" : `Ver ${commentCount(count)}`}
          onPress={() => onApply(draft)}
        />
        <TextButton label="Quitar filtros" onPress={() => onApply({})} style={styles.clear} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.scrim, flex: 1, justifyContent: "flex-end" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  clear: { alignSelf: "center" },
  dismiss: { flex: 1 },
  grab: {
    alignSelf: "center",
    backgroundColor: colors.borderSoft,
    borderRadius: 3,
    height: 5,
    width: 40,
  },
  group: { gap: spacing.sm },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.md,
  },
});
