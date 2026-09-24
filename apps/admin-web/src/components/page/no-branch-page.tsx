import { LoadingNotice } from "./query-failure";
import { PageHeader } from "./page-header";

// A Branch-scoped page before the selector has a Branch: still reading the
// active Branches, or the studio has none yet.
export function NoBranchPage({
  title,
  pending,
  loadingMessage,
  emptyMessage,
}: {
  title: string;
  pending: boolean;
  loadingMessage: string;
  emptyMessage: string;
}) {
  return (
    <article className="flex flex-col gap-5">
      <PageHeader title={title} />
      {pending ? (
        <LoadingNotice>{loadingMessage}</LoadingNotice>
      ) : (
        <p className="rounded-tarjeta border border-borde bg-blanco px-6 py-10 text-center text-cuerpo text-texto-secundario">
          {emptyMessage}
        </p>
      )}
    </article>
  );
}
