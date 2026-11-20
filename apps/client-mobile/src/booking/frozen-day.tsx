import { formatTitleDate, useGetCurrentClientSubscription } from "@pilates/api-contracts";
import { addCivilDays, colors, Glyph, radii, spacing, surfaces, Text } from "@pilates/mobile-core";
import { Pressable, StyleSheet, View } from "react-native";

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

/**
 * One quiet line under the day strip that names the frozen days, on a white
 * capsule because small text never sits on the band.
 */
export function FrozenLegend({ freeze }: { freeze: ApprovedFreeze }) {
  return (
    <View style={styles.legend} testID="browse-frozen-legend">
      <Glyph color={colors.text} name="lock" size={14} strokeWidth={1.5} />
      <Text variant="secundario">{`Plan congelado ${rangeInSentence(freeze)}`}</Text>
    </View>
  );
}

/**
 * C1 B (owner 2026-11-19): a frozen day on Reservar explains the Freeze and
 * offers the first day she can book, instead of greyed-out classes. C03g
 * draws it as the screen's 600 hero with a white button and a white link.
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
      <Text accessibilityRole="header" tone="onDark" variant="titulo-bloque">
        {`${weekdayAndDay(day)}: plan congelado`}
      </Text>
      <Text
        tone="onDark"
        variant="cuerpo"
      >{`Pediste congelar tu plan ${rangeInSentence(freeze)}.${moved}`}</Text>
      <View style={styles.actions}>
        {backOn === null ? null : (
          <Pressable
            accessibilityLabel={`Ver clases del ${weekdayAndDay(backOn).toLowerCase()}`}
            accessibilityRole="button"
            onPress={() => onShowDay(backOn)}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            testID="browse-frozen-back-on"
          >
            <Text variant="boton">{`Ver clases del ${weekdayAndDay(backOn).toLowerCase()}`}</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityLabel="Ver mi congelamiento"
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={onOpenFreeze}
          style={styles.link}
        >
          <Text tone="onDark" variant="enlace">
            Ver mi congelamiento
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The day after the Freeze, when the booking window reaches it. */
export function dayBackFromFreeze(freeze: ApprovedFreeze, dates: readonly string[]): string | null {
  const back = addCivilDays(freeze.endsOn, 1);
  return dates.includes(back) ? back : null;
}

const styles = StyleSheet.create({
  actions: { gap: spacing.smLg, marginTop: spacing.sm },
  button: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.button,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lgXl,
  },
  card: { ...surfaces.emphasis, gap: spacing.sm, padding: spacing.xlSm },
  legend: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
  },
  link: { alignSelf: "flex-start", justifyContent: "center", minHeight: 32 },
  pressed: { opacity: 0.85 },
});
