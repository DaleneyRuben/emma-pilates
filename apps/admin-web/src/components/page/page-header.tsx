import { useContext, type ReactNode } from "react";
import { PageTabsContext } from "./page-tabs-context";

// Follow-up 233 (the boards' head): the page title in Lora 32 with a
// one-line Texto tenue subtitle on the left and the page's actions on the
// right, then the destination's tabs and the tab's views. The title names
// the page the tab opens, so a screen reader hears where it landed.
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  const tabs = useContext(PageTabsContext);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-[240px] flex-1 flex-col gap-1">
          <h1 className="text-titulo-1 text-texto lg:text-[32px]">{title}</h1>
          {subtitle === undefined ? null : (
            <p className="text-cuerpo text-texto-tenue">{subtitle}</p>
          )}
        </div>
        {actions === undefined ? null : (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      {tabs}
    </div>
  );
}
