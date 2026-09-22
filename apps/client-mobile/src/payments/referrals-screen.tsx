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
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { formatBolivianos } from "../plans/plan-format";
import { BackLink } from "../ui/back-link";

type ReferralsNavigation = {
  goBack: () => void;
  navigate: (screen: "Credit") => void;
};

const shareMessage = (code: string): string =>
  `Únete a Emma Pilates Studio con mi código ${code}: regístrate en la app y úsalo al crear tu cuenta.`;

export function ReferralsScreen() {
  const navigation = useNavigation<ReferralsNavigation>();
  const fetcher = useClientFetcher();
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const referrals = useGetCurrentClientReferrals(queryOptions);
  const credit = useGetCurrentClientCredit(queryOptions);

  const header = (
    <>
      <BackLink onPress={() => navigation.goBack()} />
      <Heading accessibilityLabel="Mis referidos">Mis referidos</Heading>
    </>
  );

  if (referrals.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText accessibilityLabel="Cargando referidos">Cargando…</BodyText>
      </Screen>
    );
  }
  if (referrals.isError || referrals.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar tus referidos."
          onRetry={() => void referrals.refetch()}
        />
      </Screen>
    );
  }

  const { referralCode, referrals: referred } = referrals.data.data;
  const available =
    credit.data?.status === 200 ? credit.data.data.availableCentavos : 0;
  const creditLabel = `Tu crédito: ${formatBolivianos(available)}`;

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.codeCard}>
          <BodyText>Tu código</BodyText>
          <Text style={styles.code}>{referralCode}</Text>
          <PrimaryButton
            label="Compartir"
            onPress={() => void Share.share({ message: shareMessage(referralCode) })}
          />
        </View>
        <BodyText>
          Comparte tu código. Cuando un amigo se registre y haga su primer pago,
          ganas crédito.
        </BodyText>
        <Pressable
          accessibilityLabel={creditLabel}
          accessibilityRole="button"
          onPress={() => navigation.navigate("Credit")}
          style={styles.creditRow}
        >
          <Text style={styles.creditLabel}>{creditLabel}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        {referred.length === 0 ? (
          <BodyText style={styles.empty}>
            Aún no has invitado a nadie. ¡Comparte tu código!
          </BodyText>
        ) : (
          <View style={styles.list}>
            {referred.map((entry) => (
              <View key={entry.referredClientId} style={styles.row}>
                <Text style={styles.name}>{entry.referredName}</Text>
                <View
                  style={[
                    styles.badge,
                    entry.state === "awarded" ? styles.awarded : styles.pending,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      entry.state === "awarded" ? styles.awardedText : styles.pendingText,
                    ]}
                  >
                    {entry.state === "awarded" ? "Crédito ganado" : "Esperando su primer pago"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  awarded: { backgroundColor: "#E4EBDF" },
  awardedText: { color: colors.successText },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: { fontSize: typography.note, fontWeight: "500" },
  chevron: { color: colors.textSubtle, fontSize: typography.titleSecondary },
  code: {
    color: colors.text,
    fontFamily: "Lora_500Medium",
    fontSize: typography.title,
    letterSpacing: 2,
  },
  codeCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    gap: spacing.md,
    padding: spacing.xl,
  },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  creditLabel: { color: colors.text, fontSize: typography.body },
  creditRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  empty: { color: colors.textMuted, textAlign: "center" },
  list: { gap: spacing.sm },
  name: { color: colors.text, fontSize: typography.body },
  pending: { backgroundColor: "#F3E7D3" },
  pendingText: { color: colors.warningText },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 60,
    paddingHorizontal: spacing.lg,
  },
  screen: { gap: spacing.lg },
});
