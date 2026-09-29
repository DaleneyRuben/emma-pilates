import {
  closeCurrentClientAccount,
  useGetCurrentClientCredit,
  useGetCurrentClientSubscription,
  useGetCurrentPayment,
  useListEvaluations,
  useListUpcomingBookings,
} from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  FormField,
  Heading,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  TextButton,
  typography,
  useMobileIdentity,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { describeAccountClosure } from "./close-account-consequences";

export const closedAccountNotice =
  "Cerramos tu cuenta. Gracias por entrenar con nosotras.";

function DestructiveButton({
  disabled,
  label,
  onPress,
  testID,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.destructive,
        disabled && styles.destructiveDisabled,
        pressed && styles.destructivePressed,
      ]}
    >
      <Text
        style={[styles.destructiveLabel, disabled && styles.destructiveLabelDisabled]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// Prompt 24 (BE-007 G2–G6): the Client closes their own Account after seeing
// what it does, confirming with the password.
export function CloseAccountScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const identity = useMobileIdentity();
  const fetcher = useClientFetcher();
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const bookings = useListUpcomingBookings(queryOptions);
  const evaluations = useListEvaluations({ scope: "upcoming" }, queryOptions);
  const subscription = useGetCurrentClientSubscription(queryOptions);
  const credit = useGetCurrentClientCredit(queryOptions);
  const payment = useGetCurrentPayment(queryOptions);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [failed, setFailed] = useState(false);
  const [refused, setRefused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const header = (
    <>
      <BackLink onPress={() => navigation.goBack()} />
      <Heading accessibilityLabel="Cerrar mi cuenta">Cerrar mi cuenta</Heading>
    </>
  );
  const queries = [bookings, evaluations, subscription, credit, payment];

  if (queries.some((query) => query.isPending)) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText accessibilityLabel="Cargando">Cargando…</BodyText>
      </Screen>
    );
  }

  if (
    [bookings, evaluations, subscription, credit].some(
      (query) => query.isError || query.data?.status !== 200,
    ) ||
    payment.isError
  ) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar tu cuenta."
          onRetry={() => queries.forEach((query) => void query.refetch())}
        />
      </Screen>
    );
  }

  const closure = describeAccountClosure({
    availableCreditCentavos:
      credit.data?.status === 200 ? credit.data.data.availableCentavos : 0,
    bookings: bookings.data?.status === 200 ? bookings.data.data : [],
    evaluations:
      evaluations.data?.status === 200 ? evaluations.data.data.items : [],
    // No Payment yet answers 404, which is "nothing pending".
    latestPayment: payment.data?.status === 200 ? payment.data.data : null,
    subscription:
      subscription.data?.status === 200
        ? subscription.data.data
        : { status: "none" },
  });

  if (closure.blocked || refused) {
    return (
      <Screen style={styles.screen}>
        {header}
        <View style={styles.pending}>
          <Text style={styles.pendingTitle}>Pago en revisión</Text>
          <BodyText style={styles.pendingText}>
            Tienes un pago por transferencia en revisión. Podrás cerrar tu
            cuenta cuando el estudio lo confirme o lo rechace.
          </BodyText>
        </View>
        <View style={styles.spacer} />
        <PrimaryButton
          label="Volver al perfil"
          onPress={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  async function close() {
    setSubmitting(true);
    setPasswordError(undefined);
    setFailed(false);
    try {
      const response = (await closeCurrentClientAccount(
        { password },
        undefined,
        fetcher,
      )) as { status: number; data: unknown };
      if (response.status === 200) {
        await identity.endClosedSession(closedAccountNotice);
        return;
      }
      const code = (response.data as { code?: string } | null)?.code;
      if (code === "current_password_incorrect") {
        setPasswordError("La contraseña no es correcta.");
      } else if (code === "closure_payment_pending") {
        setRefused(true);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    }
    setSubmitting(false);
  }

  return (
    <Screen style={styles.screen}>
      {header}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={spacing.xxl}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <BodyText style={styles.lead}>
            Al cerrar tu cuenta dejas de usar Emma Pilates Studio. Esto es lo
            que va a pasar:
          </BodyText>
          <View style={styles.card}>
            {closure.lines.map((line, index) => (
              <View
                key={line}
                style={[
                  styles.line,
                  index < closure.lines.length - 1 && styles.lineDivider,
                ]}
              >
                <View style={styles.bullet} />
                <BodyText style={styles.lineText}>{line}</BodyText>
              </View>
            ))}
          </View>
          <BodyText style={styles.note}>
            El estudio conserva el registro de tus pagos y tus clases, pero deja
            de aparecer en la app y en las listas del estudio.
          </BodyText>
          <View style={styles.field}>
            <FormField
              autoCapitalize="none"
              error={passwordError}
              label="Contraseña"
              onChangeText={(value) => {
                setPasswordError(undefined);
                setPassword(value);
              }}
              placeholder="Tu contraseña"
              secureTextEntry
              value={password}
            />
            <BodyText style={styles.note}>
              Escribe tu contraseña para confirmar que eres tú.
            </BodyText>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          {failed ? (
            <View accessibilityRole="alert" style={styles.failure}>
              <BodyText style={styles.failureText}>
                No pudimos cerrar tu cuenta. Inténtalo de nuevo.
              </BodyText>
            </View>
          ) : null}
          <DestructiveButton
            disabled={password === "" || submitting}
            label="Cerrar mi cuenta"
            onPress={() => void close()}
            testID="close-account-confirm"
          />
          <TextButton label="Cancelar" onPress={() => navigation.goBack()} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bullet: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 6,
    marginTop: 7,
    width: 6,
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.frame,
    borderWidth: 1,
    overflow: "hidden",
  },
  content: { gap: spacing.mdLg, paddingBottom: spacing.lg },
  destructive: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.error,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  destructiveDisabled: { borderColor: "#E7CFC8" },
  destructiveLabel: {
    color: colors.error,
    fontSize: typography.body,
    fontWeight: "500",
  },
  destructiveLabelDisabled: { color: "#D4A99F" },
  destructivePressed: { backgroundColor: colors.errorTint },
  failure: {
    backgroundColor: colors.errorTint,
    borderRadius: radii.control,
    padding: spacing.smLg,
  },
  failureText: { color: colors.errorText, fontSize: typography.note },
  field: { gap: spacing.sm },
  flex: { flex: 1 },
  footer: { gap: spacing.xs, paddingTop: spacing.md },
  lead: { color: colors.text },
  line: {
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.smLg,
  },
  lineDivider: { borderBottomColor: colors.divider, borderBottomWidth: 1 },
  lineText: { color: colors.text, flex: 1, fontSize: typography.note + 1 },
  note: { color: colors.textMuted, fontSize: typography.note },
  pending: {
    backgroundColor: colors.warningTint,
    borderColor: "rgba(201,154,78,0.35)",
    borderRadius: radii.frame,
    borderWidth: 1,
    gap: spacing.smLg,
    padding: spacing.lgXl,
  },
  pendingText: { color: "#6E5A36" },
  pendingTitle: {
    color: "#7C5D2A",
    fontSize: typography.bodyLarge,
    fontWeight: "500",
  },
  screen: { gap: spacing.lg },
  spacer: { flex: 1 },
});
