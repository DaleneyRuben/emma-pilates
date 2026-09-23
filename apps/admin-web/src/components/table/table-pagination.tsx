import { Button } from "../ui/button";
import {
  countFormat,
  pageCount,
  pageRangeLabel,
  type PageWindow,
} from "./pagination";

type TablePaginationProps = PageWindow & {
  onPageChange: (page: number) => void;
};

export function TablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
}: TablePaginationProps) {
  const pages = pageCount(totalItems, pageSize);

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 text-nota text-texto-tenue tabular"
    >
      <p>{pageRangeLabel({ page, pageSize, totalItems })}</p>
      <div className="flex items-center gap-2">
        <p>
          Página {countFormat.format(page)} de {countFormat.format(pages)}
        </p>
        <Button
          variant="neutral"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="neutral"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
