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
import { boliviaInstant, boliviaToday } from "../lib/bolivia-time";
import {
  activeClassTypesQueryOptions,
  branchTrainersQueryOptions,
} from "./schedule-queries";
import { scheduleProblem } from "./schedule-problems";
import {
  ClassTypeOptions,
  TrainerOptions,
  WeekdayOptions,
} from "./session-options";
import { createdNotice } from "./schedule-notices";
import { useScheduleChange } from "./use-schedule-change";

// Both frequencies share one flat shape; which date fields are required
// depends on the choice, checked after the field rules.
const createSchema = (today: string) =>
  z
    .object({
      frequency: z.enum(["once", "weekly"]),
      classTypeId: z.string().min(1, "Elige un tipo de clase."),
      trainerStaffMemberId: z.string().min(1, "Elige una entrenadora."),
      time: z.string().regex(/^\d{2}:\d{2}$/, "Elige la hora."),
      capacity: wholeNumberField(1, 100, "Entre 1 y 100 lugares."),
      date: z.string(),
      weekday: z.string(),
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
        return;
      }
      if (!/^[1-7]$/.test(values.weekday)) {
        context.addIssue({
          code: "custom",
          path: ["weekday"],
          message: "Elige un día.",
        });
      }
      requireDate("effectiveFrom", "Elige desde qué fecha rige.");
    });

type CreateInput = z.input<ReturnType<typeof createSchema>>;
type CreateOutput = z.output<ReturnType<typeof createSchema>>;

// AW03 create mode with follow-up 39 §1: "Una sola vez" makes one exception
// Session on a date; "Cada semana" makes a weekly Session Schedule from a
// Bolivia "Vigente desde" date, materialized 30 days ahead (ADR-0059).
export function SessionCreateForm({
  branchId,
  onDone,
}: {
  branchId: string;
  onDone: (notice: string) => void;
}) {
  const today = boliviaToday();
  const change = useScheduleChange(branchId);
  const classTypes = useQuery(activeClassTypesQueryOptions());
  const trainers = useQuery(branchTrainersQueryOptions(branchId));
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<CreateInput, unknown, CreateOutput>({
    resolver: zodResolver(createSchema(today)),
    defaultValues: {
      frequency: "once",
      classTypeId: "",
      trainerStaffMemberId: "",
      time: "",
      capacity: "",
      date: "",
      weekday: "",
      effectiveFrom: "",
    },
  });
  const frequency = useWatch({ control: form.control, name: "frequency" });

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
              kind: "create-schedule",
              input: {
                ...shared,
                weekday: Number(values.weekday),
                startsAtLocal: values.time,
                effectiveFrom: values.effectiveFrom,
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
                <FormLabel>Entrenador</FormLabel>
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
          <div className="grid grid-cols-2 gap-3">
            {frequency === "once" ? (
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
            ) : (
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
            )}
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
