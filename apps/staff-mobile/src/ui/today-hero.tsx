import { NextClassHero } from "@pilates/mobile-core";
import { View } from "react-native";

import { nextClassEyebrow } from "../trainer/next-class";

/**
 * Today's next class as the Palo de rosa hero (ClaseE, FIX-089). It keeps the
 * row's own test id, which Maestro flows tap, inside a `next-class-hero` frame.
 */
export function TodayHero({
  accessibilityLabel,
  attendees,
  detail,
  now,
  onPress,
  places,
  startsAt,
  testID,
  title,
}: {
  accessibilityLabel?: string;
  /** Who is coming, by initials (owner 2026-11-19). */
  attendees?: readonly string[];
  detail?: string;
  now: Date;
  onPress?: () => void;
  places?: string;
  startsAt: string;
  testID: string;
  title: string;
}) {
  const eyebrow = nextClassEyebrow(startsAt, now);
  return (
    <View testID="next-class-hero">
      <NextClassHero
        accessibilityLabel={
          accessibilityLabel === undefined ? undefined : `${accessibilityLabel}, ${eyebrow}`
        }
        attendees={attendees}
        detail={detail}
        eyebrow={eyebrow}
        onPress={onPress}
        places={places}
        testID={testID}
        title={title}
      />
    </View>
  );
}
