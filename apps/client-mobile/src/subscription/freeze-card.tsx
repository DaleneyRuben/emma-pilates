import { withdrawFreeze, type ClientFreezeDto } from "@pilates/api-contracts";
import {
  addCivilDays,
  colors,
  ConfirmationSheet,
  fontFamilies,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { dayMonth, freezeRange, freezeSummary, weekdayDayMonth } from "./freeze-window";

type CardState = "requested" | "approved" | "running" | "refused";

const pills: Record<CardState, { label: string; background: string; color: string }> = {
  requested: { label: "En revisión", background: colors.warningTint, color: colors.warningTitle },
  approved: { label: "Aprobado", background: colors.successTint, color: colors.successText },
  running: { label: "Congelado", background: colors.neutralPill, color: colors.text },
  refused: { label: "No aprobado", background: colors.errorPill, color: colors.errorText },
};

/**
 * Which card a Freeze shows today: none once an approved Freeze is over or
 * after she withdrew it (Mi plan then offers Congelar plan again).
 */
export function freezeCardState(freeze: ClientFreezeDto, today: string): CardState | null {
  if (freeze.state === "requested") return "requested";
  if (freeze.state === "refused") return "refused";
  if (freeze.state !== "approved") return null;
  if (today < freeze.startsOn) return "approved";
  return today <= freeze.endsOn ? "running" : null;
}

/**
 * Walkthrough findings 51 and 53 (follow-up 259 A): the Freeze as a neutral
 * card with its state, dates, days and plan end, instead of a loose line.
 * A request in review can be withdrawn (owner, 2026-11-08).
 */
export function FreezeCard({
  freeze,
  onWithdrawn,
  planEndsOn,
  state,
}: {
  freeze: ClientFreezeDto;
  /** After a withdrawal (`true`), or when the request was decided first. */
  onWithdrawn: (withdrawn: boolean) => void;
  /** The plan's stored end: already moved once a Freeze is approved. */
  planEndsOn: string;
  state: CardState;
}) {
  const fetcher = useClientFetcher();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summary = freezeSummary(planEndsOn, freeze.startsOn, freeze.endsOn);
  const range = freezeRange(freeze.startsOn, freeze.endsOn);
  const pill = pills[state];

  const withdraw = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await withdrawFreeze(freeze.id, undefined, fetcher);
      setConfirming(false);
      if (response.status === 200) {
        onWithdrawn(true);
        return;
      }
      const code = (response.data as { code?: unknown } | null)?.code;
      if (response.status === 409) {
        // Decided, or withdrawn on another phone: show how it stands now.
        setError(
          code === "freeze_already_decided"
            ? "La administración ya decidió tu solicitud. Mira cómo quedó."
            : "Esta solicitud ya no está en revisión.",
        );
        onWithdrawn(false);
      } else {
        setError("No pudimos retirar la solicitud. Inténtalo de nuevo.");
      }
    } catch {
      setConfirming(false);
      setError("No pudimos retirar la solicitud. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const content = {
    requested: {
      title: range,
      rows: [
        ["Días", summary.days],
        ["Tu plan vencería el", summary.newEnd],
      ],
      note: "Te avisamos cuando la administración responda.",
    },
    approved: {
      title:
        freeze.startsOn === freeze.endsOn
          ? `Congelado el ${weekdayDayMonth(freeze.startsOn)}`
          : `Congelado d${range.slice(1)}`,
      rows: [
        ["Días", summary.days],
        ["Ahora vence el", weekdayDayMonth(planEndsOn)],
      ],
      note: "Esos días no puedes reservar. Tus reservas de esos días se cancelaron y las clases volvieron a tu plan.",
    },
    running: {
      title: `Congelado hasta el ${weekdayDayMonth(freeze.endsOn)}`,
      rows: [
        ["Vuelves a reservar", weekdayDayMonth(addCivilDays(freeze.endsOn, 1))],
        ["Ahora vence el", weekdayDayMonth(planEndsOn)],
      ],
      note: "Tus clases y tus días quedan guardados mientras tanto.",
    },
    refused: {
      title: range,
      rows: [["Días", summary.days]],
      note: "La administración no aprobó este congelamiento. Tu plan sigue igual y puedes pedir otro.",
    },
  }[state];

  return (
    <View style={styles.block}>
      <View style={styles.card} testID="freeze-card">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Congelamiento</Text>
          <View style={[styles.pill, { backgroundColor: pill.background }]}>
            <Text style={[styles.pillLabel, { color: pill.color }]}>{pill.label}</Text>
          </View>
        </View>
        <Text style={styles.title}>{content.title}</Text>
        {content.rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ))}
        <Text style={styles.note}>{content.note}</Text>
      </View>
      {/* Owner 2026-11-08: a discreet link under the card, like «Cerrar mi
          cuenta» on Perfil, not a button. */}
      {state === "requested" ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={spacing.md}
          onPress={() => setConfirming(true)}
          style={styles.withdraw}
        >
          <Text style={styles.withdrawLabel}>Retirar solicitud</Text>
        </Pressable>
      ) : null}
      {error === null ? null : (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <ConfirmationSheet
        busy={busy}
        confirmLabel="Retirar solicitud"
        note={`Tu plan sigue igual y vence el ${dayMonth(planEndsOn)}. Puedes pedir otro congelamiento después.`}
        onConfirm={() => void withdraw()}
        onDismiss={() => setConfirming(false)}
        title="¿Retirar tu solicitud?"
        tone="primary"
        visible={confirming}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  error: { color: colors.errorText, fontFamily: fontFamilies.body, fontSize: typography.note },
  eyebrow: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  note: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 18 },
  pill: { borderRadius: radii.pill, paddingHorizontal: spacing.smLg, paddingVertical: spacing.xs },
  pillLabel: { fontFamily: fontFamilies.bodyStrong, fontSize: typography.label },
  row: { flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  rowLabel: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 14 },
  rowValue: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    textAlign: "right",
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.titleSmall,
    lineHeight: 25,
  },
  withdraw: { alignSelf: "center", paddingVertical: spacing.xs },
  withdrawLabel: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.label,
    textDecorationLine: "underline",
  },
});
