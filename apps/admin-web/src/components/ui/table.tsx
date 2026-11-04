import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

// Dense desktop table that reflows into one stacked card per row below the
// md breakpoint (design system → Admin Desktop Web Responsiveness). Cells
// carry `data-label` so the card shows each column name.
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      // Follow-up 233: a table is a Lino card, with no border or shadow.
      className="w-full overflow-hidden rounded-marco bg-lino max-md:bg-transparent"
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
      className={cn("max-md:hidden", className)}
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
        "border-t border-divisor transition-colors hover:bg-hover-fila max-md:block max-md:rounded-marco max-md:border-0 max-md:bg-lino max-md:p-4",
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
        "h-12 px-5 text-left align-middle text-pie font-medium tracking-[0.12em] whitespace-nowrap text-texto-tenue uppercase",
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
        "px-5 py-3 align-middle max-md:flex max-md:empty:hidden max-md:justify-between max-md:gap-4 max-md:px-0 max-md:py-1.5 max-md:before:text-cabecera-tabla max-md:before:font-medium max-md:before:tracking-[0.14em] max-md:before:text-texto-tenue max-md:before:uppercase max-md:before:content-[attr(data-label)]",
        className,
      )}
      {...props}
    />
  );
}
