import {
  getGetCurrentClientReferralsQueryKey,
  useGetCurrentClientReferrals,
} from "@pilates/api-contracts";
import {
  BrandToast,
  EditReferralCode,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  ReferralCodeCard,
  Screen,
  ScreenTopBar,
  SectionTitle,
  spacing,
  StateScreen,
  usePullToRefresh,
  useRefetchOnFocus,
  useTransientNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, Share, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { HowItWorks, ReferredList } from "./referral-parts";

const noticeMilliseconds = 3000;

const shareMessage = (code: string): string =>
  `Únete a Emma Pilates Studio con mi código ${code}: regístrate en la app y úsalo al crear tu cuenta.`;

export function ReferralsScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useClientFetcher();
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const referrals = useGetCurrentClientReferrals(queryOptions);
  const queryKeys = [getGetCurrentClientReferralsQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);
  const [notice, setNotice] = useState<string | undefined>();
  const toast = useTransientNotice(notice, noticeMilliseconds, () => setNotice(undefined));

  const header = (
    <>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Invita a una amiga" />
    </>
  );

  if (referrals.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando invitaciones" />
      </Screen>
    );
  }
  if (referrals.isError || referrals.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar tus invitaciones."
          onRetry={() => void referrals.refetch()}
        />
      </Screen>
    );
  }

  const { referralCode, referrals: referred } = referrals.data.data;
  const share = () => void Share.share({ message: shareMessage(referralCode) });

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
        <View style={styles.codeBlock}>
          <ReferralCodeCard code={referralCode} onCopied={() => setNotice("Código copiado")} />
          <EditReferralCode
            fetcher={fetcher}
            onChanged={() => {
              setNotice("Código actualizado");
              void referrals.refetch();
            }}
          />
        </View>
        {referred.length === 0 ? null : <PrimaryButton label="Compartir" onPress={share} />}
        <HowItWorks />
        <View>
          <SectionTitle>Tus invitadas</SectionTitle>
          {referred.length === 0 ? (
            <StateScreen
              layout="card"
              note="Cuando una amiga use tu código, la verás aquí."
              primaryAction={{ label: "Compartir tu código", onPress: share }}
              title="Aún no invitaste a nadie"
            />
          ) : (
            <ReferredList referred={referred} />
          )}
        </View>
      </ScrollView>
      {toast === null ? null : <BrandToast onClose={() => setNotice(undefined)} title={toast} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeBlock: { gap: spacing.sm },
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  screen: { gap: spacing.lg },
});
