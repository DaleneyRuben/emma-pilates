import { Fragment, useId, useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  holdingSummary,
  trackingLabel,
  type TypeHolding,
} from "./equipment-format";
import { TypeDetail, type OnAction } from "./equipment-type-detail";

const count = (n: number) => (n === 0 ? "—" : String(n));

function TypeRow({
  holding,
  canEditTypes,
  onAction,
}: {
  holding: TypeHolding;
  canEditTypes: boolean;
  onAction: OnAction;
}) {
  const detailId = useId();
  const [open, setOpen] = useState(false);
  const { type } = holding;
  const summary = holdingSummary(holding);
  return (
    <Fragment>
      <TableRow
        className={
          open ? "bg-superficie-hundida hover:bg-superficie-hundida" : undefined
        }
      >
        <TableCell data-label="Equipo">
          <span className="flex flex-col">
            <span className="font-medium">{type.name}</span>
            <span className="text-nota text-texto">
              {trackingLabel[type.tracking]}
            </span>
          </span>
        </TableCell>
        <TableCell data-label="Unidades" className="tabular">
          {summary.total}
        </TableCell>
        <TableCell data-label="Funcionando" className="tabular">
          {summary.working}
        </TableCell>
        <TableCell data-label="Fallas" className="tabular">
          {count(summary.faults)}
        </TableCell>
        <TableCell className="md:text-right">
          <Button
            variant="link"
            aria-expanded={open}
            aria-controls={open ? detailId : undefined}
            onClick={() => setOpen(!open)}
          >
            {open ? "Ocultar" : "Ver"}
            <span className="sr-only"> {type.name}</span>
          </Button>
        </TableCell>
      </TableRow>
      {open ? (
        <TableRow className="hover:bg-transparent">
          <TableCell
            colSpan={5}
            className="bg-superficie px-5 py-4 max-md:block max-md:before:content-none"
          >
            <TypeDetail
              id={detailId}
              holding={holding}
              canEditTypes={canEditTypes}
              onAction={onAction}
            />
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  );
}

// FIX-091 (W10 A, «Tabla única»): one row per studio type with its units,
// how many work and how many have a fault; «Ver» opens the type's units or
// stock and their actions under the row.
export function EquipmentTable({
  holdings,
  canEditTypes,
  onAction,
}: {
  holdings: readonly TypeHolding[];
  canEditTypes: boolean;
  onAction: OnAction;
}) {
  if (holdings.length === 0) {
    return (
      <p className="rounded-tarjeta bg-superficie shadow-tarjeta px-4 py-3 text-nota text-texto">
        Todavía no hay tipos de equipo.
      </p>
    );
  }
  return (
    <Table aria-label="Equipos">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Equipo</TableHead>
          <TableHead>Unidades</TableHead>
          <TableHead>Funcionando</TableHead>
          <TableHead>Fallas</TableHead>
          <TableHead>
            <span className="sr-only">Detalle</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {holdings.map((holding) => (
          <TypeRow
            key={holding.type.id}
            holding={holding}
            canEditTypes={canEditTypes}
            onAction={onAction}
          />
        ))}
      </TableBody>
    </Table>
  );
}
