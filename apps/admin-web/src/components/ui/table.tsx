import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

// Dense desktop table that reflows into one stacked card per row below the
// md breakpoint (design system → Admin Desktop Web Responsiveness). Cells
// carry `data-label` so the card shows each column name.
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="w-full overflow-hidden rounded-tarjeta border border-borde bg-blanco max-md:border-0 max-md:bg-transparent"
    >
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom border-collapse text-celda text-texto max-md:block",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-superficie-sutil max-md:hidden", className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("max-md:flex max-md:flex-col max-md:gap-2", className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-divisor transition-colors last:border-b-0 hover:bg-hover-fila max-md:block max-md:rounded-tarjeta max-md:border max-md:border-borde max-md:bg-blanco max-md:p-3",
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
        "h-9 px-3 text-left align-middle text-cabecera-tabla font-medium tracking-[0.14em] text-texto-tenue uppercase",
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
        "px-3 py-2.5 align-middle max-md:flex max-md:justify-between max-md:gap-4 max-md:px-0 max-md:py-1.5 max-md:before:text-cabecera-tabla max-md:before:font-medium max-md:before:tracking-[0.14em] max-md:before:text-texto-tenue max-md:before:uppercase max-md:before:content-[attr(data-label)]",
        className,
      )}
      {...props}
    />
  );
}
