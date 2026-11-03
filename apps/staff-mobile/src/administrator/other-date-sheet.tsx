import {
  colors,
  dayChipLabel,
  fontFamilies,
  formatSessionDate,
  radii,
  spacing,
  TextButton,
} from "@pilates/mobile-core";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

/**
 * S13 «Otra»: the days after the strip, up to 30 ahead (walkthrough 23), as a
 * sheet of date chips. Cancelling a class has no 7-day booking limit.
 */
export function OtherDateSheet({
  dates,
  onClose,
  onSelect,
  selected,
  visible,
}: {
  dates: readonly string[];
  onClose: () => void;
  onSelect: (date: string) => void;
  selected: string;
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
                  testID={`cancel-class-other-${date}`}
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
