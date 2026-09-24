import { zodResolver } from "@hookform/resolvers/zod";
import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
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
import {
  boliviaInstant,
  boliviaParts,
  boliviaToday,
} from "../lib/bolivia-time";
import { branchTrainersQueryOptions } from "./schedule-queries";
import { scheduleProblem } from "./schedule-problems";
import { TrainerOptions } from "./session-options";
import { useScheduleChange } from "./use-schedule-change";

type Session = AdministratorSessionAvailabilityDto;

const occurrenceSchema = (today: string, booked: number) =>
  z.object({
    trainerStaffMemberId: z.string().min(1, "Elige una entrenadora."),
    date: z
      .string()
      .min(1, "Elige la fecha.")
      .refine((date) => date >= today, "Elige una fecha desde hoy."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Elige la hora."),
    capacity: wholeNumberField(1, 100, "Entre 1 y 100 lugares.").refine(
      (capacity) => capacity >= booked,
      `Debe ser al menos ${booked}.`,
    ),
  });

type OccurrenceInput = z.input<ReturnType<typeof occurrenceSchema>>;
type OccurrenceOutput = z.output<ReturnType<typeof occurrenceSchema>>;

// "Solo esta sesión" (follow-up 39 §1): one occurrence changes its Trainer
// (the Trainer swap), start, or capacity and becomes an exception; only what
// changed is sent, and capacity never drops below the booked seats.
export function OccurrenceForm({
  session,
  branchId,
  failure,
  onFailure,
  onDone,
  footer,
}: {
  session: Session;
  branchId: string;
  failure: string | null;
  onFailure: (message: string | null) => void;
  onDone: (notice: string | null) => void;
  footer: ReactNode;
}) {
  const today = boliviaToday();
  const start = boliviaParts(session.startsAt);
  const change = useScheduleChange(branchId);
  const trainers = useQuery(branchTrainersQueryOptions(branchId));
  const form = useForm<OccurrenceInput, unknown, OccurrenceOutput>({
    resolver: zodResolver(occurrenceSchema(today, session.bookedCount)),
    defaultValues: {
      trainerStaffMemberId: session.trainerStaffMemberId,
      date: start.date,
      time: start.time,
      capacity: String(session.capacity),
    },
  });

  const submit = form.handleSubmit(async (values) => {
    onFailure(null);
    const startsAt = boliviaInstant(values.date, values.time);
    const input = {
      ...(values.trainerStaffMemberId === session.trainerStaffMemberId
        ? {}
        : { trainerStaffMemberId: values.trainerStaffMemberId }),
      ...(new Date(startsAt).getTime() === new Date(session.startsAt).getTime()
        ? {}
        : { startsAt }),
      ...(values.capacity === session.capacity
        ? {}
        : { capacity: values.capacity }),
    };
    if (Object.keys(input).length === 0) {
      onDone(null);
      return;
    }
    try {
      await change.mutateAsync({
        kind: "update-session",
        sessionId: session.id,
        input,
      });
      onDone("Sesión actualizada.");
    } catch (error) {
      const problem = scheduleProblem(error);
      if (problem.field === undefined || problem.field === "effectiveFrom") {
        onFailure(problem.message);
      } else {
        form.setError(problem.field, { message: problem.message });
      }
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          <div className="flex flex-col gap-1.5">
            <span className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
              Tipo de clase
            </span>
            <p className="text-cuerpo text-texto">{session.classTypeName}</p>
          </div>
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
                  Si cambias de entrenadora, le avisamos a la nueva.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
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
          <p className="text-ayuda text-texto-tenue">
            Si cambias el día o la hora, avisamos a las clientas con reserva.
          </p>
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
                  {session.bookedCount === 0
                    ? "Ajústala si hay equipo fuera de servicio."
                    : `No puedes bajar de ${session.bookedCount}: ya hay ${session.bookedCount} ${session.bookedCount === 1 ? "reserva confirmada" : "reservas confirmadas"}.`}
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
          {footer}
        </SidePanelFooter>
      </form>
    </Form>
  );
}
