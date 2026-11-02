import {
  reportTrainerEquipmentIssue,
  useGetTrainerSessionRoster,
  useListTrainerSessionEquipment,
  type EquipmentDto,
} from "@pilates/api-contracts";
import {
  colors,
  EmptyState,
  FormField,
  FormScrollView,
  fontFamilies,
  formatTimeRange,
  LoadingState,
  NoticeRow,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  SectionTitle,
  SegmentedTabs,
  spacing,
  StateScreen,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
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

function EquipmentTile({
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
      style={[styles.tile, selected && styles.tileSelected]}
    >
      <Text style={[styles.tileNumber, selected && styles.onSelected]}>{String(piece.number)}</Text>
      {out ? (
        <Text style={[styles.tileOut, selected && styles.onSelected]}>fuera de servicio</Text>
      ) : null}
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
  const [kind, setKind] = useState<Kind | null>(null);
  const [chosen, setChosen] = useState<EquipmentDto | null>(null);
  const [description, setDescription] = useState("");
  const [outOfService, setOutOfService] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const session = roster.data?.status === 200 ? roster.data.data : undefined;
  const back =
    session === undefined
      ? "Volver"
      : `${session.classTypeName} · ${formatTimeRange(session.startsAt, session.endsAt).split(" – ")[0]}`;
  const header = (
    <BackBar
      back={back}
      onBack={() => navigation.goBack()}
      subtitle={session === undefined ? undefined : `Equipos de la sucursal ${session.branchName}`}
      title="Reportar una falla"
    />
  );
  const column = [styles.screen, tablet && styles.tablet];

  if (sent !== null)
    return (
      <Screen style={column}>
        <StateScreen
          icon="check"
          note={`Administración ya puede ver la falla del ${sent} y lo marcará cuando esté resuelto.`}
          primaryAction={{ label: "Volver a la lista", onPress: () => navigation.goBack() }}
          title="Gracias por avisar"
        />
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

  const groups = groupsOf(items);
  const shownKind = kind ?? groups[0]?.kind ?? "reformer";
  const shown = groups.find((group) => group.kind === shownKind)?.items ?? [];
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
      <FormScrollView
        contentContainerStyle={styles.form}
        footer={
          <View style={styles.footer}>
            {failed ? (
              <NoticeRow message="No pudimos enviar el reporte. Inténtalo de nuevo." />
            ) : null}
            <PrimaryButton
              busy={busy}
              disabled={!ready}
              label="Enviar reporte"
              onPress={() => void send()}
              testID="report-fault-send"
            />
          </View>
        }
      >
        {header}
        <View style={styles.group}>
          <SectionTitle>¿Qué equipo?</SectionTitle>
          {groups.length > 1 ? (
            <SegmentedTabs
              accessibilityLabel="Tipo de equipo"
              onSelect={setKind}
              options={groups.map((group) => ({ key: group.kind, label: plural[group.kind] }))}
              selected={shownKind}
            />
          ) : null}
          <View accessibilityLabel={plural[shownKind]} style={styles.tiles}>
            {shown.map((piece) => (
              <EquipmentTile
                key={piece.id}
                onPress={() => setChosen(piece)}
                piece={piece}
                selected={chosen?.id === piece.id}
              />
            ))}
          </View>
        </View>
        <FormField
          label="¿Qué pasó?"
          maxLength={500}
          multiline
          onChangeText={setDescription}
          placeholder="Ej.: el resorte rojo se soltó"
          style={styles.textArea}
          testID="report-fault-description"
          value={description}
        />
        <Pressable
          accessibilityLabel="No se puede usar"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: outOfService }}
          onPress={() => setOutOfService((value) => !value)}
          style={styles.switchRow}
        >
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>No se puede usar</Text>
            <Text style={styles.helper}>Nadie debería usarlo hasta que lo arreglen.</Text>
          </View>
          <Switch
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onValueChange={setOutOfService}
            thumbColor={colors.white}
            trackColor={{ false: colors.hairline, true: colors.primary }}
            value={outOfService}
          />
        </Pressable>
      </FormScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
  footer: { gap: spacing.sm, paddingTop: spacing.sm },
  form: { gap: spacing.xl, paddingBottom: spacing.lg },
  group: { gap: spacing.md },
  helper: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  onSelected: { color: colors.white },
  screen: { paddingHorizontal: spacing.xlSm },
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
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
  textArea: { minHeight: 104, textAlignVertical: "top" },
  tile: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    height: 60,
    justifyContent: "center",
    width: "23%",
  },
  tileNumber: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 20 },
  tileOut: { color: colors.error, fontFamily: fontFamilies.body, fontSize: 10 },
  tileSelected: { backgroundColor: colors.primary },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
