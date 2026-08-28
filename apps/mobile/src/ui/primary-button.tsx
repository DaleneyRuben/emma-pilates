import { Pressable, StyleSheet, Text, type GestureResponderEvent } from 'react-native';

import { colors, radii, spacing, typography } from './tokens';

type PrimaryButtonProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabledButton]}
    >
      <Text style={[styles.label, disabled && styles.disabledLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  disabledButton: {
    backgroundColor: colors.disabledBackground,
  },
  label: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '500',
  },
  disabledLabel: {
    color: colors.disabledText,
  },
});
