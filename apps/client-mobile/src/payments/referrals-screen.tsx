import {
  type ReferredClientDto,
  useGetCurrentClientCredit,
  useGetCurrentClientReferrals,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  Heading,
  initials,
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

function ReferredRow({ entry }: { entry: ReferredClientDto }) {
  const awarded = entry.state === "awarded";
  const detail =
    awarded && entry.awardedAt
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
      <View style={[styles.badge, awarded ? styles.awarded : styles.pending]}>
        <Text
          style={[
            styles.badgeText,
            awarded ? styles.awardedText : styles.pendingText,
          ]}
        >
          {awarded ? "Crédito ganado" : "Esperando su primer pago"}
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
  const creditValue = formatBolivianos(available);

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.codeCard}>
          <BodyText style={styles.codeLabel}>Tu código</BodyText>
          <Text style={styles.code}>{referralCode}</Text>
          <PrimaryButton
            label="Compartir"
            onPress={() => void Share.share({ message: shareMessage(referralCode) })}
          />
        </View>
        <BodyText style={styles.explanation}>
          Comparte tu código. Cuando un amigo se registre y haga su primer pago,
          ganas crédito.
        </BodyText>
        <Pressable
          accessibilityLabel={`Tu crédito: ${creditValue}`}
          accessibilityRole="button"
          onPress={() => navigation.navigate("Credit")}
          style={styles.creditRow}
        >
          <Text style={styles.creditLabel}>Tu crédito</Text>
          <View style={styles.creditTrailing}>
            <Text style={styles.creditValue}>{creditValue}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </Pressable>
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
    color: colors.primaryDeep,
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
  chevron: { color: colors.textSubtle, fontSize: typography.titleSecondary },
  code: {
    color: colors.text,
    fontFamily: "Lora_500Medium",
    fontSize: typography.display,
    letterSpacing: 3,
  },
  codeCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
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
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
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
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
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
