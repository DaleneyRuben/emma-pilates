import { zodResolver } from "@hookform/resolvers/zod";
import type { StaffMemberDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Form } from "../../components/form/form";
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { Button } from "../../components/ui/button";
import { activeBranchesQueryOptions } from "../../shell/branch/branch-queries";
import type { StaffRole } from "../people-search";
import { DeactivateAction, PendingActivation } from "./staff-account-actions";
import {
  staffFormSchema,
  type StaffFormInput,
  type StaffFormOutput,
} from "./staff-form-schema";
import { staffProblem } from "./staff-problems";
import { useStaffChange } from "./staff-queries";
import { StaffContact } from "./staff-read-only";
import { StaffRoleFields } from "./staff-role-fields";

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

// AW24 edit: Role and Branches are separate backend commands; a Role change
// carries the new Branches so both land together (IDN-007).
export function StaffEditForm({
  member,
  onDone,
}: {
  member: StaffMemberDto;
  onDone: (notice?: string) => void;
}) {
  const change = useStaffChange();
  const branches = useQuery(activeBranchesQueryOptions());
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<StaffFormInput, unknown, StaffFormOutput>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: member.name,
      email: member.email,
      phone: member.phone ?? "",
      role: member.role as StaffRole,
      branchIds: member.branchIds,
    },
  });
  const role = useWatch({ control: form.control, name: "role" });

  // A Branch archived since the assignment has no chip and the backend
  // refuses its id (`invalid_branch_assignment`): only the ids the chips
  // can show are compared and sent.
  const shown = (ids: readonly string[]): string[] =>
    branches.data === undefined
      ? [...ids]
      : ids.filter((id) => branches.data.some((branch) => branch.id === id));

  const submit = form.handleSubmit(
    async ({ role: next, branchIds: chosen }) => {
      setFailure(null);
      const branchIds = shown(chosen);
      const roleChanged = next !== member.role;
      const branchesChanged =
        next !== "administrator" &&
        !sameSet(branchIds, shown(member.branchIds));
      if (!roleChanged && !branchesChanged) {
        onDone();
        return;
      }
      try {
        await change.mutateAsync(
          roleChanged
            ? {
                kind: "role",
                staffMemberId: member.id,
                input:
                  next === "administrator"
                    ? { role: next }
                    : { role: next, branchIds },
              }
            : { kind: "branches", staffMemberId: member.id, branchIds },
        );
        onDone(`Guardamos los cambios de ${member.name}.`);
      } catch (error) {
        const problem = staffProblem(error);
        if (problem.field === "branchIds") {
          form.setError("branchIds", { message: problem.message });
        } else {
          setFailure(problem.message);
        }
      }
    },
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          <StaffContact member={member} />
          {member.status === "pending" ? (
            <PendingActivation member={member} />
          ) : null}
          <StaffRoleFields
            control={form.control}
            role={role}
            branchNote={`Si sacas una sucursal, sus sesiones ya asignadas no se reasignan solas.${
              member.role === "trainer"
                ? " Cámbialas de entrenadora en Horario antes de guardar."
                : ""
            }`}
          />
          {failure === null ? null : (
            <p role="alert" className="text-nota text-error-texto">
              {failure}
            </p>
          )}
        </SidePanelBody>
        <SidePanelFooter>
          <Button type="submit" size="lg" disabled={change.isPending}>
            Guardar
          </Button>
          <DeactivateAction
            member={member}
            onDone={onDone}
            onFailure={setFailure}
          />
        </SidePanelFooter>
      </form>
    </Form>
  );
}
