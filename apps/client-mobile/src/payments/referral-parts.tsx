import type { ReferredClientDto } from "@pilates/api-contracts";
import { colors, PersonAvatar, SectionTitle, spacing, surfaces, Text } from "@pilates/mobile-core";
import { Fragment } from "react";
import { StyleSheet, View } from "react-native";

// BKM-014's invitation statuses. The API says the class was booked, not taken.
const invitationStatus = {
  registered: "Registrada",
  class_booked: "Clase reservada",
  bought: "Compró su plan",
} as const;

const steps = [
  "1. Compartes tu código.",
  "2. Tu amiga toma una clase gratis.",
  "3. Si compra su primer plan, tú ganas una clase.",
] as const;

/**
 * C16's «Cómo funciona» (Rosa Emma): three plain lines and the limits line in
 * one white card, no numbered discs.
 */
export function HowItWorks() {
  return (
    <View>
      <SectionTitle>Cómo funciona</SectionTitle>
      <View style={styles.card} testID="referral-how-it-works">
        <View style={styles.steps}>
          {steps.map((step) => (
            <Text key={step} variant="cuerpo">
              {step}
            </Text>
          ))}
        </View>
        <Text variant="secundario">
          Una amiga por mes. La clase gratis es una sola vez para ella.
        </Text>
      </View>
    </View>
  );
}

/** C16's «Tus invitadas»: initials, the name, and the invitation's status. */
export function ReferredList({ referred }: { referred: readonly ReferredClientDto[] }) {
  return (
    <View style={styles.group}>
      {referred.map((entry, index) => (
        <Fragment key={entry.referredClientId}>
          {index === 0 ? null : <View style={styles.hairline} />}
          <View style={styles.row}>
            <PersonAvatar name={entry.referredName} photoUri={null} size={36} />
            <Text style={styles.label} variant="titulo-fila">
              {entry.referredName}
            </Text>
            <Text variant="cuerpo">{invitationStatus[entry.invitationStatus]}</Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lg },
  group: { ...surfaces.card, overflow: "hidden" },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  label: { flex: 1 },
  steps: { gap: spacing.sm },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.smLg,
  },
});
