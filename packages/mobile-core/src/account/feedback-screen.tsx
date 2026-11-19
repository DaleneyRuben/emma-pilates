import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BodyText } from "../ui/body-text";
import { fontFamilies } from "../ui/fonts";
import { FormField } from "../ui/form-field";
import { FormScrollView } from "../ui/form-scroll-view";
import { PrimaryButton } from "../ui/primary-button";
import { StateScreen } from "../ui/state-screen";
import { Screen } from "../ui/screen";
import { ScreenTopBar } from "../ui/screen-top-bar";
import { colors, radii, spacing, typography } from "../ui/tokens";
import type { FeedbackMetadata } from "./feedback-metadata";
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
    <StateScreen
      icon="check"
      note="Lo recibió el equipo de Emma Pilates Studio y lo vamos a revisar."
      primaryAction={{ label: "Volver al perfil", onPress: onBack }}
      title="¡Gracias por tu comentario!"
    />
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
  const ready =
    !feedback.limitReached && type !== null && length >= textLength.min && length <= textLength.max;

  return (
    <Screen style={styles.screen}>
      <ScreenTopBar fullBleed onBack={onBack} title="Enviar comentarios" />
      {feedback.sent ? (
        <Thanks onBack={onBack} />
      ) : (
        <FormScrollView
          contentContainerStyle={styles.form}
          footer={
            // Walkthrough n.º 76: the failure sits above the pinned button, so
            // the keyboard never hides part of it under the footer.
            <View style={styles.footer} testID="feedback-footer">
              {feedback.failure === null ? null : (
                <BodyText accessibilityRole="alert" style={styles.failure}>
                  {feedback.failure}
                </BodyText>
              )}
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
          revealEndWithKeyboard
        >
          <BodyText>
            Cuéntanos qué falló o qué mejorarías. Lo lee el equipo de Emma Pilates Studio.
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
        </FormScrollView>
      )}
    </Screen>
  );
}

// Prompts 25 and S27: a 560 pt column on the tablet, the full width on a phone.
const column = { alignSelf: "center", maxWidth: 560, width: "100%" } as const;

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 15 },
  chipTextSelected: { color: colors.onPrimary, fontFamily: fontFamilies.bodyStrong },
  chips: { flexDirection: "row", gap: spacing.sm },
  counterRow: { flexDirection: "row", justifyContent: "space-between" },
  failure: { color: colors.errorText },
  field: { gap: spacing.sm },
  footer: { ...column, gap: spacing.md, paddingTop: spacing.md },
  form: { ...column, gap: spacing.lg, paddingBottom: spacing.lg },
  hint: { color: colors.textSubtle, fontFamily: fontFamilies.body, fontSize: typography.note },
  label: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    textTransform: "uppercase",
  },
  screen: { gap: spacing.lg },
  // Walkthrough finding 96: past 240 pt the field scrolls inside, so the row
  // under it stays above the keyboard.
  textArea: { maxHeight: 240, minHeight: 160, paddingBottom: spacing.md, paddingTop: spacing.md },
});
