import type { StaffMemberDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { everyBranchesQueryOptions } from "../../catalog/branches/branch-queries";
import { CatalogPage, RowOpener } from "../../catalog/catalog-page";
import type { SearchChange } from "../../catalog/catalog-search";
import { ListFilter } from "../../components/table/list-filter";
import { pageRangeLabel } from "../../components/table/pagination";
import { StatusPill } from "../../components/ui/status-pill";
import { namesById } from "../../lib/named";
import { staffRoles, type StaffRole, type StaffSearch } from "../people-search";
import { branchNames, roleLabels, statusPills } from "./staff-format";
import { StaffPanelForm } from "./staff-panel";
import { staffTableQueryOptions } from "./staff-queries";

const roleOptions: { value: StaffSearch["role"]; label: string }[] = [
  { value: "all", label: "Todos" },
  ...staffRoles.map((role) => ({ value: role, label: roleLabels[role] })),
];

const columns = createColumnHelper<StaffMemberDto>();

const staffColumns =
  (names: ReadonlyMap<string, string>) =>
  (open: (row: StaffMemberDto) => void) => [
    columns.accessor("name", {
      header: "Nombre",
      cell: ({ row }) => (
        <RowOpener
          label={row.original.name}
          onOpen={() => open(row.original)}
        />
      ),
    }),
    columns.accessor("role", {
      header: "Rol",
      // A category, not a state: never a status pill (AW23, follow-up 52).
      cell: ({ getValue }) => (
        <span className="inline-flex rounded-control border border-borde bg-divisor px-2 py-0.5 text-ayuda text-texto-secundario">
          {roleLabels[getValue() as StaffRole]}
        </span>
      ),
    }),
    columns.accessor("email", {
      header: "Contacto",
      cell: ({ row }) => (
        <span className="flex flex-col text-nota text-texto-secundario">
          <span>{row.original.email}</span>
          {row.original.phone === null ? null : (
            <span className="text-texto-muy-tenue tabular">
              {row.original.phone}
            </span>
          )}
        </span>
      ),
    }),
    columns.accessor("branchIds", {
      header: "Sucursales",
      cell: ({ row }) => (
        <span className="text-texto-secundario">
          {branchNames(row.original, names)}
        </span>
      ),
    }),
    columns.accessor("status", {
      header: "Estado",
      cell: ({ getValue }) => {
        const pill = statusPills[getValue()];
        return <StatusPill tone={pill.tone}>{pill.label}</StatusPill>;
      },
    }),
  ];

// AW23: the studio's Staff Members; the Role decides which app a person
// opens and the Branches where they work.
export function StaffPage({
  search,
  onSearchChange,
}: {
  search: StaffSearch;
  onSearchChange: SearchChange<StaffSearch>;
}) {
  const query = useQuery(staffTableQueryOptions(search));
  const branches = useQuery(everyBranchesQueryOptions());
  const names = useMemo(() => namesById(branches.data ?? []), [branches.data]);

  return (
    <CatalogPage
      title="Personal"
      subtitle="El rol define qué app abre cada persona; las sucursales, dónde puede trabajar."
      createLabel="Nuevo miembro"
      loadingMessage="Cargando al personal…"
      what="al personal"
      emptyMessage="No hay miembros con este rol."
      panelTitles={{ create: "Nuevo miembro", edit: "Editar miembro" }}
      filter={
        <ListFilter
          label="Rol"
          value={search.role}
          options={roleOptions}
          onChange={(role) => onSearchChange({ role, page: 1 })}
        />
      }
      search={search}
      onPageChange={(page) => onSearchChange({ page })}
      rangeLabel={(window) =>
        window.totalItems === 0
          ? pageRangeLabel(window)
          : `${pageRangeLabel(window)} ${window.totalItems === 1 ? "miembro" : "miembros"}`
      }
      query={query}
      columns={staffColumns(names)}
      renderForm={(member, done) => (
        <StaffPanelForm member={member} onDone={done} />
      )}
    />
  );
}
