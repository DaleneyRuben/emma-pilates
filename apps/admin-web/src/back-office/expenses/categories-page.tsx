import type { AdminExpenseCategoryDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { isForbidden } from "../../components/page/is-forbidden";
import { PageHeader } from "../../components/page/page-header";
import { PageNotice } from "../../components/page/page-notice";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { backOfficeProblem } from "../back-office-problems";
import { CategoryAdder } from "./category-adder";
import {
  expenseCategoriesQueryOptions,
  useCategoryChange,
} from "./expense-queries";

function CategoryRow({
  category,
  onDelete,
}: {
  category: AdminExpenseCategoryDto;
  onDelete: () => void;
}) {
  return (
    <li className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-1.5">
      <span className="text-cuerpo text-texto">{category.name}</span>
      <span className="flex items-center gap-2">
        {category.inUse ? (
          <span className="text-ayuda text-texto-muy-tenue">En uso</span>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Eliminar ${category.name}`}
          title={
            category.inUse
              ? "Un gasto la usa: no se puede eliminar."
              : "Eliminar"
          }
          disabled={category.inUse}
          onClick={onDelete}
          className="text-error hover:text-error-texto"
        >
          <Trash2 size={16} strokeWidth={1.6} aria-hidden="true" />
        </Button>
      </span>
    </li>
  );
}

// AW15: the studio's Expense Categories, plain labels with no Branch of
// their own (BKO-001 D13). A label no Expense uses is deleted outright; a
// used one keeps its history and cannot be (the backend refuses it too).
export function ExpenseCategoriesPage() {
  const query = useQuery(expenseCategoriesQueryOptions());
  const change = useCategoryChange();
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminExpenseCategoryDto | null>(
    null,
  );

  const remove = async (category: AdminExpenseCategoryDto) => {
    setNotice(null);
    setFailure(null);
    try {
      await change.mutateAsync({
        kind: "delete",
        expenseCategoryId: category.id,
      });
      setNotice(`Categoría «${category.name}» eliminada.`);
    } catch (error) {
      setFailure(backOfficeProblem(error).message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <article className="flex flex-col gap-5">
      <PageHeader
        title="Categorías de gasto"
        subtitle="Todo el estudio · agrupan los gastos de cada sucursal en el reporte."
      />
      {notice === null ? null : <PageNotice>{notice}</PageNotice>}
      {failure === null ? null : (
        <p role="alert" className="text-nota text-error-texto">
          {failure}
        </p>
      )}
      {query.isPending ? (
        <LoadingNotice>Cargando categorías…</LoadingNotice>
      ) : query.isError ? (
        <QueryFailure
          error={query.error}
          what="las categorías"
          onRetry={() => void query.refetch()}
        />
      ) : (
        <section className="flex w-full max-w-[560px] flex-col overflow-hidden rounded-tarjeta border border-borde bg-blanco">
          {query.data.length === 0 ? (
            <p className="px-4 py-6 text-center text-nota text-texto-tenue">
              Todavía no hay categorías. Agrega la primera abajo.
            </p>
          ) : (
            <ul
              aria-label="Categorías de gasto"
              className="flex flex-col divide-y divide-divisor"
            >
              {query.data.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  onDelete={() => setDeleting(category)}
                />
              ))}
            </ul>
          )}
          {isForbidden(query.error) ? null : (
            <div className="border-t border-borde bg-superficie-sutil px-4 py-3">
              <CategoryAdder
                onAdded={(category) => {
                  setFailure(null);
                  setNotice(`Categoría «${category.name}» agregada.`);
                }}
              />
            </div>
          )}
        </section>
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={`¿Eliminar «${deleting?.name ?? ""}»?`}
        confirmLabel="Eliminar"
        busy={change.isPending}
        onConfirm={() => {
          if (deleting !== null) void remove(deleting);
        }}
      >
        <p>Deja de aparecer al registrar un gasto. Ningún gasto la usa.</p>
      </ConfirmDialog>
    </article>
  );
}
