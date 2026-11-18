import type { EquipmentDto, EquipmentStockDto } from "@pilates/api-contracts";
import { Plus } from "lucide-react";
import { useId } from "react";
import { Button } from "../../components/ui/button";
import { useIsNarrowViewport } from "../../shell/use-media-query";
import { StatusPill } from "../../components/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  damagedLabel,
  holdingCount,
  pieceName,
  statusPills,
  trackingLabel,
  trackingLong,
  type TypeHolding,
} from "./equipment-format";

export type EquipmentAction =
  | { mode: "report" | "archive"; piece: EquipmentDto }
  | { mode: "add" | "edit"; holding: TypeHolding }
  | { mode: "damage" | "quantity"; stock: EquipmentStockDto };

type OnAction = (action: EquipmentAction) => void;

const dangerLink = "text-error hover:text-error-texto";

function UnitActions({
  piece,
  onAction,
}: {
  piece: EquipmentDto;
  onAction: OnAction;
}) {
  return (
    <span className="inline-flex gap-4">
      <Button
        variant="link"
        onClick={() => onAction({ mode: "report", piece })}
      >
        Registrar falla
      </Button>
      <Button
        variant="link"
        className={dangerLink}
        onClick={() => onAction({ mode: "archive", piece })}
      >
        Dar de baja
      </Button>
    </span>
  );
}

// OpcionA420: one card of stacked rows, the name and its actions on the
// left and the state's pill on the right.
function UnitRows({
  units,
  onAction,
}: {
  units: readonly EquipmentDto[];
  onAction: OnAction;
}) {
  return (
    <ul className="rounded-marco bg-lino">
      {units.map((piece) => {
        const pill = statusPills[piece.status];
        return (
          <li
            key={piece.id}
            className="flex items-start gap-3 border-t border-divisor px-4 py-3 first:border-t-0"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-cuerpo font-medium text-texto">
                {pieceName(piece)}
              </p>
              <UnitActions piece={piece} onAction={onAction} />
            </div>
            <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
          </li>
        );
      })}
    </ul>
  );
}

function UnitTable({
  units,
  onAction,
}: {
  units: readonly EquipmentDto[];
  onAction: OnAction;
}) {
  const narrow = useIsNarrowViewport();
  if (units.length === 0) {
    return (
      <p className="rounded-marco bg-lino px-4 py-3 text-nota text-texto-tenue">
        Sin unidades en esta sucursal.
      </p>
    );
  }
  if (narrow) return <UnitRows units={units} onAction={onAction} />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Equipo</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {units.map((piece) => {
          const pill = statusPills[piece.status];
          return (
            <TableRow key={piece.id}>
              <TableCell data-label="Equipo" className="font-medium">
                {pieceName(piece)}
              </TableCell>
              <TableCell data-label="Estado">
                <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
              </TableCell>
              <TableCell className="md:text-right">
                <UnitActions piece={piece} onAction={onAction} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function QuantityCard({
  stock,
  onAction,
}: {
  stock: EquipmentStockDto;
  onAction: OnAction;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-marco bg-lino px-5 py-4 max-md:p-4">
      <p className="flex items-baseline gap-2 max-md:w-full">
        <span className="font-serif text-[28px] leading-none text-texto tabular">
          {stock.quantity}
        </span>
        <span className="text-nota text-texto-tenue">en esta sucursal</span>
      </p>
      <StatusPill tone="exito">{`${stock.usable} se pueden usar`}</StatusPill>
      {stock.damaged > 0 ? (
        <StatusPill tone="advertencia">
          {damagedLabel(stock.damaged)}
        </StatusPill>
      ) : null}
      <span className="flex-1 max-md:hidden" />
      <span className="flex gap-4 max-md:w-full">
        <Button
          variant="link"
          size="sm"
          disabled={stock.usable <= 0}
          onClick={() => onAction({ mode: "damage", stock })}
        >
          Registrar daño
        </Button>
        <Button
          variant="link"
          size="sm"
          onClick={() => onAction({ mode: "quantity", stock })}
        >
          Cambiar cantidad
        </Button>
      </span>
    </div>
  );
}

function TypeSection({
  holding,
  canEditTypes,
  onAction,
}: {
  holding: TypeHolding;
  canEditTypes: boolean;
  onAction: OnAction;
}) {
  const titleId = useId();
  const narrow = useIsNarrowViewport();
  const { type } = holding;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <div className="flex items-center gap-3 max-md:gap-2">
        <h2
          id={titleId}
          className="min-w-0 font-serif text-[19px] text-texto max-md:flex-1"
        >
          {type.name}{" "}
          <span className="text-texto-tenue tabular">
            · {holdingCount(holding)}
          </span>
        </h2>
        <span className="text-nota text-texto-tenue max-md:hidden">
          {trackingLabel[type.tracking]}
        </span>
        <span className="flex-1 max-md:hidden" />
        {holding.tracking === "unit" ? (
          <Button
            variant="link"
            size="sm"
            onClick={() => onAction({ mode: "add", holding })}
          >
            <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
            Agregar
          </Button>
        ) : null}
        {canEditTypes ? (
          <Button
            variant="link"
            size="sm"
            onClick={() => onAction({ mode: "edit", holding })}
          >
            {narrow ? "Editar" : "Editar tipo"}
          </Button>
        ) : null}
      </div>
      <p className="-mt-1 text-nota text-texto-tenue md:hidden">
        {trackingLong[type.tracking]}
      </p>
      {holding.tracking === "unit" ? (
        <UnitTable units={holding.units} onAction={onAction} />
      ) : (
        <QuantityCard stock={holding.stock} onAction={onAction} />
      )}
    </section>
  );
}

// FIX-067 option A: one section per type, in the studio's type order.
export function EquipmentSections({
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
      <p className="rounded-marco bg-lino px-4 py-3 text-nota text-texto-tenue">
        Todavía no hay tipos de equipo.
      </p>
    );
  }
  return (
    <>
      {holdings.map((holding) => (
        <TypeSection
          key={holding.type.id}
          holding={holding}
          canEditTypes={canEditTypes}
          onAction={onAction}
        />
      ))}
    </>
  );
}
