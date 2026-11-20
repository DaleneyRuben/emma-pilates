import type { AdminExpenseDto } from "@pilates/api-contracts";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Input } from "../../components/ui/input";
import { formatBolivianos } from "../../lib/money";
import { backOfficeProblem } from "../back-office-problems";
import { useExpenseVoid } from "./expense-queries";

// Finding 104 (owner, 2026-11-18): «Eliminar gasto» voids the Expense; it
// counts for nothing and nothing is deleted. Since FIX-091 it leaves the list
// for the month's «Ver gastos borrados» (W11).
export function ExpenseVoidAction({
  branchId,
  expense,
  onDone,
}: {
  branchId: string;
  expense: AdminExpenseDto;
  onDone: (notice: string) => void;
}) {
  const voidExpense = useExpenseVoid(branchId);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [failure, setFailure] = useState<string | null>(null);

  const confirm = async () => {
    setFailure(null);
    const written = reason.trim();
    try {
      await voidExpense.mutateAsync({
        expenseId: expense.id,
        input: written === "" ? {} : { reason: written },
      });
      setOpen(false);
      onDone(
        `Eliminamos el gasto de ${formatBolivianos(expense.amountCentavos)} en ${expense.expenseCategoryName}.`,
      );
    } catch (error) {
      setFailure(backOfficeProblem(error).message);
    }
  };

  return (
    <>
      <Button
        variant="link"
        className="self-center text-error hover:text-error-texto"
        onClick={() => {
          setFailure(null);
          setReason("");
          setOpen(true);
        }}
      >
        Eliminar gasto
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Eliminar este gasto?"
        confirmLabel="Eliminar"
        busy={voidExpense.isPending}
        onConfirm={() => void confirm()}
      >
        <p>
          Deja de contar en los totales y en Informes › Dinero. Sale de la lista
          y queda en «Ver gastos borrados» del mes, con quién y cuándo, y ya no
          se puede editar.
        </p>
        <label className="flex flex-col gap-1 text-texto">
          <span className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
            Motivo (opcional)
          </span>
          <Input
            aria-label="Motivo (opcional)"
            value={reason}
            maxLength={300}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {failure === null ? null : (
          <p role="alert" className="text-error-texto">
            {failure}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
