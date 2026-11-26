import { useState, type ReactNode } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, View } from "react-native";

import { Glyph } from "./glyph";
import { Text } from "./text";
import { colors } from "./tokens";

const actionWidth = 96;
// A drag shorter than this, or more vertical than horizontal, is a tap or a
// scroll, never the swipe.
const dragThreshold = 12;

function createSwipe() {
  const offset = new Animated.Value(0);
  let opened = false;
  const settle = (open: boolean) => {
    opened = open;
    Animated.spring(offset, {
      bounciness: 0,
      toValue: open ? -actionWidth : 0,
      useNativeDriver: true,
    }).start();
  };
  const responder = PanResponder.create({
    onMoveShouldSetPanResponder: (_event, { dx, dy }) =>
      Math.abs(dx) > dragThreshold && Math.abs(dx) > Math.abs(dy) * 1.5,
    onPanResponderMove: (_event, { dx }) => {
      const start = opened ? -actionWidth : 0;
      offset.setValue(Math.min(0, Math.max(-actionWidth * 1.4, start + dx)));
    },
    onPanResponderRelease: (_event, { dx, vx }) => {
      const start = opened ? -actionWidth : 0;
      settle(start + dx < -actionWidth / 2 || vx < -0.5);
    },
    onPanResponderTerminate: () => settle(opened),
  });
  return { offset, responder };
}

/**
 * Walkthrough n.º 10 (C19c, E-F15): swiping the row to the left uncovers a
 * 96 pt «Borrar» on the 600 ground; tapping it removes the row. Screen
 * readers reach the same «Borrar» as the row's action. Built on React
 * Native's own responder, so it needs no native module (an OTA carries it).
 */
export function SwipeToRemove({
  children,
  onRemove,
  testID,
}: {
  children: ReactNode;
  onRemove: () => void;
  testID?: string;
}) {
  // Built once: the responder keeps the row's offset and whether it is open.
  const [{ offset, responder }] = useState(createSwipe);

  return (
    <View
      accessibilityActions={[{ name: "remove", label: "Borrar" }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === "remove") onRemove();
      }}
      style={styles.frame}
      testID={testID}
    >
      <Pressable
        accessibilityLabel="Borrar"
        accessibilityRole="button"
        // Hidden from screen readers: the row's action says the same.
        importantForAccessibility="no-hide-descendants"
        onPress={onRemove}
        style={styles.action}
      >
        <Glyph color={colors.onEmphasis} name="trash" size={22} strokeWidth={1.7} />
        <Text tone="onDark" variant="boton-chico">
          Borrar
        </Text>
      </Pressable>
      <Animated.View
        style={[styles.content, { transform: [{ translateX: offset }] }]}
        {...responder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    backgroundColor: colors.emphasis,
    bottom: 0,
    gap: 4,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: 0,
    width: actionWidth,
  },
  content: { backgroundColor: colors.card },
  frame: { overflow: "hidden", position: "relative" },
});
