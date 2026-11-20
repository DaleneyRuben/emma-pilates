import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

// Dense desktop table that reflows into one stacked card per row below the
// md breakpoint (design system → Admin Desktop Web Responsiveness). Cells
// carry `data-label` so the card shows each column name; DataTable's lists
// draw FIX-088's compact card instead (white, thin border, no labels).
export function Table({
  className,
  lead,
  footer,
  ...props
}: ComponentProps<"table"> & { lead?: ReactNode; footer?: ReactNode }) {
  return (
    <div
      data-slot="table-container"
      // Rosa Emma (rw.py table): a white card with the soft shadow and the
      // pagination inside it; at phone width it stays one card and its rows
      // are divided.
      className="w-full overflow-hidden rounded-tarjeta bg-superficie shadow-tarjeta"
    >
      {lead === undefined ? null : (
        <div className="border-b border-borde px-5 py-3.5 text-celda text-texto">
          {lead}
        </div>
      )}
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom border-collapse text-celda text-texto max-md:block",
          className,
        )}
        {...props}
      />
      {footer === undefined ? null : (
        <div className="border-t border-superficie-hundida px-5 py-3 max-md:px-4">
          {footer}
        </div>
      )}
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "border-b border-borde bg-superficie-hundida max-md:hidden",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("max-md:flex max-md:flex-col", className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-t border-superficie-hundida transition-colors first:border-t-0 hover:bg-superficie-hundida max-md:block max-md:px-3.5 max-md:py-3",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-12 px-5 text-left align-middle text-etiqueta font-bold tracking-[0.14em] whitespace-nowrap text-texto uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-5 py-3.5 align-middle max-md:flex max-md:empty:hidden max-md:justify-between max-md:gap-4 max-md:px-0 max-md:py-1.5 max-md:before:text-cabecera-tabla max-md:before:font-medium max-md:before:tracking-[0.14em] max-md:before:text-texto max-md:before:uppercase max-md:before:content-[attr(data-label)]",
        className,
      )}
      {...props}
    />
  );
}
