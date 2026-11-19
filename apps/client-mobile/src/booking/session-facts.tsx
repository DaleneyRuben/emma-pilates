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
  SectionTitle,
  spacing,
  StaffFace,
  surfaces,
  typography,
  useMountedAt,
} from "@pilates/mobile-core";
import { capacityLabel, staffRoleLabel, type StaffGenderCode } from "@pilates/api-contracts";
import { StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
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
  trainerPhoto: { imageAssetId: string } | null;
  /** FIX-081: «Instructora» or «Instructor»; feminine from an older API. */
  trainerGender?: StaffGenderCode;
};

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * C04's hero: the date, the time and the seats on Palo de rosa; the header
 * above names the class, so the hero does not repeat it (FIX-089). `quiet`
 * draws them on a Crema card as plain text, for a day she cannot book
 * (FIX-082, frozen-plan option B).
 */
export function SessionHero({
  detail,
  full,
  quiet = false,
}: {
  detail: Detail;
  full: boolean;
  quiet?: boolean;
}) {
  if (quiet) {
    return (
      <View style={styles.quietHero} testID="session-hero">
        <Text style={styles.quietEyebrow}>{capitalized(formatSessionDate(detail.startsAt))}</Text>
        <Text style={styles.quietNote}>
          {`${formatTimeRange(detail.startsAt, detail.endsAt)} · ${formatSessionMinutes(detail.startsAt, detail.endsAt)}`}
        </Text>
        <Text style={styles.quietNote}>
          {capacityLabel(full ? detail.capacity : detail.bookedCount, detail.capacity)}
        </Text>
      </View>
    );
  }
  return (
    <EmphasisCard
      eyebrow={capitalized(formatSessionDate(detail.startsAt))}
      note={`${formatTimeRange(detail.startsAt, detail.endsAt)} · ${formatSessionMinutes(detail.startsAt, detail.endsAt)}`}
      pill={full ? "Lleno" : undefined}
      testID="session-hero"
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

/** Her 36 px face (FIX-041, follow-up 242), or her initials while she has none. */
function TrainerRow({
  name,
  photo,
  gender,
}: {
  name: string;
  photo: Detail["trainerPhoto"];
  gender: Detail["trainerGender"];
}) {
  const fetcher = useClientFetcher();
  return (
    <View style={styles.row}>
      <StaffFace fetcher={fetcher} name={name} photo={photo} size={36} />
      <Text style={styles.label}>{name}</Text>
      <Text style={styles.value}>{staffRoleLabel("trainer", gender)}</Text>
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
    ? { icon: "bell" as const, label: "Te avisamos si se libera un lugar" }
    : deadline === undefined || deadline.getTime() <= mountedAt
      ? null
      : {
          icon: "undo" as const,
          label: `Cancela sin costo hasta ${formatCancellationDeadline(deadline, new Date(mountedAt))}`,
        };
  return (
    <View>
      <SectionTitle>La clase</SectionTitle>
      <IconRowGroup plain testID="session-facts">
        <TrainerRow
          gender={detail.trainerGender}
          name={detail.trainerName}
          photo={detail.trainerPhoto}
        />
        <IconRow icon="pin" label="Sucursal" value={detail.branch.name} />
        {lastRow === null ? null : <IconRow icon={lastRow.icon} label={lastRow.label} />}
      </IconRowGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, flex: 1, fontFamily: fontFamilies.body, fontSize: typography.body },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  quietEyebrow: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
  quietHero: { ...surfaces.card, gap: spacing.sm, padding: spacing.xlSm },
  quietNote: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
  value: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14 },
});
