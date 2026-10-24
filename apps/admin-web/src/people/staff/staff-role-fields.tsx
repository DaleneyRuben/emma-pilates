import { useQuery } from "@tanstack/react-query";
import type { Control } from "react-hook-form";
import {
  ChoiceChips,
  MultiChoiceChips,
} from "../../components/form/choice-chips";
import {
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "../../components/form/form";
import { activeBranchesQueryOptions } from "../../shell/branch/branch-queries";
import { holdsEveryBranch, staffRoles, type StaffRole } from "../people-search";
import type { StaffFormInput, StaffFormOutput } from "./staff-form-schema";
import { roleLabels } from "./staff-format";

const roleOptions = staffRoles.map((role) => [role, roleLabels[role]] as const);

function FieldTitle({ children }: { children: string }) {
  return (
    <span
      aria-hidden="true"
      className="block text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase"
    >
      {children}
    </span>
  );
}

function ReadOnlyRow({ children }: { children: string }) {
  return (
    <p className="rounded-control border border-divisor bg-superficie px-3 py-2.5 text-nota text-texto-secundario">
      {children}
    </p>
  );
}

// AW24: exactly one Role among five (follow-up 157); the Administrator's and
// the Coordinator's Branches are every Branch, so the picker becomes a
// read-only row.
export function StaffRoleFields({
  control,
  role,
  branchNote,
}: {
  control: Control<StaffFormInput, unknown, StaffFormOutput>;
  role: StaffRole | "";
  /** Extra warning under the Branches (editing). */
  branchNote?: string;
}) {
  const branches = useQuery(activeBranchesQueryOptions());

  return (
    <>
      <FormField
        control={control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FieldTitle>Rol</FieldTitle>
            <ChoiceChips
              legend="Rol"
              name={field.name}
              value={field.value}
              options={roleOptions}
              onChange={field.onChange}
              className="grid grid-cols-3"
            />
            <FormDescription>
              Un solo rol por persona: define qué app abre.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      {holdsEveryBranch(role) ? (
        <div className="flex flex-col gap-1.5">
          <FieldTitle>Sucursales asignadas</FieldTitle>
          <ReadOnlyRow>Todas las sucursales (implícito por el rol)</ReadOnlyRow>
        </div>
      ) : (
        <FormField
          control={control}
          name="branchIds"
          render={({ field }) => (
            <FormItem>
              <FieldTitle>Sucursales asignadas</FieldTitle>
              {branches.isPending ? (
                <p className="text-ayuda text-texto-tenue">
                  Cargando sucursales…
                </p>
              ) : branches.isError ? (
                <p role="alert" className="text-ayuda text-error-texto">
                  No pudimos cargar las sucursales.
                </p>
              ) : (
                <MultiChoiceChips
                  legend="Sucursales asignadas"
                  name={field.name}
                  values={field.value}
                  options={branches.data.map(
                    (branch) => [branch.id, branch.name] as const,
                  )}
                  onChange={field.onChange}
                />
              )}
              <FormDescription>{branchNote}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
