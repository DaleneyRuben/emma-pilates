import { Plus, X } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../components/form/form";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { MinutesInput } from "./duration-field";
import { WeekdayOptions } from "./session-options";
import { nextRow, rowLabel, type WeeklyRow } from "./weekly-rows";

const maxRows = 7;

// AW03 «Cada semana» with follow-ups 97 and 98: one row per weekday and
// time, each with its own minutes; a repeated or overlapping row is marked on
// its own line.
export function WeeklyRowsField() {
  const { control, formState } = useFormContext<{ rows: WeeklyRow[] }>();
  const { fields, append, remove } = useFieldArray({ control, name: "rows" });
  const rows = useWatch({ control, name: "rows" });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
        Días y horas
      </span>
      {fields.map((item, index) => (
        <FormField
          key={item.id}
          control={control}
          name={`rows.${index}.time`}
          render={({ field: time, fieldState }) => (
            <FormItem>
              <div className="grid grid-cols-[minmax(0,1fr)_84px_104px_30px] items-center gap-2">
                <FormField
                  control={control}
                  name={`rows.${index}.weekday`}
                  render={({ field: day, fieldState: dayState }) => (
                    <FormItem>
                      <FormControl>
                        <Select
                          {...day}
                          aria-label={`Día, fila ${index + 1}`}
                          aria-invalid={
                            dayState.error !== undefined ||
                            fieldState.error !== undefined
                          }
                        >
                          <WeekdayOptions />
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormControl>
                  <Input
                    type="time"
                    step={300}
                    aria-label={`Hora, fila ${index + 1}`}
                    {...time}
                  />
                </FormControl>
                <FormField
                  control={control}
                  name={`rows.${index}.durationMinutes`}
                  render={({ field: minutes }) => (
                    <FormItem>
                      <FormControl>
                        <MinutesInput
                          compact
                          aria-label={`Duración, fila ${index + 1}, en minutos`}
                          {...minutes}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {fields.length > 1 ? (
                  <Button
                    type="button"
                    variant="neutral"
                    className="size-[30px] p-0"
                    aria-label={`Quitar ${rowLabel(rows[index] ?? { weekday: "", time: "", durationMinutes: "" }, index + 1)}`}
                    onClick={() => remove(index)}
                  >
                    <X size={13} strokeWidth={1.9} aria-hidden="true" />
                  </Button>
                ) : (
                  <span />
                )}
              </div>
              <FormMessage />
              {formState.errors.rows?.[index]?.durationMinutes ? (
                <p className="text-ayuda text-error-texto">
                  {formState.errors.rows[index].durationMinutes.message}
                </p>
              ) : null}
            </FormItem>
          )}
        />
      ))}
      {fields.length < maxRows ? (
        <Button
          type="button"
          variant="link"
          className="self-start text-nota"
          onClick={() => append(nextRow(rows.at(-1)))}
        >
          <Plus size={14} strokeWidth={2} aria-hidden="true" />
          Agregar día
        </Button>
      ) : null}
      <p className="text-ayuda text-texto-tenue">
        Cada día puede durar distinto; empieza en 60 minutos.
      </p>
    </div>
  );
}
