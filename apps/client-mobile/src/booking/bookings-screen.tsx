import { useGetCurrentClientSubscription } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  Heading,
  radii,
  Screen,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import type { ConfirmedBooking } from "./session-detail-screen";
import { formatSessionDate, formatTimeRange } from "./session-format";

const noticeVisibleMs = 8_000;

export function BookingsScreen({
  route,
}: {
  route: { params?: { confirmed?: ConfirmedBooking } };
}) {
  const fetcher = useClientFetcher();
  const confirmed = route.params?.confirmed;
  const [noticeFor, setNoticeFor] = useState<string | null>(
    confirmed?.bookingId ?? null,
  );
  const subscription = useGetCurrentClientSubscription({
    fetcher,
    query: { refetchOnMount: "always" },
  });

  useEffect(() => {
    if (confirmed === undefined) return undefined;
    setNoticeFor(confirmed.bookingId);
    const timer = setTimeout(() => setNoticeFor(null), noticeVisibleMs);
    return () => clearTimeout(timer);
  }, [confirmed]);

  const remaining =
    subscription.data?.status === 200
      ? subscription.data.data.subscription?.remainingClassAllowance
      : undefined;

  return (
    <Screen style={styles.screen}>
      <Heading accessibilityLabel="Mis reservas">Mis reservas</Heading>
      {confirmed !== undefined && noticeFor === confirmed.bookingId ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Reserva confirmada</Text>
          <BodyText style={styles.noticeBody}>
            {`${confirmed.classTypeName} · ${formatSessionDate(confirmed.startsAt)} · ${formatTimeRange(confirmed.startsAt, confirmed.endsAt)}`}
          </BodyText>
          {remaining !== undefined ? (
            <BodyText style={styles.balance}>
              {`Te quedan ${remaining} clases en tu plan`}
            </BodyText>
          ) : null}
        </View>
      ) : null}
      <BodyText>Tus reservas aparecerán aquí.</BodyText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balance: { color: colors.textMuted, fontSize: typography.note },
  notice: {
    backgroundColor: "rgba(124,148,115,0.14)",
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  noticeBody: { color: colors.successText, fontSize: typography.note },
  noticeTitle: { color: colors.successText, fontSize: typography.bodyLarge, fontWeight: "600" },
  screen: { gap: spacing.lg },
});
