import {
  BodyText,
  colors,
  formatSessionDate,
  formatTimeRange,
  radii,
  Screen,
  ScreenTopBar,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { createAdministratorApi } from "./administrator-api";
import { describeCount, describeSessionCancellation } from "./administrator-format";
import type { CancellableSession } from "./cancel-class-screen";

type CancelSessionNavigation = { goBack: () => void };

export function CancelSessionScreen({
  route,
}: {
  route: { params: { session: CancellableSession } };
}) {
  const navigation = useNavigation<CancelSessionNavigation>();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const api = useMemo(() => createAdministratorApi(fetcher), [fetcher]);
  const { session } = route.params;
  const [submitting, setSubmitting] = useState(false);
  const [affected, setAffected] = useState<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const cancel = async () => {
    setSubmitting(true);
    setFailure(null);
    try {
      const result = await api.cancelSession(session.id);
      await queryClient.invalidateQueries();
      setAffected(result.affectedBookings);
    } catch {
      setFailure("No pudimos cancelar la sesión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const when = `${formatSessionDate(session.startsAt)} · ${formatTimeRange(session.startsAt, session.endsAt)}`;

  if (affected !== null) {
    return (
      <Screen style={styles.screen}>
        <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Sesión cancelada" />
        <View style={styles.summary}>
          <BodyText>{when}</BodyText>
          <Text style={styles.title}>{session.classTypeName}</Text>
          <BodyText>{`${session.trainerName} · ${session.branchName}`}</BodyText>
        </View>
        <View style={styles.receipt}>
          <BodyText>
            {affected === 1
              ? "Se notificó al cliente afectado."
              : `Se notificó a los ${affected} clientes afectados.`}
          </BodyText>
          <BodyText>Se reembolsó una clase a cada cliente.</BodyText>
        </View>
        <TextButton label="Volver" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Cancelar sesión" />
      <View style={styles.summary}>
        <BodyText>{when}</BodyText>
        <Text style={styles.title}>{session.classTypeName}</Text>
        <BodyText>{session.trainerName}</BodyText>
        <BodyText>{session.branchName}</BodyText>
        <Text style={styles.affected}>
          {describeCount(session.bookedCount, "cliente afectado", "clientes afectados")}
        </Text>
      </View>
      <View style={styles.warning}>
        <Text style={styles.warningTitle}>Esto no se puede deshacer</Text>
        <BodyText style={styles.warningText}>
          {describeSessionCancellation(session)}
        </BodyText>
      </View>
      {failure === null ? null : (
        <BodyText accessibilityRole="alert" style={styles.failure}>
          {failure}
        </BodyText>
      )}
      <Pressable
        accessibilityLabel="Sí, cancelar sesión"
        accessibilityRole="button"
        accessibilityState={{ disabled: submitting }}
        disabled={submitting}
        onPress={() => void cancel()}
        style={[styles.destructive, submitting && styles.destructiveDisabled]}
      >
        <Text style={styles.destructiveLabel}>Sí, cancelar sesión</Text>
      </Pressable>
      <TextButton label="Cancelar" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  affected: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  destructive: {
    alignItems: "center",
    backgroundColor: colors.error,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 52,
  },
  destructiveDisabled: { opacity: 0.6 },
  destructiveLabel: { color: colors.white, fontSize: typography.body, fontWeight: "500" },
  failure: { color: colors.errorText },
  receipt: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  screen: { gap: spacing.lg },
  summary: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: typography.titleSecondary, fontWeight: "500" },
  // S14 draws the consequences as a warning, not an error; the destructive
  // button alone carries the error colour.
  warning: {
    backgroundColor: colors.warningTint,
    borderColor: colors.warning,
    borderRadius: radii.frame,
    borderWidth: 1,
    gap: spacing.smLg,
    padding: spacing.xlSm,
  },
  warningText: { color: colors.text, fontSize: 14, lineHeight: 23 },
  warningTitle: {
    color: colors.warningText,
    fontFamily: "Lora_500Medium",
    fontSize: typography.bodyLarge,
  },
});
