import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";

import { fontFamilies } from "./fonts";
import { Glyph } from "./glyph";
import { colors, spacing, typography } from "./tokens";

type FormFieldProps = TextInputProps & {
  error?: string;
  /** An example or a rule under the field, «Ej.: …»; never in the placeholder (FormB). */
  hint?: string;
  label: string;
};

export function FormField({
  error,
  hint,
  label,
  placeholder,
  secureTextEntry,
  style,
  ...inputProps
}: FormFieldProps) {
  const [shown, setShown] = useState(false);
  const isPassword = secureTextEntry === true;
  const disabled = inputProps.editable === false;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          // A password field never shows dots as its placeholder (FIX-089).
          placeholder={isPassword ? undefined : placeholder}
          placeholderTextColor={colors.iconQuiet}
          secureTextEntry={isPassword && !shown}
          style={[
            styles.input,
            isPassword ? styles.passwordInput : null,
            error === undefined ? null : styles.inputError,
            style,
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
      {hint === undefined ? null : <Text style={styles.hint}>{hint}</Text>}
      {error === undefined ? null : (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    color: colors.errorText,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.note,
    fontWeight: "700",
    lineHeight: 20,
  },
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
  hint: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    lineHeight: 18,
  },
  // FormB: Crema, a 1 pt Arcilla outline, radius 10, at least 48 pt to touch.
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.mdLg,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  label: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
    fontWeight: "600",
  },
  passwordInput: {
    paddingRight: 52,
  },
});
