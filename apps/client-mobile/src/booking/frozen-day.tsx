import { formatTitleDate, useGetCurrentClientSubscription } from "@pilates/api-contracts";
import {
  addCivilDays,
  colors,
  fontFamilies,
  Glyph,
  PrimaryButton,
  spacing,
  surfaces,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { dayMonth, freezeRange } from "../subscription/freeze-window";

export type ApprovedFreeze = {
  startsOn: string;
  endsOn: string;
  /** The Plan's end, already moved by the Freeze. */
  planEndsOn: string | null;
};

/** The current Subscription's approved Freeze that has not ended yet, or null. */
export function useApprovedFreeze(
  fetcher: typeof globalThis.fetch,
  today: string,
): ApprovedFreeze | null {
  const subscription = useGetCurrentClientSubscription({ fetcher });
  const view = subscription.data?.status === 200 ? subscription.data.data : undefined;
  return approvedFreeze(view, today);
}

export function approvedFreeze(
  view:
    | {
        freeze?: { state: string; startsOn: string; endsOn: string } | null;
        subscription?: { endsOn: string } | null;
      }
    | undefined,
  today: string,
): ApprovedFreeze | null {
  const freeze = view?.freeze;
  if (freeze?.state !== "approved" || freeze.endsOn < today) return null;
  return {
    startsOn: freeze.startsOn,
    endsOn: freeze.endsOn,
    planEndsOn: view?.subscription?.endsOn ?? null,
  };
}

export function isFrozen(day: string, freeze: ApprovedFreeze | null): boolean {
  return freeze !== null && day >= freeze.startsOn && day <= freeze.endsOn;
}

/** «Viernes 20»: a day in a sentence or a title, without its month. */
export function weekdayAndDay(civil: string): string {
  return formatTitleDate(civil).split(" de ")[0] ?? civil;
}

/** «del vie 20 al dom 22 nov», for inside a sentence. */
function rangeInSentence(freeze: ApprovedFreeze): string {
  const range = freezeRange(freeze.startsOn, freeze.endsOn);
  return `${range.charAt(0).toLowerCase()}${range.slice(1)}`;
}

/** One quiet line under the day strip that names the frozen days. */
export function FrozenLegend({ freeze }: { freeze: ApprovedFreeze }) {
  return (
    <View style={styles.legend} testID="browse-frozen-legend">
      <Glyph color={colors.text} name="lock" size={14} strokeWidth={1.5} />
      <Text style={styles.legendText}>{`Plan congelado ${rangeInSentence(freeze)}`}</Text>
    </View>
  );
}

/**
 * C1 B (owner 2026-11-19): a frozen day on Reservar explains the Freeze and
 * offers the first day she can book, instead of greyed-out classes.
 */
export function FrozenDayCard({
  backOn,
  day,
  freeze,
  onOpenFreeze,
  onShowDay,
}: {
  /** The first day after the Freeze, when it lies inside the booking window. */
  backOn: string | null;
  day: string;
  freeze: ApprovedFreeze;
  onOpenFreeze: () => void;
  onShowDay: (day: string) => void;
}) {
  const moved =
    freeze.planEndsOn === null ? "" : ` Tu plan ahora vence el ${dayMonth(freeze.planEndsOn)}.`;
  return (
    <View style={styles.card} testID="browse-frozen-day">
      <Text accessibilityRole="header" style={styles.title}>
        {`${weekdayAndDay(day)}: plan congelado`}
      </Text>
      <Text
        style={styles.body}
      >{`Pediste congelar tu plan ${rangeInSentence(freeze)}.${moved}`}</Text>
      {backOn === null ? null : (
        <PrimaryButton
          label={`Ver clases del ${weekdayAndDay(backOn).toLowerCase()}`}
          onPress={() => onShowDay(backOn)}
          testID="browse-frozen-back-on"
        />
      )}
      <TextButton label="Ver mi congelamiento" onPress={onOpenFreeze} style={styles.link} />
    </View>
  );
}

/** The day after the Freeze, when the booking window reaches it. */
export function dayBackFromFreeze(freeze: ApprovedFreeze, dates: readonly string[]): string | null {
  const back = addCivilDays(freeze.endsOn, 1);
  return dates.includes(back) ? back : null;
}

const styles = StyleSheet.create({
  body: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    lineHeight: 22,
  },
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  legend: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  legendText: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  link: { alignSelf: "flex-start" },
  title: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 22 },
});
