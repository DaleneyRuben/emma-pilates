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
  ActiveEmailField,
  EmailChangeDialog,
  firstName,
  PendingEmailChange,
  sameEmail,
} from "./staff-email-change";
import { isApiError } from "../../api/problem";
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
import { StaffPhotoBlock } from "./staff-photo-block";
import { staffProblem } from "./staff-problems";
import { useStaffChange } from "./staff-queries";
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
  const typedEmail = useWatch({ control: form.control, name: "email" });
  // FIX-039: the change waiting for the new address, kept from each answer.
  const [pending, setPending] = useState(member.pendingEmail);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<StaffFormOutput | null>(null);
  const active = member.status === "active";

  // A Branch archived since the assignment has no chip and the backend
  // refuses its id (`invalid_branch_assignment`): only the ids the chips
  // can show are compared and sent.
  const shown = (ids: readonly string[]): string[] =>
    branches.data === undefined
      ? [...ids]
      : ids.filter((id) => branches.data.some((branch) => branch.id === id));

  const save = async ({
    name,
    email,
    phone,
    role: next,
    branchIds: chosen,
  }: StaffFormOutput) => {
    setFailure(null);
    setEmailNotice(null);
    const emailChanged = active && !sameEmail(email, member.email);
    const branchIds = shown(chosen);
    const contactChanged = name !== member.name || phone !== member.phone;
    const roleChanged = next !== member.role;
    const branchesChanged =
      !holdsEveryBranch(next) && !sameSet(branchIds, shown(member.branchIds));
    if (!contactChanged && !roleChanged && !branchesChanged && !emailChanged) {
      onDone();
      return;
    }
    let contactSaved = false;
    let othersSaved = false;
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
      if (roleChanged || branchesChanged) {
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
      }
      othersSaved = true;
      if (!emailChanged) {
        onDone(`Guardamos los cambios de ${name}.`);
        return;
      }
      // The panel stays open on the change waiting for the new address.
      const updated = await change.mutateAsync({
        kind: "requestEmailChange",
        staffMemberId: member.id,
        email: email.trim(),
      });
      setPending(updated.pendingEmail);
      form.resetField("email", { defaultValue: member.email });
    } catch (error) {
      if (othersSaved && emailChanged) {
        if (isApiError(error) && error.code === "email_throttled") {
          limit.start("recipient", error.problem.retryAfterSeconds ?? 0);
          return;
        }
        const problem = staffProblem(error);
        if (problem.field === "email") {
          form.setError("email", { message: problem.message });
        } else {
          setFailure(problem.message);
        }
        return;
      }
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
  };

  const submit = form.handleSubmit(async (values) => {
    if (active && !sameEmail(values.email, member.email)) {
      setConfirming(values);
      return;
    }
    await save(values);
  });

  const confirmEmail = async () => {
    if (confirming === null) return;
    const values = confirming;
    setConfirming(null);
    await save(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          {/* A limit notice stays first in the body (AW24). */}
          <EmailLimitNotice limit={limit} />
          <StaffPhotoBlock member={member} />
          <StaffContactField control={form.control} name="name" />
          {member.status === "pending" ? (
            <PendingInvitation limit={limit} member={member} />
          ) : (
            <>
              <ActiveEmailField
                control={form.control}
                current={member.email}
                name={member.name}
                typed={typedEmail}
              />
              {pending === null ? null : (
                <PendingEmailChange
                  limit={limit}
                  member={member}
                  pending={pending}
                  onResent={setPending}
                  onCancelled={() => {
                    setPending(null);
                    setEmailNotice(
                      `Cancelamos el cambio. ${firstName(member.name)} sigue entrando con ${member.email}.`,
                    );
                  }}
                />
              )}
              {emailNotice === null ? null : (
                <p role="status" className="text-ayuda text-texto-secundario">
                  {emailNotice}
                </p>
              )}
            </>
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
      <EmailChangeDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        member={member}
        newEmail={confirming?.email.trim() ?? ""}
        busy={change.isPending}
        onConfirm={() => void confirmEmail()}
      />
    </Form>
  );
}
