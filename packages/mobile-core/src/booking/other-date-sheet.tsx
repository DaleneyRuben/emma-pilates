import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { dayChipLabel, formatSessionDate } from "../time/session-format";
import { SheetTitle } from "../ui/sheet-title";
import { Text } from "../ui/text";
import { TextButton } from "../ui/text-button";
import { colors, radii, spacing } from "../ui/tokens";

/**
 * S13 «Otra»: the days after a day strip, as a sheet of date chips. S13
 * reaches the 30 days a class can be cancelled ahead (walkthrough 23); the
 * booking strips (C03, S07) the booking window's later days (FIX-031,
 * follow-up 234).
 */
export function OtherDateSheet({
  dates,
  onClose,
  onSelect,
  selected,
  testIDPrefix,
  visible,
}: {
  dates: readonly string[];
  onClose: () => void;
  onSelect: (date: string) => void;
  selected: string;
  testIDPrefix: string;
  visible: boolean;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <SheetTitle>Elige otra fecha</SheetTitle>
          <ScrollView contentContainerStyle={styles.grid}>
            {dates.map((date) => {
              const { weekday, day } = dayChipLabel(date);
              const isSelected = date === selected;
              return (
                <Pressable
                  accessibilityLabel={formatSessionDate(`${date}T12:00:00.000Z`)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={date}
                  onPress={() => onSelect(date)}
                  style={[styles.day, isSelected && styles.selected]}
                  testID={`${testIDPrefix}-${date}`}
                >
                  <Text tone={isSelected ? "onDark" : "ink"} variant="pastilla">
                    {weekday}
                  </Text>
                  <Text tone={isSelected ? "onDark" : "ink"} variant="cifra">
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <TextButton label="Cerrar" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.scrim, flex: 1, justifyContent: "flex-end" },
  // White chips with a 400 outline on the white sheet; the chosen one 600.
  day: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    borderWidth: 1.5,
    height: 60,
    justifyContent: "center",
    width: "13%",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.smd },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  sheet: {
    // White, never 100: «Cerrar» is small text (follow-up 285, audit d2).
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.frame + 4,
    borderTopRightRadius: radii.frame + 4,
    gap: spacing.lg,
    maxHeight: "70%",
    padding: spacing.xlSm,
    paddingBottom: spacing.xxl,
  },
});
