import {
  getGetCurrentClientReferralsQueryKey,
  type ReferredClientDto,
  useGetCurrentClientReferrals,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  initials,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  radii,
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
import { formatReferralDate } from "./referral-format";

type ReferralsNavigation = {
  goBack: () => void;
  navigate: (screen: "Credit") => void;
};

// The design system defines tints as the semantic color at low alpha.
const successTint = "rgba(124, 148, 115, 0.16)";
const warningTint = "rgba(201, 154, 78, 0.16)";

const shareMessage = (code: string): string =>
  `Únete a Emma Pilates Studio con mi código ${code}: regístrate en la app y úsalo al crear tu cuenta.`;

const invitationBadge = {
  registered: "Registrada",
  class_booked: "Clase reservada",
  bought: "Compró su plan",
} as const;

function ReferredRow({ entry }: { entry: ReferredClientDto }) {
  const bought = entry.invitationStatus === "bought";
  const detail =
    bought && entry.awardedAt
      ? `Primer pago el ${formatReferralDate(entry.awardedAt)}`
      : `Se registró el ${formatReferralDate(entry.createdAt)}`;

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(entry.referredName)}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.name}>{entry.referredName}</Text>
        <BodyText style={styles.detail}>{detail}</BodyText>
      </View>
      <View style={[styles.badge, bought ? styles.awarded : styles.pending]}>
        <Text style={[styles.badgeText, bought ? styles.awardedText : styles.pendingText]}>
          {invitationBadge[entry.invitationStatus]}
        </Text>
      </View>
    </View>
  );
}

export function ReferralsScreen() {
  const navigation = useNavigation<ReferralsNavigation>();
  const fetcher = useClientFetcher();
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const referrals = useGetCurrentClientReferrals(queryOptions);
  const queryKeys = [getGetCurrentClientReferralsQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);

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
          Comparte tu código. Tu amiga recibe una clase gratis, una sola vez. Cuando compre su
          primer plan, tú ganas una clase.
        </BodyText>
        {referred.length === 0 ? (
          <View style={styles.emptyState}>
            <BodyText style={styles.empty}>
              Aún no has invitado a nadie. ¡Comparte tu código!
            </BodyText>
          </View>
        ) : (
          <View style={styles.list}>
            <Text style={styles.sectionTitle}>Tus invitaciones</Text>
            {referred.map((entry) => (
              <ReferredRow entry={entry} key={entry.referredClientId} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarText: {
    color: colors.primaryOnTint,
    fontSize: typography.note,
    fontWeight: "600",
  },
  awarded: { backgroundColor: successTint },
  awardedText: { color: colors.successText },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.xxs,
  },
  badgeText: { fontSize: typography.label, fontWeight: "500" },
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
  creditLabel: { color: colors.text, fontSize: typography.body },
  creditRow: {
    ...surfaces.flatCard,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  creditTrailing: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  creditValue: {
    color: colors.primaryDeep,
    fontFamily: "Lora_500Medium",
    fontSize: typography.bodyLarge,
  },
  detail: { color: colors.textMuted, fontSize: typography.note },
  empty: { color: colors.textMuted, textAlign: "center" },
  emptyState: { gap: spacing.xxs, paddingVertical: spacing.lg },
  explanation: { textAlign: "center" },
  list: { gap: spacing.sm },
  name: { color: colors.text, fontSize: typography.body, fontWeight: "500" },
  pending: { backgroundColor: warningTint },
  pendingText: { color: colors.warningText },
  row: {
    ...surfaces.flatCard,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBody: { flex: 1, gap: spacing.xxs },
  screen: { gap: spacing.lg },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
  },
});
