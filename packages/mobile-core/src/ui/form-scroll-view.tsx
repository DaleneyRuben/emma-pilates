import { useEffect, useRef, type PropsWithChildren, type ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { bandScroll } from "./screen";

/**
 * A form's scrolling column that moves up above the keyboard. Android draws
 * edge to edge (Expo 57), so the window no longer resizes for the keyboard
 * and the form pads itself there too (MOB-058). A `footer`, such as a
 * pinned submit button, rises with it.
 *
 * `revealEndWithKeyboard` is for a form that ends with its only text field
 * and a line under it (walkthrough finding 96, Enviar comentarios): the system
 * keeps the caret in view, not that line, so once the keyboard is up, and
 * whenever the column shrinks while it is, the form scrolls to its end.
 */
export function FormScrollView({
  children,
  contentContainerStyle,
  footer,
  keyboardVerticalOffset,
  revealEndWithKeyboard = false,
  style,
  testID,
}: PropsWithChildren<{
  contentContainerStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  keyboardVerticalOffset?: number;
  revealEndWithKeyboard?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>) {
  const scroller = useRef<ScrollView>(null);
  const keyboardUp = useRef(false);

  useEffect(() => {
    if (!revealEndWithKeyboard) return undefined;
    const shown = Keyboard.addListener("keyboardDidShow", () => {
      keyboardUp.current = true;
      scroller.current?.scrollToEnd({ animated: true });
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => {
      keyboardUp.current = false;
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [revealEndWithKeyboard]);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={[{ flex: 1 }, style]}
      testID={testID}
    >
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        onLayout={
          revealEndWithKeyboard
            ? () => {
                if (keyboardUp.current) scroller.current?.scrollToEnd({ animated: true });
              }
            : undefined
        }
        ref={scroller}
        // A header band inside the form reaches the screen's edges.
        style={bandScroll}
      >
        {children}
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}
