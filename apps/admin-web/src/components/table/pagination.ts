import { z } from "zod";

/**
 * ADR-0061: bounded admin tables use one-based page-and-offset pagination,
 * and ADR-0042 keeps that state in the URL. The backend caps page sizes at
 * 100 and answers `items`, `page`, `pageSize`, and `totalItems`.
 */
export const defaultPageSize = 20;
export const maxPageSize = 100;

export const listSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(maxPageSize)
    .catch(defaultPageSize),
});

export type ListSearch = z.infer<typeof listSearchSchema>;

export type PageWindow = {
  page: number;
  pageSize: number;
  totalItems: number;
};

export const countFormat = new Intl.NumberFormat("es-BO");

export const pageCount = (totalItems: number, pageSize: number): number =>
  Math.max(1, Math.ceil(totalItems / pageSize));

export function pageRangeLabel({
  page,
  pageSize,
  totalItems,
}: PageWindow): string {
  if (totalItems === 0) return "Sin resultados";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  return `Mostrando ${countFormat.format(from)}–${countFormat.format(to)} de ${countFormat.format(totalItems)}`;
}
