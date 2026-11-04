import type { UseQueryResult } from "@tanstack/react-query";
import { useId, type ReactNode } from "react";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";

/** One line of a Client file list: what, when and who, and a pill. */
export function ClientFileItem({
  title,
  detail,
  aside,
}: {
  title: string;
  detail: string;
  aside?: ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="flex min-w-0 flex-col">
        <span className="text-nota font-medium text-texto">{title}</span>
        <span className="text-ayuda text-texto-tenue tabular">{detail}</span>
      </span>
      {aside}
    </li>
  );
}

// P03's file lists: a titled section over hairline rows, read with its own
// loading, failure and empty states.
export function ClientFileSection<Data>({
  title,
  query,
  what,
  loading,
  empty,
  children,
}: {
  title: string;
  query: UseQueryResult<Data>;
  /** Completes "No pudimos cargar …". */
  what: string;
  loading: string;
  empty: string;
  /** The rows, or null when there is none. */
  children: (data: Data) => ReactNode[] | null;
}) {
  const headingId = useId();
  const rows = query.data === undefined ? null : children(query.data);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1.5">
      <h3
        id={headingId}
        className="font-sans text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase"
      >
        {title}
      </h3>
      {query.isPending ? (
        <LoadingNotice>{loading}</LoadingNotice>
      ) : query.isError ? (
        <QueryFailure
          error={query.error}
          what={what}
          onRetry={() => void query.refetch()}
        />
      ) : rows === null || rows.length === 0 ? (
        <p className="text-nota text-texto-tenue">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-divisor rounded-control border border-divisor bg-superficie">
          {rows}
        </ul>
      )}
    </section>
  );
}
