import type { ReferredClientDto } from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  PersonAvatar,
  SectionTitle,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

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
            <Text key={step} style={styles.step}>
              {step}
            </Text>
          ))}
        </View>
        <Text style={styles.limits}>
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
            <Text style={styles.label}>{entry.referredName}</Text>
            <Text style={styles.value}>{invitationStatus[entry.invitationStatus]}</Text>
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
  label: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
  limits: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    lineHeight: 18,
  },
  step: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.body,
    fontWeight: "500",
    lineHeight: 21,
  },
  steps: { gap: spacing.sm },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.smLg,
  },
  value: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14 },
});
