import {
  BackLink,
  BodyText,
  colors,
  FormField,
  Heading,
  PrimaryButton,
  Screen,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { CenteredCard } from "./assistant-layout";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import { useAssistantWorkspace } from "./assistant-workspace";

type NewClientNavigation = {
  goBack: () => void;
  popTo: (screen: "ClientSearch") => void;
  // The form is done once the account exists, so the overview replaces it.
  replace: (screen: "ClientOverview", params: { clientId: string }) => void;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const problemMessages: Record<string, string> = {
  email_in_use: "Este correo ya pertenece a otra cuenta.",
  email_throttled:
    "Ya enviamos un correo a esa dirección hace poco. Inténtalo en unos minutos.",
};

export function NewClientScreen() {
  const navigation = useNavigation<NewClientNavigation>();
  const fetcher = useStaffFetcher();
  const api = useMemo(() => createAssistantApi(fetcher), [fetcher]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [verificationPending, setVerificationPending] = useState<string | null>(
    null,
  );

  const nameError =
    submitted && name.trim().length === 0 ? "Escribe el nombre." : undefined;
  const emailError =
    submitted && !emailPattern.test(email.trim())
      ? "Escribe un correo válido."
      : undefined;

  const workspace = useAssistantWorkspace();
  const openClient = (clientId: string) => {
    if (workspace.split) {
      workspace.show({ view: "overview", clientId });
      navigation.popTo("ClientSearch");
      return;
    }
    navigation.replace("ClientOverview", { clientId });
  };

  const create = async () => {
    setSubmitted(true);
    setFailure(null);
    if (name.trim().length === 0 || !emailPattern.test(email.trim())) return;
    setSubmitting(true);
    try {
      const result = await api.inviteClient({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim().length === 0 ? null : phone.trim(),
      });
      if (result.status === "verification_pending") {
        setVerificationPending(result.clientId);
        return;
      }
      openClient(result.clientId);
    } catch (error) {
      const code = error instanceof AssistantApiError ? error.code : null;
      setFailure(
        (code !== null ? problemMessages[code] : undefined) ??
          "No pudimos crear la cuenta. Inténtalo de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <CenteredCard maxWidth={560}>
      <BackLink onPress={() => navigation.goBack()} />
      <Heading accessibilityLabel="Nuevo cliente">Nuevo cliente</Heading>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <FormField
          autoCapitalize="words"
          error={nameError}
          label="Nombre"
          onChangeText={setName}
          value={name}
        />
        <FormField
          autoCapitalize="none"
          autoCorrect={false}
          error={emailError}
          keyboardType="email-address"
          label="Correo electrónico"
          onChangeText={setEmail}
          value={email}
        />
        <FormField
          keyboardType="phone-pad"
          label="Teléfono (opcional)"
          onChangeText={setPhone}
          value={phone}
        />
        <BodyText style={styles.note}>
          Enviaremos un enlace de activación al correo. Vence en 7 días.
        </BodyText>
        {failure !== null ? (
          <BodyText accessibilityRole="alert" style={styles.failure}>
            {failure}
          </BodyText>
        ) : null}
        {verificationPending !== null ? (
          <>
            <BodyText accessibilityRole="alert" style={styles.note}>
              Este correo ya se registró desde la app y espera verificación.
              Enviamos un nuevo enlace de verificación, válido por 24 horas.
            </BodyText>
            <TextButton
              label="Ver cliente"
              onPress={() =>
                openClient(verificationPending)
              }
            />
          </>
        ) : (
          <PrimaryButton
            disabled={submitting}
            label="Crear cuenta"
            onPress={() => void create()}
          />
        )}
      </ScrollView>
      </CenteredCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  failure: { color: colors.errorText },
  form: { gap: spacing.lg, paddingBottom: spacing.xxl },
  note: { color: colors.textMuted, fontSize: typography.note },
  screen: { gap: spacing.md },
});
