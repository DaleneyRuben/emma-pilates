import {
  type AdminClientDetailDto,
  formatListDate,
  getAdminClient,
  getGetAdminClientQueryKey,
} from "@pilates/api-contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useId, useState, type ReactNode } from "react";
import { adminFetch } from "../../api/fetcher";
import { isApiError } from "../../api/problem";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { ActionList } from "../../components/panel/action-rows";
import { SummaryBlock, SummaryRow } from "../../components/panel/summary-rows";
import { ClientPhoto } from "../../components/client-photo";
import { Button } from "../../components/ui/button";
import { InlineError } from "../../components/ui/inline-error";
import { StatusPill } from "../../components/ui/status-pill";
import { PageNotice } from "../../components/page/page-notice";
import { useAdminRole, type AdminRole } from "../../session/admin-role";
import { AllowanceAdjustmentAction } from "./allowance-adjustment-action";
import { ClientAcquisitionBlock } from "./client-acquisition-block";
import { ClientBookingsTab } from "./client-bookings-tab";
import { ClientEvaluationsTab } from "./client-evaluations-tab";
import { ClientFileTabs, type ClientFileTab } from "./client-file-tabs";
import { ClientPaymentsTab } from "./client-payments-tab";
import { ClientPhone } from "./client-phone";
import { ClientPlanBlock } from "./client-plan-block";
import { ClientProfileForm } from "./client-profile-form";
import { CloseClientAccountAction } from "./close-client-account-action";
import { CourtesyAccessAction } from "./courtesy-access-action";

const clientDetailQueryOptions = (clientId: string) =>
  queryOptions({
    queryKey: getGetAdminClientQueryKey(clientId),
    queryFn: async ({ signal }) =>
      (await getAdminClient(clientId, { signal }, adminFetch))
        .data as AdminClientDetailDto,
    // The summary decides a closure (follow-up 66), so every opening reads
    // the current Bookings and Plan instead of a cached copy.
    staleTime: 0,
  });

// FIX-091 (W7 B): the Administrator's actions on her file, one row each at
// the end of Resumen. A deactivated account keeps only the Plan's classes
// (AW22: nothing left to grant or close).
function ClientActions({
  client,
  onGranted,
  onClosed,
}: {
  client: AdminClientDetailDto;
  onGranted: (notice: string) => void;
  onClosed: (notice: string) => void;
}) {
  const open = client.accountStatus !== "disabled";
  const active = client.subscription.status === "active";
  if (!open && !active) return null;
  return (
    <ActionList title="Acciones">
      {active ? (
        <>
          <AllowanceAdjustmentAction clientId={client.id} reason="courtesy" />
          <AllowanceAdjustmentAction
            clientId={client.id}
            reason="class_return"
          />
        </>
      ) : null}
      {/* REL-011: only without an active Plan. */}
      {open && !active ? (
        <CourtesyAccessAction client={client} onGranted={onGranted} />
      ) : null}
      {open ? (
        <CloseClientAccountAction client={client} onClosed={onClosed} />
      ) : null}
    </ActionList>
  );
}

function ClientSummary({
  client,
  contact,
  role,
  actions,
}: {
  client: AdminClientDetailDto;
  contact: ReactNode;
  role: AdminRole;
  actions: ReactNode;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <ClientPhoto name={client.name} photo={client.photo} size={40} />
        <p className="tipo-compacto text-texto">
          Clienta desde {formatListDate(client.clientSince)}
        </p>
      </div>
      {client.accountStatus === "pending" ? (
        <div className="flex flex-col gap-1 rounded-control border border-borde-fuerte bg-aviso px-3 py-2">
          <StatusPill tone="advertencia">Pendiente de activación</StatusPill>
          <p className="tipo-secundario text-texto">
            Todavía no abrió el enlace del correo para crear su contraseña.
          </p>
        </div>
      ) : null}
      {client.accountStatus === "disabled" ? (
        <StatusPill tone="neutral">Cuenta desactivada</StatusPill>
      ) : null}
      {contact}
      <ClientPlanBlock view={client.subscription} />
      <SummaryBlock title="Referidos">
        <SummaryRow label="Clientas referidas" figure>
          {client.referredClientCount === 0
            ? "Ninguna todavía"
            : client.referredClientCount}
        </SummaryRow>
        <SummaryRow label="Código">
          <span className="rounded-control border border-borde-fuerte bg-superficie-hundida px-2 py-0.5 tipo-titulo-fila text-texto tabular">
            {client.referralCode}
          </span>
        </SummaryRow>
      </SummaryBlock>
      {role === "administrator" ? (
        <ClientAcquisitionBlock clientId={client.id} />
      ) : null}
      {actions}
    </>
  );
}

function ContactBlock({ client }: { client: AdminClientDetailDto }) {
  return (
    <SummaryBlock title="Contacto">
      <SummaryRow label="Correo">{client.email}</SummaryRow>
      <SummaryRow label="Teléfono">
        <ClientPhone phone={client.phone} />
      </SummaryRow>
    </SummaryBlock>
  );
}

// AW22: a support summary of one Client. «Editar perfil» corrects the name
// and phone (IDN-009, follow-up 156); closing the Account (follow-up 66) is
// the Administrator's alone (ADR-0102). Follow-up 232 (WEB-040) makes it a
// file with tabs: Resumen (this summary and its actions), Reservas, Pagos
// (the Administrator's alone), and Evaluaciones; each other tab reads its
// list only when opened.
export function ClientDetailPanel({
  clientId,
  onClosed,
}: {
  clientId: string;
  onClosed: (notice: string) => void;
}) {
  const query = useQuery(clientDetailQueryOptions(clientId));
  const [granted, setGranted] = useState<string | null>(null);
  const role = useAdminRole();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<ClientFileTab>("resumen");
  const panelBase = useId();

  return (
    <>
      <ClientFileTabs
        role={role}
        value={tab}
        onChange={setTab}
        panelBase={panelBase}
      />
      <SidePanelBody>
        <div
          role="tabpanel"
          id={`${panelBase}-${tab}`}
          className="flex flex-col gap-5"
        >
          {tab === "reservas" ? (
            <ClientBookingsTab clientId={clientId} />
          ) : tab === "pagos" ? (
            <ClientPaymentsTab
              clientId={clientId}
              clientName={query.data?.name ?? ""}
            />
          ) : tab === "evaluaciones" ? (
            <ClientEvaluationsTab clientId={clientId} />
          ) : query.isPending ? (
            <LoadingNotice>Cargando la ficha…</LoadingNotice>
          ) : query.isError ? (
            isApiError(query.error) &&
            query.error.code === "client_not_found" ? (
              <InlineError>Esta clienta ya no existe.</InlineError>
            ) : (
              <QueryFailure
                error={query.error}
                what="la ficha de la clienta"
                onRetry={() => void query.refetch()}
              />
            )
          ) : (
            <>
              {saved ? (
                <PageNotice>Guardamos los cambios del perfil.</PageNotice>
              ) : null}
              <ClientSummary
                client={query.data}
                role={role}
                actions={
                  role === "administrator" ? (
                    <ClientActions
                      client={query.data}
                      onGranted={setGranted}
                      onClosed={onClosed}
                    />
                  ) : null
                }
                contact={
                  editing ? (
                    <ClientProfileForm
                      client={query.data}
                      onCancel={() => setEditing(false)}
                      onSaved={() => {
                        setEditing(false);
                        setSaved(true);
                      }}
                    />
                  ) : (
                    <ContactBlock client={query.data} />
                  )
                }
              />
            </>
          )}
        </div>
      </SidePanelBody>
      {/* AW22: a deactivated account has nothing left to edit or close. */}
      {tab !== "resumen" ||
      query.data === undefined ||
      query.data.accountStatus === "disabled" ||
      (editing && granted === null) ? null : (
        <SidePanelFooter>
          {granted === null ? null : (
            <p role="status" className="tipo-secundario text-texto">
              {granted}
            </p>
          )}
          {editing ? null : (
            <Button
              className="self-end"
              onClick={() => {
                setSaved(false);
                setEditing(true);
              }}
            >
              Editar perfil
            </Button>
          )}
        </SidePanelFooter>
      )}
    </>
  );
}
