import type { ContactAlertItemDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "../../components/page/page-header";
import { PageNotice } from "../../components/page/page-notice";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { initials } from "../../lib/initials";
import { ContactAlertActions } from "./contact-alert-actions";
import {
  clientas,
  contactAlertReasons,
  startedOnLabel,
} from "./contact-alert-copy";
import { contactAlertListQueryOptions } from "./contact-alert-queries";

function EmptyList() {
  return (
    <div className="flex flex-col items-center gap-1 rounded-tarjeta border border-borde bg-blanco px-6 py-10 text-center">
      <p className="text-cuerpo text-texto-secundario">
        Nadie para contactar por ahora.
      </p>
      <p className="text-nota text-texto-tenue">
        Aquí aparecen las clientas nuevas que dejan de reservar o toman pocas
        clases en sus primeros 90 días.
      </p>
    </div>
  );
}

function ClientCell({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primario-tinte text-[11px] font-medium text-primario-profundo"
      >
        {initials(name)}
      </span>
      <span className="font-medium text-texto">{name}</span>
    </span>
  );
}

function AlertRow({
  item,
  onMarked,
  onFailed,
}: {
  item: ContactAlertItemDto;
  onMarked: (name: string) => void;
  onFailed: (name: string) => void;
}) {
  return (
    <TableRow>
      <TableCell data-label="Clienta">
        <ClientCell name={item.name} />
      </TableCell>
      <TableCell data-label="Teléfono">
        {item.phone === null ? (
          <span className="text-texto-tenue">Sin teléfono</span>
        ) : (
          <span className="text-texto-secundario tabular">{item.phone}</span>
        )}
      </TableCell>
      <TableCell data-label="Motivo">
        <span className="flex flex-col text-[13px] text-texto-secundario">
          {item.reasons.map((reason) => (
            <span key={reason}>{contactAlertReasons[reason]}</span>
          ))}
        </span>
      </TableCell>
      <TableCell data-label="Empezó el">
        <span className="text-texto-secundario tabular">
          {startedOnLabel(item.startedOn)}
        </span>
      </TableCell>
      <TableCell className="md:text-right max-md:before:content-none">
        <ContactAlertActions
          item={item}
          onMarked={onMarked}
          onFailed={onFailed}
        />
      </TableCell>
    </TableRow>
  );
}

type Notice =
  { kind: "success"; name: string } | { kind: "error"; name: string };

export function ContactAlertsPage() {
  const query = useQuery(contactAlertListQueryOptions());
  const [notice, setNotice] = useState<Notice | null>(null);
  const items = query.data?.items ?? [];

  return (
    <article className="flex flex-col gap-5">
      <PageHeader
        title="Para contactar"
        subtitle={
          query.data === undefined
            ? undefined
            : `${clientas(query.data.totalItems)} · seguimiento de sus primeros 90 días`
        }
      />
      <p className="text-nota text-texto-tenue">
        Escríbeles por WhatsApp y márcalas como contactadas. Salen solas de la
        lista cuando reservan una clase.
      </p>
      {notice?.kind === "success" ? (
        <PageNotice>{`Marcaste a ${notice.name} como contactada.`}</PageNotice>
      ) : null}
      {notice?.kind === "error" ? (
        <p role="alert" className="text-nota text-error-texto">
          {`No pudimos marcar a ${notice.name}. Inténtalo de nuevo.`}
        </p>
      ) : null}
      {query.isPending ? (
        <LoadingNotice>Cargando clientas…</LoadingNotice>
      ) : query.isError ? (
        <QueryFailure
          error={query.error}
          what="la lista"
          onRetry={() => void query.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyList />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Clienta</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Empezó el</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <AlertRow
                key={item.clientId}
                item={item}
                onMarked={(name) => setNotice({ kind: "success", name })}
                onFailed={(name) => setNotice({ kind: "error", name })}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </article>
  );
}
