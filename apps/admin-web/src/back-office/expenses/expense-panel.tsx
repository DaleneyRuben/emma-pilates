import { zodResolver } from "@hookform/resolvers/zod";
import type { AdminExpenseDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useIdempotencyKey } from "../../api/idempotency-key";
import { CivilDateInput } from "../../components/form/civil-date-input";
import { pastCivilDateField } from "../../components/form/date-field";
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
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { formatBolivianos } from "../../lib/money";
import type { Branch } from "../../shell/branch/branch-context";
import { backOfficeProblem } from "../back-office-problems";
import { CategoryAdder } from "./category-adder";
import {
  expenseCategoriesQueryOptions,
  useExpenseChange,
} from "./expense-queries";

const expenseSchema = z.object({
  expenseCategoryId: z.string().min(1, "Elige una categoría."),
  amountCentavos: bolivianosField({
    invalid: "Escribe un monto como 450,50.",
    zero: "El monto debe ser mayor a cero.",
  }),
  date: pastCivilDateField("Elige la fecha del gasto."),
});
type ExpenseInput = z.input<typeof expenseSchema>;
type ExpenseOutput = z.output<typeof expenseSchema>;

// AW14: an Expense of the Branch the top bar names, which it keeps for good
// (BKO-001 D11); its category can be added inline without leaving the form.
export function ExpensePanelForm({
  branch,
  expense,
  onDone,
}: {
  branch: Branch;
  expense: AdminExpenseDto | undefined;
  onDone: (notice?: string) => void;
}) {
  const categories = useQuery(expenseCategoriesQueryOptions());
  const change = useExpenseChange(branch.id);
  const keyFor = useIdempotencyKey();
  const [adding, setAdding] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<ExpenseInput, unknown, ExpenseOutput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expenseCategoryId: expense?.expenseCategoryId ?? "",
      amountCentavos:
        expense === undefined ? "" : bolivianosText(expense.amountCentavos),
      date: expense?.incurredOn ?? "",
    },
  });
  const none = categories.isSuccess && categories.data.length === 0;

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    const input = {
      expenseCategoryId: values.expenseCategoryId,
      amountCentavos: values.amountCentavos,
      incurredOn: values.date,
    };
    const categoryName =
      categories.data?.find((item) => item.id === input.expenseCategoryId)
        ?.name ?? "";
    try {
      if (expense === undefined) {
        const record = { branchId: branch.id, ...input };
        await change.mutateAsync({
          kind: "record",
          input: record,
          idempotencyKey: keyFor(record),
        });
        onDone(
          `Gasto de ${formatBolivianos(input.amountCentavos)} en ${categoryName} registrado en ${branch.name}.`,
        );
        return;
      }
      if (
        input.expenseCategoryId === expense.expenseCategoryId &&
        input.amountCentavos === expense.amountCentavos &&
        input.incurredOn === expense.incurredOn
      ) {
        onDone();
        return;
      }
      await change.mutateAsync({
        kind: "correct",
        expenseId: expense.id,
        input,
      });
      onDone(`Guardamos la corrección del gasto de ${categoryName}.`);
    } catch (error) {
      const problem = backOfficeProblem(error);
      if (problem.field === "expenseCategoryId" || problem.field === "date") {
        form.setError(problem.field, { message: problem.message });
      } else {
        setFailure(problem.message);
      }
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          <p className="rounded-control border border-divisor bg-superficie px-3 py-2 text-ayuda text-texto-tenue">
            {expense === undefined
              ? `Se registra en la sucursal ${branch.name}.`
              : `Sucursal ${branch.name}: un gasto no cambia de sucursal.`}
          </p>
          <div className="flex flex-col gap-2">
            <FormField
              control={form.control}
              name="expenseCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <FormControl>
                    <Select {...field} disabled={!categories.isSuccess || none}>
                      <option value="">
                        {categories.isPending
                          ? "Cargando categorías…"
                          : "Elige una categoría"}
                      </option>
                      {(categories.data ?? []).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormDescription>
                    {none
                      ? "Todavía no hay categorías: crea la primera."
                      : categories.isError
                        ? "No pudimos cargar las categorías."
                        : undefined}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {adding || none ? (
              <CategoryAdder
                autoFocus={adding}
                onAdded={(category) => {
                  setAdding(false);
                  form.setValue("expenseCategoryId", category.id, {
                    shouldValidate: true,
                  });
                }}
              />
            ) : (
              <Button
                variant="link"
                size="sm"
                className="self-start"
                onClick={() => setAdding(true)}
              >
                <Plus size={14} strokeWidth={1.8} aria-hidden="true" />
                Nueva categoría
              </Button>
            )}
          </div>
          <FormField
            control={form.control}
            name="amountCentavos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="450,50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <FormControl>
                  <CivilDateInput {...field} />
                </FormControl>
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
          <Button type="submit" size="lg" busy={change.isPending}>
            Guardar
          </Button>
        </SidePanelFooter>
      </form>
    </Form>
  );
}
