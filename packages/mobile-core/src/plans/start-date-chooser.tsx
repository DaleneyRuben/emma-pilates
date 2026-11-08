import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { dayChipLabel } from "../time/session-format";
import { fontFamilies } from "../ui/fonts";
import { SectionTitle } from "../ui/section-title";
import { colors, radii, spacing } from "../ui/tokens";
import { startDateOptions, type StartDateOption } from "./start-date-options";

/**
 * C09 and S10 on v2: «Fecha de inicio» as the section title, then Lino tiles
 * with the day in Lora 18 between the weekday and the month (72 high, follow-up
 * 256 § 1) and the chosen one in Palo de rosa.
 */
export function StartDateChooser({
  today,
  startDateLimitDays,
  openingDate,
  selected,
  onSelect,
}: {
  today?: string;
  startDateLimitDays: number;
  openingDate: string | null;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const options = startDateOptions({ today, startDateLimitDays, openingDate });

  return <StartDateStrip onSelect={onSelect} options={options} selected={selected} />;
}

/** The «Fecha de inicio» title and its row of day tiles, for any set of days. */
export function StartDateStrip({
  options,
  selected,
  onSelect,
}: {
  options: StartDateOption[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  return (
    <View>
      <SectionTitle>Fecha de inicio</SectionTitle>
      <ScrollView
        contentContainerStyle={styles.row}
        horizontal
        showsHorizontalScrollIndicator={false}
        testID="start-date-chooser"
      >
        {options.map((option) => (
          <StartDateChip
            key={option.date}
            option={option}
            selected={option.date === selected}
            onSelect={onSelect}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// Verification n.º 42 (follow-up 256 § 1): a strip can cross months, so each
// day names its month, short under the number and in full for VoiceOver.
const months = [
  ["ene", "enero"],
  ["feb", "febrero"],
  ["mar", "marzo"],
  ["abr", "abril"],
  ["may", "mayo"],
  ["jun", "junio"],
  ["jul", "julio"],
  ["ago", "agosto"],
  ["sep", "septiembre"],
  ["oct", "octubre"],
  ["nov", "noviembre"],
  ["dic", "diciembre"],
] as const;

const monthOf = (civilDate: string) => months[Number(civilDate.slice(5, 7)) - 1] ?? months[0];

function StartDateChip({
  option,
  selected,
  onSelect,
}: {
  option: StartDateOption;
  selected: boolean;
  onSelect: (date: string) => void;
}) {
  const chip = dayChipLabel(option.date);
  const weekday = option.weekday === "" ? chip.weekday : option.weekday;
  const day = option.weekday === "Día de apertura" ? "" : chip.day;
  const [shortMonth, month] = monthOf(option.date);

  return (
    <Pressable
      accessibilityLabel={day === "" ? weekday : `${weekday} ${day} de ${month}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onSelect(option.date)}
      style={[styles.chip, selected && styles.chipSelected]}
      testID={`start-date-${option.date}`}
    >
      <Text style={[styles.weekday, selected && [styles.selectedText, styles.selectedWeekday]]}>
        {weekday}
      </Text>
      {day === "" ? null : (
        <>
          <Text style={[styles.day, selected && styles.selectedText]}>{day}</Text>
          <Text style={[styles.weekday, selected && [styles.selectedText, styles.selectedWeekday]]}>
            {shortMonth}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.button,
    borderWidth: 0,
    gap: spacing.xxs,
    height: 72,
    justifyContent: "center",
    // «Día de apertura» is wider than a day.
    minWidth: 52,
    paddingHorizontal: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary },
  day: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 18 },
  row: { gap: spacing.sm },
  selectedText: { color: colors.white },
  selectedWeekday: { fontFamily: fontFamilies.bodyStrong, fontWeight: "600" },
  weekday: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 11 },
});
