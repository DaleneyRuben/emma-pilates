import type { ClientSubscriptionDto } from "@pilates/api-contracts";
import {
  colors,
  EmphasisCard,
  formatBolivianos,
  Glyph,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { guestPassCopy } from "./guest-pass-copy";
import { promotionCardMaxWidth } from "./promotion-image";

/** The hero for a Guest Pass (walkthrough n.º 56, 60): its free class, then a Plan. */
export function GuestPassCard({
  onBook,
  onDetail,
  onPurchase,
  view,
}: {
  onBook: () => void;
  onDetail: () => void;
  onPurchase: () => void;
  view: Pick<ClientSubscriptionDto, "status" | "subscription" | "nextSubscription">;
}) {
  const copy = guestPassCopy(view);
  if (copy === null) return null;
  return (
    <View style={styles.capped} testID="home-guest-pass-card">
      <EmphasisCard
        action={
          copy.next === "purchase"
            ? { label: "Comprar un plan", onPress: onPurchase, testID: "home-buy-plan" }
            : copy.next === "book"
              ? {
                  label: "Reservar mi clase gratis",
                  onPress: onBook,
                  testID: "home-book-guest",
                  // C02f: a full-width white button inside the card.
                  wide: true,
                }
              : { label: "Mi plan", onPress: onDetail, testID: "home-plan-detail" }
        }
        eyebrow={copy.eyebrow}
        lead={
          copy.invitedBy === undefined ? undefined : (
            <View style={styles.invitedBy}>
              <View style={styles.initials}>
                <Text variant="pastilla">{copy.invitedBy.initials}</Text>
              </View>
              <Text tone="onDark" variant="titulo-fila">
                {`Te invitó ${copy.invitedBy.firstName}`}
              </Text>
            </View>
          )
        }
        note={copy.note}
        title={copy.title}
      />
    </View>
  );
}

/** C02j (walkthrough n.º 22): her friend's code gave no free class this time. */
export function InactiveInviteNotice({ hostFirstName }: { hostFirstName: string }) {
  return (
    <View style={[styles.notice, styles.capped]} testID="home-inactive-invite">
      <View style={styles.noticeDisc}>
        <Glyph color={colors.text} name="gift" size={20} strokeWidth={1.7} />
      </View>
      <View style={styles.noticeText}>
        <Text variant="titulo-fila">{`El código de ${hostFirstName} todavía no está activo`}</Text>
        <Text variant="cuerpo">Esta vez tu cuenta no incluye la clase gratis.</Text>
      </View>
    </View>
  );
}

function MatIllustration() {
  return (
    <Svg
      accessibilityElementsHidden
      fill="none"
      height={64}
      importantForAccessibility="no-hide-descendants"
      stroke={colors.primaryTint}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      style={styles.illustration}
      viewBox="0 0 64 64"
      width={64}
    >
      <Rect height={8} rx={4} width={52} x={6} y={44} />
      <Circle cx={34} cy={14} r={5} />
      <Path d="M20 42c4-10 10-16 14-20l10 6M34 22l-4 20" />
    </Svg>
  );
}

/** 02's hero without a Plan (walkthrough n.º 5): the price pill, the owner's title, a white pill. */
export function PurchasePlanCard({
  onPurchase,
  plansFromPriceCentavos,
}: {
  onPurchase: () => void;
  plansFromPriceCentavos: number | null | undefined;
}) {
  const fromPrice =
    plansFromPriceCentavos === null || plansFromPriceCentavos === undefined
      ? undefined
      : `Desde ${formatBolivianos(plansFromPriceCentavos)}`;
  return (
    <View style={[styles.purchase, styles.capped]} testID="home-purchase-card">
      <View style={styles.purchaseBody}>
        <EmphasisCard
          action={{ label: "Comprar un plan", onPress: onPurchase, testID: "home-buy-plan" }}
          note="Mat y Reformer · paga por QR o en el estudio"
          pill={fromPrice}
          title="Elige tu plan y empieza a moverte"
        />
      </View>
      <MatIllustration />
    </View>
  );
}

const styles = StyleSheet.create({
  // UX-012: the tablet carousel stops at 720 px; the hero takes the same cap
  // and lines up with it at the left (review of FIX-082).
  capped: { alignSelf: "flex-start", maxWidth: promotionCardMaxWidth, width: "100%" },
  illustration: { alignSelf: "flex-end", marginBottom: spacing.xlSm, marginRight: spacing.xlSm },
  initials: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  invitedBy: { alignItems: "center", flexDirection: "row", gap: spacing.smLg },
  notice: {
    ...surfaces.card,
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  noticeDisc: {
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  noticeText: { flex: 1, gap: spacing.xs },
  purchase: { ...surfaces.emphasis, flexDirection: "row" },
  purchaseBody: { flex: 1 },
});
