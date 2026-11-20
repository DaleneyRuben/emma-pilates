import { useContext, type ReactNode } from "react";
import { PageTabsContext } from "./page-tabs-context";

// Follow-up 233, Rosa Emma (rw.py frame): the page title in Lora on the
// Rubor band, the subtitle in `destacado` (the one Work Sans the band allows) and
// the page's actions on the right; below the band, on the page, the
// destination's tabs and the tab's views. The title names the page the tab
// opens, so a screen reader hears where it landed.
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
    <div className="flex flex-col gap-[18px]">
      <div className="-mx-4 flex flex-col gap-3 bg-banda px-4 pt-3 pb-[22px] lg:-mx-9 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-6 lg:px-9 lg:pt-[18px] lg:pb-[26px]">
        <div className="flex min-w-0 flex-col gap-1.5 lg:min-w-[240px] lg:flex-1">
          <h1 className="tipo-titulo-pagina text-texto">{title}</h1>
          {subtitle === undefined ? null : (
            <p className="tipo-destacado text-texto">{subtitle}</p>
          )}
        </div>
        {actions === undefined ? null : (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        )}
      </div>
      {tabs}
    </div>
  );
}
