import { decideFreeze, useGetFreezeReview } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  Screen,
  ScreenTopBar,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatCivilDate } from "../assistant/assistant-format";
import { useStaffFetcher } from "../staff-fetcher";

type ReviewNavigation = { goBack: () => void };

const decisionNotice = (body: unknown): string => {
  const code = (body as { code?: unknown } | null)?.code;
  if (code === "freeze_start_in_past") {
    return "El congelamiento ya empezó. Recházalo y pide uno desde mañana.";
  }
  if (code === "freeze_already_decided") return "Este congelamiento ya fue decidido.";
  if (code === "freeze_access_denied") return "No puedes decidir un congelamiento.";
  return "No pudimos guardar la decisión.";
};

export function ReviewFreezeScreen({ route }: { route: { params: { freezeId: string } } }) {
  const navigation = useNavigation<ReviewNavigation>();
  const fetcher = useStaffFetcher();
  const review = useGetFreezeReview(route.params.freezeId, { fetcher });
  const [pending, setPending] = useState<"approved" | "refused" | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  const decide = async (decision: "approved" | "refused") => {
    setPending(decision);
    try {
      const response = await decideFreeze(route.params.freezeId, { decision }, undefined, fetcher);
      setNotice(
        response.status === 200
          ? { text: "Listo. La clienta ya fue avisada.", tone: "success" }
          : { text: decisionNotice(response.data), tone: "error" },
      );
    } catch {
      setNotice({ text: "No pudimos guardar la decisión.", tone: "error" });
    } finally {
      setPending(null);
    }
  };

  const header = (
    <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Congelamiento" />
  );
  if (review.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando congelamiento" />
      </Screen>
    );
  }
  if (review.isError || review.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar el congelamiento."
          onRetry={() => void review.refetch()}
        />
      </Screen>
    );
  }
  const freeze = review.data.data;

  return (
    <Screen style={styles.screen}>
      {header}
      <Text style={styles.name}>{freeze.clientName}</Text>
      <BodyText>{freeze.planName}</BodyText>
      <BodyText>{`${formatCivilDate(freeze.startsOn)} – ${formatCivilDate(freeze.endsOn)}`}</BodyText>
      <BodyText>{freeze.reason}</BodyText>
      {notice === null ? null : (
        <Text
          accessibilityRole="alert"
          style={notice.tone === "success" ? styles.notice : styles.failure}
        >
          {notice.text}
        </Text>
      )}
      {freeze.state === "requested" ? (
        <View style={styles.actions}>
          <PrimaryButton
            disabled={pending !== null}
            label="Aprobar"
            onPress={() => void decide("approved")}
          />
          <TextButton
            disabled={pending !== null}
            label="Rechazar"
            onPress={() => void decide("refused")}
          />
        </View>
      ) : (
        <BodyText>Esta solicitud ya fue decidida.</BodyText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.md },
  name: { color: colors.text, fontSize: typography.titleSecondary, fontWeight: "500" },
  failure: { color: colors.errorText, fontSize: typography.note },
  notice: { color: colors.successText, fontSize: typography.note },
  screen: { gap: spacing.lg },
});
