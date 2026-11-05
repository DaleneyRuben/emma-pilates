import { holdsEveryBranch } from "../people-search";
import { zodResolver } from "@hookform/resolvers/zod";
import type { StaffMemberDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Form } from "../../components/form/form";
import { PhoneFormField } from "../../components/form/phone-field";
import { phoneValue } from "../../components/form/phone-value";
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { Button } from "../../components/ui/button";
import { activeBranchesQueryOptions } from "../../shell/branch/branch-queries";
import type { StaffRole } from "../people-search";
import { DeactivateAction } from "./staff-account-actions";
import { EmailLimitNotice } from "./staff-email-limit";
import { useEmailLimit } from "./use-email-limit";
import {
  CancelInvitationAction,
  PendingInvitation,
} from "./staff-pending-invitation";
import { StaffContactField } from "./staff-contact-field";
import {
  staffEditSchema,
  type StaffFormInput,
  type StaffFormOutput,
} from "./staff-form-schema";
import { staffProblem } from "./staff-problems";
import { useStaffChange } from "./staff-queries";
import { StaffContact } from "./staff-read-only";
import { StaffRoleFields } from "./staff-role-fields";
import { TrainerReferralCodeField } from "./trainer-referral-code-field";

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

// AW24 edit: contact, Role and Branches are separate backend commands; a
// Role change carries the new Branches so both land together (IDN-007).
// FIX-038: the name and the phone go first, as one contact command.
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
  const limit = useEmailLimit();
  const form = useForm<StaffFormInput, unknown, StaffFormOutput>({
    resolver: zodResolver(staffEditSchema(member.phone)),
    defaultValues: {
      name: member.name,
      email: member.email,
      phone: phoneValue(member.phone),
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
    async ({ name, phone, role: next, branchIds: chosen }) => {
      setFailure(null);
      const branchIds = shown(chosen);
      const contactChanged = name !== member.name || phone !== member.phone;
      const roleChanged = next !== member.role;
      const branchesChanged =
        !holdsEveryBranch(next) && !sameSet(branchIds, shown(member.branchIds));
      if (!contactChanged && !roleChanged && !branchesChanged) {
        onDone();
        return;
      }
      let contactSaved = false;
      try {
        if (contactChanged) {
          await change.mutateAsync({
            kind: "contact",
            staffMemberId: member.id,
            name,
            phone,
          });
          contactSaved = true;
        }
        if (!roleChanged && !branchesChanged) {
          onDone(`Guardamos los cambios de ${name}.`);
          return;
        }
        await change.mutateAsync(
          roleChanged
            ? {
                kind: "role",
                staffMemberId: member.id,
                input: holdsEveryBranch(next)
                  ? { role: next }
                  : { role: next, branchIds },
              }
            : { kind: "branches", staffMemberId: member.id, branchIds },
        );
        onDone(`Guardamos los cambios de ${name}.`);
      } catch (error) {
        const problem = staffProblem(error);
        // The contact landed before the Role or Branches failed.
        const saved = contactSaved
          ? "Guardamos el nombre y el teléfono, pero no el resto. "
          : "";
        if (problem.field === "branchIds") {
          form.setError("branchIds", { message: problem.message });
          if (saved !== "") setFailure(saved.trim());
        } else {
          setFailure(`${saved}${problem.message}`);
        }
      }
    },
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          {member.status === "pending" ? (
            <EmailLimitNotice limit={limit} />
          ) : null}
          <StaffContactField control={form.control} name="name" />
          {member.status === "pending" ? (
            <PendingInvitation limit={limit} member={member} />
          ) : (
            <StaffContact member={member} only={["email"]} />
          )}
          <PhoneFormField control={form.control} name="phone" />
          <StaffRoleFields
            control={form.control}
            role={role}
            branchNote={`Si sacas una sucursal, sus sesiones ya asignadas no se reasignan solas.${
              member.role === "trainer"
                ? " Cámbialas de entrenadora en Horario antes de guardar."
                : ""
            }`}
          />
          {member.role === "trainer" ? (
            <TrainerReferralCodeField staffMemberId={member.id} />
          ) : null}
          {failure === null ? null : (
            <p role="alert" className="text-nota text-error-texto">
              {failure}
            </p>
          )}
        </SidePanelBody>
        <SidePanelFooter>
          <Button type="submit" size="lg" busy={change.isPending}>
            Guardar
          </Button>
          {member.status === "pending" ? (
            <CancelInvitationAction
              member={member}
              onDone={onDone}
              onFailure={setFailure}
            />
          ) : (
            <DeactivateAction
              member={member}
              onDone={onDone}
              onFailure={setFailure}
            />
          )}
        </SidePanelFooter>
      </form>
    </Form>
  );
}
