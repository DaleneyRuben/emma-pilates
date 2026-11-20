import { formatListDate } from "@pilates/api-contracts";
import { StyleSheet, View } from "react-native";

import { Text } from "../ui/text";
import { spacing, surfaces } from "../ui/tokens";
import { StartDateStrip } from "./start-date-chooser";
import { addCivilDays, nextPlanStartOptions } from "./start-date-options";

// FIX-090: «sáb 5 dic», the shared list date.
const format = (civilDate: string): string => formatListDate(civilDate);

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
      {/* A sentence never sits straight on 100: its own white card (audit d6). */}
      <View style={styles.lineCard} testID="next-plan-start-line">
        <Text variant="cuerpo">
          {`${currentPlan} vence el ${format(addCivilDays(firstDay, -1))}. El nuevo empieza el ${format(selected)}; se puede elegir hasta el ${format(last)}.`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  lineCard: { ...surfaces.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
