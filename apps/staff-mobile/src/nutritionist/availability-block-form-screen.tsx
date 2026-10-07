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
  BodyText,
  colors,
  PickerCheck,
  PrimaryButton,
  radii,
  Screen,
  ScreenTopBar,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import {
  addCivilDays,
  boliviaToday,
  civilDateChip,
  civilDateLong,
  displayTime,
  minutesOf,
  quarterHours,
  slotMinutes,
  countLabel,
  turnosIn,
  weekdayNames,
} from "./nutritionist-format";

type FormNavigation = { goBack: () => void };
type TimeField = "start" | "end";
type Confirmation = "replace" | "end";

const effectiveDateChoices = 15;

const blockProblems: Record<string, string> = {
  availability_block_overlap: "Se superpone con otro de tus horarios.",
  availability_block_invalid_range:
    "Revisa las horas: el horario debe durar al menos 45 minutos, en tramos de 15.",
  availability_block_effective_date_past: "Elige hoy o una fecha posterior.",
  availability_block_ended: "Este horario ya termina antes de esa fecha.",
  availability_block_not_found: "Este horario ya no existe.",
  branch_not_assigned: "Ya no tienes asignada esa sucursal.",
};

const problemMessage = (body: unknown): string => {
  const code =
    typeof body === "object" && body !== null ? (body as { code?: unknown }).code : undefined;
  return (
    (typeof code === "string" ? blockProblems[code] : undefined) ??
    "No pudimos guardar el horario. Inténtalo de nuevo."
  );
};

const keptLine = (count: number): string =>
  count === 1
    ? "La evaluación ya reservada se mantiene."
    : `Las ${count} evaluaciones ya reservadas se mantienen.`;

function Pill({
  label,
  onPress,
  selected,
  accessibilityLabel = label,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.pill, selected && styles.pillSelected]}
    >
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

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
      setMessage("No pudimos guardar el horario. Inténtalo de nuevo.");
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
        onPress={() => setPicking(field)}
        style={styles.timeField}
      >
        <Text style={styles.timeLabel}>{label}</Text>
        <Text style={[styles.timeValue, value === null && styles.timePlaceholder]}>{shown}</Text>
      </Pressable>
    );
  };

  return (
    <Screen style={styles.screen}>
      <ScreenTopBar
        fullBleed
        onBack={() => navigation.goBack()}
        title={editing ? "Editar horario" : "Nuevo horario"}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionLabel>Día</SectionLabel>
        <View style={styles.pills}>
          {weekdayNames.map((name, index) => (
            <Pill
              key={name}
              label={name}
              onPress={() => setWeekday(index + 1)}
              selected={weekday === index + 1}
            />
          ))}
        </View>
        {branches.length > 1 ? (
          <>
            <SectionLabel>Sucursal</SectionLabel>
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
          </>
        ) : null}
        <SectionLabel>Horario</SectionLabel>
        <View style={styles.times}>
          {timeField("start", startsAtLocal)}
          {timeField("end", endsAtLocal)}
        </View>
        <SectionLabel>{editing ? "Aplicar cambios desde" : "A partir del"}</SectionLabel>
        <ScrollView
          contentContainerStyle={styles.pills}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateStrip}
        >
          {Array.from({ length: effectiveDateChoices }, (_, offset) => {
            const date = addCivilDays(today, offset);
            const chip = civilDateChip(date, today);
            return (
              <Pill
                accessibilityLabel={`Fecha ${chip}`}
                key={date}
                label={chip}
                onPress={() => setEffectiveFrom(date)}
                selected={effectiveFrom === date}
              />
            );
          })}
        </ScrollView>
        <BodyText style={styles.muted}>
          El sistema generará turnos de evaluación individuales dentro de este horario.
        </BodyText>
        {turnos > 0 ? (
          <Text style={styles.preview}>
            {[
              `${countLabel(turnos, "turno", "turnos")} de 45 min`,
              ...(booked > 0 ? [countLabel(booked, "ya reservado", "ya reservados")] : []),
            ].join(" · ")}
          </Text>
        ) : null}
        {message !== null ? (
          <BodyText accessibilityRole="alert" style={styles.failure}>
            {message}
          </BodyText>
        ) : null}
        <PrimaryButton disabled={!valid || submitting} label="Guardar" onPress={save} />
        {editing ? (
          <Pressable
            accessibilityLabel="Eliminar horario"
            accessibilityRole="button"
            onPress={() => setConfirming("end")}
            style={styles.remove}
          >
            <Text style={styles.removeText}>Eliminar horario</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <Modal
        animationType="slide"
        onRequestClose={() => setPicking(null)}
        transparent
        visible={picking !== null}
      >
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, styles.timeSheet]}>
            <Text style={styles.sheetTitle}>
              {picking === "start" ? "Hora de inicio" : "Hora de fin"}
            </Text>
            <ScrollView contentContainerStyle={styles.timeOptions}>
              {quarterHours.map((time) => {
                const selected = time === (picking === "start" ? startsAtLocal : endsAtLocal);
                return (
                  <Pressable
                    accessibilityLabel={displayTime(time)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={time}
                    onPress={() => {
                      if (picking === "start") setStartsAtLocal(time);
                      else setEndsAtLocal(time);
                      setPicking(null);
                    }}
                    style={styles.timeOption}
                  >
                    <Text
                      style={[styles.timeOptionText, selected && styles.timeOptionTextSelected]}
                    >
                      {displayTime(time)}
                    </Text>
                    <PickerCheck selected={selected} testID={`picker-check-${time}`} />
                  </Pressable>
                );
              })}
            </ScrollView>
            <TextButton label="Volver" onPress={() => setPicking(null)} />
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        onRequestClose={() => setConfirming(null)}
        transparent
        visible={confirming !== null}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet} testID="block-change-sheet">
            <Text style={styles.sheetTitle}>
              {confirming === "end" ? "¿Quitar este horario?" : "¿Aplicar el cambio?"}
            </Text>
            <BodyText>
              {`${confirming === "end" ? "Quitar" : "Aplicar"} desde el ${civilDateLong(effectiveFrom)}.`}
            </BodyText>
            {booked > 0 ? <BodyText>{keptLine(booked)}</BodyText> : null}
            {confirming === "end" ? (
              <Pressable
                accessibilityLabel="Quitar horario"
                accessibilityRole="button"
                disabled={submitting}
                onPress={remove}
                style={styles.destructive}
              >
                <Text style={styles.destructiveText}>Quitar horario</Text>
              </Pressable>
            ) : (
              <PrimaryButton disabled={submitting} label="Aplicar cambio" onPress={save} />
            )}
            <TextButton label="Volver" onPress={() => setConfirming(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  dateStrip: { flexGrow: 0 },
  destructive: {
    alignItems: "center",
    borderColor: colors.error,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  destructiveText: { color: colors.errorText, fontSize: typography.body },
  failure: { color: colors.errorText },
  label: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    textTransform: "uppercase",
  },
  muted: { color: colors.textMuted, fontSize: typography.note },
  pill: {
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.text, fontSize: typography.note },
  pillTextSelected: { color: colors.white },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  preview: { color: colors.primaryDeep, fontSize: typography.note, fontWeight: "600" },
  remove: { alignItems: "center", minHeight: 44, justifyContent: "center" },
  removeText: { color: colors.errorText, fontSize: typography.body },
  screen: { gap: spacing.md },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.frame,
    borderTopRightRadius: radii.frame,
    gap: spacing.md,
    padding: spacing.xl,
  },
  sheetBackdrop: {
    backgroundColor: "rgba(74,58,48,0.22)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetTitle: { color: colors.text, fontSize: typography.titleSecondary, fontWeight: "500" },
  timeField: {
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.control,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xxs,
    padding: spacing.md,
  },
  timeLabel: { color: colors.textMuted, fontSize: typography.label },
  timeOption: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    width: "23%",
  },
  timeOptionText: { color: colors.text, fontSize: typography.body },
  timeOptionTextSelected: { color: colors.primaryDeep, fontWeight: "500" },
  timeOptions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  timePlaceholder: { color: colors.textSubtle },
  timeSheet: { maxHeight: "70%" },
  timeValue: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  times: { flexDirection: "row", gap: spacing.md },
});
