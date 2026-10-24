import type { PayStatementDto } from "@pilates/api-contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MonthStepper } from "../../components/table/month-stepper";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import { PageHeader } from "../../components/page/page-header";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { boliviaMonth } from "../../lib/bolivia-time";
import { formatBolivianos } from "../../lib/money";
import {
  approvePayStatementRequest,
  draftPayStatementsRequest,
  payStatementsQueryOptions,
} from "./pay-statement-queries";

const lineKind = (kind: PayStatementDto["lines"][number]["kind"]) =>
  kind === "class"
    ? "Clase"
    : kind === "minimum_not_met"
      ? "Mínimo no alcanzado"
      : "Comisión";

function StatementCard({
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

// BKO-006: the Administrator drafts a month and approves each statement.
// Approval creates the Salary Payment. A Trainer's own view is «Mis pagos».
export function PayStatementsPage({
  month,
  onMonthChange,
}: {
  month: string;
  onMonthChange: (month: string) => void;
}) {
  const queryClient = useQueryClient();
  const query = useQuery(payStatementsQueryOptions(month));
  const draft = useMutation({
    mutationFn: () => draftPayStatementsRequest(month),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: payStatementsQueryOptions(month).queryKey,
      }),
  });
  const statements = query.data;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Pagos a instructoras"
        subtitle="Todo el estudio · el cálculo sale de las tarifas vigentes."
        actions={
          <Button
            variant="secondary"
            busy={draft.isPending}
            onClick={() => draft.mutate()}
          >
            Calcular mes
          </Button>
        }
      />
      <MonthStepper
        month={month}
        latest={boliviaMonth()}
        onChange={onMonthChange}
      />
      {draft.isError ? (
        <p role="alert" className="text-ayuda text-error-texto">
          No pudimos calcular el mes.
        </p>
      ) : null}
      {query.isError ? (
        <QueryFailure
          error={query.error}
          what="los pagos"
          onRetry={() => void query.refetch()}
        />
      ) : statements === undefined ? (
        <LoadingNotice>Cargando los pagos…</LoadingNotice>
      ) : statements.length === 0 ? (
        <p className="text-cuerpo text-texto-secundario">
          Este mes no tiene pagos calculados.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {statements.map((statement) => (
            <StatementCard
              key={statement.id}
              statement={statement}
              month={month}
            />
          ))}
        </div>
      )}
    </div>
  );
}
