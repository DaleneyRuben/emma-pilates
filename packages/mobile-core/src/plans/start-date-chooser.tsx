import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { dayChipLabel } from "../time/session-format";
import { SectionTitle } from "../ui/section-title";
import { Text } from "../ui/text";
import { colors, radii, shadows, spacing } from "../ui/tokens";
import { startDateOptions, type StartDateOption } from "./start-date-options";

/**
 * C09 and S10 on v2: «Fecha de inicio» as the section title, then Lino tiles
 * with the day in cifra between the weekday and the month (72 high, follow-up
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

/**
 * The «Fecha de inicio» title and its row of day tiles, for any set of days.
 * Staff pick E3 C titles it «Empieza» and notes the current Plan's end in
 * `aside`, beside the title.
 */
export function StartDateStrip({
  aside,
  options,
  selected,
  title = "Fecha de inicio",
  onSelect,
}: {
  aside?: string;
  options: StartDateOption[];
  selected: string;
  title?: string;
  onSelect: (date: string) => void;
}) {
  return (
    <View>
      {aside === undefined ? (
        <SectionTitle>{title}</SectionTitle>
      ) : (
        <View style={styles.titleRow}>
          <SectionTitle>{title}</SectionTitle>
          {/* Small text on a white capsule, never straight on 100 (audit d7). */}
          <View style={styles.aside}>
            <Text style={styles.asideText} variant="secundario">
              {aside}
            </Text>
          </View>
        </View>
      )}
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
  // The chosen tile changes ground and tone, never weight.
  const tone = selected ? "onDark" : "ink";

  return (
    <Pressable
      accessibilityLabel={day === "" ? weekday : `${weekday} ${day} de ${month}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onSelect(option.date)}
      style={[styles.chip, selected && styles.chipSelected]}
      testID={`start-date-${option.date}`}
    >
      <Text tone={tone} variant="pastilla">
        {weekday}
      </Text>
      {day === "" ? null : (
        <>
          <Text tone={tone} variant="cifra">
            {day}
          </Text>
          <Text tone={tone} variant="pastilla">
            {shortMonth}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  aside: {
    backgroundColor: colors.card,
    borderRadius: radii.inset,
    flexShrink: 1,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.smLg,
    paddingVertical: spacing.xs,
  },
  asideText: { textAlign: "right" },
  chip: {
    ...shadows.card,
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.inset,
    gap: spacing.xxs,
    minHeight: 72,
    justifyContent: "center",
    // «Día de apertura» is wider than a day.
    minWidth: 52,
    paddingHorizontal: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary },
  row: { gap: spacing.sm },
  titleRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
});
