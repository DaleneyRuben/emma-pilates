import type { ReferredClientDto } from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  initials,
  radii,
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
  "Compartes tu código",
  "Tu amiga toma una clase gratis",
  "Compra su primer plan y tú ganas una clase",
] as const;

/** C16's «Cómo funciona»: three numbered rows and the limits line. */
export function HowItWorks() {
  return (
    <View>
      <SectionTitle>Cómo funciona</SectionTitle>
      <View style={styles.group}>
        {steps.map((step, index) => (
          <Fragment key={step}>
            {index === 0 ? null : <View style={styles.hairline} />}
            <View style={styles.row}>
              <View style={styles.disc}>
                <Text style={styles.discText}>{String(index + 1)}</Text>
              </View>
              <Text style={styles.label}>{step}</Text>
            </View>
          </Fragment>
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
            <View style={styles.disc}>
              <Text style={styles.discText}>{initials(entry.referredName)}</Text>
            </View>
            <Text style={styles.label}>{entry.referredName}</Text>
            <Text style={styles.value}>{invitationStatus[entry.invitationStatus]}</Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  discText: { color: colors.primaryOnTint, fontFamily: fontFamilies.display, fontSize: 15 },
  group: { ...surfaces.card },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: 64 },
  label: { color: colors.text, flex: 1, fontFamily: fontFamilies.body, fontSize: typography.body },
  limits: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    marginTop: spacing.md,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  value: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 14 },
});
