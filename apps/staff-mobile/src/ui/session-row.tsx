import { ClassRow, ExceptionPill } from "@pilates/mobile-core";
import type { ReactNode } from "react";

/**
 * A class on a staff list (Rosa Emma): the shared class row, the type bar and
 * the time in Lora, the class over one quiet line, and the places «N de M». Only
 * an exception («Completa», «Ya reservada») takes a pill, in their place.
 * Put rows in a `ClassList`, or pass `standalone` for a row on its own card.
 */
export function SessionRow({
  accessibilityLabel,
  exception,
  onPress,
  places,
  standalone = false,
  subtitle,
  subtitleLead,
  testID,
  time,
  title,
}: {
  accessibilityLabel?: string;
  exception?: string;
  onPress?: () => void;
  places?: string;
  standalone?: boolean;
  subtitle: string;
  /** The Trainer's 20 px face before the quiet line (FIX-041, follow-up 242). */
  subtitleLead?: ReactNode;
  testID?: string;
  time: string;
  title: string;
}) {
  return (
    <ClassRow
      accessibilityLabel={accessibilityLabel}
      detail={subtitle}
      detailLead={subtitleLead}
      end={exception === undefined ? undefined : <ExceptionPill>{exception}</ExceptionPill>}
      onPress={onPress}
      places={places}
      standalone={standalone}
      testID={testID}
      time={time}
      title={title}
    />
  );
}
