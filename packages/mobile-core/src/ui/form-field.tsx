import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";

import { fontFamilies } from "./fonts";
import { Glyph } from "./glyph";
import { colors, radii, spacing, typography } from "./tokens";

type FormFieldProps = TextInputProps & {
  error?: string;
  label: string;
};

export function FormField({ error, label, secureTextEntry, style, ...inputProps }: FormFieldProps) {
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
          placeholderTextColor={colors.textSubtle}
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
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
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
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  inputError: {
    borderColor: colors.error,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    textTransform: "uppercase",
  },
  passwordInput: {
    paddingRight: 52,
  },
});
