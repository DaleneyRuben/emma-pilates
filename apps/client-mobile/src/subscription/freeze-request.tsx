import { requestFreeze } from "@pilates/api-contracts";
import { BodyText, colors, PrimaryButton, spacing, typography } from "@pilates/mobile-core";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";

const problemMessage = (body: unknown): string => {
  if (typeof body === "object" && body !== null) {
    const code = (body as { code?: unknown }).code;
    if (code === "freeze_not_allowed") return "Este plan no se puede congelar.";
  }
  return "No pudimos enviar la solicitud. Inténtalo de nuevo.";
};

export function FreezeRequest({
  subscriptionId,
  onRequested,
}: {
  subscriptionId: string;
  onRequested: () => void;
}) {
  const fetcher = useClientFetcher();
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await requestFreeze(
        { subscriptionId, startsOn, endsOn, reason },
        undefined,
        fetcher,
      );
      if (response.status === 201) {
        onRequested();
        return;
      }
      setMessage(problemMessage(response.data));
    } catch {
      setMessage("No pudimos enviar la solicitud. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Congelar plan</Text>
      <BodyText>Elige las fechas y el motivo. La administradora lo aprueba.</BodyText>
      <TextInput
        accessibilityLabel="Inicio del congelamiento"
        onChangeText={setStartsOn}
        placeholder="AAAA-MM-DD"
        style={styles.input}
        value={startsOn}
      />
      <TextInput
        accessibilityLabel="Fin del congelamiento"
        onChangeText={setEndsOn}
        placeholder="AAAA-MM-DD"
        style={styles.input}
        value={endsOn}
      />
      <TextInput
        accessibilityLabel="Motivo"
        onChangeText={setReason}
        placeholder="Motivo"
        style={styles.input}
        value={reason}
      />
      {message === null ? null : (
        <Text accessibilityRole="alert" style={styles.error}>
          {message}
        </Text>
      )}
      <PrimaryButton
        disabled={submitting || startsOn === "" || endsOn === "" || reason.trim() === ""}
        label="Solicitar congelamiento"
        onPress={() => void submit()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.errorText, fontSize: typography.note },
  form: { gap: spacing.md },
  input: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  title: { color: colors.text, fontSize: typography.body, fontWeight: "600" },
});
