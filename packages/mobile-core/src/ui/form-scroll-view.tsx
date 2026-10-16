import type { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, ScrollView, type StyleProp, type ViewStyle } from "react-native";

/**
 * A form's scrolling column that moves up above the keyboard. Android draws
 * edge to edge (Expo 57), so the window no longer resizes for the keyboard
 * and the form pads itself there too (MOB-058). A `footer`, such as a
 * pinned submit button, rises with it.
 */
export function FormScrollView({
  children,
  contentContainerStyle,
  footer,
  keyboardVerticalOffset,
  style,
  testID,
}: PropsWithChildren<{
  contentContainerStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  keyboardVerticalOffset?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>) {
  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={[{ flex: 1 }, style]}
      testID={testID}
    >
      <ScrollView contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}
