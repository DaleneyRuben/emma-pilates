import {
  closeCurrentClientAccount,
  useGetCurrentClientSubscription,
  useGetCurrentPayment,
  useListEvaluations,
  useListUpcomingBookings,
} from "@pilates/api-contracts";
import {
  BodyText,
  ButtonLabel,
  colors,
  FormField,
  FormScrollView,
  type GlyphName,
  IconRow,
  IconRowGroup,
  LoadingState,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  spacing,
  StateScreen,
  TextButton,
  typography,
  useMobileIdentity,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { describeAccountClosure } from "./close-account-consequences";
import { PromotionsConsent } from "./promotions-consent";

export const closedAccountNotice = "Cerramos tu cuenta. Gracias por entrenar con nosotras.";

function DestructiveButton({
  busy,
  disabled,
  label,
  onPress,
  testID,
}: {
  busy: boolean;
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
      accessibilityState={{ busy, disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.destructive,
        disabled && !busy && styles.destructiveDisabled,
        pressed && styles.destructivePressed,
      ]}
    >
      <ButtonLabel
        busy={busy}
        label={label}
        spinnerColor={colors.error}
        style={[styles.destructiveLabel, disabled && !busy && styles.destructiveLabelDisabled]}
      />
    </Pressable>
  );
}

// Prompt 24 (BE-007 G2–G6): the Client closes their own Account after seeing
// what it does, confirming with the password.
// C24: each consequence as an icon row, its glyph by what it is about.
function consequenceIcon(line: string): GlyphName {
  if (line.startsWith("Cancelamos") || line.startsWith("Sales")) return "calendar";
  if (line.startsWith("Tu plan")) return "card";
  if (line.startsWith("Cerramos")) return "logout";
  if (line.startsWith("Tu correo")) return "mail";
  return "alert";
}

export function CloseAccountScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const identity = useMobileIdentity();
  const fetcher = useClientFetcher();
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const bookings = useListUpcomingBookings(queryOptions);
  const evaluations = useListEvaluations({ scope: "upcoming" }, queryOptions);
  const subscription = useGetCurrentClientSubscription(queryOptions);
  const payment = useGetCurrentPayment(queryOptions);
  const [password, setPassword] = useState("");
  const [keepPromotions, setKeepPromotions] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [failed, setFailed] = useState(false);
  const [refused, setRefused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const header = (
    <>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Cerrar mi cuenta" />
    </>
  );
  const queries = [bookings, evaluations, subscription, payment];

  if (queries.some((query) => query.isPending)) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando" />
      </Screen>
    );
  }

  if (
    [bookings, evaluations, subscription].some(
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
    bookings: bookings.data?.status === 200 ? bookings.data.data : [],
    evaluations: evaluations.data?.status === 200 ? evaluations.data.data.items : [],
    // No Payment yet answers 404, which is "nothing pending".
    latestPayment: payment.data?.status === 200 ? payment.data.data : null,
    subscription: subscription.data?.status === 200 ? subscription.data.data : { status: "none" },
  });

  if (closure.blocked || refused) {
    return (
      <Screen style={styles.screen}>
        {header}
        <StateScreen
          icon="hourglass"
          note="Podrás cerrar tu cuenta cuando el estudio confirme o rechace tu transferencia."
          primaryAction={{ label: "Volver al perfil", onPress: () => navigation.goBack() }}
          title="Tienes un pago en revisión"
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
        { password, keepPromotions },
        undefined,
        fetcher,
      )) as {
        status: number;
        data: unknown;
      };
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
      <FormScrollView
        contentContainerStyle={styles.content}
        footer={
          <View style={styles.footer}>
            {failed ? (
              <View accessibilityRole="alert" style={styles.failure}>
                <BodyText style={styles.failureText}>
                  No pudimos cerrar tu cuenta. Inténtalo de nuevo.
                </BodyText>
              </View>
            ) : null}
            <DestructiveButton
              busy={submitting}
              disabled={password === ""}
              label="Cerrar mi cuenta"
              onPress={() => void close()}
              testID="close-account-confirm"
            />
            <TextButton label="Cancelar" onPress={() => navigation.goBack()} />
          </View>
        }
        keyboardVerticalOffset={spacing.xxl}
      >
        <BodyText style={styles.lead}>
          Esto pasa al cerrar tu cuenta en Emma Pilates Studio:
        </BodyText>
        <IconRowGroup testID="close-account-lines">
          {closure.lines.map((line) => (
            <IconRow icon={consequenceIcon(line)} key={line} label={line} />
          ))}
        </IconRowGroup>
        <BodyText style={styles.note}>
          Borramos tu nombre, correo, teléfono y foto. El estudio conserva tus pagos y tus clases
          sin tus datos, para su contabilidad.
        </BodyText>
        <PromotionsConsent checked={keepPromotions} onChange={setKeepPromotions} />
        <View style={styles.field}>
          <FormField
            autoCapitalize="none"
            error={passwordError}
            label="Tu contraseña, para confirmar"
            onChangeText={(value) => {
              setPasswordError(undefined);
              setPassword(value);
            }}
            placeholder="Tu contraseña"
            secureTextEntry
            value={password}
          />
        </View>
      </FormScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.mdLg, paddingBottom: spacing.lg },
  destructive: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.error,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  destructiveDisabled: { borderColor: colors.errorDisabledBorder },
  destructiveLabel: {
    color: colors.error,
    fontSize: typography.body,
    fontWeight: "500",
  },
  destructiveLabelDisabled: { color: colors.errorDisabledText },
  destructivePressed: { backgroundColor: colors.errorTint },
  failure: {
    backgroundColor: colors.errorTint,
    borderRadius: radii.control,
    padding: spacing.smLg,
  },
  failureText: { color: colors.errorText, fontSize: typography.note },
  field: { gap: spacing.sm },
  footer: { gap: spacing.xs, paddingTop: spacing.md },
  lead: { color: colors.text },
  note: { color: colors.textMuted, fontSize: typography.note },
  screen: { gap: spacing.lg },
});
