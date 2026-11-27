import {
  getGetAdminFeedbackQueryKey,
  getListAdminFeedbackQueryKey,
  useGetAdminFeedback,
  useTriageAdminFeedback,
  type AdminFeedbackDto,
  type TriageFeedbackDtoStatus,
} from "@pilates/api-contracts";
import {
  AvatarCircle,
  colors,
  FormField,
  FormScrollView,
  InlineError,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  SegmentedTabs,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { bodyScroll, FooterPanel, taskEdges } from "../ui/card-pieces";
import { appLine, commentSentAt, senderLine, typeWords } from "./comment-words";

const statuses: readonly { key: TriageFeedbackDtoStatus; label: string }[] = [
  { key: "new", label: "Nuevo" },
  { key: "reviewed", label: "Revisado" },
  { key: "resolved", label: "Resuelto" },
];

// The comment (`children`) and its triage scroll above E-F19's fixed footer
// panel, which holds «Guardar» and rises with the keyboard.
function Triage({ children, comment }: { children: ReactNode; comment: AdminFeedbackDto }) {
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TriageFeedbackDtoStatus>(comment.status);
  const [note, setNote] = useState(comment.changeNote ?? "");
  const [saved, setSaved] = useState(false);
  const triage = useTriageAdminFeedback({
    fetcher,
    mutation: {
      // The generated fetcher resolves a refusal too: only a 200 is saved.
      onSuccess: (response) => {
        if (response.status !== 200) return;
        setSaved(true);
        void queryClient.invalidateQueries({ queryKey: getListAdminFeedbackQueryKey() });
        void queryClient.invalidateQueries({
          queryKey: getGetAdminFeedbackQueryKey(comment.id),
        });
      },
    },
  });
  const failed = triage.isError || (triage.data !== undefined && triage.data.status !== 200);

  const footer = (
    <FooterPanel bleed={0} testID="comment-footer">
      <PrimaryButton
        busy={triage.isPending}
        label="Guardar"
        onPress={() =>
          triage.mutate({
            feedbackId: comment.id,
            data: { status, changeNote: note.trim() === "" ? null : note.trim() },
          })
        }
      />
    </FooterPanel>
  );

  return (
    <View style={bodyScroll.clip}>
      <FormScrollView contentContainerStyle={bodyScroll.content} footer={footer}>
        {children}
        <View style={styles.card}>
          <Text variant="etiqueta">Estado</Text>
          <SegmentedTabs
            onSelect={(next) => {
              setSaved(false);
              setStatus(next);
            }}
            options={statuses}
            selected={status}
          />
          <FormField
            hint="Nota interna: la clienta o el equipo no la ven."
            label="Qué cambiamos"
            maxLength={500}
            multiline
            onChangeText={(text) => {
              setSaved(false);
              setNote(text);
            }}
            placeholder="Ej.: Arreglamos la lista de reservas en la versión 1.0.2."
            value={note}
          />
          {failed ? <InlineError>No pudimos guardar. Inténtalo de nuevo.</InlineError> : null}
          {saved ? <Text variant="secundario">Guardado.</Text> : null}
        </View>
      </FormScrollView>
    </View>
  );
}

/**
 * Walkthrough n.º 11 (E-F19): one comment with who sent it, the text, the
 * app and when; the Administrator marks it Nuevo, Revisado or Resuelto with
 * «Qué cambiamos» as the internal note, as on the admin web.
 */
export function CommentScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const { feedbackId } = useRoute().params as { feedbackId: string };
  const fetcher = useStaffFetcher();
  const comment = useGetAdminFeedback(feedbackId, { fetcher });
  const header = <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Comentario" />;

  if (comment.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando comentario" />
      </Screen>
    );
  }
  if (comment.isError || comment.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar el comentario."
          onRetry={() => void comment.refetch()}
        />
      </Screen>
    );
  }

  const row = comment.data.data;
  return (
    <Screen edges={taskEdges} style={[styles.screen, bodyScroll.taskScreen]}>
      {header}
      <Triage comment={row} key={`${row.id}-${row.status}`}>
        <View style={[styles.card, styles.sender]}>
          <AvatarCircle name={row.senderName} size={44} />
          <View style={styles.senderText}>
            <Text variant="titulo-fila">{row.senderName}</Text>
            <Text variant="secundario">{senderLine(row)}</Text>
          </View>
          <View style={styles.type}>
            <Text tone="onDark" variant="pastilla">
              {typeWords[row.type]}
            </Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text variant="cuerpo">{row.text}</Text>
        </View>
        <View style={styles.facts}>
          <View style={styles.fact}>
            <Text style={styles.factLabel} variant="cuerpo">
              App
            </Text>
            <Text variant="titulo-fila">{appLine(row)}</Text>
          </View>
          <View style={[styles.fact, styles.divided]}>
            <Text style={styles.factLabel} variant="cuerpo">
              Enviado
            </Text>
            <Text variant="titulo-fila">{commentSentAt(row.createdAt)}</Text>
          </View>
        </View>
      </Triage>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.smd, padding: spacing.lg },
  divided: { borderTopColor: colors.hairline, borderTopWidth: 1 },
  fact: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  factLabel: { flex: 1 },
  facts: { ...surfaces.card, overflow: "hidden" },
  screen: { paddingHorizontal: spacing.lg },
  sender: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  senderText: { flex: 1, gap: 2 },
  type: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: spacing.md,
  },
});
