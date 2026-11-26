import {
  getGetCurrentClientReferralsQueryKey,
  useGetCurrentClientReferrals,
} from "@pilates/api-contracts";
import {
  BrandToast,
  LoadingState,
  QueryFailure,
  Screen,
  ScreenTopBar,
  SectionTitle,
  spacing,
  surfaces,
  TabletColumns,
  Text,
  usePullToRefresh,
  useRefetchOnFocus,
  useTransientNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, Share, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { InactiveReferralCodeCard, ReferralCodeCard } from "./referral-code-card";
import { HowItWorks, ReferredList } from "./referral-parts";

const noticeMilliseconds = 3000;

/** The invite link a friend opens (walkthrough n.º 13). */
export const inviteLink = (code: string): string =>
  `https://links.emmapilatesstudio.com/client/invite/${encodeURIComponent(code)}`;

// C16g: the system's own share sheet carries the text and the link.
const shareMessage = (code: string): string =>
  `Únete a Emma Pilates Studio con mi código ${code}: tu primera clase es gratis. ${inviteLink(code)}`;

export function ReferralsScreen() {
  const navigation = useNavigation<{ goBack: () => void; navigate: (route: "Plans") => void }>();
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

  // An API from before walkthrough n.º 22 sends no `codeActive`: share as before.
  const { codeActive = true, referralCode, referrals: referred } = referrals.data.data;
  const share = () => void Share.share({ message: shareMessage(referralCode) });

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
        {/* 16T: the code and how it works beside «Tus invitadas» on a tablet. */}
        <TabletColumns
          left={
            <>
              {codeActive ? (
                <ReferralCodeCard
                  code={referralCode}
                  fetcher={fetcher}
                  onChanged={() => {
                    setNotice("Código actualizado");
                    void referrals.refetch();
                  }}
                  onCopied={() => setNotice("Código copiado")}
                  onShare={share}
                />
              ) : (
                <InactiveReferralCodeCard
                  code={referralCode}
                  onPurchase={() => navigation.navigate("Plans")}
                />
              )}
              <HowItWorks />
            </>
          }
          right={
            <View>
              <SectionTitle>Tus invitadas</SectionTitle>
              {referred.length === 0 ? (
                // Rosa Emma C16b: the quiet line in a white card; sharing is above.
                <View style={styles.emptyCard} testID="referrals-empty">
                  <Text variant="cuerpo">
                    Aún no invitaste a nadie. Cuando una amiga use tu código, la verás aquí.
                  </Text>
                </View>
              ) : (
                <ReferredList referred={referred} />
              )}
            </View>
          }
        />
      </ScrollView>
      {toast === null ? null : <BrandToast onClose={() => setNotice(undefined)} title={toast} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  emptyCard: { ...surfaces.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.mdLg },
  screen: { gap: spacing.lg },
});
