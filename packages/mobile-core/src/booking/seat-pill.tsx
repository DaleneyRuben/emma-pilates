import { Text } from "../ui/text";

/**
 * The places of a class (follow-up 84, MOB-047; FIX-089): a normal state, so
 * plain bold text, never a pill. «full» is kept for callers; the words say it.
 */
export function SeatPill({
  children,
  testID = "seat-pill",
}: {
  children: string;
  full?: boolean;
  testID?: string;
}) {
  return (
    <Text testID={testID} variant="pastilla">
      {children}
    </Text>
  );
}
