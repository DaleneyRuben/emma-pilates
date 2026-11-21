import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import logo from "../../assets/emma-logo.png";
import { colors } from "./tokens";

// Design follow-up 94: nothing for 400 ms, a 300 ms fade, then one breath every
// 2.8 s between the rest and the top; still under Reduce Motion.
const appearDelayMilliseconds = 400;
const fadeInMilliseconds = 300;
const halfBreathMilliseconds = 1400;
// Follow-up 287: the rest keeps the logo at 0.8, never a washed-out grey.
const rest = { opacity: 0.8, scale: 0.96 };
const top = { opacity: 1, scale: 1 };

// The logo is 1312 × 565 (the owner's 2026-11-06 file, background removed); tablets start at the Staff app's 768 pt split width.
const logoAspect = 565 / 1312;
const tabletMinimumWidth = 768;
const haloToLogo = 1.25;

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

  // Follow-ups 286 and 287 (E-A12, Rosa Emma option A): the logo on a white
  // halo over the screen's own Rosa 100; the halo breathes with the logo as one piece.
  const logoWidth = windowWidth >= tabletMinimumWidth ? 300 : 240;
  const halo = Math.round(logoWidth * haloToLogo);
  return (
    // The area never collapses below the halo, so a parent that does not grow
    // (the Trainer's Agenda under its week card) cannot push it onto content.
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessible
      style={[styles.area, { minHeight: halo }]}
    >
      {visible && reduceMotion !== undefined ? (
        // The accessible area above is the one element screen readers reach.
        <Animated.View
          style={[
            styles.halo,
            { borderRadius: halo / 2, height: halo, width: halo },
            { opacity, transform: [{ scale }] },
          ]}
          testID="loading-state-halo"
        >
          <Image
            resizeMode="contain"
            source={logo}
            style={{ width: logoWidth, height: Math.round(logoWidth * logoAspect) }}
            testID="loading-state-logo"
          />
        </Animated.View>
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
  halo: {
    alignItems: "center",
    // Follow-up 287: white, solid to 52 % of the radius, a soft edge by 70 %,
    // so it reads clearly on the screen's Rosa 100.
    experimental_backgroundImage: `radial-gradient(circle, ${colors.card} 0%, ${colors.card} 52%, rgba(255, 251, 251, 0.6) 60%, rgba(255, 251, 251, 0) 70%)`,
    justifyContent: "center",
  },
});
