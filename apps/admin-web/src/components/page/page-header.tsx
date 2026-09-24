import type { ReactNode } from "react";

// Design system → Main area: page title (Lora 27) and a one-line subtitle on
// the left, the page's actions on the right.
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-titulo-pagina text-texto">{title}</h1>
        {subtitle === undefined ? null : (
          <p className="text-[12.5px] text-texto-tenue">{subtitle}</p>
        )}
      </div>
      {actions === undefined ? null : (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
