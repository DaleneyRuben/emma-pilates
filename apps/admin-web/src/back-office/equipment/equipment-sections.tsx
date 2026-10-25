import type { EquipmentDto } from "@pilates/api-contracts";
import { useId } from "react";
import { Button } from "../../components/ui/button";
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
  equipmentKinds,
  equipmentName,
  kindPlural,
  statusPills,
  type EquipmentKind,
} from "./equipment-format";

export type EquipmentAction = (
  action: "report" | "archive",
  piece: EquipmentDto,
) => void;

function KindSection({
  kind,
  items,
  onAction,
}: {
  kind: EquipmentKind;
  items: readonly EquipmentDto[];
  onAction: EquipmentAction;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="font-serif text-[19px] text-texto">
        {kindPlural[kind]}{" "}
        <span className="text-texto-tenue tabular">· {items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className="rounded-tarjeta border border-borde bg-blanco px-4 py-3 text-nota text-texto-tenue">
          {`Sin ${kindPlural[kind].toLowerCase()} registrados.`}
        </p>
      ) : (
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
            {items.map((piece) => {
              const pill = statusPills[piece.status];
              return (
                <TableRow key={piece.id}>
                  <TableCell data-label="Equipo" className="font-medium">
                    {equipmentName(piece.kind, piece.number)}
                  </TableCell>
                  <TableCell data-label="Estado">
                    <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                  </TableCell>
                  <TableCell className="md:text-right">
                    <span className="inline-flex gap-4">
                      <Button
                        variant="link"
                        onClick={() => onAction("report", piece)}
                      >
                        Registrar falla
                      </Button>
                      <Button
                        variant="link"
                        className="text-error hover:text-error-texto"
                        onClick={() => onAction("archive", piece)}
                      >
                        Dar de baja
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

// AW37: one section per kind, reformers, cadillacs, then mats.
export function EquipmentSections({
  items,
  onAction,
}: {
  items: readonly EquipmentDto[];
  onAction: EquipmentAction;
}) {
  return (
    <>
      {equipmentKinds.map(([kind]) => (
        <KindSection
          key={kind}
          kind={kind}
          items={items.filter((piece) => piece.kind === kind)}
          onAction={onAction}
        />
      ))}
    </>
  );
}
