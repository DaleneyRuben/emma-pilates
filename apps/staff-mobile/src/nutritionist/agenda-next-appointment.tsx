import type { NutritionistAgendaEntryDto } from "@pilates/api-contracts";
import { colors, initials, LineIcon, radii, spacing, surfaces, Text } from "@pilates/mobile-core";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Path } from "react-native-svg";

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
 * screen's one 600 hero, her initials in a white circle,
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
        <Text tone="onDark" variant="etiqueta">
          {started ? "En curso" : "Próxima cita"}
        </Text>
        <Text tone="onDark" variant="titulo-bloque">
          {nextAppointmentTitle(entry, today)}
        </Text>
        <View style={styles.client}>
          <View style={styles.circle}>
            <Text allowFontScaling={false} variant="pastilla">
              {initials(entry.clientName)}
            </Text>
          </View>
          <View style={styles.who}>
            <Text tone="onDark" variant="titulo-fila">
              {entry.clientName}
            </Text>
            <Text tone="onDark" variant="secundario">
              {nextAppointmentDetail(entry)}
            </Text>
          </View>
        </View>
      </View>
      {href === null ? (
        <Text tone="onDark" variant="secundario">
          {missingWhatsAppNote(entry)}
        </Text>
      ) : (
        <Pressable
          accessibilityLabel="Escribirle por WhatsApp"
          accessibilityRole="button"
          onPress={() => void Linking.openURL(href)}
          style={({ pressed }) => [styles.whatsApp, pressed && styles.pressed]}
          testID={`whatsapp-evaluation-${entry.evaluationId}`}
        >
          <LineIcon color={colors.primary} size={20} strokeWidth={1.6}>
            <Path d="M4.5 5.5h15v10h-9l-4.5 4v-4h-1.5z" />
          </LineIcon>
          <Text variant="boton">Escribirle por WhatsApp</Text>
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
          <Text tone="onDark" variant="enlace">
            Cancelar evaluación
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { ...surfaces.emphasis, gap: spacing.md, padding: spacing.xlSm },
  body: { gap: spacing.sm },
  cancel: { alignItems: "center", justifyContent: "center", minHeight: 44 },
  circle: {
    alignItems: "center",
    backgroundColor: colors.onEmphasis,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  client: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  pressed: { opacity: 0.85 },
  who: { flex: 1, gap: spacing.xxs },
  // Board N01: the white «light» button inside the hero, its glyph first.
  whatsApp: {
    alignItems: "center",
    backgroundColor: colors.onEmphasis,
    borderRadius: radii.button,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
});
