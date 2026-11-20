import {
  colors,
  fontFamilies,
  spacing,
  StaffFace,
  surfaces,
  typography,
  useMountedAt,
} from "@pilates/mobile-core";
import { formatDateTime, staffRoleLabel, type StaffGenderCode } from "@pilates/api-contracts";
import { Fragment, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { freePlacesLabel } from "./free-places";

type Detail = {
  availableSeats: number;
  branch: { name: string };
  capacity: number;
  startsAt: string;
  trainerName: string;
  trainerPhoto: { imageAssetId: string } | null;
  /** FIX-081: «Instructora» or «Instructor»; feminine from an older API. */
  trainerGender?: StaffGenderCode;
};

/** The places a Client sees: «5 de 8 libres», «Último lugar» or «Clase llena». */
function placesLabel(availableSeats: number, capacity: number, full: boolean) {
  return freePlacesLabel(full ? 0 : availableSeats, capacity);
}

type Fact = { key: string; label: string; value?: ReactNode };

function FactRow({ fact }: { fact: Fact }) {
  return (
    <View style={styles.row} testID={`session-fact-${fact.key}`}>
      <Text style={[styles.label, fact.value === undefined && styles.wide]}>{fact.label}</Text>
      {typeof fact.value === "string" ? <Text style={styles.value}>{fact.value}</Text> : fact.value}
    </View>
  );
}

/** Her 36 px face (FIX-041, follow-up 242), or her initials while she has none. */
function Trainer({ name, photo }: { name: string; photo: Detail["trainerPhoto"] }) {
  const fetcher = useClientFetcher();
  return (
    <View style={styles.trainer}>
      <StaffFace fetcher={fetcher} name={name} photo={photo} size={36} />
      <Text style={styles.value}>{name}</Text>
    </View>
  );
}

/**
 * C4 A's quiet table: the Trainer, the Branch, the free places, and when the
 * free cancellation ends (or, for a full class, that a freed place is
 * announced). A limit already past, or unknown, leaves its row out.
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
  const lastRow: Fact | null = full
    ? { key: "waitlist", label: "Te avisamos si se libera un lugar" }
    : deadline === undefined || deadline.getTime() <= mountedAt
      ? null
      : { key: "cancel", label: "Cancelas gratis hasta", value: formatDateTime(deadline) };
  const facts: Fact[] = [
    {
      key: "trainer",
      label: staffRoleLabel("trainer", detail.trainerGender),
      value: <Trainer name={detail.trainerName} photo={detail.trainerPhoto} />,
    },
    { key: "branch", label: "Sucursal", value: detail.branch.name },
    {
      key: "places",
      label: "Lugares",
      value: placesLabel(detail.availableSeats, detail.capacity, full),
    },
    ...(lastRow === null ? [] : [lastRow]),
  ];
  return (
    <View style={styles.table} testID="session-facts">
      {facts.map((fact, index) => (
        <Fragment key={fact.key}>
          {index === 0 ? null : <View style={styles.hairline} />}
          <FactRow fact={fact} />
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hairline: { backgroundColor: colors.hairline, height: 1 },
  label: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  table: { ...surfaces.card },
  trainer: { alignItems: "center", flexDirection: "row", flexShrink: 1, gap: spacing.sm },
  value: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
    textAlign: "right",
  },
  wide: { flex: 1 },
});
