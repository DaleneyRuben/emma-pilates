import type { EquipmentDto } from "@pilates/api-contracts";
import { chipStyles, colors, fontFamilies, radii, spacing, typography } from "@pilates/mobile-core";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

// S26's pieces (FIX-067, FIX-076): the labelled numbered tiles and the switch of a per-unit
// type, and the damage counter of a by-quantity type.

export const unitName = (piece: EquipmentDto) => `${piece.typeName} ${piece.number}`;

export function UnitTiles({
  chosenId,
  label,
  onChoose,
  units,
}: {
  chosenId: string | null;
  label: string;
  onChoose: (piece: EquipmentDto) => void;
  units: EquipmentDto[];
}) {
  return (
    <View style={styles.unitGroup}>
      <Text accessibilityRole="header" style={styles.unitHeading}>
        Número del equipo
      </Text>
      <View accessibilityLabel={label} style={styles.tiles}>
        {units.map((piece) => {
          const selected = piece.id === chosenId;
          const out = piece.status === "out_of_service";
          return (
            <Pressable
              accessibilityLabel={out ? `${unitName(piece)}, fuera de servicio` : unitName(piece)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={piece.id}
              onPress={() => onChoose(piece)}
              style={[
                styles.tile,
                chipStyles.box,
                out && styles.tileWithNote,
                selected && chipStyles.boxSelected,
              ]}
            >
              <Text style={[styles.tileNumber, selected && chipStyles.labelSelected]}>
                {`N.º ${piece.number}`}
              </Text>
              {out ? (
                <Text style={[styles.tileOut, selected && styles.onSelected]}>
                  fuera de servicio
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {units.length === 1 ? <Text style={styles.helper}>Es el único de esta sucursal.</Text> : null}
    </View>
  );
}

// FIX-076: what the disabled «Enviar reporte» still needs, or null when ready.
export function missingStep({
  described,
  hasUnit,
  typeName,
  usable,
}: {
  described: boolean;
  hasUnit: boolean | null;
  typeName: string;
  usable: number;
}) {
  if (hasUnit === null) {
    if (usable === 0) return "No hay ninguno que se pueda usar.";
    return described ? null : "Para enviarlo, cuenta qué pasó.";
  }
  if (!hasUnit && !described) return "Para enviarlo, elige el número y cuenta qué pasó.";
  if (!hasUnit) return `Para enviarlo, elige el número del ${typeName}.`;
  return described ? null : "Para enviarlo, cuenta qué pasó.";
}

export function MissingStep({ message }: { message: string | null }) {
  if (message === null) return null;
  return (
    <Text accessibilityLiveRegion="polite" style={styles.missing} testID="report-fault-missing">
      {message}
    </Text>
  );
}

function StepButton({
  disabled,
  label,
  onPress,
  symbol,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  symbol: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={[styles.step, disabled && styles.stepDisabled]}
    >
      <Text style={styles.stepSymbol}>{symbol}</Text>
    </Pressable>
  );
}

export function DamageCounter({
  count,
  onChange,
  usable,
}: {
  count: number;
  onChange: (count: number) => void;
  usable: number;
}) {
  if (usable === 0)
    return (
      <View style={styles.card}>
        <Text style={styles.muted}>
          No hay ninguno que se pueda usar: ya están todos reportados.
        </Text>
      </View>
    );
  return (
    <View style={styles.card}>
      <Text style={styles.muted}>{`Hay ${usable} que se pueden usar`}</Text>
      <Text style={styles.question}>¿Cuántos se dañaron?</Text>
      <View style={styles.stepper}>
        <StepButton
          disabled={count <= 1}
          label="Uno menos"
          onPress={() => onChange(count - 1)}
          symbol="−"
        />
        <Text
          accessibilityLabel={`${count} dañados`}
          accessibilityLiveRegion="polite"
          style={styles.count}
          testID="report-fault-count"
        >
          {String(count)}
        </Text>
        <StepButton
          disabled={count >= usable}
          label="Uno más"
          onPress={() => onChange(count + 1)}
          symbol="+"
        />
      </View>
    </View>
  );
}

export function OutOfServiceSwitch({
  onChange,
  value,
}: {
  onChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel="No se puede usar"
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.switchRow}
    >
      <View style={styles.switchText}>
        <Text style={styles.switchLabel}>No se puede usar</Text>
        <Text style={styles.helper}>Nadie debería usarlo hasta que lo arreglen.</Text>
      </View>
      <Switch
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onValueChange={onChange}
        thumbColor={colors.white}
        trackColor={{ false: colors.hairline, true: colors.primary }}
        value={value}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    gap: spacing.md,
    padding: spacing.lg,
  },
  count: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 30,
    minWidth: 40,
    textAlign: "center",
  },
  helper: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  muted: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 14 },
  onSelected: { color: colors.onPrimary },
  question: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: 16 },
  // FIX-089: the secondary button, Crema with a Rosa profundo outline.
  step: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.button,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  stepDisabled: { opacity: 0.4 },
  stepSymbol: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 24,
    fontWeight: "600",
  },
  stepper: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  switchLabel: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: 16 },
  switchRow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.card,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  switchText: { flex: 1, gap: spacing.xxs },
  missing: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    textAlign: "center",
  },
  tile: {
    alignItems: "center",
    borderRadius: radii.inset,
    height: 44,
    justifyContent: "center",
    minWidth: 72,
    paddingHorizontal: spacing.mdLg,
  },
  tileNumber: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.body,
    fontWeight: "500",
  },
  tileOut: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 12 },
  tileWithNote: { height: 52 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  unitGroup: { gap: spacing.sm },
  unitHeading: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.54,
    textTransform: "uppercase",
  },
});
