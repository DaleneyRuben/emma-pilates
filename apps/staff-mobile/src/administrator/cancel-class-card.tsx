import type { SessionAvailabilityDto } from "@pilates/api-contracts";
import {
  CardFooter,
  Chevron,
  colors,
  DetailLine,
  fontFamilies,
  formatTimeRange,
  SeatPill,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { describeCount } from "./administrator-format";

function seatsTag(session: SessionAvailabilityDto): string {
  if (session.availableSeats === 0) return "Llena";
  return describeCount(session.availableSeats, "cupo", "cupos");
}

/**
 * S13's Session card (MOB-042): the chevron beside the time and title, the
 * Trainer and Branch lines, then the booked count and the seat pill under a
 * rule. The label names the Branch only while every Branch is listed.
 */
export function CancelClassCard({
  branchName,
  labelBranch,
  onPress,
  session,
}: {
  branchName: string;
  labelBranch: boolean;
  onPress: () => void;
  session: SessionAvailabilityDto;
}) {
  const time = formatTimeRange(session.startsAt, session.endsAt);
  return (
    <Pressable
      accessibilityLabel={`${session.classTypeName} ${time}${labelBranch ? ` · ${branchName}` : ""}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.card}
      testID={`cancel-class-card-${session.id}`}
    >
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={styles.time}>{time}</Text>
          <Text style={styles.title}>{session.classTypeName}</Text>
        </View>
        <Chevron />
      </View>
      <View style={styles.details}>
        <DetailLine icon="person" iconSize={16} style={styles.trainer}>
          {session.trainerName}
        </DetailLine>
        <DetailLine icon="pin" iconSize={15} style={styles.branch}>
          {`Sucursal ${branchName}`}
        </DetailLine>
      </View>
      <CardFooter paddingTop={13}>
        <Text style={styles.booked}>
          {describeCount(session.bookedCount, "reserva", "reservas")}
        </Text>
        <SeatPill full={session.availableSeats === 0}>{seatsTag(session)}</SeatPill>
      </CardFooter>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  booked: { color: colors.textSecondary, fontSize: 14, fontVariant: ["tabular-nums"] },
  branch: { color: colors.textMuted, fontSize: typography.note },
  card: { ...surfaces.card, gap: 13, padding: spacing.lgXl },
  details: { gap: 7 },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  time: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.note,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
    letterSpacing: 0.78,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: typography.titleCard,
  },
  titles: { flexShrink: 1, gap: spacing.smd },
  trainer: { color: colors.text, fontSize: 14 },
});
