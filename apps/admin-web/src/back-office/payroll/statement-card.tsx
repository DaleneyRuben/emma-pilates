import type { PayStatementDto } from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { formatBolivianos } from "../../lib/money";
import {
  approvePayStatementRequest,
  payStatementsQueryOptions,
} from "./pay-statement-queries";

const lineKind = (kind: PayStatementDto["lines"][number]["kind"]) => {
  if (kind === "class") return "Clase";
  if (kind === "minimum_not_met") return "Mínimo no alcanzado";
  if (kind === "base") return "Base";
  if (kind === "new_client") return "Clienta nueva";
  if (kind === "bonus") return "Bono";
  return "Comisión";
};

export function StatementCard({
  statement,
  month,
}: {
  statement: PayStatementDto;
  month: string;
}) {
  const queryClient = useQueryClient();
  const approve = useMutation({
    mutationFn: () => approvePayStatementRequest(statement.id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: payStatementsQueryOptions(month).queryKey,
      }),
  });
  return (
    <article className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-blanco p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-titulo-panel text-texto">
            {statement.staffMemberName}
          </h2>
          <p className="text-nota text-texto-tenue">
            {statement.state === "approved" ? "Aprobado" : "Borrador"}
          </p>
        </div>
        <p className="font-serif text-[28px] text-texto tabular">
          {formatBolivianos(statement.totalCentavos)}
        </p>
      </div>
      <Table aria-label={`Líneas de ${statement.staffMemberName}`}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Concepto</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead className="text-right">Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {statement.lines.map((line, index) => (
            <TableRow key={`${line.kind}-${index}`}>
              <TableCell data-label="Concepto">{lineKind(line.kind)}</TableCell>
              <TableCell data-label="Detalle">{line.detail}</TableCell>
              <TableCell data-label="Monto" className="tabular md:text-right">
                {formatBolivianos(line.amountCentavos)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {statement.state === "draft" ? (
        <Button busy={approve.isPending} onClick={() => approve.mutate()}>
          Aprobar
        </Button>
      ) : null}
      {approve.isError ? (
        <p role="alert" className="text-ayuda text-error-texto">
          No pudimos aprobar el pago.
        </p>
      ) : null}
    </article>
  );
}
