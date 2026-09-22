import {
  useGetCurrentClientCredit,
  useGetCurrentClientReferrals,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  Heading,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { formatBolivianos } from "../plans/plan-format";
import { BackLink } from "@pilates/mobile-core";
import { formatReferralDate } from "./referral-format";

type CreditNavigation = {
  goBack: () => void;
  navigate: (screen: "Referrals") => void;
};

export function CreditScreen() {
  const navigation = useNavigation<CreditNavigation>();
  const fetcher = useClientFetcher();
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const credit = useGetCurrentClientCredit(queryOptions);
  const referrals = useGetCurrentClientReferrals(queryOptions);

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
  const hasCredit = availableCentavos > 0 || reservedCentavos > 0;
  const awarded =
    referrals.data?.status === 200
      ? referrals.data.data.referrals.filter(
          (entry) => entry.state === "awarded" && entry.awardedAt !== null,
        )
      : [];

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.balance}>
          {hasCredit ? (
            <BodyText style={styles.balanceLabel}>Saldo a favor</BodyText>
          ) : null}
          <Text style={styles.amount}>{formatBolivianos(availableCentavos)}</Text>
          {hasCredit ? <BodyText>disponibles</BodyText> : null}
          {reservedCentavos > 0 ? (
            <BodyText style={styles.centered}>
              {`${formatBolivianos(reservedCentavos)} están reservados para un pago en revisión.`}
            </BodyText>
          ) : null}
        </View>
        {hasCredit ? (
          <>
            <BodyText style={styles.centered}>
              Este crédito se aplica automáticamente al monto que pagues por tu
              próximo plan.
            </BodyText>
            {awarded.length > 0 ? (
              <View style={styles.origin}>
                <Text style={styles.sectionTitle}>De dónde viene</Text>
                {awarded.map((entry) => (
                  <View key={entry.referredClientId} style={styles.originRow}>
                    <BodyText>
                      {`${entry.referredName} · ${formatReferralDate(entry.awardedAt ?? entry.createdAt)}`}
                    </BodyText>
                    <Text style={styles.originAmount}>
                      {`+${formatBolivianos(entry.awardCentavos ?? 0)}`}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            <TextButton
              label="Ver mis referidos"
              onPress={() => navigation.navigate("Referrals")}
            />
          </>
        ) : (
          <>
            <BodyText style={styles.centered}>
              Aún no tienes crédito. Invita a tus amigos para ganar.
            </BodyText>
            <PrimaryButton
              label="Ver mi código"
              onPress={() => navigation.navigate("Referrals")}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.text,
    fontFamily: "Lora_500Medium",
    fontSize: 64,
    lineHeight: 72,
    textAlign: "center",
  },
  balance: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xl },
  balanceLabel: {
    color: colors.textMuted,
    fontSize: typography.note,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  centered: { textAlign: "center" },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  origin: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  originAmount: {
    color: colors.successText,
    fontSize: typography.body,
    fontWeight: "600",
  },
  originRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  screen: { gap: spacing.lg },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
  },
});
