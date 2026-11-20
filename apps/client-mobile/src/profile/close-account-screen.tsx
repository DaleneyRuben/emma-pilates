import {
  closeCurrentClientAccount,
  useGetCurrentClientSubscription,
  useGetCurrentPayment,
  useListEvaluations,
  useListUpcomingBookings,
} from "@pilates/api-contracts";
import {
  colors,
  footerEdges,
  FooterPanel,
  footerScreen,
  FormField,
  FormScrollView,
  Glyph,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  radii,
  rosa,
  Screen,
  ScreenTopBar,
  spacing,
  StateScreen,
  surfaces,
  Text,
  TextButton,
  type GlyphName,
  useMobileIdentity,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { describeAccountClosure } from "./close-account-consequences";
import { PromotionsConsent } from "./promotions-consent";

export const closedAccountNotice = "Cerramos tu cuenta. Gracias por entrenar con nosotras.";

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
    <Screen edges={footerEdges} style={[styles.screen, footerScreen]}>
      {header}
      <FormScrollView
        contentContainerStyle={styles.content}
        footer={
          <FooterPanel>
            {failed ? (
              <View accessibilityRole="alert" style={styles.failure}>
                <Text variant="cuerpo">No pudimos cerrar tu cuenta. Inténtalo de nuevo.</Text>
              </View>
            ) : null}
            {/* FIX-089: destructive is the secondary look, confirmed by the
                password, and the off button says why. */}
            <PrimaryButton
              busy={submitting}
              disabled={password === ""}
              disabledReason="Escribe tu contraseña para confirmar"
              label="Cerrar mi cuenta"
              onPress={() => void close()}
              testID="close-account-confirm"
              tone="error"
            />
            <TextButton label="Cancelar" onPress={() => navigation.goBack()} />
          </FooterPanel>
        }
        keyboardVerticalOffset={spacing.xxl}
      >
        {/* C24: the lead, the consequences, then the data note, the consent
            and the password, each on a white card. */}
        <View style={styles.card}>
          {/* C24 draws the lead as `titulo-fila`. */}
          <Text variant="titulo-fila">Esto pasa al cerrar tu cuenta en Emma Pilates Studio:</Text>
        </View>
        <View style={styles.lines} testID="close-account-lines">
          {closure.lines.map((line, index) => (
            <View key={line} style={[styles.line, index > 0 && styles.divided]}>
              <View style={styles.disc}>
                <Glyph
                  color={colors.text}
                  name={consequenceIcon(line)}
                  size={16}
                  strokeWidth={1.6}
                />
              </View>
              <Text style={styles.lineText} variant="cuerpo">
                {line}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.card}>
          <Text variant="secundario">
            Borramos tu nombre, correo, teléfono y foto. El estudio conserva tus pagos y tus clases
            sin tus datos, para su contabilidad.
          </Text>
          <PromotionsConsent checked={keepPromotions} onChange={setKeepPromotions} />
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
  card: { ...surfaces.card, gap: spacing.mdLg, padding: spacing.lg },
  content: { gap: spacing.smLg, paddingBottom: spacing.lg },
  disc: {
    alignItems: "center",
    backgroundColor: rosa[50],
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  divided: { borderTopColor: colors.hairline, borderTopWidth: 1 },
  // C25e's way: the failure on 50 with a 1.5 pt 400 rule, above the button.
  failure: {
    backgroundColor: colors.errorTint,
    borderColor: colors.borderStrong,
    borderRadius: radii.inset,
    borderWidth: 1.5,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  line: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.smLg,
  },
  lineText: { flex: 1, paddingTop: spacing.smd },
  lines: { ...surfaces.card, overflow: "hidden" },
  screen: { gap: spacing.md },
});
