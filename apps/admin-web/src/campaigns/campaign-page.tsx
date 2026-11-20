import { formatListDate, type PastCampaignDto } from "@pilates/api-contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { isApiError } from "../api/problem";
import { PageHeader } from "../components/page/page-header";
import { PageNotice } from "../components/page/page-notice";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { DataTable } from "../components/table/data-table";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { grantedLine, owedLine } from "./campaign-copy";
import {
  campaignSchema,
  type CampaignInput,
  type CampaignOutput,
} from "./campaign-form";
import { CampaignPanel } from "./campaign-panel";
import {
  campaignPreviewQueryOptions,
  useCampaignGrant,
} from "./campaign-queries";

const failureMessage = (error: unknown): string => {
  if (!isApiError(error)) {
    return "No pudimos dar las clases. Inténtalo de nuevo.";
  }
  if (error.code === "administration_access_denied") {
    return "No tienes permiso para crear una campaña.";
  }
  return "No pudimos dar las clases. Inténtalo de nuevo.";
};

// The API keeps each campaign's name and its latest grant only, so the
// history has no count of Clients or classes (FIX-091 gap).
const historyColumns: ColumnDef<PastCampaignDto>[] = [
  { accessorKey: "name", header: "Campaña" },
  {
    id: "grantedAt",
    header: "Fecha",
    cell: ({ row }) => formatListDate(row.original.grantedAt),
    meta: { align: "right" },
  },
];

// AW21 (BKM-015): the Administrator grants extra classes for a campaign, a
// start of year or a holiday, to every active Client, founders included
// (FIX-064). A Client without a current Plan is named: her next Plan collects
// the classes. Never a discount. FIX-091 (W13 A): the campaigns already
// given, and the form in the «Nueva campaña» panel.
export function CampaignPage() {
  const preview = useQuery(campaignPreviewQueryOptions());
  const queryClient = useQueryClient();
  const grant = useCampaignGrant();
  const [panelOpen, setPanelOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<{
    granted: number;
    classes: number;
    owed: string | null;
  } | null>(null);
  const form = useForm<CampaignInput, unknown, CampaignOutput>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { name: "", classes: "1" },
  });

  // Closing the panel discards what was typed (side-panel convention).
  const changePanel = (open: boolean) => {
    if (!open) form.reset();
    setFailure(null);
    setPanelOpen(open);
  };

  const confirm = async () => {
    const values = campaignSchema.parse(form.getValues());
    try {
      const granted = await grant.mutateAsync(values);
      // An older backend answers without `owed`.
      const owed = granted.owed ?? [];
      setResult({
        granted: granted.granted.length + owed.length,
        classes: granted.classes,
        owed: owedLine(owed),
      });
      // Walkthrough finding 92: an empty form cannot give the classes twice,
      // and the refreshed preview now names this campaign as given.
      form.reset();
      void queryClient.invalidateQueries({
        queryKey: campaignPreviewQueryOptions().queryKey,
      });
      setConfirming(false);
      setPanelOpen(false);
    } catch (error) {
      setFailure(failureMessage(error));
      setConfirming(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Clases de campaña"
        subtitle="Clases extra para el inicio de año o las vacaciones. No cambia ningún precio."
        actions={
          preview.data === undefined ? undefined : (
            <Button onClick={() => changePanel(true)}>Nueva campaña</Button>
          )
        }
      />
      {result === null ? null : (
        <PageNotice>
          {`${grantedLine(result.granted, result.classes)} ${result.owed ?? ""}`.trim()}
        </PageNotice>
      )}
      {preview.isPending ? (
        <LoadingNotice>Cargando las clientas…</LoadingNotice>
      ) : preview.isError ? (
        <QueryFailure
          error={preview.error}
          what="las clientas de la campaña"
          onRetry={() => void preview.refetch()}
        />
      ) : (
        <>
          <section aria-label="Campañas dadas" className="flex flex-col gap-3">
            <DataTable
              columns={historyColumns}
              // An older backend answers without `pastCampaigns`.
              rows={preview.data.pastCampaigns ?? []}
              rowId={(campaign) => campaign.name}
              emptyMessage="Aún no diste ninguna campaña."
            />
          </section>
          <CampaignPanel
            open={panelOpen}
            onOpenChange={changePanel}
            form={form}
            preview={preview.data}
            failure={failure}
            onSubmit={() => {
              setFailure(null);
              setConfirming(true);
            }}
          />
        </>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿Dar las clases de campaña?"
        confirmLabel="Confirmar campaña"
        tone="primary"
        busy={grant.isPending}
        onConfirm={() => void confirm()}
      >
        <p>
          Cada clienta activa recibe las clases: en su plan vigente o, si no
          tiene uno, en su próximo plan. Ningún precio cambia.
        </p>
      </ConfirmDialog>
    </div>
  );
}
