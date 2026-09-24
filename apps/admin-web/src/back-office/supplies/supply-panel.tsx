import { zodResolver } from "@hookform/resolvers/zod";
import type { AdminSupplyDto } from "@pilates/api-contracts";
import { useState } from "react";
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
} from "../../components/form/form";
import { wholeNumberField } from "../../components/form/number-field";
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { countFormat } from "../../components/table/pagination";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Input } from "../../components/ui/input";
import { backOfficeProblem } from "../back-office-problems";
import { useSupplyChange } from "./supply-queries";

// The backend's whole-unit range (BKO-001 D3).
const units = wholeNumberField(
  0,
  1_000_000,
  "Escribe un número entero desde 0.",
);

const supplySchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre.").max(80),
  initialQuantity: units,
  lowStockThreshold: units,
});
type SupplyInput = z.input<typeof supplySchema>;
type SupplyOutput = z.output<typeof supplySchema>;

export const unitsLabel = (quantity: number) =>
  `${countFormat.format(quantity)} unid.`;

// AW09 with follow-up 49: the stock is typed once, at creation; afterwards
// only Withdrawals and Restocks move it, and a discontinued Supply is
// archived rather than deleted so its history stays in AW31.
export function SupplyPanelForm({
  branchId,
  supply,
  onDone,
}: {
  branchId: string;
  supply: AdminSupplyDto | undefined;
  onDone: (notice?: string) => void;
}) {
  const change = useSupplyChange(branchId);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const form = useForm<SupplyInput, unknown, SupplyOutput>({
    resolver: zodResolver(supplySchema),
    defaultValues: {
      name: supply?.name ?? "",
      // Never sent on edit; the stock is not editable there.
      initialQuantity:
        supply === undefined ? "" : String(supply.quantityOnHand),
      lowStockThreshold:
        supply === undefined ? "" : String(supply.lowStockThreshold),
    },
  });

  const refuse = (error: unknown) => {
    const problem = backOfficeProblem(error);
    if (problem.field === "name") {
      form.setError("name", { message: problem.message });
    } else {
      setFailure(problem.message);
    }
  };

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      if (supply === undefined) {
        await change.mutateAsync({
          kind: "create",
          input: { branchId, ...values },
        });
        onDone(
          `Insumo «${values.name}» creado con ${unitsLabel(values.initialQuantity)}`,
        );
        return;
      }
      const input = {
        name: values.name,
        lowStockThreshold: values.lowStockThreshold,
      };
      if (
        input.name === supply.name &&
        input.lowStockThreshold === supply.lowStockThreshold
      ) {
        onDone();
        return;
      }
      await change.mutateAsync({ kind: "update", supplyId: supply.id, input });
      onDone(`Guardamos los cambios de ${input.name}.`);
    } catch (error) {
      refuse(error);
    }
  });

  const archive = async () => {
    if (supply === undefined) return;
    setFailure(null);
    try {
      await change.mutateAsync({ kind: "archive", supplyId: supply.id });
      setConfirming(false);
      onDone(`${supply.name} se archivó: sus retiros siguen en el historial.`);
    } catch (error) {
      setConfirming(false);
      refuse(error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Papel higiénico" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {supply === undefined ? (
            <FormField
              control={form.control}
              name="initialQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad en stock</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="10" {...field} />
                  </FormControl>
                  <FormDescription>
                    Solo al crearlo: después cambia con retiros y reposiciones.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="flex flex-col gap-1.5">
              <p className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
                Cantidad en stock
              </p>
              <p className="rounded-control border border-divisor bg-superficie px-3 py-2.5 text-cuerpo text-texto tabular">
                {unitsLabel(supply.quantityOnHand)}
              </p>
              <p className="text-ayuda text-texto-tenue">
                Cambia solo con «Registrar retiro» y «Registrar reposición».
              </p>
            </div>
          )}
          <FormField
            control={form.control}
            name="lowStockThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Umbral de alerta</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="4" {...field} />
                </FormControl>
                <FormDescription>
                  Con esta cantidad o menos, Insumos lo marca con stock bajo.
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
          {supply === undefined ? null : (
            <Button
              variant="link"
              className="self-center text-error hover:text-error-texto"
              onClick={() => setConfirming(true)}
            >
              Archivar insumo
            </Button>
          )}
        </SidePanelFooter>
      </form>
      {supply === undefined ? null : (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title="¿Archivar este insumo?"
          confirmLabel="Archivar"
          cancelLabel="Cancelar"
          pending={change.isPending}
          onConfirm={() => void archive()}
        >
          <p>
            Dejará de aparecer en Insumos y en Registrar retiro. Sus retiros
            seguirán en «Retiros e insumos consumidos».
          </p>
        </ConfirmDialog>
      )}
    </Form>
  );
}
