import {
  Chip,
  FormField,
  OutlinedButton,
  PrimaryButton,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { bodyScroll, CardLabel, FooterPanel } from "../ui/card-pieces";
import {
  refusalDisabledReason,
  refusalMessageLimit,
  refusalNeedsMessage,
  refusalReasons,
  refusalReasonText,
  type RefusalReason,
} from "./freeze-refusal";

/**
 * E9 B (owner 2026-11-19, E-D11): the refusal's reason as chips in a white
 * card under «Motivo», an optional message, the «Esto no se puede deshacer»
 * card, then, on the white footer panel,
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
      {header}
      <ScrollView
        contentContainerStyle={bodyScroll.content}
        keyboardShouldPersistTaps="handled"
        style={bodyScroll.scroll}
      >
        <View style={styles.card}>
          <CardLabel>Motivo</CardLabel>
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
        </View>
        <View style={styles.card}>
          <FormField
            hint="Ej.: Necesitamos 48 h de aviso para congelar."
            label={`Mensaje para ${firstName}`}
            maxLength={refusalMessageLimit(reason)}
            multiline
            onChangeText={setMessage}
            optional={!refusalNeedsMessage(reason)}
            value={message}
          />
        </View>
        <View style={styles.notice} testID="refuse-freeze-notice">
          <Text variant="titulo-fila">Esto no se puede deshacer</Text>
          <Text variant="cuerpo">{`${firstName} podrá pedir otro congelamiento.`}</Text>
        </View>
        {error}
      </ScrollView>
      <FooterPanel>
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
      </FooterPanel>
    </>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lg },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  notice: {
    ...surfaces.card,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
});
