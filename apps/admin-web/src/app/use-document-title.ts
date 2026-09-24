import { useEffect } from "react";

const studio = "Emma";

/** The browser tab names the page first: "Gastos · Emma". */
export function useDocumentTitle(page: string | undefined): void {
  useEffect(() => {
    document.title =
      page === undefined ? `${studio} · Administración` : `${page} · ${studio}`;
  }, [page]);
}
