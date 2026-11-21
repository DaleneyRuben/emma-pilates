import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";

import { fieldTextProps } from "./field-text";
import { Glyph } from "./glyph";
import { InlineError } from "./inline-error";
import { Text } from "./text";
import { colors, radii, spacing } from "./tokens";

const dotsOnly = /^[\s•·*.●]+$/;

type FormFieldProps = TextInputProps & {
  error?: string;
  /** An example or a rule under the field, «Ej.: …»; never in the placeholder (FormB). */
  hint?: string;
  label: string;
  /** Says «(opcional)» after the label, at regular weight (FormB). */
  optional?: boolean;
};

/**
 * A labelled field (FormB, follow-up 285): the label in `compacto-600`, the
 * text in `cuerpo` (italic while empty), the hint and the error in
 * `secundario`, the error announced as an alert.
 */
export function FormField({
  error,
  hint,
  label,
  optional = false,
  placeholder,
  secureTextEntry,
  style,
  ...inputProps
}: FormFieldProps) {
  const [shown, setShown] = useState(false);
  const isPassword = secureTextEntry === true;
  const disabled = inputProps.editable === false;
  // An uncontrolled field keeps its own text: follow it so the example's
  // italic leaves once something is typed (follow-up 285 rule 7).
  const [typed, setTyped] = useState(inputProps.defaultValue ?? "");
  const fieldText = fieldTextProps(inputProps.value ?? typed);

  return (
    <View style={styles.field}>
      <Text variant="compacto-600">
        {label}
        {optional ? <Text variant="compacto"> (opcional)</Text> : null}
      </Text>
      <View>
        <TextInput
          {...inputProps}
          onChangeText={(text) => {
            setTyped(text);
            inputProps.onChangeText?.(text);
          }}
          maxFontSizeMultiplier={fieldText.maxFontSizeMultiplier}
          accessibilityLabel={optional ? `${label} (opcional)` : label}
          // A password field never shows dots as its placeholder (FIX-089).
          placeholder={isPassword && dotsOnly.test(placeholder ?? "") ? undefined : placeholder}
          placeholderTextColor={fieldText.placeholderTextColor}
          secureTextEntry={isPassword && !shown}
          // The field's text last: a caller's style places the box, never
          // its face, size or colour (follow-up 285).
          style={[
            styles.input,
            isPassword ? styles.passwordInput : null,
            error === undefined ? null : styles.inputError,
            style,
            fieldText.style,
          ]}
        />
        {isPassword ? (
          <Pressable
            accessibilityLabel={shown ? "Ocultar contraseña" : "Mostrar contraseña"}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => setShown((current) => !current)}
            style={styles.eye}
          >
            <Glyph
              color={disabled ? colors.iconQuiet : colors.textMuted}
              name={shown ? "eyeOff" : "eye"}
              size={20}
            />
          </Pressable>
        ) : null}
      </View>
      {hint === undefined ? null : <Text variant="secundario">{hint}</Text>}
      {error === undefined ? null : <InlineError field>{error}</InlineError>}
    </View>
  );
}

const styles = StyleSheet.create({
  eye: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    marginTop: -22,
    position: "absolute",
    right: 4,
    top: "50%",
    width: 44,
  },
  field: {
    gap: spacing.smd,
  },
  // Rosa Emma: white, a 1.5 pt 400 outline, radius 14, 52 pt high.
  input: {
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderRadius: radii.inset,
    borderWidth: 1.5,
    minHeight: 52,
    paddingHorizontal: spacing.mdLg,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  passwordInput: {
    paddingRight: 52,
  },
});
