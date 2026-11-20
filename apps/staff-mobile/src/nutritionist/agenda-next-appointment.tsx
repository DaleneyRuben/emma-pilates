import type { NutritionistAgendaEntryDto } from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  initials,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import {
  appointmentWhatsAppHref,
  isCancellable,
  missingWhatsAppNote,
  nextAppointmentDetail,
  nextAppointmentTitle,
} from "./agenda-copy";
import { clockTime } from "./nutritionist-format";

/**
 * E5 B «Próxima cita grande» (owner 2026-11-19): the next appointment in the
 * screen's one Palo de rosa block, her initials in a Crema circle,
 * «Escribirle por WhatsApp», and «Cancelar evaluación» inside while it can be.
 */
export function NextAppointment({
  entry,
  onCancel,
  today,
}: {
  entry: NutritionistAgendaEntryDto;
  onCancel: () => void;
  today: string;
}) {
  const href = appointmentWhatsAppHref(entry);
  const started = !isCancellable(entry);
  return (
    <View style={styles.block} testID="next-appointment">
      <View
        accessibilityLabel={`${clockTime(entry.startsAt)} ${entry.clientName}`}
        accessible
        style={styles.body}
      >
        <Text style={styles.eyebrow}>{started ? "En curso" : "Próxima cita"}</Text>
        <Text style={styles.title}>{nextAppointmentTitle(entry, today)}</Text>
        <View style={styles.client}>
          <View style={styles.circle}>
            <Text style={styles.initials}>{initials(entry.clientName)}</Text>
          </View>
          <View style={styles.who}>
            <Text style={styles.name}>{entry.clientName}</Text>
            <Text style={styles.detail}>{nextAppointmentDetail(entry)}</Text>
          </View>
        </View>
      </View>
      {href === null ? (
        <Text style={styles.detail}>{missingWhatsAppNote(entry)}</Text>
      ) : (
        <Pressable
          accessibilityLabel="Escribirle por WhatsApp"
          accessibilityRole="button"
          onPress={() => void Linking.openURL(href)}
          style={({ pressed }) => [styles.whatsApp, pressed && styles.pressed]}
          testID={`whatsapp-evaluation-${entry.evaluationId}`}
        >
          <Text style={styles.whatsAppLabel}>Escribirle por WhatsApp</Text>
        </Pressable>
      )}
      {started ? null : (
        <Pressable
          accessibilityLabel="Cancelar evaluación"
          accessibilityRole="button"
          hitSlop={{ bottom: 6, top: 6 }}
          onPress={onCancel}
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
          testID={`cancel-evaluation-${entry.evaluationId}`}
        >
          <Text style={styles.cancelLabel}>Cancelar evaluación</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { ...surfaces.emphasis, gap: spacing.md, padding: spacing.xlSm },
  body: { gap: spacing.sm },
  cancel: { alignItems: "center", justifyContent: "center", minHeight: 44 },
  cancelLabel: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  circle: {
    alignItems: "center",
    backgroundColor: colors.onEmphasis,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  client: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  detail: { color: colors.onEmphasis, fontFamily: fontFamilies.body, fontSize: 14 },
  eyebrow: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
  initials: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.label,
    fontWeight: "700",
  },
  name: { color: colors.onEmphasis, fontFamily: fontFamilies.bodyStrong, fontSize: 16 },
  pressed: { opacity: 0.85 },
  title: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.display,
    fontSize: 28,
    fontVariant: ["tabular-nums"],
    lineHeight: 34,
  },
  who: { flex: 1, gap: spacing.xxs },
  whatsApp: {
    alignItems: "center",
    backgroundColor: colors.onEmphasis,
    borderRadius: radii.button,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  whatsAppLabel: {
    color: colors.primary,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
});
