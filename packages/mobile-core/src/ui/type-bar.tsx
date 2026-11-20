import { StyleSheet, View } from "react-native";

import { colors } from "./tokens";

/**
 * A class type's colour (Rosa Emma): Reformer 600, Mat 300, Cadillac 500, any
 * other type 400. The type is read from its name, as every surface writes it.
 */
export function classTypeColor(name: string): string {
  if (/reformer/i.test(name)) return colors.typeReformer;
  if (/cadillac/i.test(name)) return colors.typeCadillac;
  if (/\bmat\b/i.test(name)) return colors.typeMat;
  return colors.typeOther;
}

/** The 5 pt bar at the start of a class row, in its type's colour. */
export function TypeBar({ name, testID = "type-bar" }: { name: string; testID?: string }) {
  return <View style={[styles.bar, { backgroundColor: classTypeColor(name) }]} testID={testID} />;
}

const styles = StyleSheet.create({
  bar: { alignSelf: "stretch", borderRadius: 3, flexShrink: 0, minHeight: 36, width: 5 },
});
