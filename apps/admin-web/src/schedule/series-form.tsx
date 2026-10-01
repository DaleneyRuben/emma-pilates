import { zodResolver } from "@hookform/resolvers/zod";
import type {
  AdminSessionScheduleDto,
  AdministratorSessionAvailabilityDto,
} from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/form/form";
import { wholeNumberField } from "../components/form/number-field";
import { SidePanelBody, SidePanelFooter } from "../components/panel/side-panel";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { boliviaParts, boliviaToday } from "../lib/bolivia-time";
import { firstChangeDate } from "./schedule-dates";
import { EndSeriesAction } from "./end-series-action";
import { branchTrainersQueryOptions } from "./schedule-queries";
import { replacedNotice } from "./schedule-notices";
import { scheduleProblem } from "./schedule-problems";
import { TrainerOptions, WeekdayOptions } from "./session-options";
import { useScheduleChange } from "./use-schedule-change";

const seriesSchema = (earliest: string) =>
  z.object({
    trainerStaffMemberId: z.string().min(1, "Elige una entrenadora."),
    weekday: z.string().regex(/^[1-7]$/, "Elige un día."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Elige la hora."),
    capacity: wholeNumberField(1, 100, "Entre 1 y 100 lugares."),
    effectiveFrom: z
      .string()
      .min(1, "Elige desde qué fecha rige.")
      .refine(
        (date) => date >= earliest,
        "Elige una fecha desde hoy y posterior al inicio de la serie.",
      ),
  });

type SeriesInput = z.input<ReturnType<typeof seriesSchema>>;
type SeriesOutput = z.output<ReturnType<typeof seriesSchema>>;

// "Esta y las futuras" (follow-up 39 §1, ADR-0059): the weekly schedule is
// replaced from a Bolivia date; only unbooked future Sessions change, and a
// Session with Bookings or a waitlist keeps its time until edited itself.
export function SeriesForm({
  session,
  schedule,
  branchId,
  failure,
  onFailure,
  onDone,
  footer,
}: {
  session: AdministratorSessionAvailabilityDto;
  schedule: AdminSessionScheduleDto;
  branchId: string;
  failure: string | null;
  onFailure: (message: string | null) => void;
  onDone: (notice: string) => void;
  footer: ReactNode;
}) {
  const today = boliviaToday();
  const earliest = firstChangeDate(schedule, today);
  const sessionDate = boliviaParts(session.startsAt).date;
  const defaultDate = sessionDate > earliest ? sessionDate : earliest;
  const change = useScheduleChange(branchId);
  const trainers = useQuery(branchTrainersQueryOptions(branchId));
  const [ending, setEnding] = useState(false);
  const form = useForm<SeriesInput, unknown, SeriesOutput>({
    resolver: zodResolver(seriesSchema(earliest)),
    defaultValues: {
      trainerStaffMemberId: schedule.trainerStaffMemberId,
      weekday: String(schedule.weekday),
      time: schedule.startsAtLocal,
      capacity: String(schedule.capacity),
      effectiveFrom: defaultDate,
    },
  });

  const submit = form.handleSubmit(async (values) => {
    onFailure(null);
    try {
      const outcome = await change.mutateAsync({
        kind: "replace-schedule",
        scheduleId: schedule.id,
        input: {
          branchId,
          classTypeId: schedule.classTypeId,
          trainerStaffMemberId: values.trainerStaffMemberId,
          weekday: Number(values.weekday),
          startsAtLocal: values.time,
          capacity: values.capacity,
          effectiveFrom: values.effectiveFrom,
        },
      });
      if (outcome.kind === "replace-schedule") {
        onDone(replacedNotice(outcome.result, values.effectiveFrom));
      }
    } catch (error) {
      const problem = scheduleProblem(error);
      if (problem.field === undefined || problem.field === "capacity") {
        onFailure(problem.message);
      } else {
        form.setError(
          problem.field === "date" ? "effectiveFrom" : problem.field,
          {
            message: problem.message,
          },
        );
      }
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          <p className="text-nota text-texto">
            Serie semanal de {schedule.classTypeName}
          </p>
          <p className="text-ayuda text-texto-tenue">
            Las sesiones que ya tienen reservas o lista de espera se mantienen
            sin cambios.
          </p>
          <FormField
            control={form.control}
            name="trainerStaffMemberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entrenadora</FormLabel>
                <FormControl>
                  <Select {...field}>
                    <TrainerOptions trainers={trainers.data ?? []} />
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="weekday"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Día de la semana</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <WeekdayOptions />
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora</FormLabel>
                  <FormControl>
                    <Input type="time" step={300} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacidad</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="effectiveFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vigente desde</FormLabel>
                <FormControl>
                  <Input type="date" min={earliest} {...field} />
                </FormControl>
                <FormDescription>
                  Fecha en hora de Bolivia. Las sesiones anteriores no cambian.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {failure === null ? null : (
            <p role="alert" className="text-nota text-error-texto">
              {failure}
            </p>
          )}
        </SidePanelBody>
        <SidePanelFooter>
          <Button type="submit" size="lg" disabled={change.isPending}>
            Guardar
          </Button>
          <Button
            variant="link"
            className="self-center"
            onClick={() => setEnding(true)}
          >
            Terminar la serie
          </Button>
          {footer}
        </SidePanelFooter>
      </form>
      <EndSeriesAction
        open={ending}
        onOpenChange={setEnding}
        schedule={schedule}
        branchId={branchId}
        earliest={earliest}
        defaultDate={defaultDate}
        onDone={onDone}
        onFailure={onFailure}
      />
    </Form>
  );
}
