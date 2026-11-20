import { Children, Fragment, isValidElement, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Chevron } from "../ui/chevron";
import { attendeesLabel, HeroAttendees } from "./hero-attendees";
import { fontFamilies } from "../ui/fonts";
import { colors, spacing, surfaces, typography } from "../ui/tokens";

/** The places of a class, «N de M» (FIX-089). */
export function placesLabel(booked: number, capacity: number): string {
  return `${booked} de ${capacity}`;
}

/**
 * The next class (ClaseE, FIX-089): a Palo de rosa hero with the time and
 * class in large Lora, the places, and the branch and who is coming.
 */
export function NextClassHero({
  accessibilityLabel,
  attendees = [],
  detail,
  eyebrow,
  onPress,
  places,
  testID = "next-class-hero",
  title,
}: {
  accessibilityLabel?: string;
  /** Who else is coming, by initials. */
  attendees?: readonly string[];
  detail?: string;
  eyebrow: string;
  onPress?: () => void;
  places?: string;
  testID?: string;
  title: string;
}) {
  const content = (
    <>
      <View style={styles.heroTop}>
        <Text style={styles.heroEyebrow}>{eyebrow.toUpperCase()}</Text>
        {places === undefined ? null : <Text style={styles.heroPlaces}>{places}</Text>}
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      {detail === undefined ? null : <Text style={styles.heroDetail}>{detail}</Text>}
      <HeroAttendees initials={attendees} />
    </>
  );
  const label = [
    accessibilityLabel ?? [eyebrow, title, places, detail].filter(Boolean).join(", "),
    attendees.length === 0 ? undefined : attendeesLabel(attendees.length),
  ]
    .filter(Boolean)
    .join(", ");
  if (onPress === undefined) {
    return (
      <View accessibilityLabel={label} accessible style={styles.hero} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

/** Rows of classes on one Crema card with an Arcilla outline and Rubor dividers. */
export function ClassList({
  children,
  testID = "class-list",
}: {
  children: ReactNode;
  testID?: string;
}) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.list} testID={testID}>
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index === 0 ? null : <View style={styles.divider} testID="class-list-divider" />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/**
 * Any other class (ClaseE): the time in a Rubor box, the class and one quiet
 * line, the places «N de M» at the end. `standalone` gives a lone row its own
 * card; otherwise put rows in a `ClassList`.
 */
export function ClassRow({
  accessibilityLabel,
  detail,
  detailLead,
  detailLines,
  end,
  onPress,
  places,
  standalone = false,
  testID,
  time,
  title,
}: {
  accessibilityLabel?: string;
  detail?: string;
  /** Something before the quiet line, such as the Trainer's small face. */
  detailLead?: ReactNode;
  /** Keeps the quiet line to this many lines. */
  detailLines?: number;
  /** Replaces the places, such as an exception pill. */
  end?: ReactNode;
  onPress?: () => void;
  places?: string;
  standalone?: boolean;
  testID?: string;
  time: string;
  title: string;
}) {
  const content = (
    <>
      <View style={styles.timeBox} testID="class-row-time">
        <Text numberOfLines={1} style={styles.time}>
          {time}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {detail === undefined ? null : (
          <View style={styles.detailLine}>
            {detailLead}
            <Text numberOfLines={detailLines} style={styles.detail}>
              {detail}
            </Text>
          </View>
        )}
      </View>
      {end ?? (places === undefined ? null : <Text style={styles.places}>{places}</Text>)}
      {onPress === undefined ? null : <Chevron size={16} strokeWidth={1.5} tone="muted" />}
    </>
  );
  const label = accessibilityLabel ?? [time, title, detail, places].filter(Boolean).join(", ");
  const rowStyle = [styles.row, standalone && styles.standalone];
  if (onPress === undefined) {
    return (
      <View accessibilityLabel={label} accessible style={rowStyle} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [...rowStyle, pressed && styles.pressed]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

/** Cancelled classes, folded at the end: «N canceladas por mínimo · Ver». */
export function CancelledFold({
  children,
  count,
  reason = "por mínimo",
  testID = "cancelled-fold",
}: {
  children: ReactNode;
  count: number;
  reason?: string;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  const summary = [count, count === 1 ? "cancelada" : "canceladas", reason]
    .filter((part) => part !== "")
    .join(" ");
  return (
    <View style={styles.fold} testID={testID}>
      <Pressable
        accessibilityLabel={`${summary}, ${open ? "Ocultar" : "Ver"}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={styles.foldLine}
      >
        <Text style={styles.foldText}>{summary}</Text>
        <Text style={styles.foldText}>{open ? "Ocultar" : "Ver"}</Text>
      </Pressable>
      {open ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  detail: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
  },
  detailLine: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  divider: { backgroundColor: colors.hairline, height: 1 },
  fold: { gap: spacing.sm },
  foldLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  foldText: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
    fontWeight: "600",
  },
  hero: { ...surfaces.emphasis, gap: spacing.smd, padding: spacing.xlSm },
  heroDetail: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    fontWeight: "500",
  },
  heroEyebrow: {
    color: colors.onEmphasis,
    flexShrink: 1,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.label,
    fontWeight: "700",
  },
  heroPlaces: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.note,
    fontWeight: "700",
  },
  heroTitle: { color: colors.onEmphasis, fontFamily: fontFamilies.display, fontSize: 26 },
  heroTop: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  list: { ...surfaces.card },
  places: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.note,
    fontWeight: "600",
  },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: 11,
  },
  standalone: { ...surfaces.card },
  time: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  timeBox: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    minWidth: 62,
    paddingHorizontal: spacing.sm,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.body,
    fontWeight: "500",
  },
});
