import { StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "../ui/fonts";
import { colors, spacing } from "../ui/tokens";
import { StartDateStrip } from "./start-date-chooser";
import { addCivilDays, nextPlanStartOptions } from "./start-date-options";

const dayMonth = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const format = (civilDate: string): string =>
  dayMonth.format(new Date(`${civilDate}T12:00:00.000Z`));

/**
 * Design follow-up 254 § 4 (booking ADR-0013): the next Plan's «Fecha de
 * inicio», from firstDay (the day after the current end) through 28 days
 * after that end, with a line naming the end, the chosen start and the last
 * day. currentPlan opens the line: «Tu plan actual», «El plan actual de Rocío».
 */
export function NextPlanStartChooser({
  currentPlan,
  firstDay,
  selected,
  onSelect,
}: {
  currentPlan: string;
  firstDay: string;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const options = nextPlanStartOptions(firstDay);
  const last = options[options.length - 1]?.date ?? firstDay;

  return (
    <View style={styles.block}>
      <StartDateStrip onSelect={onSelect} options={options} selected={selected} />
      <Text style={styles.line}>
        {`${currentPlan} vence el ${format(addCivilDays(firstDay, -1))}. El nuevo empieza el ${format(selected)}; se puede elegir hasta el ${format(last)}.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  line: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
  },
});
