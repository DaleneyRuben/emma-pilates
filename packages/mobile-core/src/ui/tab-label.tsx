import { Text } from "./text";

/**
 * A tab's label in both apps (follow-up 285): `pastilla`, white on the open
 * tab's 600 pill and ink on the others. The open tab changes its ground, never
 * its weight (rule 4), and the label never shrinks under 12 pt.
 */
export function TabLabel({ children, focused }: { children: string; focused: boolean }) {
  return (
    <Text numberOfLines={1} tone={focused ? "onDark" : "ink"} variant="pastilla">
      {children}
    </Text>
  );
}
