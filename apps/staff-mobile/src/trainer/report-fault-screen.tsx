import {
  reportTrainerEquipmentIssue,
  useGetTrainerSessionRoster,
  useListTrainerSessionEquipment,
  type EquipmentDto,
  type SessionEquipmentIssueInputDto,
  type SessionEquipmentTypeDto,
} from "@pilates/api-contracts";
import {
  EmptyState,
  FormField,
  FormScrollView,
  formatTimeRange,
  LoadingState,
  NoticeRow,
  PrimaryButton,
  QueryFailure,
  Screen,
  spacing,
  StateScreen,
  surfaces,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { bodyScroll, CardLabel, FooterPanel, taskEdges } from "../profile/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { FilterChips } from "../ui/filter-chips";
import { useIsTablet } from "../ui/use-is-tablet";
import {
  DamageCounter,
  MissingStep,
  missingStep,
  OutOfServiceSwitch,
  UnitTiles,
  unitName,
} from "./report-fault-pieces";

type SessionType = SessionEquipmentTypeDto;

// A type the Branch has: units, or a stock (even if all of it is damaged).
const held = (type: SessionType) => type.units.length > 0 || type.quantity > 0;

const isConflict = (response: { status: number; data: unknown }) =>
  response.status === 409 &&
  (response.data as { code?: unknown } | null)?.code === "equipment_damage_exceeds_usable";

// S26 (BKO-004): a Trainer tells the studio a machine of her Session's Branch
// is broken; the Administrator resolves it on the admin web (AW37). Boards
// I10–I13: the band stays fixed, each step is a white card with its label
// inside, and «Enviar reporte» sits in the white footer with what it still needs.
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
  const [typeId, setTypeId] = useState<string | null>(null);
  const [chosen, setChosen] = useState<EquipmentDto | null>(null);
  const [count, setCount] = useState(1);
  const [description, setDescription] = useState("");
  const [outOfService, setOutOfService] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<"failed" | "conflict" | null>(null);
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
        <BackBar onBack={() => navigation.goBack()} />
        <View style={styles.balance} />
        <StateScreen
          icon="check"
          layout="card"
          note={`Administración ya puede ver ${sent} y lo marcará cuando esté resuelto.`}
          primaryAction={{ label: "Volver a la lista", onPress: () => navigation.goBack() }}
          title="Gracias por avisar"
        />
        <View style={styles.balance} />
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

  const { types: all, typeId: sessionTypeId } = equipment.data.data;
  const types = all.filter(held);
  const shown =
    types.find((type) => type.id === typeId) ??
    types.find((type) => type.id === sessionTypeId) ??
    types[0];
  if (shown === undefined)
    return (
      <Screen style={column}>
        {header}
        <View style={styles.emptyGap}>
          <EmptyState
            icon="alert"
            message="Administración todavía no cargó los equipos de esta sucursal."
            title="Sin equipos registrados"
          />
        </View>
      </Screen>
    );

  const byQuantity = shown.tracking === "quantity";
  const damaged = Math.max(1, Math.min(count, shown.usable));
  // FIX-076: a type with a single unit comes with it chosen.
  const only = shown.units.length === 1 ? shown.units[0] : undefined;
  // A unit a refetch dropped is no longer chosen.
  const piece = shown.units.find((each) => each.id === chosen?.id) ?? only ?? null;
  const described = description.trim() !== "";
  const missing = missingStep({
    described,
    hasUnit: byQuantity ? null : piece !== null,
    typeName: shown.name,
    usable: shown.usable,
  });
  const ready = missing === null;
  const choose = (id: string) => {
    setTypeId(id);
    setChosen(null);
    setCount(1);
    setOutOfService(false);
    setProblem(null);
  };
  const send = async () => {
    const input: SessionEquipmentIssueInputDto | null = byQuantity
      ? { typeId: shown.id, quantity: damaged, description: description.trim() }
      : piece === null
        ? null
        : { equipmentId: piece.id, description: description.trim(), outOfService };
    if (input === null) return;
    setBusy(true);
    setProblem(null);
    try {
      const response = await reportTrainerEquipmentIssue(sessionId, input, undefined, fetcher);
      if (isConflict(response)) {
        setProblem("conflict");
        await equipment.refetch();
        return;
      }
      if (response.status !== 201) throw new Error("The fault report was refused");
      setSent(
        byQuantity || piece === null
          ? `el daño de ${shown.name} (${damaged})`
          : `la falla del ${unitName(piece)}`,
      );
    } catch {
      setProblem("failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={taskEdges} style={[column, bodyScroll.taskScreen]}>
      {header}
      <View style={bodyScroll.clip}>
        <FormScrollView
          contentContainerStyle={bodyScroll.content}
          footer={
            <FooterPanel bleed={0}>
              {problem === "failed" ? (
                <NoticeRow message="No pudimos enviar el reporte. Inténtalo de nuevo." />
              ) : null}
              {problem === "conflict" ? (
                <NoticeRow message={`Solo hay ${shown.usable} que se pueden usar.`} />
              ) : null}
              {busy ? null : <MissingStep message={missing} />}
              <PrimaryButton
                busy={busy}
                disabled={!ready}
                label="Enviar reporte"
                onPress={() => void send()}
                testID="report-fault-send"
              />
            </FooterPanel>
          }
        >
          <View style={styles.card}>
            <CardLabel>¿Qué equipo?</CardLabel>
            <FilterChips
              onSelect={choose}
              options={types.map((type) => ({ id: type.id, label: type.name }))}
              selected={shown.id}
              testID="report-fault-types"
            />
          </View>
          {byQuantity ? (
            <DamageCounter count={damaged} onChange={setCount} usable={shown.usable} />
          ) : (
            <UnitTiles
              chosenId={piece?.id ?? null}
              label={shown.name}
              onChoose={setChosen}
              units={shown.units}
            />
          )}
          <View style={styles.card}>
            <FormField
              label="¿Qué pasó?"
              maxLength={500}
              multiline
              onChangeText={setDescription}
              hint={byQuantity ? "Ej.: uno se pinchó" : "Ej.: el resorte rojo se soltó"}
              style={styles.textArea}
              testID="report-fault-description"
              value={description}
            />
          </View>
          {byQuantity ? null : (
            <OutOfServiceSwitch onChange={setOutOfService} value={outOfService} />
          )}
        </FormScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Board I13: the thanks card sits in the middle of the space under the band.
  balance: { flex: 1 },
  card: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lg },
  centered: { alignItems: "center", justifyContent: "center" },
  emptyGap: { paddingTop: spacing.md },
  screen: { paddingHorizontal: spacing.xlSm },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
  textArea: { minHeight: 104, textAlignVertical: "top" },
});
