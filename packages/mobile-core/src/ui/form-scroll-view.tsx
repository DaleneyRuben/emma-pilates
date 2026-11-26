import { useEffect, useRef, type PropsWithChildren, type ReactNode, type RefObject } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useBandScroll } from "./screen";

/**
 * A form's scrolling column that moves up above the keyboard. Android draws
 * edge to edge (Expo 57), so the window no longer resizes for the keyboard
 * and the form pads itself there too (MOB-058). A `footer`, such as a
 * pinned submit button, rises with it.
 *
 * `revealEndWithKeyboard` is for a form that ends with its only text field
 * and a line under it (walkthrough finding 96, Enviar comentarios): the system
 * keeps the caret in view, not that line, so once the keyboard is up, and
 * whenever the column shrinks while it is, the form scrolls to its end. A
 * form may turn it on only while its last field has the focus.
 */
export function FormScrollView({
  band = false,
  children,
  contentContainerStyle,
  footer,
  keyboardVerticalOffset,
  revealEndWithKeyboard = false,
  scrollRef,
  style,
  testID,
}: PropsWithChildren<{
  /** The header band scrolls inside the form (sign-in): reach the screen's edges. */
  band?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  keyboardVerticalOffset?: number;
  revealEndWithKeyboard?: boolean;
  /** Lets the form scroll back to a field it marks (walkthrough n.º 15). */
  scrollRef?: RefObject<ScrollView | null>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>) {
  const ownScroller = useRef<ScrollView>(null);
  const scroller = scrollRef ?? ownScroller;
  const bleed = useBandScroll();
  const keyboardUp = useRef(false);
  const reveal = useRef(revealEndWithKeyboard);
  const revealEnd = () => {
    if (reveal.current && keyboardUp.current) scroller.current?.scrollToEnd({ animated: true });
  };

  // The flag may turn on while the keyboard is already up, as when «Crea tu
  // cuenta» moves from a field to its last one, the referral code (C01b3).
  useEffect(() => {
    reveal.current = revealEndWithKeyboard;
    if (revealEndWithKeyboard && keyboardUp.current) {
      scroller.current?.scrollToEnd({ animated: true });
    }
  }, [revealEndWithKeyboard, scroller]);

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () => {
      keyboardUp.current = true;
      if (reveal.current) scroller.current?.scrollToEnd({ animated: true });
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => {
      keyboardUp.current = false;
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [scroller]);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={[{ flex: 1 }, style]}
      testID={testID}
    >
      <ScrollView
        contentContainerStyle={
          band ? [bleed.contentContainerStyle, contentContainerStyle] : contentContainerStyle
        }
        keyboardShouldPersistTaps="handled"
        // A line that appears under the last field, such as «Código de
        // Lucía», grows the content after the keyboard is up.
        onContentSizeChange={revealEndWithKeyboard ? revealEnd : undefined}
        onLayout={revealEndWithKeyboard ? revealEnd : undefined}
        ref={scroller}
        style={band ? bleed.style : undefined}
      >
        {children}
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}
