import { getGetOwnReferralCodeQueryKey, useGetOwnReferralCode } from "@pilates/api-contracts";
import {
  BrandToast,
  colors,
  EditReferralCode,
  fontFamilies,
  LoadingState,
  QueryFailure,
  radii,
  ReferralCodeCard,
  Screen,
  SectionTitle,
  spacing,
  surfaces,
  typography,
  useRefetchOnFocus,
  useTransientNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Fragment, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";

const noticeMilliseconds = 3000;

const steps = [
  "Compartes tu código con tus alumnas",
  "Ella lo escribe al crear su cuenta",
  "Queda registrada como tu clienta",
] as const;

/** S30 «Tu código de referido» (follow-up 229): the Trainer's own code. */
export function StaffReferralCodeScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useStaffFetcher();
  const own = useGetOwnReferralCode({ fetcher, query: { refetchOnMount: "always" } });
  useRefetchOnFocus([getGetOwnReferralCodeQueryKey()]);
  const [notice, setNotice] = useState<string | undefined>();
  const toast = useTransientNotice(notice, noticeMilliseconds, () => setNotice(undefined));
  const header = (
    <BackBar back="Perfil" onBack={() => navigation.goBack()} title="Tu código de referido" />
  );

  if (own.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando tu código" />
      </Screen>
    );
  }
  const code = own.data?.status === 200 ? own.data.data.referralCode : null;
  if (own.isError || code === null) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar tu código." onRetry={() => void own.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {header}
        <View style={styles.codeBlock}>
          <ReferralCodeCard code={code} onCopied={() => setNotice("Código copiado")} />
          <EditReferralCode fetcher={fetcher} onChanged={() => setNotice("Código actualizado")} />
        </View>
        <View>
          <SectionTitle>Cómo funciona</SectionTitle>
          <View style={styles.group}>
            {steps.map((step, index) => (
              <Fragment key={step}>
                {index === 0 ? null : <View style={styles.hairline} />}
                <View style={styles.row}>
                  <View style={styles.disc}>
                    <Text style={styles.discText}>{String(index + 1)}</Text>
                  </View>
                  <Text style={styles.label}>{step}</Text>
                </View>
              </Fragment>
            ))}
          </View>
          <Text style={styles.note}>
            Puedes cambiar tu código una vez cada 30 días. Si lo cambias, el anterior deja de
            funcionar; las clientas que ya se registraron siguen contigo.
          </Text>
        </View>
      </ScrollView>
      {toast === null ? null : <BrandToast onClose={() => setNotice(undefined)} title={toast} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeBlock: { gap: spacing.sm },
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  discText: { color: colors.primaryOnTint, fontFamily: fontFamilies.display, fontSize: 16 },
  group: { ...surfaces.card },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: 64 },
  label: { color: colors.text, flex: 1, fontFamily: fontFamilies.body, fontSize: typography.body },
  note: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    marginTop: spacing.md,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  screen: { paddingHorizontal: spacing.xlSm },
});
