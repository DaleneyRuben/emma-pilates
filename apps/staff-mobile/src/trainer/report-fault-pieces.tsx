import type { EquipmentDto } from "@pilates/api-contracts";
import { chipStyles, colors, radii, spacing, surfaces, Text } from "@pilates/mobile-core";
import { Pressable, StyleSheet, Switch, View } from "react-native";

import { CardLabel } from "../ui/card-pieces";

// S26's pieces (FIX-067, FIX-076): the labelled numbered tiles and the switch of a per-unit
// type, and the damage counter of a by-quantity type. Each is its own white card (I10, I11).

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
    <View style={styles.card}>
      <CardLabel>Número del equipo</CardLabel>
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
              <Text tone={selected ? "onDark" : "ink"} variant="titulo-fila">
                {`N.º ${piece.number}`}
              </Text>
              {out ? (
                <Text style={styles.tileOut} tone={selected ? "onDark" : "ink"} variant="pastilla">
                  fuera de servicio
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {units.length === 1 ? <Text variant="secundario">Es el único de esta sucursal.</Text> : null}
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
    <Text
      accessibilityLiveRegion="polite"
      style={styles.missing}
      testID="report-fault-missing"
      variant="secundario"
    >
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
      <Text variant="boton">{symbol}</Text>
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
        <Text variant="cuerpo">No hay ninguno que se pueda usar: ya están todos reportados.</Text>
      </View>
    );
  return (
    <View style={styles.card}>
      <Text variant="titulo-fila">{`Hay ${usable} que se pueden usar`}</Text>
      <Text variant="cuerpo">¿Cuántos se dañaron?</Text>
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
          variant="cifra-grande"
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
        <Text variant="titulo-fila">No se puede usar</Text>
        <Text variant="secundario">Nadie debería usarlo hasta que lo arreglen.</Text>
      </View>
      <Switch
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onValueChange={onChange}
        thumbColor={colors.white}
        trackColor={{ false: colors.band, true: colors.primary }}
        value={value}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lg },
  count: { minWidth: 40, textAlign: "center" },
  // Board I11: the stepper's square buttons, white with a 600 outline.
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
  // The system's disabled look (audit c3): the 50 ground and the 400 outline,
  // the symbol in full ink; never dimmed.
  stepDisabled: { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderStrong },
  stepper: { alignItems: "center", flexDirection: "row", gap: spacing.xlSm },
  switchRow: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  switchText: { flex: 1, gap: spacing.xxs },
  missing: { textAlign: "center" },
  tile: {
    alignItems: "center",
    borderRadius: radii.inset,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.smd,
    width: 72,
  },
  tileOut: { textAlign: "center" },
  tileWithNote: { height: 58 },
  tiles: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
