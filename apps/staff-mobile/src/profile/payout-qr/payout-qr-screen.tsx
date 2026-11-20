import { getGetOwnPayoutQrQueryKey, useGetOwnPayoutQr } from "@pilates/api-contracts";
import {
  BodyText,
  BrandToast,
  colors,
  fontFamilies,
  Glyph,
  LoadingState,
  OutlinedButton,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  surfaces,
  typography,
  useRefetchOnFocus,
  useTransientNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../../staff-fetcher";
import { BackBar } from "../../ui/back-bar";
import { bodyScroll, FooterPanel, taskEdges } from "../card-pieces";
import { PayoutQrCard } from "./payout-qr-card";
import { payoutQrBanner } from "./payout-qr-copy";
import { qrDate } from "./payout-qr-dates";
import { PayoutQrDateSheet, PayoutQrSourceSheet } from "./payout-qr-upload-sheets";
import { useSavePayoutQr } from "./use-save-payout-qr";

const noticeMilliseconds = 3000;

/** «Mi QR de cobro» (FIX-072, follow-up 276 option A), for every role. */
export function PayoutQrScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useStaffFetcher();
  const own = useGetOwnPayoutQr({ fetcher, query: { refetchOnMount: "always" } });
  useRefetchOnFocus([getGetOwnPayoutQrQueryKey()]);
  const [notice, setNotice] = useState<string | undefined>();
  const toast = useTransientNotice(notice, noticeMilliseconds, () => setNotice(undefined));
  const flow = useSavePayoutQr((validUntil) =>
    setNotice(`Guardamos tu QR. Vale hasta el ${qrDate(validUntil)}.`),
  );
  const header = (
    <BackBar back="Perfil" onBack={() => navigation.goBack()} title="Mi QR de cobro" />
  );

  if (own.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando tu QR" />
      </Screen>
    );
  }
  if (own.isError || own.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar tu QR." onRetry={() => void own.refetch()} />
      </Screen>
    );
  }

  const qr = own.data.data.payoutQr;
  const banner = qr === null ? null : payoutQrBanner(qr);
  const upload = flow.upload;

  return (
    <Screen edges={taskEdges} style={[styles.screen, bodyScroll.taskScreen]}>
      {header}
      <ScrollView contentContainerStyle={bodyScroll.content} style={bodyScroll.scroll}>
        {/* E-M08: the explanation sits in a white card, the warning on a soft 50 aside. */}
        <View style={styles.intro}>
          <BodyText style={styles.introText}>
            Administración lo usa para pagarte tu sueldo. Los QR del banco vencen: cuando subas uno
            nuevo, dinos hasta cuándo vale y te avisamos antes de que venza.
          </BodyText>
        </View>
        {banner === null ? null : (
          <View style={[styles.banner, banner.tone === "error" ? styles.bad : styles.warn]}>
            <Glyph
              color={banner.tone === "error" ? colors.error : colors.warningText}
              name={banner.tone === "error" ? "alert" : "clock"}
              size={20}
              strokeWidth={1.6}
            />
            <Text
              style={[
                styles.bannerText,
                banner.tone === "error" ? styles.badText : styles.warnText,
              ]}
            >
              {banner.text}
            </Text>
          </View>
        )}
        {qr === null ? (
          <View style={styles.empty}>
            <Glyph color={colors.primary} name="image" size={40} strokeWidth={1.4} />
            <Text style={styles.emptyTitle}>Todavía no subiste tu QR de cobro</Text>
            <BodyText style={styles.center}>
              Una foto o captura del QR de tu banco para recibir pagos.
            </BodyText>
          </View>
        ) : (
          <PayoutQrCard qr={qr} />
        )}
      </ScrollView>
      <FooterPanel>
        {qr === null ? (
          <PrimaryButton label="Subir mi QR" onPress={flow.start} testID="payout-qr-upload" />
        ) : (
          <OutlinedButton label="Cambiar QR" onPress={flow.start} testID="payout-qr-change" />
        )}
      </FooterPanel>
      {toast === null ? null : <BrandToast onClose={() => setNotice(undefined)} title={toast} />}
      <PayoutQrSourceSheet
        onCancel={flow.cancel}
        onPick={flow.pick}
        visible={upload.step === "source"}
      />
      <PayoutQrDateSheet
        // A new photo starts with no day chosen (review finding).
        key={upload.step === "date" ? upload.picked.uri : "none"}
        busy={upload.step === "date" && upload.saving}
        failure={upload.step === "date" ? upload.failure : null}
        onCancel={flow.cancel}
        onSave={flow.save}
        photoUri={upload.step === "date" ? upload.picked.uri : null}
        visible={upload.step === "date"}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bad: { backgroundColor: colors.errorSurface },
  badText: { color: colors.error },
  banner: {
    alignItems: "flex-start",
    borderColor: colors.borderSoft,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  bannerText: { flex: 1, fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
  center: { textAlign: "center" },
  // E-M10: a white box with the 400 dashed outline.
  empty: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderRadius: radii.card,
    borderStyle: "dashed",
    borderWidth: 1.5,
    gap: spacing.sm,
    paddingHorizontal: spacing.xlSm,
    paddingVertical: 28,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.titleSecondary,
    lineHeight: 27,
    textAlign: "center",
  },
  intro: { ...surfaces.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  introText: { fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
  screen: { paddingHorizontal: spacing.xlSm },
  warn: { backgroundColor: colors.warningTint },
  warnText: { color: colors.warningText },
});
