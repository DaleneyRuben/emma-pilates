import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import logo from "../../assets/emma-logo.png";

// Design follow-up 94: nothing for 400 ms, a 300 ms fade, then one breath every
// 2.8 s between the rest and the top; still under Reduce Motion.
const appearDelayMilliseconds = 400;
const fadeInMilliseconds = 300;
const halfBreathMilliseconds = 1400;
const rest = { opacity: 0.55, scale: 0.96 };
const top = { opacity: 1, scale: 1 };

// The logo is 800 × 333; tablets start at the Staff app's 768 pt split width.
const logoAspect = 333 / 800;
const tabletMinimumWidth = 768;

/**
 * A screen's first load (MOB-061): only the studio's logo, centred in the
 * space it is given, announced as progress with the screen's Spanish label.
 */
export function LoadingState({ label }: { label: string }) {
  const { width: windowWidth } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(rest.scale));

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), appearDelayMilliseconds);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible || reduceMotion === undefined) return;
    if (reduceMotion) {
      opacity.setValue(top.opacity);
      scale.setValue(top.scale);
      return;
    }
    const animation = Animated.sequence([
      Animated.timing(opacity, {
        toValue: rest.opacity,
        duration: fadeInMilliseconds,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([breathe(opacity, scale, top), breathe(opacity, scale, rest)]),
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, [opacity, reduceMotion, scale, visible]);

  const logoWidth = windowWidth >= tabletMinimumWidth ? 300 : 240;
  return (
    <View accessibilityLabel={label} accessibilityRole="progressbar" accessible style={styles.area}>
      {visible && reduceMotion !== undefined ? (
        // The accessible area above is the one element screen readers reach.
        <Animated.Image
          resizeMode="contain"
          source={logo}
          style={{
            width: logoWidth,
            height: Math.round(logoWidth * logoAspect),
            opacity,
            transform: [{ scale }],
          }}
          testID="loading-state-logo"
        />
      ) : null}
    </View>
  );
}

function breathe(
  opacity: Animated.Value,
  scale: Animated.Value,
  to: { opacity: number; scale: number },
): Animated.CompositeAnimation {
  const timing = { duration: halfBreathMilliseconds, easing: Easing.inOut(Easing.ease) };
  return Animated.parallel([
    Animated.timing(opacity, { ...timing, toValue: to.opacity, useNativeDriver: true }),
    Animated.timing(scale, { ...timing, toValue: to.scale, useNativeDriver: true }),
  ]);
}

// `undefined` until the system answers, so the logo never starts breathing
// for someone who asked for less motion.
function useReduceMotion(): boolean | undefined {
  const [reduceMotion, setReduceMotion] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) =>
      setReduceMotion(enabled),
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return reduceMotion;
}

const styles = StyleSheet.create({
  area: { flex: 1, alignItems: "center", justifyContent: "center" },
});
