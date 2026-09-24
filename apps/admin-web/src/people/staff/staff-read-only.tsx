import type { StaffMemberDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { everyBranchesQueryOptions } from "../../catalog/branches/branch-queries";
import { SidePanelBody } from "../../components/panel/side-panel";
import { namesById } from "../../lib/named";
import type { StaffRole } from "../people-search";
import { branchNames, roleLabels } from "./staff-format";

// The contact a Staff Member was invited with; no command edits it yet.
export function StaffContact({ member }: { member: StaffMemberDto }) {
  const rows = [
    ["Nombre", member.name],
    ["Correo", member.email],
    ["Teléfono", member.phone ?? "Sin teléfono"],
  ] as const;
  return (
    <dl className="flex flex-col divide-y divide-divisor rounded-control border border-divisor bg-superficie">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-4 px-3 py-2"
        >
          <dt className="shrink-0 text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
            {label}
          </dt>
          <dd className="min-w-0 text-right text-nota break-words text-texto">
            {value}
          </dd>
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
  const branches = useQuery(everyBranchesQueryOptions());
  const names = namesById(branches.data ?? []);
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
