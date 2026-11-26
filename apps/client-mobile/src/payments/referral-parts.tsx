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

// Walkthrough n.º 20 (C16s): what comes next for each friend.
const nextStep = {
  registered: "Todavía no reservó su clase gratis.",
  class_booked: "Si compra su primer plan, ganas una clase.",
  bought: "Ganaste 1 clase. Ya está en tu plan.",
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
        <Text variant="secundario">Puedes invitar a una amiga por mes.</Text>
      </View>
    </View>
  );
}

/**
 * C16s' «Tus invitadas»: initials, the name with the invitation's status on
 * its right, and the next step under them.
 */
export function ReferredList({ referred }: { referred: readonly ReferredClientDto[] }) {
  return (
    <View style={styles.group}>
      {referred.map((entry, index) => (
        <Fragment key={entry.referredClientId}>
          {index === 0 ? null : <View style={styles.hairline} />}
          <View style={styles.row}>
            <PersonAvatar name={entry.referredName} photoUri={null} size={36} />
            <View style={styles.label}>
              <View style={styles.nameLine}>
                <Text style={styles.label} variant="titulo-fila">
                  {entry.referredName}
                </Text>
                <Text variant="secundario">{invitationStatus[entry.invitationStatus]}</Text>
              </View>
              <Text variant="secundario">{nextStep[entry.invitationStatus]}</Text>
            </View>
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
  label: { flex: 1, gap: 2 },
  nameLine: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
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
