import { randomUUID } from "expo-crypto";
import { useRef, useState } from "react";
import { Keyboard, Pressable, type ScrollView, StyleSheet, View } from "react-native";

import { FormField } from "../ui/form-field";
import { FormScrollView } from "../ui/form-scroll-view";
import { Glyph } from "../ui/glyph";
import { InlineError } from "../ui/inline-error";
import { PrimaryButton } from "../ui/primary-button";
import { StateScreen } from "../ui/state-screen";
import { Screen } from "../ui/screen";
import { ScreenTopBar } from "../ui/screen-top-bar";
import { Text } from "../ui/text";
import { colors, radii, spacing, surfaces } from "../ui/tokens";
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
  error,
  value,
  onChange,
}: {
  error?: string;
  value: FeedbackType | null;
  onChange: (type: FeedbackType) => void;
}) {
  return (
    <View style={styles.field}>
      <Text variant="etiqueta">TIPO</Text>
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
              style={[
                styles.chip,
                error !== undefined && styles.chipMissing,
                selected && styles.chipSelected,
              ]}
            >
              <Text tone={selected ? "onDark" : "ink"} variant="compacto">
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error === undefined ? null : (
        // C25c: the missing type stands out, with its icon, in titulo-fila.
        <View accessibilityRole="alert" style={styles.missing}>
          <Glyph
            color={colors.text}
            name="alert"
            size={16}
            strokeWidth={1.7}
            testID="feedback-type-error-icon"
          />
          <Text variant="titulo-fila">{error}</Text>
        </View>
      )}
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
  // n.º 15 (C25c): the button stays on; a tap marks what is missing.
  const [tried, setTried] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const typeMissing = tried && type === null;
  const textShort = tried && length < textLength.min;

  const send = () => {
    if (type === null || length < textLength.min || length > textLength.max) {
      setTried(true);
      Keyboard.dismiss();
      scroller.current?.scrollTo({ animated: true, y: 0 });
      return;
    }
    void feedback.send(type, text);
  };

  return (
    <Screen style={styles.screen}>
      <ScreenTopBar fullBleed onBack={onBack} title="Enviar comentarios" />
      {feedback.sent ? (
        <Thanks onBack={onBack} />
      ) : (
        <FormScrollView
          contentContainerStyle={styles.form}
          keyboardVerticalOffset={spacing.xxl}
          revealEndWithKeyboard
          scrollRef={scroller}
        >
          <View style={styles.card}>
            <Text variant="cuerpo">
              Cuéntanos qué falló o qué mejorarías. Lo lee el equipo de Emma Pilates Studio.
            </Text>
            <TypeChips
              error={typeMissing ? "Elige el tipo de comentario" : undefined}
              value={type}
              onChange={setType}
            />
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
                <Text variant="secundario">Mínimo 10 caracteres.</Text>
                <Text variant="secundario">{`${text.length} / ${textLength.max}`}</Text>
              </View>
              {textShort ? <InlineError field>Escribe al menos 10 caracteres.</InlineError> : null}
            </View>
          </View>
          {/* n.º 6 and 15 (C25d): the button ends the form and scrolls with it;
              the day's limit (walkthrough n.º 76) sits right above it. */}
          <View style={styles.end} testID="feedback-form">
            {feedback.failure === null ? null : (
              <View style={styles.failureBox}>
                <Glyph color={colors.text} name="alert" size={18} strokeWidth={1.6} />
                <InlineError style={styles.failure}>{feedback.failure}</InlineError>
              </View>
            )}
            <PrimaryButton
              busy={feedback.sending}
              disabled={feedback.limitReached}
              label="Enviar comentario"
              onPress={send}
            />
          </View>
        </FormScrollView>
      )}
    </Screen>
  );
}

// Prompts 25 and S27: a 560 pt column on the tablet, the full width on a phone.
const column = { alignSelf: "center", maxWidth: 560, width: "100%" } as const;

const styles = StyleSheet.create({
  // C25: white chips with a 1.5 pt 400 outline, the chosen one 600.
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  chip: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    // C25c: the three chips share the row.
    flex: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.mdLg,
  },
  chipMissing: { borderColor: colors.primary, borderWidth: 2 },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chips: { flexDirection: "row", gap: spacing.sm },
  missing: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  counterRow: { flexDirection: "row", justifyContent: "space-between" },
  end: { gap: spacing.sm, marginTop: spacing.md },
  failure: { flex: 1 },
  // C25e: the day's limit on 50 with a 1.5 pt 400 rule, above the button.
  failureBox: {
    alignItems: "flex-start",
    backgroundColor: colors.errorTint,
    borderColor: colors.borderStrong,
    borderRadius: radii.inset,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  field: { gap: spacing.sm },
  form: { ...column, paddingBottom: spacing.lg },
  screen: { gap: spacing.md },
  // Walkthrough finding 96: past 240 pt the field scrolls inside, so the row
  // under it stays above the keyboard.
  textArea: { maxHeight: 240, minHeight: 160, paddingBottom: spacing.md, paddingTop: spacing.md },
});
