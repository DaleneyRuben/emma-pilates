import type { EquipmentDto, EquipmentStockDto } from "@pilates/api-contracts";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { StatusPill } from "../../components/ui/status-pill";
import {
  damagedLabel,
  holdingCount,
  pieceName,
  statusPills,
  trackingLong,
  type TypeHolding,
} from "./equipment-format";

export type EquipmentAction =
  | { mode: "report" | "archive"; piece: EquipmentDto }
  | { mode: "add" | "edit"; holding: TypeHolding }
  | { mode: "damage" | "quantity"; stock: EquipmentStockDto };

export type OnAction = (action: EquipmentAction) => void;

const emptyNote =
  "rounded-tarjeta bg-superficie shadow-tarjeta px-4 py-3 text-nota text-texto";

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
        onClick={() => onAction({ mode: "archive", piece })}
      >
        Dar de baja
      </Button>
    </span>
  );
}

// One Crema block of divided rows: the unit's name and state on the left,
// its actions on the right (stacked under the name at phone width).
function UnitRows({
  units,
  onAction,
}: {
  units: readonly EquipmentDto[];
  onAction: OnAction;
}) {
  if (units.length === 0) {
    return <p className={emptyNote}>Sin unidades en esta sucursal.</p>;
  }
  return (
    <ul className="rounded-tarjeta bg-superficie shadow-tarjeta">
      {units.map((piece) => {
        const pill = statusPills[piece.status];
        return (
          <li
            key={piece.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-borde px-4 py-3 first:border-t-0"
          >
            <p className="min-w-[120px] text-cuerpo font-medium text-texto">
              {pieceName(piece)}
            </p>
            <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
            <span className="flex-1" />
            <UnitActions piece={piece} onAction={onAction} />
          </li>
        );
      })}
    </ul>
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
    <div className="flex flex-wrap items-center gap-3 rounded-tarjeta bg-superficie shadow-tarjeta px-5 py-4 max-md:p-4">
      <p className="flex items-baseline gap-2 max-md:w-full">
        <span className="font-serif text-cifra leading-none text-texto tabular">
          {stock.quantity}
        </span>
        <span className="text-nota text-texto">en esta sucursal</span>
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
          disabled={stock.usable <= 0}
          onClick={() => onAction({ mode: "damage", stock })}
        >
          Registrar daño
        </Button>
        <Button
          variant="link"
          onClick={() => onAction({ mode: "quantity", stock })}
        >
          Cambiar cantidad
        </Button>
      </span>
    </div>
  );
}

// FIX-091 (W10 A): what «Ver» opens under a type's row: its units or its
// stock, with every action the type's former section had.
export function TypeDetail({
  id,
  holding,
  canEditTypes,
  onAction,
}: {
  id: string;
  holding: TypeHolding;
  canEditTypes: boolean;
  onAction: OnAction;
}) {
  const { type } = holding;
  return (
    <section
      id={id}
      aria-label={`${type.name} · ${holdingCount(holding)}`}
      className="flex flex-col gap-2"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-nota text-texto">{trackingLong[type.tracking]}</p>
        <span className="flex-1" />
        {holding.tracking === "unit" ? (
          <Button
            variant="link"
            onClick={() => onAction({ mode: "add", holding })}
          >
            <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
            Agregar
          </Button>
        ) : null}
        {canEditTypes ? (
          <Button
            variant="link"
            onClick={() => onAction({ mode: "edit", holding })}
          >
            Editar tipo
          </Button>
        ) : null}
      </div>
      {holding.tracking === "unit" ? (
        <UnitRows units={holding.units} onAction={onAction} />
      ) : (
        <QuantityCard stock={holding.stock} onAction={onAction} />
      )}
    </section>
  );
}
