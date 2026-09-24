import { zodResolver } from "@hookform/resolvers/zod";
import type { AdminPlanDto, PlanInputDto } from "@pilates/api-contracts";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { isApiError } from "../../api/problem";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/form/form";
import {
  bolivianosField,
  bolivianosText,
} from "../../components/form/money-field";
import { wholeNumberField } from "../../components/form/number-field";
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { durationLabel, planDurations } from "./plan-format";
import { usePlanChange } from "./plan-queries";

const priceMessage = "Escribe un monto como 1.050,00.";

const planSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre.").max(80),
  durationMonths: z
    .enum(["1", "3", "6", "12"])
    .transform((months) => Number(months) as PlanInputDto["durationMonths"]),
  classAllowance: wholeNumberField(1, 1000, "Entre 1 y 1.000 clases."),
  priceCentavos: bolivianosField({
    invalid: priceMessage,
    zero: "El precio debe ser mayor a cero.",
  }),
  displayOrder: wholeNumberField(0, 1000, "Un número desde 0."),
});

type PlanInput = z.input<typeof planSchema>;
type PlanOutput = z.output<typeof planSchema>;

const failureMessage = (error: unknown): string => {
  if (!isApiError(error)) return "No pudimos guardar. Inténtalo de nuevo.";
  switch (error.code) {
    case "plan_not_found":
      return "Este plan ya no existe. Cierra el panel y vuelve a abrir la lista.";
    case "invalid_request":
    case "invalid_catalog_value":
      return "Revisa los datos: hay un valor que no es válido.";
    case "administration_access_denied":
      return "No tienes permiso para cambiar los planes.";
    default:
      return "No pudimos guardar. Inténtalo de nuevo.";
  }
};

const textFields = [
  ["name", "Nombre", "Paquete de 8 clases", undefined],
  ["classAllowance", "Clases incluidas", "8", "numeric"],
  ["priceCentavos", "Precio", "560,00", "decimal"],
  ["displayOrder", "Orden en la app", "1", "numeric"],
] as const;

const helpers: Partial<Record<keyof PlanInput, string>> = {
  classAllowance:
    "Cantidad fija para todo el periodo; ningún plan es ilimitado.",
  priceCentavos: "En bolivianos.",
  displayOrder: "Los planes se muestran a las clientas de menor a mayor.",
};

// AW05: name, a 1/3/6/12-month duration, a fixed class count, and the price.
// Prices are audited and never touch Subscriptions or open purchases
// (ADM-001 A3); hiding a Plan only removes it from the Client catalog.
export function PlanPanelForm({
  plan,
  onDone,
}: {
  plan: AdminPlanDto | undefined;
  onDone: () => void;
}) {
  const change = usePlanChange();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<PlanInput, unknown, PlanOutput>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: plan?.name ?? "",
      durationMonths: String(
        plan?.durationMonths ?? 1,
      ) as PlanInput["durationMonths"],
      classAllowance: plan === undefined ? "" : String(plan.classAllowance),
      priceCentavos:
        plan === undefined ? "" : bolivianosText(plan.priceCentavos),
      displayOrder: plan === undefined ? "" : String(plan.displayOrder),
    },
  });

  const run = async (work: () => Promise<unknown>) => {
    setFailure(null);
    try {
      await work();
      onDone();
    } catch (error) {
      setFailure(failureMessage(error));
    }
  };

  const submit = form.handleSubmit((input) =>
    run(() =>
      change.mutateAsync(
        plan === undefined
          ? { kind: "create", input }
          : { kind: "update", planId: plan.id, input },
      ),
    ),
  );

  const [nameField, ...numberFields] = textFields;
  const renderText = ([
    name,
    label,
    placeholder,
    inputMode,
  ]: (typeof textFields)[number]) => (
    <FormField
      key={name}
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} inputMode={inputMode} {...field} />
          </FormControl>
          <FormDescription>{helpers[name]}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          {renderText(nameField)}
          <FormField
            control={form.control}
            name="durationMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {planDurations.map((months) => (
                      <option key={months} value={String(months)}>
                        {durationLabel(months)}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {numberFields.map(renderText)}
          {plan === undefined ? null : (
            <p className="rounded-control border border-divisor bg-superficie px-3 py-2 text-ayuda text-texto-tenue">
              Las suscripciones vigentes y las compras ya iniciadas conservan su
              precio.
            </p>
          )}
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
          {plan === undefined ? null : (
            <Button
              variant="link"
              className="self-center"
              disabled={change.isPending}
              onClick={() =>
                void run(() =>
                  change.mutateAsync({
                    kind: "visibility",
                    planId: plan.id,
                    visible: plan.hiddenAt !== null,
                  }),
                )
              }
            >
              {plan.hiddenAt === null
                ? "Ocultar en la app"
                : "Mostrar en la app"}
            </Button>
          )}
        </SidePanelFooter>
      </form>
    </Form>
  );
}
