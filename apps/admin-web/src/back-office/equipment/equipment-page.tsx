import type { EquipmentDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
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
import { useAdminRole } from "../../session/admin-role";
import type { Branch } from "../../shell/branch/branch-context";
import { useBranchSelection } from "../../shell/branch/use-branch-selection";
import { backOfficeProblem } from "../back-office-problems";
import { AddUnitForm, ReportIssueForm } from "./equipment-forms";
import { holdingsOf, holdsNone, pieceName, plural } from "./equipment-format";
import { EquipmentIssuesCard } from "./equipment-issues-card";
import {
  branchEquipmentQueryOptions,
  branchIssuesQueryOptions,
  branchStocksQueryOptions,
  equipmentTypesQueryOptions,
  useEquipmentChange,
} from "./equipment-queries";
import { EquipmentTable } from "./equipment-table";
import type { EquipmentAction } from "./equipment-type-detail";
import { DamageForm, QuantityForm } from "./equipment-stock-forms";
import { EditTypeForm, NewTypeForm } from "./equipment-type-forms";

type Panel = { mode: "closed" } | { mode: "create-type" } | EquipmentAction;

const panelTitle = (panel: Panel): string => {
  switch (panel.mode) {
    case "create-type":
      return "Nuevo tipo de equipo";
    case "report":
      return `Registrar falla · ${pieceName(panel.piece)}`;
    case "add":
      return `Agregar ${panel.holding.type.name}`;
    case "edit":
      return `Editar tipo · ${panel.holding.type.name}`;
    case "damage":
      return `Registrar daño · ${panel.stock.typeName}`;
    case "quantity":
      return `Cambiar cantidad · ${panel.stock.typeName}`;
    default:
      return "";
  }
};

function BranchEquipment({ branch }: { branch: Branch }) {
  const administrator = useAdminRole() === "administrator";
  const types = useQuery(equipmentTypesQueryOptions());
  const equipment = useQuery(branchEquipmentQueryOptions(branch.id));
  const stocks = useQuery(branchStocksQueryOptions(branch.id));
  const openIssues = useQuery(branchIssuesQueryOptions(branch.id, "open"));
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
      done(`Dimos de baja ${pieceName(piece)}.`);
    } catch (error) {
      close();
      setFailure(backOfficeProblem(error).message);
    }
  };

  const reads = [types, equipment, stocks] as const;
  const failed = reads.find((read) => read.isError);
  const holdings =
    types.data && equipment.data && stocks.data
      ? holdingsOf(types.data, equipment.data, stocks.data, branch.id)
      : undefined;
  const subtitle =
    holdings === undefined || openIssues.data === undefined
      ? `Sucursal ${branch.name}`
      : `Sucursal ${branch.name} · ${plural(holdings.length, "tipo de equipo", "tipos de equipo")} · ${plural(openIssues.data.length, "falla abierta", "fallas abiertas")}`;
  const sidePanel = panel.mode !== "closed" && panel.mode !== "archive";

  return (
    <article className="flex flex-col gap-5">
      <PageHeader
        title="Equipos"
        subtitle={subtitle}
        actions={
          administrator ? (
            <Button onClick={() => open({ mode: "create-type" })}>
              <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
              Nuevo tipo de equipo
            </Button>
          ) : undefined
        }
      />
      {notice === null ? null : <PageNotice>{notice}</PageNotice>}
      {failure === null ? null : (
        <p role="alert" className="text-nota text-error-texto">
          {failure}
        </p>
      )}
      {failed !== undefined ? (
        <QueryFailure
          error={failed.error}
          what="los equipos"
          onRetry={() => reads.forEach((read) => void read.refetch())}
        />
      ) : holdings === undefined ? (
        <LoadingNotice>Cargando equipos…</LoadingNotice>
      ) : (
        <>
          <EquipmentIssuesCard branchId={branch.id} onNotice={setNotice} />
          <EquipmentTable
            holdings={holdings}
            canEditTypes={administrator}
            onAction={open}
          />
        </>
      )}
      <SidePanel
        open={sidePanel}
        onOpenChange={(isOpen) => {
          if (!isOpen) close();
        }}
        title={panelTitle(panel)}
      >
        {panel.mode === "create-type" ? (
          <NewTypeForm branch={branch} onDone={done} />
        ) : panel.mode === "report" ? (
          <ReportIssueForm
            branchId={branch.id}
            equipment={{ id: panel.piece.id, name: pieceName(panel.piece) }}
            onDone={done}
          />
        ) : panel.mode === "add" && panel.holding.tracking === "unit" ? (
          <AddUnitForm
            branchId={branch.id}
            type={panel.holding.type}
            onDone={done}
          />
        ) : panel.mode === "edit" ? (
          <EditTypeForm
            branchId={branch.id}
            type={panel.holding.type}
            removable={holdsNone(panel.holding)}
            onDone={done}
          />
        ) : panel.mode === "damage" ? (
          <DamageForm branchId={branch.id} stock={panel.stock} onDone={done} />
        ) : panel.mode === "quantity" ? (
          <QuantityForm branch={branch} stock={panel.stock} onDone={done} />
        ) : null}
      </SidePanel>
      <ConfirmDialog
        open={panel.mode === "archive"}
        onOpenChange={(isOpen) => {
          if (!isOpen) close();
        }}
        title={
          panel.mode === "archive"
            ? `¿Dar de baja ${pieceName(panel.piece)}?`
            : ""
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

// AW37 (BKO-004, ADR-0106, FIX-067): the selected Branch's equipment by
// studio type, numbered units or a count, their faults, and what works.
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
