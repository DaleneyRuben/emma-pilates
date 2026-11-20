import { formatListDate } from "@pilates/api-contracts";
import {
  addCivilDays,
  colors,
  fontFamilies,
  nextPlanStartOptions,
  spacing,
  StartDateStrip,
  startDateOptions,
  useStudioRules,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";

/**
 * Staff pick E3 C: «Empieza» as a strip of days. A first Plan offers the
 * studio's window from today; a next Plan (booking ADR-0013) offers the day
 * after the current end through 28 days after it, notes that end beside the
 * title and says the chosen start and the last day under the strip.
 */
export function PaymentStartDays({
  onSelect,
  renewalStartsOn,
  selected,
  today,
}: {
  onSelect: (date: string) => void;
  renewalStartsOn: string | undefined;
  selected: string;
  today: string;
}) {
  const studioRules = useStudioRules(useStaffFetcher());
  if (renewalStartsOn !== undefined) {
    const options = nextPlanStartOptions(renewalStartsOn);
    const last = options[options.length - 1]?.date ?? renewalStartsOn;
    return (
      <View style={styles.block}>
        <StartDateStrip
          aside={`el actual vence el ${formatListDate(addCivilDays(renewalStartsOn, -1))}`}
          onSelect={onSelect}
          options={options}
          selected={selected}
          title="Empieza"
        />
        <Text style={styles.line}>
          {`El nuevo empieza el ${formatListDate(selected)}; se puede elegir hasta el ${formatListDate(last)}.`}
        </Text>
      </View>
    );
  }
  if (studioRules === undefined) return null;
  return (
    <StartDateStrip
      onSelect={onSelect}
      options={startDateOptions({
        today,
        startDateLimitDays: studioRules.startDateLimitDays,
        openingDate: studioRules.openingDate,
      })}
      selected={selected}
      title="Empieza"
    />
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  line: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
});
