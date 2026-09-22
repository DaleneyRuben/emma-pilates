import { useGetCurrentClientCredit } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  Heading,
  PrimaryButton,
  QueryFailure,
  Screen,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { formatBolivianos } from "../plans/plan-format";
import { BackLink } from "../ui/back-link";

type CreditNavigation = {
  goBack: () => void;
  navigate: (screen: "Referrals") => void;
};

export function CreditScreen() {
  const navigation = useNavigation<CreditNavigation>();
  const fetcher = useClientFetcher();
  const credit = useGetCurrentClientCredit({
    fetcher,
    query: { refetchOnMount: "always" },
  });

  const header = (
    <>
      <BackLink onPress={() => navigation.goBack()} />
      <Heading accessibilityLabel="Mi crédito">Mi crédito</Heading>
    </>
  );

  if (credit.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText accessibilityLabel="Cargando crédito">Cargando…</BodyText>
      </Screen>
    );
  }
  if (credit.isError || credit.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar tu crédito."
          onRetry={() => void credit.refetch()}
        />
      </Screen>
    );
  }

  const { availableCentavos, reservedCentavos } = credit.data.data;

  return (
    <Screen style={styles.screen}>
      {header}
      <View style={styles.balance}>
        <Text style={styles.amount}>
          {availableCentavos === 0 && reservedCentavos === 0
            ? "Bs 0"
            : `${formatBolivianos(availableCentavos)} disponibles`}
        </Text>
        {reservedCentavos > 0 ? (
          <BodyText style={styles.centered}>
            {`${formatBolivianos(reservedCentavos)} están reservados para un pago en revisión.`}
          </BodyText>
        ) : null}
      </View>
      {availableCentavos === 0 && reservedCentavos === 0 ? (
        <>
          <BodyText style={styles.centered}>
            Aún no tienes crédito. Invita a tus amigos para ganar.
          </BodyText>
          <PrimaryButton
            label="Ver mi código"
            onPress={() => navigation.navigate("Referrals")}
          />
        </>
      ) : (
        <>
          <BodyText style={styles.centered}>
            Este crédito se aplica automáticamente al monto que pagues por tu
            próximo plan.
          </BodyText>
          <TextButton
            label="Ver mis referidos"
            onPress={() => navigation.navigate("Referrals")}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.text,
    fontFamily: "Lora_500Medium",
    fontSize: typography.display,
    textAlign: "center",
  },
  balance: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  centered: { textAlign: "center" },
  screen: { gap: spacing.lg },
});
