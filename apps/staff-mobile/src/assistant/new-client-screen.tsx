import {
  BackLink,
  BodyText,
  colors,
  formatCountdown,
  FormField,
  FormScrollView,
  Heading,
  PrimaryButton,
  Screen,
  spacing,
  typography,
  useCountdown,
  WaitNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { StyleSheet } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { CenteredCard } from "./assistant-layout";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import {
  accountEmailLimitCode,
  accountEmailLimitMessage,
  limitedEmailMessage,
} from "./assistant-format";
import { useAssistantWorkspace } from "./assistant-workspace";
import { SelfRegisteredNotice } from "./self-registered-notice";

type NewClientNavigation = {
  goBack: () => void;
  popTo: (screen: "ClientSearch") => void;
  // The form is done once the account exists, so the overview replaces it.
  replace: (screen: "ClientOverview", params: { clientId: string; reopened?: boolean }) => void;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const problemOf = (error: unknown) => (error instanceof AssistantApiError ? error : null);

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
  const [emailInUse, setEmailInUse] = useState(false);
  const [accountLimited, setAccountLimited] = useState(false);
  const [waitSeconds, startWait] = useCountdown();
  const [selfRegistered, setSelfRegistered] = useState<{
    clientId: string;
    email: string;
  } | null>(null);

  const nameError = submitted && name.trim().length === 0 ? "Escribe el nombre." : undefined;
  const emailError = emailInUse
    ? "Este correo ya pertenece a otra cuenta. No se creó ni se cambió nada."
    : submitted && !emailPattern.test(email.trim())
      ? "Escribe un correo válido."
      : undefined;

  const workspace = useAssistantWorkspace();
  const openClient = (clientId: string, reopened = false) => {
    if (workspace.split) {
      workspace.show({ view: "overview", clientId, reopened });
      navigation.popTo("ClientSearch");
      return;
    }
    navigation.replace("ClientOverview", { clientId, reopened });
  };

  const create = async () => {
    setSubmitted(true);
    setFailure(null);
    setEmailInUse(false);
    setAccountLimited(false);
    if (name.trim().length === 0 || !emailPattern.test(email.trim())) return;
    setSubmitting(true);
    try {
      const result = await api.inviteClient({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim().length === 0 ? null : phone.trim(),
      });
      if (result.status === "verification_pending") {
        setSelfRegistered({ clientId: result.clientId, email: result.email });
        return;
      }
      openClient(result.clientId, result.status === "invitation_resent");
    } catch (error) {
      const problem = problemOf(error);
      if (problem?.code === "email_in_use") {
        setEmailInUse(true);
      } else if (problem?.code === accountEmailLimitCode) {
        startWait(problem.retryAfterSeconds);
        setAccountLimited(true);
      } else if (problem?.code === "email_throttled") {
        startWait(problem.retryAfterSeconds);
        setFailure(limitedEmailMessage);
      } else {
        setFailure("No pudimos crear la cuenta. Inténtalo de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <CenteredCard maxWidth={560}>
        <BackLink onPress={() => navigation.goBack()} />
        <Heading accessibilityLabel="Nuevo cliente">Nuevo cliente</Heading>
        <FormScrollView contentContainerStyle={styles.form}>
          {selfRegistered !== null ? (
            <SelfRegisteredNotice
              clientId={selfRegistered.clientId}
              email={selfRegistered.email}
              onOpen={() => openClient(selfRegistered.clientId)}
            />
          ) : (
            <>
              {accountLimited && waitSeconds > 0 ? (
                <WaitNotice
                  message={accountEmailLimitMessage}
                  remainingSeconds={waitSeconds}
                  waitLabel="Podrás intentarlo en"
                />
              ) : null}
              <FormField
                autoCapitalize="words"
                error={nameError}
                label="Nombre"
                onChangeText={setName}
                placeholder="Nombre y apellido"
                value={name}
              />
              <FormField
                autoCapitalize="none"
                autoCorrect={false}
                error={emailError}
                keyboardType="email-address"
                label="Correo electrónico"
                onChangeText={(value) => {
                  setEmail(value);
                  setEmailInUse(false);
                }}
                placeholder="correo@ejemplo.com"
                value={email}
              />
              <FormField
                keyboardType="phone-pad"
                label="Teléfono (opcional)"
                onChangeText={setPhone}
                placeholder="+591 700 00000"
                value={phone}
              />
              <BodyText style={styles.note}>
                Enviaremos un enlace de activación al correo. Vence en 7 días.
              </BodyText>
              {failure !== null ? (
                <BodyText
                  accessibilityRole="alert"
                  style={failure === limitedEmailMessage ? undefined : styles.failure}
                >
                  {failure}
                </BodyText>
              ) : null}
              {waitSeconds > 0 && !accountLimited ? (
                <BodyText style={styles.note}>
                  {`Podrás intentarlo en ${formatCountdown(waitSeconds)}.`}
                </BodyText>
              ) : null}
              <PrimaryButton
                disabled={submitting || waitSeconds > 0}
                label="Crear cuenta"
                onPress={() => void create()}
              />
            </>
          )}
        </FormScrollView>
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
