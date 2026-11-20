import { LoadingNotice } from "./query-failure";
import { PageHeader } from "./page-header";
import { EmptyState } from "../ui/empty-state";

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
        <EmptyState>{emptyMessage}</EmptyState>
      )}
    </article>
  );
}
