import {
  getGetCurrentClientReferralsQueryKey,
  useGetCurrentClientReferrals,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  typography,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";

const shareMessage = (code: string): string =>
  `Únete a Emma Pilates Studio con mi código ${code}: regístrate en la app y úsalo al crear tu cuenta.`;

// 16 after PAY-005 (follow-up 136): the Client's referral code and a promise.
// Credit is retired; «Invita a una amiga» (BKM-014) brings the guest pass.
export function ReferralsScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useClientFetcher();
  const referrals = useGetCurrentClientReferrals({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const queryKeys = [getGetCurrentClientReferralsQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);

  const header = (
    <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Mis referidos" />
  );

  if (referrals.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando referidos" />
      </Screen>
    );
  }
  if (referrals.isError || referrals.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar tu código."
          onRetry={() => void referrals.refetch()}
        />
      </Screen>
    );
  }

  const { referralCode } = referrals.data.data;

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
        <View style={styles.codeCard}>
          <BodyText style={styles.codeLabel}>Tu código</BodyText>
          <Text style={styles.code}>{referralCode}</Text>
          <PrimaryButton
            label="Compartir"
            onPress={() => void Share.share({ message: shareMessage(referralCode) })}
          />
        </View>
        <BodyText style={styles.explanation}>
          Pronto podrás invitar a una amiga a una clase gratis.
        </BodyText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: {
    color: colors.text,
    fontFamily: "Lora_500Medium",
    fontSize: typography.display,
    letterSpacing: 3,
  },
  codeCard: {
    ...surfaces.card,
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  codeLabel: {
    color: colors.textMuted,
    fontSize: typography.note,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  explanation: { color: colors.textMuted, textAlign: "center" },
  screen: { gap: spacing.lg },
});
