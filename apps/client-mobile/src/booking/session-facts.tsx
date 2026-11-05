import {
  colors,
  EmphasisCard,
  fontFamilies,
  formatSessionDate,
  formatSessionMinutes,
  formatCancellationDeadline,
  formatTimeRange,
  IconRow,
  IconRowGroup,
  initials,
  radii,
  SectionTitle,
  spacing,
  typography,
  useMountedAt,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { CapacityBlock } from "./capacity-block";

type Detail = {
  availableSeats: number;
  bookedCount: number;
  branch: { name: string };
  capacity: number;
  classType: { name: string };
  endsAt: string;
  startsAt: string;
  trainerName: string;
};

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** C04's hero: the date, the class, the time and the seats on Rosa profundo. */
export function SessionHero({ detail, full }: { detail: Detail; full: boolean }) {
  return (
    <EmphasisCard
      eyebrow={capitalized(formatSessionDate(detail.startsAt))}
      note={`${formatTimeRange(detail.startsAt, detail.endsAt)} · ${formatSessionMinutes(detail.startsAt, detail.endsAt)}`}
      pill={full ? "Lleno" : undefined}
      testID="session-hero"
      title={detail.classType.name}
    >
      <CapacityBlock
        availableSeats={detail.availableSeats}
        bookedCount={detail.bookedCount}
        capacity={detail.capacity}
        full={full}
      />
    </EmphasisCard>
  );
}

function TrainerRow({ name }: { name: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.initials}>
        <Text style={styles.initialsText}>{initials(name)}</Text>
      </View>
      <Text style={styles.label}>{name}</Text>
      <Text style={styles.value}>Entrenadora</Text>
    </View>
  );
}

/**
 * C04's «La clase»: the Trainer, the Branch, and when the free cancellation
 * ends (or, for a full class, that a freed seat is announced).
 */
export function SessionFacts({
  cancellationWindowMinutes,
  detail,
  full,
}: {
  cancellationWindowMinutes: number | undefined;
  detail: Detail;
  full: boolean;
}) {
  const mountedAt = useMountedAt();
  const deadline =
    cancellationWindowMinutes === undefined
      ? undefined
      : new Date(new Date(detail.startsAt).getTime() - cancellationWindowMinutes * 60_000);
  const lastRow = full
    ? { icon: "bell" as const, label: "Te avisamos si se libera un cupo" }
    : deadline === undefined || deadline.getTime() <= mountedAt
      ? null
      : {
          icon: "undo" as const,
          label: `Cancela sin costo hasta ${formatCancellationDeadline(deadline, new Date(mountedAt))}`,
        };
  return (
    <View>
      <SectionTitle>La clase</SectionTitle>
      <IconRowGroup testID="session-facts">
        <TrainerRow name={detail.trainerName} />
        <IconRow icon="pin" label="Sucursal" value={detail.branch.name} />
        {lastRow === null ? null : <IconRow icon={lastRow.icon} label={lastRow.label} />}
      </IconRowGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  initials: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  initialsText: { color: colors.primaryOnTint, fontFamily: fontFamilies.display, fontSize: 14 },
  label: { color: colors.text, flex: 1, fontFamily: fontFamilies.body, fontSize: typography.body },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  value: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 14 },
});
