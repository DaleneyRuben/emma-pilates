import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Chevron } from "./chevron";
import { fontFamilies } from "./fonts";
import { colors, radii, spacing, typography } from "./tokens";

const weekdays = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const months = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const header = ["L", "M", "M", "J", "V", "S", "D"];

const pad = (value: number) => String(value).padStart(2, "0");

function shiftMonth(month: string, by: number): string {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, index - 1 + by, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

function monthDays(month: string): { blanks: number; days: string[] } {
  const [year, index] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, index - 1, 1));
  const count = new Date(Date.UTC(year, index, 0)).getUTCDate();
  const days = Array.from({ length: count }, (_, day) => `${month}-${pad(day + 1)}`);
  return { blanks: (first.getUTCDay() + 6) % 7, days };
}

function dayLabel(day: string): string {
  const date = new Date(`${day}T12:00:00.000Z`);
  return `${weekdays[date.getUTCDay()]} ${date.getUTCDate()} de ${months[date.getUTCMonth()]}`;
}

type Place = "single" | "start" | "end" | "inside" | null;

function placeIn(day: string, start: string | null, end: string | null): Place {
  if (start === null) return null;
  if (end === null || start === end) return day === start ? "single" : null;
  if (day === start) return "start";
  if (day === end) return "end";
  return day > start && day < end ? "inside" : null;
}

/**
 * DES-015 (follow-up 259): a month calendar, Monday first, with ‹ › between
 * `firstMonth` and `lastMonth` ("YYYY-MM"). It draws the range from
 * `rangeStart` to `rangeEnd` and mutes the days `isOff` names, which stay
 * tappable so the screen can say why. Days are civil dates ("YYYY-MM-DD").
 */
export function Calendar({
  firstMonth,
  isOff,
  lastMonth,
  onPressDay,
  rangeEnd,
  rangeStart,
  today,
}: {
  firstMonth: string;
  isOff: (day: string) => boolean;
  lastMonth: string;
  onPressDay: (day: string) => void;
  rangeEnd: string | null;
  rangeStart: string | null;
  today: string;
}) {
  const [month, setMonth] = useState(firstMonth);
  const { blanks, days } = monthDays(month);
  const [year, index] = month.split("-").map(Number);
  const title = `${months[index - 1].charAt(0).toUpperCase()}${months[index - 1].slice(1)} ${year}`;
  const canGoBack = month > firstMonth;
  const canGoForward = month < lastMonth;

  return (
    <View style={styles.calendar} testID="calendar">
      <View style={styles.monthBar}>
        <Pressable
          accessibilityLabel="Mes anterior"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canGoBack }}
          disabled={!canGoBack}
          hitSlop={4}
          onPress={() => setMonth(shiftMonth(month, -1))}
          style={[styles.arrow, !canGoBack && styles.arrowOff]}
        >
          <View style={styles.flip}>
            <Chevron testID="calendar-previous" tone="muted" />
          </View>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Pressable
          accessibilityLabel="Mes siguiente"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canGoForward }}
          disabled={!canGoForward}
          hitSlop={4}
          onPress={() => setMonth(shiftMonth(month, 1))}
          style={[styles.arrow, !canGoForward && styles.arrowOff]}
        >
          <Chevron testID="calendar-next" tone="muted" />
        </Pressable>
      </View>
      <View style={styles.week}>
        {header.map((letter, column) => (
          <Text key={column} style={styles.weekday}>
            {letter}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {Array.from({ length: blanks }, (_, blank) => (
          <View key={`blank-${blank}`} style={styles.cell} testID="calendar-blank" />
        ))}
        {days.map((day) => {
          const off = isOff(day);
          const place = placeIn(day, rangeStart, rangeEnd);
          const filled = place === "single" || place === "start" || place === "end";
          const label = `${dayLabel(day)}${day === today ? ", hoy" : ""}${off ? ", no disponible" : ""}`;
          return (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="button"
              accessibilityState={{ selected: place !== null }}
              key={day}
              onPress={() => onPressDay(day)}
              style={[
                styles.cell,
                place === "inside" && styles.band,
                place === "start" && styles.bandStart,
                place === "end" && styles.bandEnd,
              ]}
              testID={`calendar-day-${day}`}
            >
              <View
                style={[
                  styles.dot,
                  day === today && !filled && styles.today,
                  filled && styles.filled,
                ]}
              >
                <Text
                  style={[styles.number, off && styles.numberOff, filled && styles.numberFilled]}
                >
                  {String(Number(day.slice(8)))}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const cellHeight = 44;

const styles = StyleSheet.create({
  arrow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.inset,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  arrowOff: { opacity: 0.35 },
  band: { backgroundColor: colors.primaryTint },
  bandEnd: {
    backgroundColor: colors.primaryTint,
    borderBottomRightRadius: 22,
    borderTopRightRadius: 22,
  },
  bandStart: {
    backgroundColor: colors.primaryTint,
    borderBottomLeftRadius: 22,
    borderTopLeftRadius: 22,
  },
  calendar: { gap: spacing.sm },
  cell: {
    alignItems: "center",
    height: cellHeight,
    justifyContent: "center",
    marginVertical: 2,
    width: `${100 / 7}%`,
  },
  dot: {
    alignItems: "center",
    borderRadius: radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  filled: { backgroundColor: colors.primary },
  flip: { transform: [{ rotate: "180deg" }] },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  monthBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  number: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
  numberFilled: { color: colors.white, fontFamily: fontFamilies.bodyStrong },
  numberOff: { color: colors.iconQuiet, textDecorationLine: "line-through" },
  title: { color: colors.text, fontFamily: fontFamilies.display, fontSize: typography.titleSmall },
  today: { borderColor: colors.primary, borderWidth: 1.5 },
  week: { flexDirection: "row" },
  weekday: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    textAlign: "center",
    width: `${100 / 7}%`,
  },
});
