import {
  Chip,
  colors,
  fontFamilies,
  FormField,
  OutlinedButton,
  PrimaryButton,
  radii,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { backBarScroll } from "../ui/back-bar";
import {
  refusalDisabledReason,
  refusalMessageLimit,
  refusalNeedsMessage,
  refusalReasons,
  refusalReasonText,
  type RefusalReason,
} from "./freeze-refusal";

/**
 * E9 B (owner 2026-11-19): the refusal's reason as chips, an optional message,
 * the «Esto no se puede deshacer» notice in Crema with an Arcilla border, then
 * «Rechazar y avisar a <clienta>» and «Volver». This step is the destructive
 * decision's confirmation (FIX-089).
 */
export function RefuseFreezeStep({
  busy,
  error,
  firstName,
  header,
  onBack,
  onRefuse,
}: {
  busy: boolean;
  error: ReactNode;
  firstName: string;
  header: ReactNode;
  onBack: () => void;
  onRefuse: (refusalReason: string) => void;
}) {
  const [reason, setReason] = useState<RefusalReason | null>(null);
  const [message, setMessage] = useState("");
  const text = refusalReasonText(reason, message);
  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.content, backBarScroll.content]}
        keyboardShouldPersistTaps="handled"
        style={backBarScroll.scroll}
      >
        {header}
        <View accessibilityRole="radiogroup" style={styles.chips}>
          {refusalReasons.map((option) => (
            <Chip
              key={option}
              label={option}
              onPress={() => setReason(option)}
              role="radio"
              selected={reason === option}
            />
          ))}
        </View>
        <FormField
          hint="Ej.: Necesitamos 48 h de aviso para congelar."
          label={`Mensaje para ${firstName}`}
          maxLength={refusalMessageLimit(reason)}
          multiline
          onChangeText={setMessage}
          optional={!refusalNeedsMessage(reason)}
          value={message}
        />
        <View style={styles.notice} testID="refuse-freeze-notice">
          <Text style={styles.noticeTitle}>Esto no se puede deshacer</Text>
          <Text style={styles.noticeBody}>{`${firstName} podrá pedir otro congelamiento.`}</Text>
        </View>
        {error}
      </ScrollView>
      <View style={styles.actions}>
        <PrimaryButton
          busy={busy}
          disabled={text === undefined}
          disabledReason={refusalDisabledReason(reason, message, firstName)}
          label={`Rechazar y avisar a ${firstName}`}
          onPress={() => {
            if (text !== undefined) onRefuse(text);
          }}
        />
        <OutlinedButton
          disabled={busy}
          label="Volver"
          onPress={onBack}
          testID="refuse-freeze-back"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm, paddingBottom: spacing.lg, paddingTop: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  notice: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  noticeBody: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  noticeTitle: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "700",
  },
});
