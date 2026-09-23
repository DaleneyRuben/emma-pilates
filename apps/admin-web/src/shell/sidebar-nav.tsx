import { Link } from "@tanstack/react-router";
import { navigationGroups } from "../app/navigation";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Secciones" className="flex flex-col gap-5 px-3 py-4">
      {navigationGroups.map((group, index) => (
        <div
          key={group.label ?? `group-${index}`}
          className="flex flex-col gap-0.5"
        >
          {group.label === undefined ? null : (
            <p className="px-3 pb-1.5 text-etiqueta-campo font-medium tracking-[0.14em] text-texto-muy-tenue uppercase">
              {group.label}
            </p>
          )}
          {group.items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              activeOptions={{ exact: true, includeSearch: false }}
              className="flex h-9 items-center rounded-control px-3 text-fila-menu text-texto-secundario hover:bg-hover-fila hover:text-texto data-[status=active]:bg-primario-tinte data-[status=active]:font-medium data-[status=active]:text-primario-profundo"
            >
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
