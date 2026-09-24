import {
  getAdminClient,
  getGetAdminClientQueryKey,
  type AdminClientDetailDto,
} from "@pilates/api-contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { adminFetch } from "../../api/fetcher";
import { isApiError } from "../../api/problem";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import { SidePanelBody } from "../../components/panel/side-panel";
import { StatusPill } from "../../components/ui/status-pill";
import { formatCivilDate } from "../../lib/bolivia-time";
import { formatBolivianos } from "../../lib/money";

const clientDetailQueryOptions = (clientId: string) =>
  queryOptions({
    queryKey: getGetAdminClientQueryKey(clientId),
    queryFn: async ({ signal }) =>
      (await getAdminClient(clientId, { signal }, adminFetch))
        .data as AdminClientDetailDto,
  });

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="font-sans text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
        {title}
      </h3>
      <dl className="flex flex-col divide-y divide-divisor rounded-control border border-divisor bg-superficie">
        {children}
      </dl>
    </section>
  );
}

// Read-only rows on Superficie (AW22): the whole panel is a summary.
function Row({
  label,
  children,
  figure = false,
}: {
  label: string;
  children: ReactNode;
  figure?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-2">
      <dt className="text-nota text-texto-tenue">{label}</dt>
      <dd
        className={
          figure
            ? "text-right font-serif text-[15px] text-texto tabular"
            : "text-right text-nota text-texto"
        }
      >
        {children}
      </dd>
    </div>
  );
}

function PlanBlock({ view }: { view: AdminClientDetailDto["subscription"] }) {
  const current = view.subscription;
  if (current === null || current === undefined || view.status === "none") {
    return (
      <Block title="Plan">
        <Row label="Plan">
          <span className="text-texto-muy-tenue">Sin plan activo</span>
        </Row>
      </Block>
    );
  }
  if (view.status === "expired") {
    return (
      <Block title="Plan">
        <Row label="Plan">
          <span className="flex items-center justify-end gap-2">
            <span className="text-texto-muy-tenue">Sin plan activo</span>
            <StatusPill tone="error">Expirado</StatusPill>
          </span>
        </Row>
        <p className="px-3 py-2 text-ayuda text-texto-tenue">
          Último plan vencido el {formatCivilDate(current.endsOn)}.
        </p>
      </Block>
    );
  }
  return (
    <Block title="Plan">
      <Row label="Plan">
        <span className="flex items-center justify-end gap-2">
          {current.planName}
          <StatusPill tone="exito">Activo</StatusPill>
        </span>
      </Row>
      <Row label="Vigencia">
        <span className="tabular">
          {formatCivilDate(current.startsOn)} –{" "}
          {formatCivilDate(current.endsOn)}
        </span>
      </Row>
      {/* Every Plan grants a fixed number of classes (follow-up 11). */}
      <Row label="Clases disponibles" figure>
        {current.remainingClassAllowance} de {current.originalClassAllowance}
      </Row>
    </Block>
  );
}

function ClientSummary({ client }: { client: AdminClientDetailDto }) {
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
      <Block title="Contacto">
        <Row label="Correo">{client.email}</Row>
        <Row label="Teléfono">
          {client.phone === null ? (
            <span className="text-texto-muy-tenue">Sin teléfono</span>
          ) : (
            <span className="tabular">{client.phone}</span>
          )}
        </Row>
      </Block>
      <PlanBlock view={client.subscription} />
      <Block title="Crédito">
        <Row label="Saldo disponible" figure>
          {formatBolivianos(client.creditAvailableCentavos)}
        </Row>
      </Block>
      <Block title="Referidos">
        <Row label="Clientas referidas" figure>
          {client.referredClientCount === 0
            ? "Ninguna todavía"
            : client.referredClientCount}
        </Row>
        <Row label="Código">
          <span className="rounded-md border border-borde bg-blanco px-2 py-0.5 font-mono text-ayuda tracking-wider text-texto-secundario">
            {client.referralCode}
          </span>
        </Row>
      </Block>
    </>
  );
}

// AW22: a support summary of one Client, read-only, with no footer button.
export function ClientDetailPanel({ clientId }: { clientId: string }) {
  const query = useQuery(clientDetailQueryOptions(clientId));

  return (
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
        <ClientSummary client={query.data} />
      )}
    </SidePanelBody>
  );
}
