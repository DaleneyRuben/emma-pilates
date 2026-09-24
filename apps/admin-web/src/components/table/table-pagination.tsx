import { Button } from "../ui/button";
import {
  countFormat,
  pageCount,
  pageRangeLabel,
  type PageWindow,
} from "./pagination";

export type RangeLabel = (window: PageWindow & { shown: number }) => string;

type TablePaginationProps = PageWindow & {
  onPageChange: (page: number) => void;
  /** Rows on this page; a list with its own counter wording needs it. */
  shown?: number;
  rangeLabel?: RangeLabel;
};

export function TablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  shown = 0,
  rangeLabel,
}: TablePaginationProps) {
  const pages = pageCount(totalItems, pageSize);

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 text-nota text-texto-tenue tabular"
    >
      <p>
        {rangeLabel === undefined
          ? pageRangeLabel({ page, pageSize, totalItems })
          : rangeLabel({ page, pageSize, totalItems, shown })}
      </p>
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
