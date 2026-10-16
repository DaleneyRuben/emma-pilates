import { zodResolver } from "@hookform/resolvers/zod";
import type { AdminSupplyDto } from "@pilates/api-contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useIdempotencyKey } from "../../api/idempotency-key";
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
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { refreshBranchSupplies } from "../back-office-cache";
import { backOfficeProblem } from "../back-office-problems";
import { unitsLabel } from "./supply-format";
import {
  branchSuppliesQueryOptions,
  useSupplyMovement,
  type SupplyMovement,
} from "./supply-queries";

type Kind = SupplyMovement["kind"];

const copy: Record<
  Kind,
  { quantity: string; notice: (name: string, stock: number) => string }
> = {
  withdrawal: {
    quantity: "Cantidad retirada",
    notice: (name, stock) =>
      `Retiro registrado: quedan ${unitsLabel(stock)} de ${name}.`,
  },
  restock: {
    quantity: "Cantidad repuesta",
    notice: (name, stock) =>
      `Reposición registrada: ahora hay ${unitsLabel(stock)} de ${name}.`,
  },
};

const overStock = (stock: number) => `Solo hay ${unitsLabel(stock)} en stock.`;

// A Withdrawal never takes the stock below zero (back-office/CONTEXT.md), so
// its quantity is checked against the stock last read for the Supply; the
// database still has the final word.
const movementSchema = (kind: Kind, stockOf: (id: string) => number | null) =>
  z
    .object({
      supplyId: z.string().min(1, "Elige un insumo."),
      quantity: wholeNumberField(
        1,
        1_000_000,
        "Escribe un número entero desde 1.",
      ),
    })
    .superRefine(({ supplyId, quantity }, context) => {
      const stock = stockOf(supplyId);
      if (kind === "withdrawal" && stock !== null && quantity > stock) {
        context.addIssue({
          code: "custom",
          path: ["quantity"],
          message: overStock(stock),
        });
      }
    });

type MovementInput = z.input<ReturnType<typeof movementSchema>>;
type MovementOutput = z.output<ReturnType<typeof movementSchema>>;

// AW10 (with follow-up 50) and follow-up 48's AW10-style Restock panel: two
// fields and one button, for logging units at the moment they move.
export function SupplyMovementForm({
  branchId,
  kind,
  onDone,
}: {
  branchId: string;
  kind: Kind;
  onDone: (notice: string) => void;
}) {
  const queryClient = useQueryClient();
  const supplies = useQuery(branchSuppliesQueryOptions(branchId));
  const movement = useSupplyMovement(branchId);
  const keyFor = useIdempotencyKey();
  const [failure, setFailure] = useState<string | null>(null);
  const schema = useMemo(
    () =>
      movementSchema(
        kind,
        (id) =>
          queryClient
            .getQueryData(branchSuppliesQueryOptions(branchId).queryKey)
            ?.items.find((supply) => supply.id === id)?.quantityOnHand ?? null,
      ),
    [kind, queryClient, branchId],
  );
  const form = useForm<MovementInput, unknown, MovementOutput>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { supplyId: "", quantity: "" },
  });
  const [supplyId, quantity] = useWatch({
    control: form.control,
    name: ["supplyId", "quantity"],
  });
  const items = supplies.data?.items ?? [];
  const selected: AdminSupplyDto | undefined = items.find(
    (supply) => supply.id === supplyId,
  );
  const over =
    kind === "withdrawal" &&
    selected !== undefined &&
    /^\d+$/.test(quantity.trim()) &&
    Number(quantity) > selected.quantityOnHand;

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    const body = { supplyId: values.supplyId, quantity: values.quantity };
    try {
      const result = await movement.mutateAsync({
        kind,
        ...body,
        idempotencyKey: keyFor({ kind, ...body }),
      });
      onDone(copy[kind].notice(selected?.name ?? "", result.quantityOnHand));
    } catch (error) {
      const problem = backOfficeProblem(error);
      if (problem.code === "insufficient_stock") {
        // Someone took units meanwhile: show the stock as it is now.
        await refreshBranchSupplies(queryClient, branchId);
        await form.trigger("quantity");
      } else {
        setFailure(problem.message);
      }
    }
  });

  const empty = supplies.isSuccess && items.length === 0;

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          <FormField
            control={form.control}
            name="supplyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Insumo</FormLabel>
                <FormControl>
                  <Select
                    {...field}
                    disabled={!supplies.isSuccess || empty}
                    onChange={(event) => {
                      field.onChange(event);
                      if (form.getValues("quantity") !== "") {
                        void form.trigger("quantity");
                      }
                    }}
                  >
                    <option value="">
                      {supplies.isPending
                        ? "Cargando insumos…"
                        : "Elige un insumo"}
                    </option>
                    {items.map((supply) => (
                      <option key={supply.id} value={supply.id}>
                        {`${supply.name} (${unitsLabel(supply.quantityOnHand)})`}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormDescription>
                  {empty
                    ? "No hay insumos en esta sucursal."
                    : supplies.isError
                      ? "No pudimos cargar los insumos. Cierra el panel e inténtalo de nuevo."
                      : undefined}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{copy[kind].quantity}</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="1" {...field} />
                </FormControl>
                <FormDescription>
                  {kind === "withdrawal" && selected !== undefined
                    ? `Máximo: ${unitsLabel(selected.quantityOnHand)}`
                    : undefined}
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
          <Button
            type="submit"
            size="lg"
            disabled={empty || over}
            busy={movement.isPending}
          >
            Registrar
          </Button>
        </SidePanelFooter>
      </form>
    </Form>
  );
}
