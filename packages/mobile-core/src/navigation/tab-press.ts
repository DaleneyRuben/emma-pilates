/** Walkthrough n.º 28 (not built yet). */
export function popTabToRootOnPress(options: {
  navigation: { dispatch: (action: object) => void };
  route: { state?: { index?: number; key?: string } };
}) {
  return { tabPress: () => void options };
}
