import {
  reportTrainerEquipmentIssue,
  useGetTrainerSessionRoster,
  useListTrainerSessionEquipment,
  type EquipmentDto,
} from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  EmptyState,
  FormField,
  fontFamilies,
  formatTimeRange,
  Heading,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { useIsTablet } from "../ui/use-is-tablet";

type Kind = EquipmentDto["kind"];

const singular: Record<Kind, string> = { reformer: "Reformer", cadillac: "Cadillac", mat: "Mat" };
const plural: Record<Kind, string> = { reformer: "Reformers", cadillac: "Cadillacs", mat: "Mats" };

const nameOf = (piece: EquipmentDto) => `${singular[piece.kind]} ${piece.number}`;

// The Session's own kind first, as the backend orders the pieces.
function groupsOf(items: EquipmentDto[]): { kind: Kind; items: EquipmentDto[] }[] {
  const kinds = [...new Set(items.map((piece) => piece.kind))];
  return kinds.map((kind) => ({ kind, items: items.filter((piece) => piece.kind === kind) }));
}

function EquipmentChip({
  piece,
  selected,
  onPress,
}: {
  piece: EquipmentDto;
  selected: boolean;
  onPress: () => void;
}) {
  const out = piece.status === "out_of_service";
  return (
    <Pressable
      accessibilityLabel={out ? `${nameOf(piece)}, fuera de servicio` : nameOf(piece)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {nameOf(piece)}
        {out ? (
          <Text style={[styles.chipOut, selected && styles.chipTextSelected]}>
            {" · fuera de servicio"}
          </Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

function Checkbox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="No se puede usar"
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.checkRow}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      <View style={styles.checkText}>
        <Text style={styles.checkLabel}>No se puede usar</Text>
        <Text style={styles.helper}>Márcalo si nadie debería usarlo hasta que lo arreglen.</Text>
      </View>
    </Pressable>
  );
}

// S26 (BKO-004): a Trainer tells the studio a machine of her Session's Branch
// is broken; the Administrator resolves it on the admin web (AW37).
export function ReportFaultScreen({ route }: { route: { params: { sessionId: string } } }) {
  const { sessionId } = route.params;
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useStaffFetcher();
  const tablet = useIsTablet();
  const roster = useGetTrainerSessionRoster(sessionId, { fetcher });
  const equipment = useListTrainerSessionEquipment(sessionId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const [chosen, setChosen] = useState<EquipmentDto | null>(null);
  const [description, setDescription] = useState("");
  const [outOfService, setOutOfService] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const session = roster.data?.status === 200 ? roster.data.data : undefined;
  const header = (
    <>
      <BackLink onPress={() => navigation.goBack()} />
      <Heading accessibilityLabel="Reportar una falla">Reportar una falla</Heading>
      {session === undefined ? null : (
        <BodyText>{`${session.classTypeName} · Sucursal ${session.branchName} · ${formatTimeRange(session.startsAt, session.endsAt)}`}</BodyText>
      )}
    </>
  );
  const column = [styles.screen, tablet && styles.tablet];

  if (sent !== null)
    return (
      <Screen style={column}>
        {header}
        <View style={styles.sent}>
          <Text style={styles.check}>✓</Text>
          <Text style={styles.sentTitle}>Gracias por avisar</Text>
          <BodyText>{`Administración ya puede ver la falla de ${sent}.`}</BodyText>
        </View>
        <PrimaryButton label="Volver a la lista" onPress={() => navigation.goBack()} />
      </Screen>
    );
  if (equipment.isPending)
    return (
      <Screen style={[column, styles.centered]}>
        <LoadingState label="Cargando equipos" />
      </Screen>
    );
  if (equipment.isError || equipment.data?.status !== 200)
    return (
      <Screen style={column}>
        {header}
        <QueryFailure
          label="No pudimos cargar los equipos."
          onRetry={() => void equipment.refetch()}
        />
      </Screen>
    );

  const items = equipment.data.data.items;
  if (items.length === 0)
    return (
      <Screen style={column}>
        {header}
        <EmptyState
          message="Administración todavía no cargó los equipos de esta sucursal."
          title="Sin equipos registrados"
          variant="plain"
        />
      </Screen>
    );

  const ready = chosen !== null && description.trim() !== "";
  const send = async () => {
    if (chosen === null) return;
    setBusy(true);
    setFailed(false);
    try {
      const response = await reportTrainerEquipmentIssue(
        sessionId,
        { equipmentId: chosen.id, description: description.trim(), outOfService },
        undefined,
        fetcher,
      );
      if (response.status !== 201) throw new Error("The fault report was refused");
      setSent(nameOf(chosen));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={column}>
      {header}
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>¿Qué equipo?</Text>
        {groupsOf(items).map((group) => (
          <View key={group.kind} style={styles.group}>
            <Text style={styles.groupLabel}>{plural[group.kind]}</Text>
            <View style={styles.chips}>
              {group.items.map((piece) => (
                <EquipmentChip
                  key={piece.id}
                  onPress={() => setChosen(piece)}
                  piece={piece}
                  selected={chosen?.id === piece.id}
                />
              ))}
            </View>
          </View>
        ))}
        <FormField
          label="¿Qué pasó?"
          maxLength={500}
          multiline
          onChangeText={setDescription}
          placeholder="Ej.: el resorte rojo se soltó"
          style={styles.textArea}
          value={description}
        />
        <Checkbox checked={outOfService} onPress={() => setOutOfService((value) => !value)} />
      </ScrollView>
      {failed ? (
        <BodyText accessibilityRole="alert">
          No pudimos enviar el reporte. Inténtalo de nuevo.
        </BodyText>
      ) : null}
      <PrimaryButton
        busy={busy}
        disabled={!ready}
        label="Enviar reporte"
        onPress={() => void send()}
        testID="report-fault-send"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: 6,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  centered: { alignItems: "center", justifyContent: "center" },
  check: { color: colors.success, fontSize: 40 },
  checkLabel: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
  checkRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, minHeight: 44 },
  checkText: { flexShrink: 1, gap: spacing.xs },
  chip: {
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  chipOut: { color: colors.error, fontSize: typography.note },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14 },
  chipTextSelected: { color: colors.white },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  eyebrow: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.7,
    textTransform: "uppercase",
  },
  form: { gap: spacing.lg, paddingBottom: spacing.lg },
  group: { gap: spacing.sm },
  groupLabel: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  helper: { color: colors.textSubtle, fontFamily: fontFamilies.body, fontSize: typography.note },
  screen: { gap: spacing.md },
  sent: { alignItems: "center", flex: 1, gap: spacing.md, justifyContent: "center" },
  sentTitle: { color: colors.text, fontFamily: fontFamilies.heading, fontSize: 21 },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
  textArea: { minHeight: 104, textAlignVertical: "top" },
  tick: { color: colors.white, fontSize: 14 },
});
