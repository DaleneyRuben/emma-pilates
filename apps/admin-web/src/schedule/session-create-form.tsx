import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ChoiceChips } from "../components/form/choice-chips";
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
import { boliviaInstant, boliviaToday, weekdayOf } from "../lib/bolivia-time";
import {
  activeClassTypesQueryOptions,
  branchTrainersQueryOptions,
} from "./schedule-queries";
import { scheduleProblem } from "./schedule-problems";
import { ClassTypeOptions, TrainerOptions } from "./session-options";
import { createdNotice } from "./schedule-notices";
import { useScheduleChange } from "./use-schedule-change";
import { WeeklyRowsField } from "./weekly-rows-field";
import { rowClash } from "./weekly-rows";

// Both frequencies share one flat shape; which date fields are required
// depends on the choice, checked after the field rules.
const wallClock = /^\d{2}:\d{2}$/;

const createSchema = (
  today: string,
  durationOf: (classTypeId: string) => number | undefined,
) =>
  z
    .object({
      frequency: z.enum(["once", "weekly"]),
      classTypeId: z.string().min(1, "Elige un tipo de clase."),
      trainerStaffMemberId: z.string().min(1, "Elige una entrenadora."),
      time: z.string(),
      capacity: wholeNumberField(1, 100, "Entre 1 y 100 lugares."),
      date: z.string(),
      rows: z.array(z.object({ weekday: z.string(), time: z.string() })),
      effectiveFrom: z.string(),
    })
    .superRefine((values, context) => {
      const requireDate = (path: "date" | "effectiveFrom", missing: string) => {
        const value = values[path];
        if (value === "") {
          context.addIssue({ code: "custom", path: [path], message: missing });
        } else if (value < today) {
          context.addIssue({
            code: "custom",
            path: [path],
            message: "Elige una fecha desde hoy.",
          });
        }
      };
      if (values.frequency === "once") {
        requireDate("date", "Elige la fecha.");
        if (!wallClock.test(values.time)) {
          context.addIssue({
            code: "custom",
            path: ["time"],
            message: "Elige la hora.",
          });
        }
        return;
      }
      let complete = true;
      values.rows.forEach((row, index) => {
        if (!/^[1-7]$/.test(row.weekday)) {
          complete = false;
          context.addIssue({
            code: "custom",
            path: ["rows", index, "weekday"],
            message: "Elige un día.",
          });
        }
        if (!wallClock.test(row.time)) {
          complete = false;
          context.addIssue({
            code: "custom",
            path: ["rows", index, "time"],
            message: "Elige la hora.",
          });
        }
      });
      const clash = complete
        ? rowClash(
            values.rows,
            Math.max(1, durationOf(values.classTypeId) ?? 0),
          )
        : null;
      if (clash !== null) {
        context.addIssue({
          code: "custom",
          path: ["rows", clash.index, "time"],
          message: clash.message,
        });
      }
      requireDate("effectiveFrom", "Elige desde qué fecha rige.");
    });

type CreateInput = z.input<ReturnType<typeof createSchema>>;
type CreateOutput = z.output<ReturnType<typeof createSchema>>;

/** A Bolivia date and wall clock picked from an empty AW02 slot. */
export type SessionStart = { date: string; time: string };

// AW03 create mode with follow-up 39 §1: "Una sola vez" makes one exception
// Session on a date; "Cada semana" makes a weekly Session Schedule from a
// Bolivia "Vigente desde" date, materialized 30 days ahead (ADR-0059).
// Opened from an empty slot (follow-up 96), the slot's day and hour fill
// Fecha and Hora, and the day carries into «Cada semana».
export function SessionCreateForm({
  branchId,
  start,
  onDone,
}: {
  branchId: string;
  start?: SessionStart;
  onDone: (notice: string) => void;
}) {
  const today = boliviaToday();
  const change = useScheduleChange(branchId);
  const classTypes = useQuery(activeClassTypesQueryOptions());
  const trainers = useQuery(branchTrainersQueryOptions(branchId));
  const [failure, setFailure] = useState<string | null>(null);
  const durationOf = (classTypeId: string) =>
    classTypes.data?.find((classType) => classType.id === classTypeId)
      ?.durationMinutes;
  const form = useForm<CreateInput, unknown, CreateOutput>({
    resolver: zodResolver(createSchema(today, durationOf)),
    defaultValues: {
      frequency: "once",
      classTypeId: "",
      trainerStaffMemberId: "",
      time: start?.time ?? "",
      capacity: "",
      date: start?.date ?? "",
      rows: [
        {
          weekday: start === undefined ? "" : String(weekdayOf(start.date)),
          time: start?.time ?? "",
        },
      ],
      effectiveFrom: start?.date ?? "",
    },
  });
  const frequency = useWatch({ control: form.control, name: "frequency" });
  const classTypeId = useWatch({ control: form.control, name: "classTypeId" });

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    const shared = {
      branchId,
      classTypeId: values.classTypeId,
      trainerStaffMemberId: values.trainerStaffMemberId,
      capacity: values.capacity,
    };
    try {
      const outcome = await change.mutateAsync(
        values.frequency === "once"
          ? {
              kind: "create-session",
              input: {
                ...shared,
                startsAt: boliviaInstant(values.date, values.time),
              },
            }
          : {
              kind: "create-schedules",
              input: {
                ...shared,
                effectiveFrom: values.effectiveFrom,
                rows: values.rows.map((row) => ({
                  weekday: Number(row.weekday),
                  startsAtLocal: row.time,
                })),
              },
            },
      );
      onDone(createdNotice(outcome));
    } catch (error) {
      const problem = scheduleProblem(error);
      if (problem.field === undefined) {
        setFailure(problem.message);
        return;
      }
      const field =
        problem.field === "date" && values.frequency === "weekly"
          ? "effectiveFrom"
          : problem.field;
      form.setError(field, { message: problem.message });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <ChoiceChips
                legend="Frecuencia"
                name={field.name}
                value={field.value}
                options={[
                  ["once", "Una sola vez"],
                  ["weekly", "Cada semana"],
                ]}
                onChange={field.onChange}
              />
            )}
          />
          {frequency === "weekly" ? (
            <p className="text-ayuda text-texto-tenue">
              Genera las sesiones de los próximos 30 días y las sigue creando
              cada semana.
            </p>
          ) : null}
          <FormField
            control={form.control}
            name="classTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de clase</FormLabel>
                <FormControl>
                  <Select
                    {...field}
                    onChange={(event) => {
                      field.onChange(event);
                      const chosen = classTypes.data?.find(
                        (classType) => classType.id === event.target.value,
                      );
                      if (chosen && !form.getFieldState("capacity").isDirty) {
                        form.setValue(
                          "capacity",
                          String(chosen.defaultCapacity),
                        );
                      }
                    }}
                  >
                    <ClassTypeOptions classTypes={classTypes.data ?? []} />
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                <FormDescription>
                  Solo entrenadoras asignadas a esta sucursal.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {frequency === "once" ? (
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" min={today} {...field} />
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
          ) : (
            <WeeklyRowsField durationMinutes={durationOf(classTypeId)} />
          )}
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacidad</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" {...field} />
                </FormControl>
                <FormDescription>
                  Se llena con la capacidad del tipo de clase; ajústala si hay
                  equipo fuera de servicio.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {frequency === "weekly" ? (
            <FormField
              control={form.control}
              name="effectiveFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vigente desde</FormLabel>
                  <FormControl>
                    <Input type="date" min={today} {...field} />
                  </FormControl>
                  <FormDescription>Fecha en hora de Bolivia.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
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
        </SidePanelFooter>
      </form>
    </Form>
  );
}
