import type { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export function FormScrollView({
  children,
  contentContainerStyle,
  keyboardVerticalOffset,
  style,
  testID,
}: PropsWithChildren<{
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={[{ flex: 1 }, style]}
      testID={testID}
    >
      <ScrollView contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
