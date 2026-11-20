import {
  createAvailabilityBlock,
  endAvailabilityBlock,
  getListAvailabilityBlocksQueryKey,
  getListNutritionistAgendaQueryKey,
  replaceAvailabilityBlock,
  useGetCurrentStaffMemberProfile,
  type AvailabilityBlockDto,
  type AvailabilityBlockInputDto,
} from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  Glyph,
  NoticeRow,
  PrimaryButton,
  radii,
  Screen,
  spacing,
  surfaces,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { bodyScroll, CardLabel, FooterPanel, taskEdges } from "../ui/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import {
  DateTile,
  Pill,
  pillRow,
  problemMessage,
  saveFailureMessage,
} from "./availability-block-form-parts";
import { BlockChangeSheet, type Confirmation } from "./availability-block-sheets";
import {
  addCivilDays,
  boliviaToday,
  civilDateChip,
  displayTime,
  minutesOf,
  slotMinutes,
  countLabel,
  turnosIn,
  weekdayNames,
  weekdayTag,
} from "./nutritionist-format";
import type { TimeField } from "./time-wheel";
import { TimeWheelSheet } from "./time-wheel-sheet";

type FormNavigation = { goBack: () => void };

const effectiveDateChoices = 15;

export function AvailabilityBlockFormScreen({
  route,
}: {
  route: { params?: { block?: AvailabilityBlockDto } };
}) {
  const block = route.params?.block;
  const editing = block !== undefined;
  const navigation = useNavigation<FormNavigation>();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const profile = useGetCurrentStaffMemberProfile({ fetcher });
  const branches = profile.data?.status === 200 ? profile.data.data.branches : [];
  const today = boliviaToday();

  const [weekday, setWeekday] = useState<number | null>(block?.weekday ?? null);
  const [chosenBranchId, setBranchId] = useState<string | null>(block?.branchId ?? null);
  const [startsAtLocal, setStartsAtLocal] = useState<string | null>(block?.startsAtLocal ?? null);
  const [endsAtLocal, setEndsAtLocal] = useState<string | null>(block?.endsAtLocal ?? null);
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [picking, setPicking] = useState<TimeField | null>(null);
  // Each opening starts the wheel afresh; closing keeps it mounted so it slides out.
  const [openings, setOpenings] = useState(0);
  const [confirming, setConfirming] = useState<Confirmation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // A retried identical request replays; a changed request needs a new key.
  const lastAttempt = useRef<{ body: string; key: string } | null>(null);

  const branchId = chosenBranchId ?? (branches.length === 1 ? (branches[0]?.id ?? null) : null);
  const turnos =
    startsAtLocal !== null && endsAtLocal !== null ? turnosIn(startsAtLocal, endsAtLocal) : 0;
  const input: AvailabilityBlockInputDto | null =
    weekday !== null && branchId !== null && startsAtLocal !== null && endsAtLocal !== null
      ? { branchId, weekday, startsAtLocal, endsAtLocal, effectiveFrom }
      : null;
  const valid =
    input !== null && minutesOf(input.endsAtLocal) - minutesOf(input.startsAtLocal) >= slotMinutes;
  const booked = block?.upcomingBookedCount ?? 0;

  const idempotencyFor = (body: AvailabilityBlockInputDto) => {
    const serialized = JSON.stringify(body);
    if (lastAttempt.current?.body !== serialized) {
      lastAttempt.current = { body: serialized, key: randomUUID() };
    }
    return { headers: { "idempotency-key": lastAttempt.current.key } };
  };

  const finish = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAvailabilityBlocksQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListNutritionistAgendaQueryKey() }),
    ]);
    navigation.goBack();
  };

  const run = async (request: () => Promise<{ status: number; data: unknown }>) => {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await request();
      if (response.status >= 200 && response.status < 300) {
        await finish();
        return;
      }
      setMessage(problemMessage(response.data));
    } catch {
      setMessage(saveFailureMessage);
    } finally {
      setSubmitting(false);
      setConfirming(null);
    }
  };

  const save = () => {
    if (input === null || !valid) return;
    if (block === undefined) {
      void run(() => createAvailabilityBlock(input, idempotencyFor(input), fetcher));
    } else if (booked > 0 && confirming === null) {
      setConfirming("replace");
    } else {
      void run(() => replaceAvailabilityBlock(block.id, input, idempotencyFor(input), fetcher));
    }
  };

  const remove = () => {
    if (block === undefined) return;
    void run(() => endAvailabilityBlock(block.id, { effectiveFrom }, undefined, fetcher));
  };

  const timeField = (field: TimeField, value: string | null) => {
    const label = field === "start" ? "Hora de inicio" : "Hora de fin";
    const shown = value === null ? "Elegir" : displayTime(value);
    return (
      <Pressable
        accessibilityLabel={`${label}: ${shown}`}
        accessibilityRole="button"
        onPress={() => {
          setOpenings((count) => count + 1);
          setPicking(field);
        }}
        style={styles.timeField}
      >
        <Text style={styles.timeLabel}>{label}</Text>
        <Text style={[styles.timeValue, value === null && styles.timePlaceholder]}>{shown}</Text>
      </Pressable>
    );
  };

  // Boards N07–N08: the band stays fixed, each step is a white card with its
  // label inside, and the white footer holds «Guardar» (and «Eliminar horario»).
  return (
    <Screen edges={taskEdges} style={[styles.screen, bodyScroll.taskScreen]}>
      <BackBar
        onBack={() => navigation.goBack()}
        title={editing ? "Editar horario" : "Nuevo horario"}
      />
      <ScrollView contentContainerStyle={bodyScroll.content} style={bodyScroll.scroll}>
        <View style={styles.card}>
          <CardLabel>Día</CardLabel>
          <View style={styles.weekdays}>
            {weekdayNames.map((name, index) => (
              <Pill
                accessibilityLabel={name}
                fill
                key={name}
                label={weekdayTag(index + 1)}
                onPress={() => setWeekday(index + 1)}
                selected={weekday === index + 1}
              />
            ))}
          </View>
        </View>
        {branches.length > 1 ? (
          <View style={styles.card}>
            <CardLabel>Sucursal</CardLabel>
            <View style={styles.pills}>
              {branches.map((branch) => (
                <Pill
                  accessibilityLabel={`Sucursal ${branch.name}`}
                  key={branch.id}
                  label={branch.name}
                  onPress={() => setBranchId(branch.id)}
                  selected={branchId === branch.id}
                />
              ))}
            </View>
          </View>
        ) : branches[0] === undefined ? null : (
          <View style={styles.card}>
            <CardLabel>Sucursal</CardLabel>
            <Text style={styles.fixedBranch}>{branches[0].name}</Text>
          </View>
        )}
        <View style={styles.card}>
          <CardLabel>Horario</CardLabel>
          <View style={styles.times}>
            {timeField("start", startsAtLocal)}
            {timeField("end", endsAtLocal)}
          </View>
        </View>
        <View style={styles.card}>
          <CardLabel>{editing ? "Aplicar cambios desde" : "A partir del"}</CardLabel>
          <ScrollView
            contentContainerStyle={styles.dates}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateStrip}
          >
            {Array.from({ length: effectiveDateChoices }, (_, offset) => {
              const date = addCivilDays(today, offset);
              return (
                <DateTile
                  accessibilityLabel={`Fecha ${civilDateChip(date, today)}`}
                  date={date}
                  key={date}
                  onPress={() => setEffectiveFrom(date)}
                  selected={effectiveFrom === date}
                  today={today}
                />
              );
            })}
          </ScrollView>
          {turnos > 0 ? (
            <View style={styles.turnos}>
              <Glyph color={colors.text} name="clock" size={22} strokeWidth={1.6} />
              <Text style={styles.turnosText}>
                {[
                  `${countLabel(turnos, "turno", "turnos")} de 45 min`,
                  ...(booked > 0
                    ? [countLabel(booked, "ya tiene reserva", "ya tienen reserva")]
                    : []),
                ].join(" · ")}
              </Text>
            </View>
          ) : (
            <Text style={styles.muted}>
              El sistema generará turnos de evaluación individuales dentro de este horario.
            </Text>
          )}
          {booked > 0 && editing ? (
            <Text style={styles.muted}>
              {`${countLabel(booked, "evaluación reservada se mantiene", "evaluaciones reservadas se mantienen")}.`}
            </Text>
          ) : null}
        </View>
        {message !== null ? (
          <View accessibilityLabel={message} accessibilityRole="alert">
            <NoticeRow message={message} />
          </View>
        ) : null}
      </ScrollView>
      <FooterPanel>
        <PrimaryButton busy={submitting} disabled={!valid} label="Guardar" onPress={save} />
        {editing ? (
          <TextButton label="Eliminar horario" onPress={() => setConfirming("end")} tone="error" />
        ) : null}
      </FooterPanel>
      <TimeWheelSheet
        key={openings}
        onClose={() => setPicking(null)}
        onPick={(time) => {
          if (picking === "start") {
            setStartsAtLocal(time);
            // A start that leaves the end under one turno sends the end back to «Elegir».
            if (endsAtLocal !== null && minutesOf(endsAtLocal) - minutesOf(time) < slotMinutes) {
              setEndsAtLocal(null);
            }
          } else setEndsAtLocal(time);
          setPicking(null);
        }}
        picking={picking}
        start={startsAtLocal}
        value={picking === "start" ? startsAtLocal : endsAtLocal}
      />
      <BlockChangeSheet
        booked={booked}
        busy={submitting}
        confirming={confirming}
        effectiveFrom={effectiveFrom}
        onApply={save}
        onClose={() => setConfirming(null)}
        onRemove={remove}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lg },
  dateStrip: { flexGrow: 0, marginHorizontal: -spacing.lg },
  dates: { flexDirection: "row", gap: 6, paddingHorizontal: spacing.lg },
  fixedBranch: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.bodyMedium,
    fontWeight: "600",
  },
  muted: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
  pills: pillRow,
  screen: { paddingHorizontal: spacing.xlSm },
  // Board N07: the time boxes, white with a 1.5 pt 400 outline and the time in Lora.
  timeField: {
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderRadius: radii.inset,
    borderWidth: 1.5,
    flex: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.smLg,
  },
  timeLabel: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  timePlaceholder: { fontStyle: "italic" },
  timeValue: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.titleSecondary,
    fontVariant: ["tabular-nums"],
  },
  times: { flexDirection: "row", gap: spacing.smLg },
  turnos: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  turnosText: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    lineHeight: 21,
  },
  // v2 S17: the seven day tiles share the width, 4 pt apart (board N07).
  weekdays: { flexDirection: "row", gap: spacing.xs },
});
