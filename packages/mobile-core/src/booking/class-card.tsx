import { Children, Fragment, isValidElement, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Chevron } from "../ui/chevron";
import { Text } from "../ui/text";
import { TypeBar } from "../ui/type-bar";
import { attendeesLabel, HeroAttendees } from "./hero-attendees";
import { colors, spacing, surfaces } from "../ui/tokens";

/** The places of a class, «N de M» (FIX-089). */
export function placesLabel(booked: number, capacity: number): string {
  return `${booked} de ${capacity}`;
}

/**
 * The next class (Rosa Emma): the solid 600 hero with the time and class in
 * large Lora, the places, and the branch and who is coming.
 */
export function NextClassHero({
  accessibilityLabel,
  action,
  attendees = [],
  detail,
  eyebrow,
  onPress,
  places,
  testID = "next-class-hero",
  title,
}: {
  accessibilityLabel?: string;
  /** A control under the hero's group, such as «Cancelar reserva» (C05). */
  action?: ReactNode;
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
        <Text style={styles.heroEyebrow} tone="onDark" variant="etiqueta">
          {eyebrow}
        </Text>
        {places === undefined ? null : (
          <Text tone="onDark" variant="pastilla">
            {places}
          </Text>
        )}
      </View>
      <Text tone="onDark" variant="titulo-bloque">
        {title}
      </Text>
      {detail === undefined ? null : (
        <Text tone="onDark" variant="cuerpo">
          {detail}
        </Text>
      )}
      <HeroAttendees initials={attendees} />
    </>
  );
  const label = [
    accessibilityLabel ?? [eyebrow, title, places, detail].filter(Boolean).join(", "),
    attendees.length === 0 ? undefined : attendeesLabel(attendees.length),
  ]
    .filter(Boolean)
    .join(", ");
  const group =
    onPress === undefined ? (
      <View accessibilityLabel={label} accessible style={styles.hero} testID={testID}>
        {content}
      </View>
    ) : (
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
  if (action === undefined) return group;
  // The action stays outside the hero's accessible group, on the same 600.
  return (
    <View style={styles.heroWithAction}>
      {group}
      <View style={styles.heroAction}>{action}</View>
    </View>
  );
}

/** Rows of classes on one white card with 100 dividers. */
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
 * Any other class (Rosa Emma): the type bar, the time in Lora, the class and
 * one quiet line, the places «N de M» at the end. `standalone` gives a lone row its own
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
  typeName,
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
  /** The class type that colours the bar, when the title is not its name. */
  typeName?: string;
}) {
  const content = (
    <>
      <TypeBar name={typeName ?? title} />
      {/* No numberOfLines: at a large text size «08:00» grows, never «08:…». */}
      <Text style={styles.time} testID="class-row-time" variant="cifra">
        {time}
      </Text>
      <View style={styles.body}>
        <Text variant="titulo-fila">{title}</Text>
        {detail === undefined ? null : (
          <View style={styles.detailLine}>
            {detailLead}
            <Text numberOfLines={detailLines} style={styles.detail} variant="secundario">
              {detail}
            </Text>
          </View>
        )}
      </View>
      {end ?? (places === undefined ? null : <Text variant="pastilla">{places}</Text>)}
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
        <Text variant="secundario">{summary}</Text>
        <Text variant="enlace">{open ? "Ocultar" : "Ver"}</Text>
      </Pressable>
      {open ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  detail: { flexShrink: 1 },
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
  hero: { ...surfaces.emphasis, gap: spacing.smd, padding: spacing.xlSm },
  heroAction: {
    alignItems: "flex-end",
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xlSm,
  },
  heroWithAction: { ...surfaces.emphasis },
  heroEyebrow: { flexShrink: 1 },
  heroTop: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  list: { ...surfaces.card, overflow: "hidden" },
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
  // The time in cifra beside the type bar (follow-up 285).
  time: { flexShrink: 0, minWidth: 62 },
});
