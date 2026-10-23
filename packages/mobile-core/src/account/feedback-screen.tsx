import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BodyText } from "../ui/body-text";
import { fontFamilies } from "../ui/fonts";
import { Glyph } from "../ui/glyph";
import { FormField } from "../ui/form-field";
import { FormScrollView } from "../ui/form-scroll-view";
import { PrimaryButton } from "../ui/primary-button";
import { Screen } from "../ui/screen";
import { ScreenTopBar } from "../ui/screen-top-bar";
import { colors, radii, spacing, surfaces, typography } from "../ui/tokens";
import { describeFeedbackDevice, type FeedbackMetadata } from "./feedback-metadata";
import { useSendFeedback, type FeedbackType } from "./use-send-feedback";

const types: readonly (readonly [FeedbackType, string])[] = [
  ["problem", "Problema"],
  ["suggestion", "Sugerencia"],
  ["other", "Otro"],
];
const textLength = { min: 10, max: 2000 } as const;

type FeedbackScreenProps = {
  fetcher: typeof globalThis.fetch;
  metadata: FeedbackMetadata;
  newIdempotencyKey?: () => string;
  onBack: () => void;
};

function TypeChips({
  value,
  onChange,
}: {
  value: FeedbackType | null;
  onChange: (type: FeedbackType) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Tipo</Text>
      <View style={styles.chips}>
        {types.map(([type, label]) => {
          const selected = type === value;
          return (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={type}
              onPress={() => onChange(type)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Thanks({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.thanks}>
      <View style={styles.thanksIcon}>
        <Glyph name="message" size={30} />
      </View>
      <Text accessibilityRole="header" style={styles.thanksTitle}>
        ¡Gracias por tu comentario!
      </Text>
      <BodyText style={styles.centered}>
        Lo recibió el equipo de Emma Pilates y lo vamos a revisar.
      </BodyText>
      <PrimaryButton label="Volver al perfil" onPress={onBack} />
    </View>
  );
}

// REL-012: «Enviar comentarios» on Perfil in both apps (system-identity
// CONTEXT, Feedback). The app version, build, system, and Role travel with the
// text; no screenshot does, which keeps Data safety simple.
export function FeedbackScreen({
  fetcher,
  metadata,
  newIdempotencyKey = randomUUID,
  onBack,
}: FeedbackScreenProps) {
  const [type, setType] = useState<FeedbackType | null>(null);
  const [text, setText] = useState("");
  const feedback = useSendFeedback({ fetcher, metadata, newIdempotencyKey });
  const length = text.trim().length;
  const ready = type !== null && length >= textLength.min && length <= textLength.max;

  return (
    <Screen style={styles.screen}>
      <ScreenTopBar fullBleed onBack={onBack} title="Enviar comentarios" />
      {feedback.sent ? (
        <Thanks onBack={onBack} />
      ) : (
        <FormScrollView
          contentContainerStyle={styles.form}
          footer={
            <View style={styles.footer}>
              <PrimaryButton
                busy={feedback.sending}
                disabled={!ready}
                label="Enviar comentario"
                onPress={() => {
                  if (type !== null) void feedback.send(type, text);
                }}
              />
            </View>
          }
          keyboardVerticalOffset={spacing.xxl}
        >
          <BodyText>
            Cuéntanos qué falló o qué mejorarías. Lo lee el equipo de Emma Pilates.
          </BodyText>
          <TypeChips value={type} onChange={setType} />
          <View style={styles.field}>
            <FormField
              label="Comentario"
              maxLength={textLength.max}
              multiline
              onChangeText={setText}
              placeholder="Escribe aquí tu comentario"
              style={styles.textArea}
              testID="feedback-text"
              textAlignVertical="top"
              value={text}
            />
            <View style={styles.counterRow}>
              <Text style={styles.hint}>Mínimo 10 caracteres.</Text>
              <Text style={styles.hint}>{`${text.length} / ${textLength.max}`}</Text>
            </View>
          </View>
          <View style={styles.attached}>
            <BodyText style={styles.attachedText}>
              {`Junto con tu comentario enviamos ${describeFeedbackDevice(metadata)} y tu rol. No enviamos capturas de pantalla.`}
            </BodyText>
          </View>
          {feedback.failure === null ? null : (
            <BodyText accessibilityRole="alert" style={styles.failure}>
              {feedback.failure}
            </BodyText>
          )}
        </FormScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  attached: {
    ...surfaces.flatCard,
    padding: spacing.md,
  },
  attachedText: { color: colors.textSecondary, fontSize: typography.note, lineHeight: 19 },
  centered: { textAlign: "center" },
  chip: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  chipSelected: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontFamily: fontFamilies.body, fontSize: 15 },
  chipTextSelected: { color: colors.primaryDeep, fontFamily: fontFamilies.bodyMedium },
  chips: { flexDirection: "row", gap: spacing.sm },
  counterRow: { flexDirection: "row", justifyContent: "space-between" },
  failure: { color: colors.errorText },
  field: { gap: spacing.sm },
  footer: { paddingTop: spacing.md },
  form: { gap: spacing.lg, paddingBottom: spacing.lg },
  hint: { color: colors.textSubtle, fontFamily: fontFamilies.body, fontSize: typography.note },
  label: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    textTransform: "uppercase",
  },
  screen: { gap: spacing.lg },
  textArea: { minHeight: 160, paddingBottom: spacing.md, paddingTop: spacing.md },
  thanks: { alignItems: "stretch", gap: spacing.lg, paddingTop: spacing.xxl },
  thanksIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  thanksTitle: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: typography.titleSecondary,
    textAlign: "center",
  },
});
