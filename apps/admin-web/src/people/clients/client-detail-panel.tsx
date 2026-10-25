import {
  getAdminClient,
  getGetAdminClientQueryKey,
  type AdminClientDetailDto,
} from "@pilates/api-contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
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
import { SummaryBlock, SummaryRow } from "../../components/panel/summary-rows";
import { Button } from "../../components/ui/button";
import { StatusPill } from "../../components/ui/status-pill";
import { PageNotice } from "../../components/page/page-notice";
import { formatCivilDate } from "../../lib/bolivia-time";
import { useAdminRole, type AdminRole } from "../../session/admin-role";
import { AllowanceAdjustmentAction } from "./allowance-adjustment-action";
import { ClientAcquisitionBlock } from "./client-acquisition-block";
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

function PlanBlock({
  clientId,
  view,
  role,
}: {
  clientId: string;
  view: AdminClientDetailDto["subscription"];
  role: AdminRole;
}) {
  const current = view.subscription;
  if (current === null || current === undefined || view.status === "none") {
    return (
      <SummaryBlock title="Plan">
        <SummaryRow label="Plan">
          <span className="text-texto-muy-tenue">Sin plan activo</span>
        </SummaryRow>
      </SummaryBlock>
    );
  }
  if (view.status === "expired") {
    return (
      <SummaryBlock title="Plan">
        <SummaryRow label="Plan">
          <span className="flex items-center justify-end gap-2">
            <span className="text-texto-muy-tenue">Sin plan activo</span>
            <StatusPill tone="error">Expirado</StatusPill>
          </span>
        </SummaryRow>
        <p className="px-3 py-2 text-ayuda text-texto-tenue">
          Último plan vencido el {formatCivilDate(current.endsOn)}.
        </p>
      </SummaryBlock>
    );
  }
  return (
    <SummaryBlock title="Plan">
      <SummaryRow label="Plan">
        <span className="flex items-center justify-end gap-2">
          {current.planName}
          <StatusPill tone="exito">Activo</StatusPill>
        </span>
      </SummaryRow>
      <SummaryRow label="Vigencia">
        <span className="tabular">
          {formatCivilDate(current.startsOn)} –{" "}
          {formatCivilDate(current.endsOn)}
        </span>
      </SummaryRow>
      {/* Every Plan grants a fixed number of classes (follow-up 11). */}
      <SummaryRow label="Clases disponibles" figure>
        {current.remainingClassAllowance} de {current.originalClassAllowance}
      </SummaryRow>
      {current.extraClassesLine ? (
        <p className="px-3 py-2 text-nota text-texto">
          {current.extraClassesLine}
        </p>
      ) : null}
      {view.status === "active" && role === "administrator" ? (
        <div className="flex flex-wrap gap-2 px-3 py-2">
          <AllowanceAdjustmentAction clientId={clientId} reason="courtesy" />
          <AllowanceAdjustmentAction
            clientId={clientId}
            reason="class_return"
          />
        </div>
      ) : null}
    </SummaryBlock>
  );
}

function ClientSummary({
  client,
  contact,
  role,
}: {
  client: AdminClientDetailDto;
  contact: ReactNode;
  role: AdminRole;
}) {
  return (
    <>
      <p className="text-nota text-texto-tenue">
        Cliente desde {formatCivilDate(client.clientSince)}
      </p>
      {client.accountStatus === "pending" ? (
        <div className="flex flex-col gap-1 rounded-control border border-advertencia/40 bg-advertencia/10 px-3 py-2">
          <StatusPill tone="advertencia">Pendiente de activación</StatusPill>
          <p className="text-ayuda text-advertencia-texto">
            Todavía no abrió el enlace del correo para crear su contraseña.
          </p>
        </div>
      ) : null}
      {client.accountStatus === "disabled" ? (
        <StatusPill tone="neutral">Cuenta desactivada</StatusPill>
      ) : null}
      {contact}
      <PlanBlock clientId={client.id} view={client.subscription} role={role} />
      <SummaryBlock title="Referidos">
        <SummaryRow label="Clientas referidas" figure>
          {client.referredClientCount === 0
            ? "Ninguna todavía"
            : client.referredClientCount}
        </SummaryRow>
        <SummaryRow label="Código">
          <span className="rounded-control border border-borde bg-blanco px-2 py-0.5 font-mono text-ayuda tracking-wider text-texto-secundario">
            {client.referralCode}
          </span>
        </SummaryRow>
      </SummaryBlock>
      {role === "administrator" ? (
        <ClientAcquisitionBlock clientId={client.id} />
      ) : null}
    </>
  );
}

function ContactBlock({ client }: { client: AdminClientDetailDto }) {
  return (
    <SummaryBlock title="Contacto">
      <SummaryRow label="Correo">{client.email}</SummaryRow>
      <SummaryRow label="Teléfono">
        {client.phone === null ? (
          <span className="text-texto-muy-tenue">Sin teléfono</span>
        ) : (
          <span className="tabular">{client.phone}</span>
        )}
      </SummaryRow>
    </SummaryBlock>
  );
}

// AW22: a support summary of one Client. «Editar perfil» corrects the name
// and phone (IDN-009, follow-up 156); closing the Account (follow-up 66) is
// the Administrator's alone (ADR-0102).
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

  return (
    <>
      <SidePanelBody>
        {query.isPending ? (
          <LoadingNotice>Cargando la ficha…</LoadingNotice>
        ) : query.isError ? (
          isApiError(query.error) && query.error.code === "client_not_found" ? (
            <p role="alert" className="text-cuerpo text-texto-secundario">
              Esta clienta ya no existe.
            </p>
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
      </SidePanelBody>
      {/* AW22: a deactivated account has nothing left to edit or close. */}
      {query.data === undefined ||
      query.data.accountStatus === "disabled" ? null : (
        <SidePanelFooter>
          {granted === null ? null : (
            <p role="status" className="text-nota text-exito-texto">
              {granted}
            </p>
          )}
          {editing ? null : (
            <Button
              variant="neutral"
              size="sm"
              className="self-start"
              onClick={() => {
                setSaved(false);
                setEditing(true);
              }}
            >
              Editar perfil
            </Button>
          )}
          <div className="flex flex-wrap gap-2">
            {/* REL-011: only the Administrator, and only without an active Plan. */}
            {role === "administrator" &&
            query.data.subscription.status !== "active" ? (
              <CourtesyAccessAction
                client={query.data}
                onGranted={setGranted}
              />
            ) : null}
            {role === "administrator" ? (
              <CloseClientAccountAction
                client={query.data}
                onClosed={onClosed}
              />
            ) : null}
          </div>
        </SidePanelFooter>
      )}
    </>
  );
}
