import { decideFreeze, useGetFreezeReview } from "@pilates/api-contracts";
import {
  BrandToast,
  ClientFace,
  colors,
  fontFamilies,
  IconRow,
  IconRowGroup,
  LoadingState,
  NoticeRow,
  PrimaryButton,
  QueryFailure,
  Screen,
  SectionTitle,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { BackBar, backBarScroll } from "../ui/back-bar";
import { freezeDays, freezeRange } from "./freeze-format";

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
  const queryClient = useQueryClient();

  const decide = async (decision: "approved" | "refused") => {
    setPending(decision);
    try {
      const response = await decideFreeze(route.params.freezeId, { decision }, undefined, fetcher);
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

  const header = <BackBar onBack={() => navigation.goBack()} title="Revisar congelamiento" />;
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

  const requested = freeze.state === "requested";
  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, backBarScroll.content]}
        style={backBarScroll.scroll}
      >
        {header}
        <View style={styles.identity}>
          <ClientFace
            fetcher={fetcher}
            name={freeze.clientName}
            photo={freeze.clientPhoto}
            size={56}
          />
          <View style={styles.identityBody}>
            <Text style={styles.name}>{freeze.clientName}</Text>
            <Text style={styles.muted}>{freeze.planName}</Text>
          </View>
        </View>
        <View>
          <SectionTitle>Solicitud</SectionTitle>
          <IconRowGroup>
            <IconRow
              icon="calendar"
              label={`Del ${freezeRange(freeze.startsOn, freeze.endsOn)}`}
              value={freezeDays(freeze.startsOn, freeze.endsOn)}
            />
            <IconRow icon="message" label={freeze.reason} />
          </IconRowGroup>
        </View>
        {notice?.tone === "error" ? (
          <View accessibilityLabel={notice.text} accessibilityRole="alert">
            <NoticeRow message={notice.text} />
          </View>
        ) : null}
        {requested ? null : <Text style={styles.muted}>Esta solicitud ya fue decidida.</Text>}
      </ScrollView>
      {requested && notice?.tone !== "success" ? (
        <View style={styles.actions}>
          <PrimaryButton
            busy={pending === "approved"}
            disabled={pending !== null}
            label="Aprobar congelamiento"
            onPress={() => void decide("approved")}
          />
          <TextButton
            disabled={pending !== null}
            label="Rechazar"
            onPress={() => void decide("refused")}
            tone="error"
          />
        </View>
      ) : null}
      {notice?.tone === "success" ? (
        <BrandToast onClose={() => navigation.goBack()} title={notice.text} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.xs, paddingBottom: spacing.lg, paddingTop: spacing.md },
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  identity: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  identityBody: { flex: 1, gap: spacing.xxs },
  muted: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  name: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 22 },
  screen: { paddingHorizontal: spacing.xlSm },
});
