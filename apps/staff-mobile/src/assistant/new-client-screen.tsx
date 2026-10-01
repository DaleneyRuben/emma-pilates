import {
  BackLink,
  BodyText,
  colors,
  formatCountdown,
  FormField,
  Heading,
  PrimaryButton,
  Screen,
  spacing,
  TextButton,
  typography,
  useCountdown,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { CenteredCard } from "./assistant-layout";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import { limitedEmailMessage } from "./assistant-format";
import { useAssistantWorkspace } from "./assistant-workspace";

type NewClientNavigation = {
  goBack: () => void;
  popTo: (screen: "ClientSearch") => void;
  // The form is done once the account exists, so the overview replaces it.
  replace: (
    screen: "ClientOverview",
    params: { clientId: string; reopened?: boolean },
  ) => void;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const problemOf = (error: unknown) =>
  error instanceof AssistantApiError ? error : null;

/** S05 «Verificación pendiente»: she registered herself, so only a link is offered. */
function SelfRegisteredNotice({
  clientId,
  email,
  onOpen,
}: {
  clientId: string;
  email: string;
  onOpen: () => void;
}) {
  const fetcher = useStaffFetcher();
  const api = useMemo(() => createAssistantApi(fetcher), [fetcher]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);
  const [waitSeconds, startWait] = useCountdown();

  const send = async () => {
    setSending(true);
    setSent(false);
    setFailure(null);
    setLimited(false);
    try {
      await api.sendVerification(clientId);
      setSent(true);
    } catch (error) {
      const problem = problemOf(error);
      if (problem?.code === "email_throttled") {
        startWait(problem.retryAfterSeconds);
        setLimited(true);
      } else {
        setFailure("No pudimos enviar el enlace. Inténtalo de nuevo.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.notice}>
      <BodyText accessibilityRole="alert">
        Este correo ya se registró desde la app y espera verificación. No
        cambiamos sus datos ni su contraseña.
      </BodyText>
      <BodyText style={styles.email}>{email}</BodyText>
      <BodyText style={styles.note}>
        Puedes enviarle un enlace de verificación nuevo, válido por 24 horas.
        Los anteriores dejan de funcionar.
      </BodyText>
      {sent ? (
        <BodyText style={styles.success}>
          Enviamos un enlace de verificación nuevo.
        </BodyText>
      ) : null}
      {failure !== null ? <BodyText style={styles.failure}>{failure}</BodyText> : null}
      {limited ? <BodyText>{limitedEmailMessage}</BodyText> : null}
      {waitSeconds > 0 ? (
        <BodyText style={styles.note}>
          {`Podrás reenviarlo en ${formatCountdown(waitSeconds)}.`}
        </BodyText>
      ) : null}
      <PrimaryButton
        disabled={sending || waitSeconds > 0}
        label="Enviar enlace de verificación"
        onPress={() => void send()}
      />
      <TextButton label="Ver cliente" onPress={onOpen} />
    </View>
  );
}

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
  const [waitSeconds, startWait] = useCountdown();
  const [selfRegistered, setSelfRegistered] = useState<{
    clientId: string;
    email: string;
  } | null>(null);

  const nameError =
    submitted && name.trim().length === 0 ? "Escribe el nombre." : undefined;
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
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {selfRegistered !== null ? (
          <SelfRegisteredNotice
            clientId={selfRegistered.clientId}
            email={selfRegistered.email}
            onOpen={() => openClient(selfRegistered.clientId)}
          />
        ) : (
          <>
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
            {waitSeconds > 0 ? (
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
      </ScrollView>
      </CenteredCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  email: { color: colors.text, fontWeight: "600" },
  failure: { color: colors.errorText },
  form: { gap: spacing.lg, paddingBottom: spacing.xxl },
  note: { color: colors.textMuted, fontSize: typography.note },
  notice: { gap: spacing.md },
  screen: { gap: spacing.md },
  success: { color: colors.successText, fontSize: typography.note },
});
