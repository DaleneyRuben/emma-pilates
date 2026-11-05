import {
  acquisitionChannelRequired,
  type AcquisitionChannelChoice,
  colors,
  fontFamilies,
  formatCountdown,
  FormField,
  FormScrollView,
  bolivianMobileMessage,
  isBolivianMobileOrBlank,
  normalizeBolivianMobile,
  IconRowGroup,
  NoticeRow,
  PrimaryButton,
  Screen,
  SectionTitle,
  spacing,
  typography,
  useCountdown,
  WaitNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { GroupedField } from "../ui/grouped-field";
import { CenteredCard } from "./assistant-layout";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import {
  accountEmailLimitCode,
  accountEmailLimitMessage,
  limitedEmailMessage,
} from "./assistant-format";
import { useAssistantWorkspace } from "./assistant-workspace";
import { ChannelGrid } from "./channel-grid";
import { SelfRegisteredNotice } from "./self-registered-notice";

type NewClientNavigation = {
  goBack: () => void;
  popTo: (screen: "ClientSearch") => void;
  // The form is done once the account exists, so the overview replaces it.
  replace: (screen: "ClientOverview", params: { clientId: string; reopened?: boolean }) => void;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Walkthrough 20: only a trainer or a friend hands over a code.
const referralLabels: Partial<Record<AcquisitionChannelChoice, string>> = {
  friend: "Código de la amiga (opcional)",
  trainer: "Código de la instructora (opcional)",
};

const problemOf = (error: unknown) => (error instanceof AssistantApiError ? error : null);

export function NewClientScreen() {
  const navigation = useNavigation<NewClientNavigation>();
  const fetcher = useStaffFetcher();
  const api = useMemo(() => createAssistantApi(fetcher), [fetcher]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<AcquisitionChannelChoice | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [codeUnknown, setCodeUnknown] = useState(false);
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

  const phoneError =
    submitted && !isBolivianMobileOrBlank(phone) ? bolivianMobileMessage : undefined;
  const channelError = submitted && channel === null ? acquisitionChannelRequired : undefined;

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
    setCodeUnknown(false);
    if (
      name.trim().length === 0 ||
      !emailPattern.test(email.trim()) ||
      !isBolivianMobileOrBlank(phone) ||
      channel === null
    ) {
      return;
    }
    setSubmitting(true);
    const code = referralLabels[channel] === undefined ? "" : referralCode.trim();
    try {
      const result = await api.inviteClient({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim().length === 0 ? null : normalizeBolivianMobile(phone),
        acquisitionChannel: channel,
        ...(code === "" ? {} : { referralCode: code }),
      });
      if (result.status === "verification_pending") {
        setSelfRegistered({ clientId: result.clientId, email: result.email });
        return;
      }
      openClient(result.clientId, result.status === "invitation_resent");
    } catch (error) {
      const problem = problemOf(error);
      if (problem?.code === "referral_code_invalid") {
        setCodeUnknown(true);
      } else if (problem?.code === "email_in_use") {
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

  const referralLabel = channel === null ? undefined : referralLabels[channel];
  const footer =
    selfRegistered !== null ? undefined : (
      <View style={styles.footer}>
        {failure !== null ? (
          failure === limitedEmailMessage ? (
            <Text accessibilityRole="alert" style={styles.note}>
              {failure}
            </Text>
          ) : (
            <View accessibilityRole="alert">
              <NoticeRow message={failure} />
            </View>
          )
        ) : null}
        {waitSeconds > 0 && !accountLimited ? (
          <Text style={styles.note}>{`Podrás intentarlo en ${formatCountdown(waitSeconds)}.`}</Text>
        ) : (
          <Text style={styles.note}>
            Le enviaremos un enlace de activación al correo. Vence en 7 días.
          </Text>
        )}
        <PrimaryButton
          busy={submitting}
          disabled={waitSeconds > 0}
          label="Crear cuenta"
          onPress={() => void create()}
          testID="new-client-submit"
        />
      </View>
    );

  return (
    <Screen style={styles.screen}>
      <CenteredCard maxWidth={560}>
        <BackBar onBack={() => navigation.goBack()} title="Nuevo cliente" />
        <FormScrollView contentContainerStyle={styles.form} footer={footer}>
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
              <View>
                <SectionTitle>Datos</SectionTitle>
                <IconRowGroup>
                  <GroupedField
                    autoCapitalize="words"
                    error={nameError}
                    label="Nombre"
                    onChangeText={setName}
                    placeholder="Nombre y apellido"
                    testID="new-client-name"
                    value={name}
                  />
                  <GroupedField
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
                    testID="new-client-email"
                    value={email}
                  />
                  <GroupedField
                    error={phoneError}
                    keyboardType="phone-pad"
                    label="Teléfono (opcional)"
                    onChangeText={setPhone}
                    placeholder="71234567"
                    testID="new-client-phone"
                    value={phone}
                  />
                </IconRowGroup>
              </View>
              <View style={styles.channel}>
                <SectionTitle>¿Cómo nos conoció?</SectionTitle>
                <ChannelGrid
                  error={channelError}
                  label="¿Cómo nos conoció?"
                  onChange={setChannel}
                  value={channel}
                />
                {referralLabel === undefined ? null : (
                  <FormField
                    autoCapitalize="characters"
                    autoCorrect={false}
                    error={
                      codeUnknown
                        ? "No encontramos ese código. Revísalo o déjalo vacío."
                        : undefined
                    }
                    label={referralLabel}
                    onChangeText={(value) => {
                      setReferralCode(value);
                      setCodeUnknown(false);
                    }}
                    testID="new-client-referral-code"
                    value={referralCode}
                  />
                )}
              </View>
            </>
          )}
        </FormScrollView>
      </CenteredCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  channel: { gap: spacing.md },
  footer: { gap: spacing.sm, paddingTop: spacing.md },
  form: { gap: spacing.xl, paddingBottom: spacing.xl },
  note: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    textAlign: "center",
  },
  screen: { gap: spacing.md, paddingHorizontal: spacing.xlSm },
});
