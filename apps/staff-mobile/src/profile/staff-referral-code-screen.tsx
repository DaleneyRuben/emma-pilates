import { getGetOwnReferralCodeQueryKey, useGetOwnReferralCode } from "@pilates/api-contracts";
import {
  BrandToast,
  EditReferralCode,
  LoadingState,
  QueryFailure,
  ReferralCodeCard,
  Screen,
  spacing,
  surfaces,
  Text,
  useRefetchOnFocus,
  useTransientNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { bodyScroll, RowCard } from "../ui/card-pieces";

const noticeMilliseconds = 3000;

const steps = [
  "Compartes tu código con tus clientas",
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
      {header}
      <ScrollView contentContainerStyle={bodyScroll.content} style={bodyScroll.scroll}>
        <ReferralCodeCard code={code} onCopied={() => setNotice("Código copiado")} />
        {/* E-F13: «Editar código» on its own white card. */}
        <View style={styles.edit}>
          <EditReferralCode fetcher={fetcher} onChanged={() => setNotice("Código actualizado")} />
        </View>
        <RowCard label="Cómo funciona">
          {steps.map((step, index) => (
            <View key={step} style={styles.row}>
              <Text style={styles.number} variant="cifra">
                {String(index + 1)}
              </Text>
              <Text style={styles.label} variant="cuerpo">
                {step}
              </Text>
            </View>
          ))}
        </RowCard>
        <View style={styles.noteCard}>
          <Text variant="secundario">
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
  edit: { ...surfaces.card, alignItems: "flex-start", paddingHorizontal: spacing.xs },
  label: { flex: 1 },
  // A quiet line goes in a white card, never on the 100 screen.
  noteCard: { ...surfaces.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  // FIX-089: the step number stands alone in `cifra`, with no disc behind it.
  number: { width: 24 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  screen: { paddingHorizontal: spacing.xlSm },
});
