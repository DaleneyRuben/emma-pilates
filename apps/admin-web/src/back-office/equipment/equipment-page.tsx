import type { EquipmentDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { isForbidden } from "../../components/page/is-forbidden";
import { NoBranchPage } from "../../components/page/no-branch-page";
import { PageHeader } from "../../components/page/page-header";
import { PageNotice } from "../../components/page/page-notice";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import { SidePanel } from "../../components/panel/side-panel";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import type { Branch } from "../../shell/branch/branch-context";
import { useBranchSelection } from "../../shell/branch/use-branch-selection";
import { backOfficeProblem } from "../back-office-problems";
import { NewEquipmentForm, ReportIssueForm } from "./equipment-forms";
import { equipmentName } from "./equipment-format";
import { EquipmentIssuesCard } from "./equipment-issues-card";
import {
  branchEquipmentQueryOptions,
  useEquipmentChange,
} from "./equipment-queries";
import { EquipmentSections } from "./equipment-sections";

type Panel =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "report"; piece: EquipmentDto }
  | { mode: "archive"; piece: EquipmentDto };

const subtitle = (
  branch: Branch,
  items: readonly EquipmentDto[] | undefined,
) => {
  if (items === undefined) return `Sucursal ${branch.name}`;
  const out = items.filter((piece) => piece.status === "out_of_service").length;
  const count = items.length === 1 ? "1 equipo" : `${items.length} equipos`;
  return `Sucursal ${branch.name} · ${count} · ${out} fuera de servicio`;
};

const nameOf = (piece: EquipmentDto) => equipmentName(piece.kind, piece.number);

function EmptyEquipment({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-tarjeta border border-borde bg-blanco px-6 py-10 text-center">
      <p className="text-texto-secundario">
        Todavía no hay equipos en esta sucursal.
      </p>
      <p className="text-nota text-texto-tenue">
        Registra cada reformer, cadillac y mat con su número para llevar sus
        fallas.
      </p>
      <Button onClick={onCreate}>Nuevo equipo</Button>
    </div>
  );
}

function BranchEquipment({ branch }: { branch: Branch }) {
  const equipment = useQuery(branchEquipmentQueryOptions(branch.id));
  const change = useEquipmentChange(branch.id);
  const [panel, setPanel] = useState<Panel>({ mode: "closed" });
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const close = () => setPanel({ mode: "closed" });
  const done = (message: string) => {
    close();
    setNotice(message);
  };
  const open = (next: Panel) => {
    setNotice(null);
    setFailure(null);
    setPanel(next);
  };

  const archive = async (piece: EquipmentDto) => {
    try {
      await change.mutateAsync({ kind: "archive", equipmentId: piece.id });
      done(`Dimos de baja ${nameOf(piece)}.`);
    } catch (error) {
      close();
      setFailure(backOfficeProblem(error).message);
    }
  };

  return (
    <article className="flex flex-col gap-5">
      <PageHeader
        title="Equipos"
        subtitle={subtitle(branch, equipment.data)}
        actions={
          isForbidden(equipment.error) ? undefined : (
            <Button onClick={() => open({ mode: "create" })}>
              <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
              Nuevo equipo
            </Button>
          )
        }
      />
      {notice === null ? null : <PageNotice>{notice}</PageNotice>}
      {failure === null ? null : (
        <p role="alert" className="text-nota text-error-texto">
          {failure}
        </p>
      )}
      {equipment.isPending ? (
        <LoadingNotice>Cargando equipos…</LoadingNotice>
      ) : equipment.isError ? (
        <QueryFailure
          error={equipment.error}
          what="los equipos"
          onRetry={() => void equipment.refetch()}
        />
      ) : equipment.data.length === 0 ? (
        <EmptyEquipment onCreate={() => open({ mode: "create" })} />
      ) : (
        <>
          <EquipmentIssuesCard branchId={branch.id} onNotice={setNotice} />
          <EquipmentSections
            items={equipment.data}
            onAction={(mode, piece) => open({ mode, piece })}
          />
        </>
      )}
      <SidePanel
        open={panel.mode === "create" || panel.mode === "report"}
        onOpenChange={(isOpen) => {
          if (!isOpen) close();
        }}
        title={
          panel.mode === "report"
            ? `Registrar falla · ${nameOf(panel.piece)}`
            : "Nuevo equipo"
        }
      >
        {panel.mode === "report" ? (
          <ReportIssueForm
            branchId={branch.id}
            equipment={{ id: panel.piece.id, name: nameOf(panel.piece) }}
            onDone={done}
          />
        ) : (
          <NewEquipmentForm branchId={branch.id} onDone={done} />
        )}
      </SidePanel>
      <ConfirmDialog
        open={panel.mode === "archive"}
        onOpenChange={(isOpen) => {
          if (!isOpen) close();
        }}
        title={
          panel.mode === "archive" ? `¿Dar de baja ${nameOf(panel.piece)}?` : ""
        }
        confirmLabel="Dar de baja"
        busy={change.isPending}
        onConfirm={() => {
          if (panel.mode === "archive") void archive(panel.piece);
        }}
      >
        <p>
          Deja de aparecer en la lista y de contar para las clases. Sus fallas
          quedan en el historial.
        </p>
      </ConfirmDialog>
    </article>
  );
}

// AW37 (BKO-004, ADR-0106): the selected Branch's reformers, cadillacs, and
// mats, their faults, and whether each one works.
export function EquipmentPage() {
  const { selectedBranch, status } = useBranchSelection();
  if (selectedBranch === undefined) {
    return (
      <NoBranchPage
        title="Equipos"
        pending={status === "pending"}
        loadingMessage="Cargando equipos…"
        emptyMessage="Todavía no hay sucursales activas. Crea una en Sucursales para registrar sus equipos."
      />
    );
  }
  return <BranchEquipment key={selectedBranch.id} branch={selectedBranch} />;
}
