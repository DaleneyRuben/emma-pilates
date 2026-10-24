import { zodResolver } from "@hookform/resolvers/zod";
import type { StudioSettingsDto } from "@pilates/api-contracts";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { isApiError } from "../api/problem";
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
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { formatCancellationWindow } from "./studio-rules-format";
import { useStudioSettingsChange } from "./studio-rules-queries";

const percent = () => wholeNumberField(0, 100, "Un porcentaje entre 0 y 100.");

const settingsSchema = z.object({
  minimumBookings: wholeNumberField(1, 20, "Entre 1 y 20 reservas."),
  taxRatePercent: percent(),
  renewalTargetMonths1To6Percent: percent(),
  renewalTargetMonths7To12Percent: percent(),
  renewalTargetFromMonth13Percent: percent(),
  openingDate: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Elige una fecha válida.")
    .transform((date) => (date === "" ? null : date)),
});

type SettingsInput = z.input<typeof settingsSchema>;
type SettingsOutput = z.output<typeof settingsSchema>;

const failureMessage = (error: unknown): string => {
  if (!isApiError(error)) return "No pudimos guardar. Inténtalo de nuevo.";
  switch (error.code) {
    case "invalid_request":
    case "invalid_studio_setting":
      return "Revisa los datos: hay un valor que no es válido.";
    case "administration_access_denied":
      return "No tienes permiso para cambiar las reglas del estudio.";
    default:
      return "No pudimos guardar. Inténtalo de nuevo.";
  }
};

const valuesOf = (settings: StudioSettingsDto): SettingsInput => ({
  minimumBookings: String(settings.minimumBookings),
  taxRatePercent: String(settings.taxRatePercent),
  renewalTargetMonths1To6Percent: String(
    settings.renewalTargetMonths1To6Percent,
  ),
  renewalTargetMonths7To12Percent: String(
    settings.renewalTargetMonths7To12Percent,
  ),
  renewalTargetFromMonth13Percent: String(
    settings.renewalTargetFromMonth13Percent,
  ),
  openingDate: settings.openingDate ?? "",
});

type Field = {
  name: keyof SettingsInput;
  label: string;
  helper?: string;
};

// AW36: the values the owner's decisions call configurable (BKM-004). The
// page keys the form by version, so a saved or newer version resets it and
// the page, not the form, keeps the line saying what happened.
export function StudioRulesForm({
  settings,
  onSaved,
  onConflict,
}: {
  settings: StudioSettingsDto;
  onSaved: () => void;
  onConflict: () => void;
}) {
  const change = useStudioSettingsChange();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<SettingsInput, unknown, SettingsOutput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: valuesOf(settings),
  });

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await change.mutateAsync({
        expectedVersion: settings.version,
        ...values,
      });
      onSaved();
    } catch (error) {
      if (
        isApiError(error) &&
        error.code === "studio_settings_version_conflict"
      ) {
        onConflict();
        return;
      }
      setFailure(failureMessage(error));
    }
  });

  const renderField = ({ name, label, helper }: Field) => (
    <FormField
      key={name}
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {name === "openingDate" ? (
              <Input type="date" {...field} />
            ) : (
              <Input inputMode="numeric" {...field} />
            )}
          </FormControl>
          <FormDescription>{helper}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const check = formatCancellationWindow(
    settings.minimumBookingsCheckLeadMinutes,
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          {renderField({
            name: "minimumBookings",
            label: "Mínimo de reservas por clase",
            helper: `Una clase con menos reservas se cancela sola ${check} antes de empezar.`,
          })}
          {renderField({
            name: "taxRatePercent",
            label: "Impuestos sobre las ventas (%)",
            helper: "La parte de cada venta que se separa para impuestos.",
          })}
        </div>
        <fieldset className="flex flex-col gap-3">
          <legend className="pb-2 text-celda font-medium text-texto">
            Meta de renovación de la coordinadora
          </legend>
          <div className="grid gap-4 md:grid-cols-3">
            {renderField({
              name: "renewalTargetMonths1To6Percent",
              label: "Meses 1 a 6 (%)",
            })}
            {renderField({
              name: "renewalTargetMonths7To12Percent",
              label: "Meses 7 a 12 (%)",
            })}
            {renderField({
              name: "renewalTargetFromMonth13Percent",
              label: "Desde el mes 13 (%)",
            })}
          </div>
          <p className="text-ayuda text-texto-tenue">
            Los meses se cuentan desde la fecha de apertura.
          </p>
        </fieldset>
        <div className="md:max-w-[calc(50%-8px)]">
          {renderField({
            name: "openingDate",
            label: "Fecha de apertura",
            helper:
              "Déjala vacía hasta conocerla. Antes de esa fecha, las clientas pueden comprar con inicio el día de la apertura.",
          })}
        </div>
        {failure === null ? null : (
          <p role="alert" className="text-nota text-error-texto">
            {failure}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="self-start max-md:self-stretch"
          busy={change.isPending}
          disabled={change.isPending}
        >
          Guardar cambios
        </Button>
      </form>
    </Form>
  );
}
