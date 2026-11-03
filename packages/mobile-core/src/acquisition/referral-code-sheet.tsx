import { useGetReferralCodeAvailability } from "@pilates/api-contracts";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "../ui/fonts";
import { FormField } from "../ui/form-field";
import { Glyph } from "../ui/glyph";
import { PrimaryButton } from "../ui/primary-button";
import { TextButton } from "../ui/text-button";
import { colors, radii, spacing, typography } from "../ui/tokens";

// The API's rule (BKM-017): 3 to 20 letters, digits or hyphens.
const codePattern = /^[A-Z0-9][A-Z0-9-]{2,19}$/;
const debounceMilliseconds = 300;

export type CodeStatus =
  "available" | "blocked" | "current" | "failed" | "in_use" | "malformed" | "too_soon";

export const codeStatusText: Record<CodeStatus, string> = {
  available: "Disponible",
  blocked: "Ese código no está permitido",
  current: "Es tu código actual",
  failed: "No pudimos guardar tu código. Intenta de nuevo.",
  in_use: "Ya está en uso",
  malformed: "Usa de 3 a 20 letras, números o guiones",
  too_soon: "Solo puedes cambiarlo una vez cada 30 días",
};

/** Upper case, no accents, no spaces or symbols: what the code would be stored as. */
export const normalizeCode = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");

type ReferralCodeSheetProps = {
  code: string;
  fetcher: typeof fetch;
  onChangeCode: (code: string) => void;
  onDismiss: () => void;
  onSave: () => void;
  /** The server refused the last save («Ya está en uso» meanwhile). */
  refusal: CodeStatus | null;
  /** C16e / S23c inside the same sheet: iOS drops a second Modal presented
   * while the first is still closing, so the confirmation never opens its own. */
  confirmation: Confirmation | null;
  visible: boolean;
};

type Confirmation = {
  busy: boolean;
  current: string;
  onBack: () => void;
  onConfirm: () => void;
};

/** C16c / S23b: the bottom sheet that checks the new code while she types. */
export function ReferralCodeSheet({
  code,
  confirmation,
  fetcher,
  onChangeCode,
  onDismiss,
  onSave,
  refusal,
  visible,
}: ReferralCodeSheetProps) {
  const [checked, setChecked] = useState(code);
  useEffect(() => {
    const timer = setTimeout(() => setChecked(code), debounceMilliseconds);
    return () => clearTimeout(timer);
  }, [code]);

  const wellFormed = codePattern.test(checked);
  const availability = useGetReferralCodeAvailability(
    { code: checked },
    // No cached «Disponible»: only a fresh answer enables «Guardar código».
    { fetcher, query: { enabled: visible && wellFormed, gcTime: 0, staleTime: 0 } },
  );
  const answer =
    availability.data?.status === 200 && availability.data.data.code === checked
      ? availability.data.data.status
      : null;

  let status: CodeStatus | null = null;
  if (checked === code) {
    if (refusal !== null) status = refusal;
    else if (checked.length > 0 && !wellFormed) status = "malformed";
    else status = answer;
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={confirmation === null ? onDismiss : confirmation.onBack}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        // A Modal on Android does not resize with the keyboard: pad it there too.
        behavior="padding"
        style={styles.backdrop}
      >
        {/* A tap on «Guardar código» acts while the keyboard is up. */}
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {confirmation === null ? null : (
            <View style={styles.sheet}>
              <Text style={styles.title}>{`¿Cambiar tu código a ${code}?`}</Text>
              <Text style={styles.body}>
                {`Tu código anterior ${confirmation.current} dejará de funcionar. Las amigas que ya se registraron con él siguen contando para ti.`}
              </Text>
              <PrimaryButton
                busy={confirmation.busy}
                label="Cambiar código"
                onPress={confirmation.onConfirm}
                size="compact"
              />
              <TextButton
                disabled={confirmation.busy}
                label="Volver"
                onPress={confirmation.onBack}
              />
            </View>
          )}
          <View style={[styles.sheet, confirmation !== null && styles.hidden]}>
            <Text style={styles.title}>Editar tu código</Text>
            <View style={styles.field}>
              <FormField
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect={false}
                label="Tu nuevo código"
                maxLength={20}
                onChangeText={(text) => onChangeCode(normalizeCode(text))}
                style={styles.input}
                testID="referral-code-input"
                value={code}
              />
              {status === null ? null : <StatusLine status={status} />}
            </View>
            <Text style={styles.note}>
              Usa de 3 a 20 letras, números o guiones. Puedes cambiarlo una vez cada 30 días.
            </Text>
            <PrimaryButton
              disabled={status !== "available" && status !== "failed"}
              label="Guardar código"
              onPress={onSave}
              size="compact"
            />
            <TextButton label="Cancelar" onPress={onDismiss} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function StatusLine({ status }: { status: CodeStatus }) {
  const tone =
    status === "available" ? styles.ok : status === "current" ? styles.quiet : styles.wrong;
  return (
    <View accessibilityLiveRegion="polite" style={styles.status}>
      {status === "available" ? (
        <Glyph color={colors.successText} name="check" size={16} strokeWidth={1.8} />
      ) : null}
      <Text style={[styles.statusText, tone]}>{codeStatusText[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.scrim, flex: 1, justifyContent: "flex-end" },
  body: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
  field: { gap: spacing.sm },
  hidden: { display: "none" },
  input: { fontFamily: fontFamilies.display, fontSize: 22, letterSpacing: 2.6 },
  note: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  ok: { color: colors.successText },
  quiet: { color: colors.textMuted },
  scroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.frame,
    borderTopRightRadius: radii.frame,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  status: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  statusText: { fontFamily: fontFamilies.bodyStrong, fontSize: 14, fontWeight: "600" },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: typography.titleSecondary,
    fontWeight: "500",
  },
  wrong: { color: colors.errorText },
});
