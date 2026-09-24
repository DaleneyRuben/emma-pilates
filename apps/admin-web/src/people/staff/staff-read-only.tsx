import type { StaffMemberDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { branchTableQueryOptions } from "../../catalog/branches/branch-queries";
import { SidePanelBody } from "../../components/panel/side-panel";
import type { StaffRole } from "../people-search";
import { branchNames, roleLabels } from "./staff-format";

const allBranches = { status: "all", page: 1, pageSize: 100 } as const;

// The contact a Staff Member was invited with; no command edits it yet.
export function StaffContact({ member }: { member: StaffMemberDto }) {
  const rows = [
    ["Nombre", member.name],
    ["Correo electrónico", member.email],
    ["Teléfono", member.phone ?? "Sin teléfono"],
  ] as const;
  return (
    <dl className="flex flex-col divide-y divide-divisor rounded-control border border-divisor bg-superficie">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-4 px-3 py-2"
        >
          <dt className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
            {label}
          </dt>
          <dd className="text-right text-nota text-texto">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// The signed-in Administrator's own account (the backend refuses
// `own_staff_member`) and a deactivated account (no reactivation yet).
export function StaffReadOnly({
  member,
  note,
}: {
  member: StaffMemberDto;
  note: string;
}) {
  const branches = useQuery(branchTableQueryOptions(allBranches));
  const names = new Map(
    (branches.data?.items ?? []).map((branch) => [branch.id, branch.name]),
  );
  const facts = [
    ["Rol", roleLabels[member.role as StaffRole]],
    ["Sucursales asignadas", branchNames(member, names)],
  ] as const;

  return (
    <SidePanelBody>
      <p className="rounded-control border border-divisor bg-superficie px-3 py-2 text-ayuda text-texto-tenue">
        {note}
      </p>
      <StaffContact member={member} />
      {facts.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-1">
          <span className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
            {label}
          </span>
          <span className="text-nota text-texto">{value}</span>
        </div>
      ))}
    </SidePanelBody>
  );
}
