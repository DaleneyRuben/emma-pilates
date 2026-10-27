import {
  BodyText,
  colors,
  ConfirmationSheet,
  PickerCheck,
  radii,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { civilDateLong, displayTime, quarterHours } from "./nutritionist-format";
import { keptLine } from "./availability-block-form-parts";

export type TimeField = "start" | "end";
export type Confirmation = "replace" | "end";

// The quarter-hour picker behind «Hora de inicio» and «Hora de fin».
export function TimePickerSheet({
  picking,
  value,
  onPick,
  onClose,
}: {
  picking: TimeField | null;
  value: string | null;
  onPick: (time: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={picking !== null}>
      <View style={styles.sheetBackdrop}>
        <View style={[styles.sheet, styles.timeSheet]}>
          <Text style={styles.sheetTitle}>
            {picking === "start" ? "Hora de inicio" : "Hora de fin"}
          </Text>
          <ScrollView contentContainerStyle={styles.timeOptions}>
            {quarterHours.map((time) => {
              const selected = time === value;
              return (
                <Pressable
                  accessibilityLabel={displayTime(time)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={time}
                  onPress={() => onPick(time)}
                  style={styles.timeOption}
                >
                  <Text style={[styles.timeOptionText, selected && styles.timeOptionTextSelected]}>
                    {displayTime(time)}
                  </Text>
                  <PickerCheck selected={selected} testID={`picker-check-${time}`} />
                </Pressable>
              );
            })}
          </ScrollView>
          <TextButton label="Volver" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

// «¿Aplicar el cambio?» / «¿Quitar este horario?» before a block with
// booked Evaluations is replaced or ended.
export function BlockChangeSheet({
  confirming,
  effectiveFrom,
  booked,
  busy,
  onApply,
  onRemove,
  onClose,
}: {
  confirming: Confirmation | null;
  effectiveFrom: string;
  booked: number;
  busy: boolean;
  onApply: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const ending = confirming === "end";
  return (
    <ConfirmationSheet
      busy={busy}
      confirmLabel={ending ? "Quitar horario" : "Aplicar cambio"}
      note={`${ending ? "Quitar" : "Aplicar"} desde el ${civilDateLong(effectiveFrom)}.`}
      onConfirm={ending ? onRemove : onApply}
      onDismiss={onClose}
      testID="block-change-sheet"
      title={ending ? "¿Quitar este horario?" : "¿Aplicar el cambio?"}
      tone={ending ? "destructive" : "primary"}
      visible={confirming !== null}
    >
      {booked > 0 ? <BodyText>{keptLine(booked)}</BodyText> : null}
    </ConfirmationSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.frame,
    borderTopRightRadius: radii.frame,
    gap: spacing.md,
    padding: spacing.xl,
  },
  sheetBackdrop: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetTitle: { color: colors.text, fontSize: typography.titleSecondary, fontWeight: "500" },
  timeOption: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    width: "23%",
  },
  timeOptionText: { color: colors.text, fontSize: typography.body },
  timeOptionTextSelected: { color: colors.primaryDeep, fontWeight: "500" },
  timeOptions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  timeSheet: { maxHeight: "70%" },
});
