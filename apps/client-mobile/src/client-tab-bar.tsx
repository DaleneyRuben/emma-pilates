import { colors, shadows, spacing, Text, useIsTablet } from "@pilates/mobile-core";
import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CommonActions } from "@react-navigation/native";
import { Pressable, StyleSheet, View } from "react-native";

/**
 * The Client tab bar: React Navigation's own on a phone; on a tablet
 * (follow-up 289) an 84 pt white bar with the four tabs centred in one row,
 * each icon beside its label, the open tab on the 600 pill.
 */
export function ClientTabBar(props: BottomTabBarProps) {
  const tablet = useIsTablet();
  if (!tablet) return <BottomTabBar {...props} />;
  return <TabletTabBar {...props} />;
}

function TabletTabBar({ descriptors, insets, navigation, state }: BottomTabBarProps) {
  const focusedOptions = descriptors[state.routes[state.index]!.key]!.options;
  const hidden = (focusedOptions.tabBarStyle as { display?: string } | undefined)?.display;
  if (hidden === "none") return null;

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
      testID="tablet-tab-bar"
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]!;
        const focused = state.index === index;
        const tint = focused ? colors.onPrimary : colors.text;
        const onPress = () => {
          const event = navigation.emit({
            canPreventDefault: true,
            target: route.key,
            type: "tabPress",
          });
          if (!focused && !event.defaultPrevented) {
            navigation.dispatch({
              ...CommonActions.navigate(route.name, route.params),
              target: state.key,
            });
          }
        };
        return (
          <Pressable
            accessibilityLabel={options.tabBarAccessibilityLabel}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            key={route.key}
            onLongPress={() => navigation.emit({ target: route.key, type: "tabLongPress" })}
            onPress={onPress}
            style={[styles.tab, focused && styles.open]}
            testID={options.tabBarButtonTestID}
          >
            {options.tabBarIcon?.({
              // React Navigation's icon contract names the icon's tint `color`.
              // eslint-disable-next-line no-restricted-syntax
              color: tint,
              focused,
              size: 22,
            })}
            <Text numberOfLines={1} tone={focused ? "onDark" : "ink"} variant="boton-chico">
              {options.title ?? route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    ...shadows.tabBar,
    backgroundColor: colors.card,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center",
    paddingTop: spacing.md,
  },
  open: { backgroundColor: colors.primary },
  tab: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.xlSm,
  },
});
