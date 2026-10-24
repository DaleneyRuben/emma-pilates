import { decideFreeze, type FreezeReviewDto } from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminFetch } from "../../api/fetcher";
import { ApiError } from "../../api/problem";
import { CatalogPage } from "../../catalog/catalog-page";
import { Button } from "../../components/ui/button";
import { formatCivilDate } from "../../lib/bolivia-time";
import { requestedFreezesQueryOptions } from "./freeze-queries";

type FreezeRow = FreezeReviewDto;

const columns = createColumnHelper<FreezeRow>();

function DecisionCell({
  freeze,
  onDone,
}: {
  freeze: FreezeRow;
  onDone: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (decision: "approved" | "refused") =>
      decideFreeze(freeze.id, { decision }, undefined, adminFetch),
    onSuccess: async (_result, decision) => {
      await queryClient.invalidateQueries({
        queryKey: requestedFreezesQueryOptions().queryKey,
      });
      onDone(
        decision === "approved"
          ? "Congelamiento aprobado"
          : "Congelamiento rechazado",
      );
    },
  });
  const problem =
    mutation.error instanceof ApiError &&
    mutation.error.code === "freeze_access_denied"
      ? "No puedes decidir un congelamiento."
      : mutation.isError
        ? "No pudimos guardar la decisión. Inténtalo de nuevo."
        : null;

  return (
    <span className="flex flex-col items-start gap-2">
      <span className="flex flex-wrap gap-2">
        <Button
          disabled={mutation.isPending}
          onClick={() => mutation.mutate("approved")}
          size="sm"
          type="button"
        >
          Aprobar
        </Button>
        <Button
          disabled={mutation.isPending}
          onClick={() => mutation.mutate("refused")}
          size="sm"
          type="button"
          variant="destructive"
        >
          Rechazar
        </Button>
      </span>
      {problem === null ? null : (
        <span className="text-nota text-error" role="alert">
          {problem}
        </span>
      )}
    </span>
  );
}

export function FreezesPage() {
  const query = useQuery(requestedFreezesQueryOptions());
  const [notice, setNotice] = useState<string | null>(null);
  const freezeColumns = () => [
    columns.accessor("clientName", {
      header: "Clienta",
      cell: ({ getValue }) => (
        <span className="font-medium text-texto">{getValue()}</span>
      ),
    }),
    columns.accessor("planName", {
      header: "Plan",
      cell: ({ getValue }) => (
        <span className="text-texto-secundario">{getValue()}</span>
      ),
    }),
    columns.accessor("startsOn", {
      header: "Desde",
      cell: ({ getValue }) => (
        <span className="text-texto-secundario tabular">
          {formatCivilDate(getValue())}
        </span>
      ),
    }),
    columns.accessor("endsOn", {
      header: "Hasta",
      cell: ({ getValue }) => (
        <span className="text-texto-secundario tabular">
          {formatCivilDate(getValue())}
        </span>
      ),
    }),
    columns.accessor("reason", {
      header: "Motivo",
      cell: ({ getValue }) => (
        <span className="text-texto-secundario">{getValue()}</span>
      ),
    }),
    columns.display({
      id: "decision",
      header: "Decisión",
      cell: ({ row }) => (
        <DecisionCell freeze={row.original} onDone={setNotice} />
      ),
    }),
  ];

  return (
    <CatalogPage
      title="Congelamientos"
      subtitle={notice ?? "Solicitudes pendientes de una clienta."}
      loadingMessage="Cargando congelamientos…"
      what="los congelamientos"
      emptyMessage={
        <span className="text-texto-secundario">
          No hay solicitudes pendientes.
        </span>
      }
      filter={null}
      search={{ page: 1, pageSize: 40 }}
      onPageChange={() => undefined}
      query={query}
      columns={freezeColumns}
    />
  );
}
