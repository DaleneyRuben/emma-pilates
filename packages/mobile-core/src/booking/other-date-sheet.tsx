import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { dayChipLabel, formatSessionDate } from "../time/session-format";
import { fontFamilies } from "../ui/fonts";
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
          <Text style={styles.title}>Elige otra fecha</Text>
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
                  <Text style={[styles.weekday, isSelected && styles.onSelected]}>{weekday}</Text>
                  <Text style={[styles.number, isSelected && styles.onSelected]}>{day}</Text>
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
  day: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    height: 60,
    justifyContent: "center",
    width: "13%",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.smd },
  number: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 18 },
  onSelected: { color: colors.white },
  selected: { backgroundColor: colors.primary },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.frame + 4,
    borderTopRightRadius: radii.frame + 4,
    gap: spacing.lg,
    maxHeight: "70%",
    padding: spacing.xlSm,
    paddingBottom: spacing.xxl,
  },
  title: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 22 },
  weekday: { color: colors.textMuted, fontFamily: fontFamilies.bodyMedium, fontSize: 11 },
});
