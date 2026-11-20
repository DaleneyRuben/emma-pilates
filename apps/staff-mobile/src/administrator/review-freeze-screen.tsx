import { decideFreeze, useGetFreezeReview } from "@pilates/api-contracts";
import {
  BrandToast,
  colors,
  fontFamilies,
  LoadingState,
  NoticeRow,
  OutlinedButton,
  PrimaryButton,
  QueryFailure,
  Screen,
  spacing,
  surfaces,
} from "@pilates/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { bodyScroll, FooterPanel, taskEdges } from "../ui/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { useIsTablet } from "../ui/use-is-tablet";
import { freezeDecision } from "./freeze-format";
import { FreezeReviewCard } from "./freeze-review-card";
import { RefuseFreezeStep } from "./refuse-freeze-step";

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

/**
 * E9 A + B (owner 2026-11-19): the review ends with «Aprobar»; «Rechazar con
 * un motivo» opens the refusal step on the same screen, and «Volver» or the
 * back arrow returns to the review.
 */
export function ReviewFreezeScreen({ route }: { route: { params: { freezeId: string } } }) {
  const navigation = useNavigation<ReviewNavigation>();
  const fetcher = useStaffFetcher();
  const tablet = useIsTablet();
  const review = useGetFreezeReview(route.params.freezeId, { fetcher });
  const [pending, setPending] = useState<"approved" | "refused" | null>(null);
  const [refusing, setRefusing] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const queryClient = useQueryClient();

  const decide = async (decision: "approved" | "refused", refusalReason?: string) => {
    setPending(decision);
    setNotice(null);
    try {
      const body = refusalReason === undefined ? { decision } : { decision, refusalReason };
      const response = await decideFreeze(route.params.freezeId, body, undefined, fetcher);
      setNotice(
        response.status === 200
          ? { text: "Listo. La clienta ya fue avisada.", tone: "success" }
          : { text: decisionNotice(response.data), tone: "error" },
      );
      await queryClient.invalidateQueries();
    } catch {
      setNotice({ text: "No pudimos guardar la decisión.", tone: "error" });
    } finally {
      setPending(null);
    }
  };

  const back = () => {
    if (refusing) {
      setRefusing(false);
      setNotice(null);
    } else navigation.goBack();
  };
  const header = <BackBar onBack={back} title="Revisar congelamiento" />;
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
  const firstName = freeze.clientName.trim().split(/\s+/)[0] ?? freeze.clientName;
  const requested = freeze.state === "requested";
  const decision = freezeDecision(freeze);
  const error =
    notice?.tone === "error" ? (
      <View accessibilityLabel={notice.text} accessibilityRole="alert">
        <NoticeRow message={notice.text} />
      </View>
    ) : null;
  const toast =
    notice?.tone === "success" ? (
      <BrandToast onClose={() => navigation.goBack()} title={notice.text} />
    ) : null;

  if (refusing && requested && notice?.tone !== "success") {
    return (
      <Screen edges={taskEdges} style={[styles.screen, bodyScroll.taskScreen]}>
        <View style={[styles.column, tablet && styles.tablet]}>
          <RefuseFreezeStep
            busy={pending === "refused"}
            error={error}
            firstName={firstName}
            header={
              <BackBar
                onBack={back}
                subtitle={`${firstName} recibirá este motivo en su app.`}
                title="Rechazar congelamiento"
              />
            }
            onBack={back}
            onRefuse={(refusalReason) => void decide("refused", refusalReason)}
          />
        </View>
      </Screen>
    );
  }

  const deciding = requested && notice?.tone !== "success";
  return (
    <Screen
      edges={deciding ? taskEdges : undefined}
      style={[styles.screen, deciding && bodyScroll.taskScreen]}
    >
      <View style={[styles.column, tablet && styles.tablet]}>
        {header}
        <ScrollView contentContainerStyle={bodyScroll.content} style={bodyScroll.scroll}>
          <FreezeReviewCard fetcher={fetcher} freeze={freeze} />
          {error}
          {decision === undefined ? null : (
            <View style={styles.decision}>
              <Text style={styles.decisionText}>{decision}</Text>
            </View>
          )}
        </ScrollView>
        {deciding ? (
          <FooterPanel>
            <PrimaryButton
              busy={pending === "approved"}
              disabled={pending !== null}
              label="Aprobar"
              onPress={() => void decide("approved")}
            />
            <OutlinedButton
              disabled={pending !== null}
              label="Rechazar con un motivo"
              onPress={() => {
                setNotice(null);
                setRefusing(true);
              }}
            />
          </FooterPanel>
        ) : null}
      </View>
      {toast}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // iPad: the review keeps a phone-like column instead of stretching.
  column: { alignSelf: "center", flex: 1, width: "100%" },
  // E-D10: who decided and when, in a white card.
  decision: { ...surfaces.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  decisionText: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
  screen: { paddingHorizontal: spacing.xlSm },
  tablet: { maxWidth: 560 },
});
