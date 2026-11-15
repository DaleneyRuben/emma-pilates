import {
  colors,
  fontFamilies,
  PrimaryButton,
  radii,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { displayTime, localTimeOf, minutesOf } from "./nutritionist-format";
import {
  hourTarget,
  lengthLine,
  minuteTarget,
  openingMinute,
  quarterMinutes,
  startLine,
  wheelBounds,
  wheelHours,
  type TimeField,
} from "./time-wheel";

const row = 44;

type WheelOption = { value: number; text: string; label: string; enabled: boolean };

/**
 * One column of S17b's wheel: five rows tall, the chosen one in the middle
 * on a Lino band. It snaps to a row when scrolled and moves to a row when
 * tapped; rows the field cannot take are faint and do nothing.
 */
function WheelColumn({
  options,
  selected,
  onSelect,
  testID,
}: {
  options: WheelOption[];
  selected: number;
  onSelect: (value: number) => void;
  testID: string;
}) {
  const scroller = useRef<ScrollView>(null);
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === selected),
  );

  useEffect(() => {
    scroller.current?.scrollTo({ animated: true, y: index * row });
  }, [index]);

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const landed = Math.round(event.nativeEvent.contentOffset.y / row);
    const nearest = options
      .map((option, at) => ({ at, option }))
      .filter(({ option }) => option.enabled)
      .sort((a, b) => Math.abs(a.at - landed) - Math.abs(b.at - landed))[0];
    if (nearest === undefined || nearest.at === index) {
      scroller.current?.scrollTo({ animated: true, y: index * row });
      return;
    }
    onSelect(nearest.option.value);
  };

  return (
    <View style={styles.column}>
      <View style={styles.band} />
      <ScrollView
        contentContainerStyle={styles.columnContent}
        contentOffset={{ x: 0, y: index * row }}
        decelerationRate="fast"
        onMomentumScrollEnd={settle}
        // iOS sends no momentum end when the finger lifts without speed.
        onScrollEndDrag={(event) => {
          if (Platform.OS === "ios" && Math.abs(event.nativeEvent.velocity?.y ?? 0) < 0.05) {
            settle(event);
          }
        }}
        ref={scroller}
        showsVerticalScrollIndicator={false}
        snapToInterval={row}
        testID={testID}
      >
        {options.map((option) => {
          const chosen = option.value === selected;
          return (
            <Pressable
              accessibilityLabel={option.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: !option.enabled, selected: chosen }}
              disabled={!option.enabled}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={styles.row}
            >
              <Text
                style={[
                  styles.rowText,
                  chosen && styles.rowTextChosen,
                  !option.enabled && styles.rowTextOff,
                ]}
              >
                {option.text}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/**
 * S17b: the sheet behind «Hora de inicio» and «Hora de fin» (follow-up 262).
 * Mount it with a `key` per opening so it starts from the field's time.
 */
export function TimeWheelSheet({
  picking,
  value,
  start,
  onPick,
  onClose,
}: {
  picking: TimeField | null;
  value: string | null;
  start: string | null;
  onPick: (time: string) => void;
  onClose: () => void;
}) {
  // Mounted afresh for each opening, it keeps that field while it slides out.
  const [field] = useState<TimeField>(picking ?? "start");
  const bounds = wheelBounds(field, start);
  const [draft, setDraft] = useState(() => openingMinute(field, value, start));
  const choose = (target: number | null) => {
    if (target !== null) setDraft(target);
  };

  const hours = wheelHours(field).map((hour) => ({
    enabled: hourTarget(hour, draft, bounds) !== null,
    label: `Hora ${hour}`,
    text: String(hour),
    value: hour,
  }));
  const minutes = quarterMinutes.map((minute) => {
    const text = String(minute).padStart(2, "0");
    return {
      enabled: minuteTarget(minute, draft, bounds) !== null,
      label: `Minuto ${text}`,
      text,
      value: minute,
    };
  });
  const note = field === "end" && start !== null ? lengthLine(draft - minutesOf(start)) : startLine;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={picking !== null}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Cerrar" onPress={onClose} style={styles.dismiss} />
        <View style={styles.sheet} testID="time-wheel-sheet">
          <View style={styles.grab} />
          <View style={styles.readout}>
            <Text style={styles.title}>{field === "start" ? "Hora de inicio" : "Hora de fin"}</Text>
            <Text accessibilityLiveRegion="polite" style={styles.time}>
              {displayTime(localTimeOf(draft))}
            </Text>
            <Text style={styles.note}>{note}</Text>
          </View>
          <View style={styles.wheel}>
            <WheelColumn
              onSelect={(hour) => choose(hourTarget(hour, draft, bounds))}
              options={hours}
              selected={Math.floor(draft / 60)}
              testID="time-wheel-hours"
            />
            <WheelColumn
              onSelect={(minute) => choose(minuteTarget(minute, draft, bounds))}
              options={minutes}
              selected={draft % 60}
              testID="time-wheel-minutes"
            />
          </View>
          <View style={styles.actions}>
            <PrimaryButton label="Listo" onPress={() => onPick(localTimeOf(draft))} />
            <TextButton label="Volver" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.xs },
  backdrop: { backgroundColor: colors.scrim, flex: 1, justifyContent: "flex-end" },
  band: {
    backgroundColor: colors.card,
    borderRadius: radii.control,
    height: row,
    left: 0,
    position: "absolute",
    right: 0,
    top: row * 2,
  },
  column: { flex: 1, height: row * 5 },
  columnContent: { paddingVertical: row * 2 },
  dismiss: { flex: 1 },
  grab: {
    alignSelf: "center",
    backgroundColor: colors.hairline,
    borderRadius: 999,
    height: 5,
    width: 36,
  },
  note: { color: colors.textMuted, fontSize: typography.body },
  readout: { alignItems: "center", gap: spacing.xs },
  row: { alignItems: "center", height: row, justifyContent: "center" },
  rowText: {
    color: colors.textMuted,
    fontSize: 22,
    fontVariant: ["tabular-nums"],
  },
  rowTextChosen: { color: colors.text, fontWeight: "600" },
  rowTextOff: { color: colors.borderStrong },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.frame,
    borderTopRightRadius: radii.frame,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.smLg,
  },
  time: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 40,
    fontVariant: ["tabular-nums"],
  },
  title: { color: colors.textMuted, fontSize: typography.body, fontWeight: "500" },
  wheel: { flexDirection: "row", gap: spacing.sm },
});
