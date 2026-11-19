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
 * C16's «Cómo funciona»: three plain lines and the limits line. FIX-082
 * (Invita option A): no numbered discs, no card.
 */
export function HowItWorks() {
  return (
    <View>
      <SectionTitle>Cómo funciona</SectionTitle>
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
  group: { ...surfaces.card },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: 64 },
  label: { color: colors.text, flex: 1, fontFamily: fontFamilies.body, fontSize: typography.body },
  limits: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    marginTop: spacing.md,
  },
  step: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    lineHeight: 22,
  },
  steps: { gap: spacing.xxs },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  value: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14 },
});
