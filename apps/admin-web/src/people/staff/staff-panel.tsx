import { zodResolver } from "@hookform/resolvers/zod";
import type { StaffMemberDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/form/form";
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { WaitNotice } from "../../auth/request-limit-notice";
import { useCountdown } from "../../auth/use-countdown";
import { currentSessionQueryOptions } from "../../session/session-queries";
import { StaffEditForm } from "./staff-edit-form";
import {
  emptyStaffForm,
  staffFormSchema,
  type StaffFormInput,
  type StaffFormOutput,
} from "./staff-form-schema";
import {
  accountEmailLimitMessage,
  isAccountEmailLimit,
  staffProblem,
} from "./staff-problems";
import { useStaffChange } from "./staff-queries";
import { StaffReadOnly } from "./staff-read-only";
import { StaffRoleFields } from "./staff-role-fields";

const contactFields = [
  ["name", "Nombre", "text", "name"],
  ["email", "Correo electrónico", "email", "email"],
  ["phone", "Teléfono (opcional)", "tel", "tel"],
] as const;

const helpers: Partial<Record<keyof StaffFormInput, string>> = {
  email:
    "Le enviaremos un enlace de activación a este correo. Vence en 7 días.",
};

// AW24 create with follow-up 35: the new person gets an emailed Activation
// Link; nobody sees or relays a password.
function StaffCreateForm({ onDone }: { onDone: (notice?: string) => void }) {
  const change = useStaffChange();
  const [failure, setFailure] = useState<string | null>(null);
  const [accountWait, startAccountWait] = useCountdown();
  const form = useForm<StaffFormInput, unknown, StaffFormOutput>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: emptyStaffForm(),
  });
  const role = useWatch({ control: form.control, name: "role" });

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      const created = await change.mutateAsync({
        kind: "create",
        input: {
          ...values,
          branchIds: values.role === "administrator" ? [] : values.branchIds,
        },
      });
      onDone(
        created.invitationReopened === true
          ? `${created.name} ya tenía una invitación pendiente. La abrimos y enviamos un enlace nuevo; su rol y sus sucursales no cambiaron.`
          : `Invitación enviada a ${values.email}: tiene 7 días para activar su cuenta.`,
      );
    } catch (error) {
      if (isAccountEmailLimit(error)) {
        startAccountWait(error.problem.retryAfterSeconds ?? 0);
        return;
      }
      const problem = staffProblem(error);
      if (problem.field === undefined) {
        setFailure(problem.message);
      } else {
        form.setError(problem.field, { message: problem.message });
      }
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          {accountWait > 0 ? (
            <WaitNotice
              message={accountEmailLimitMessage}
              seconds={accountWait}
              waitLabel="Podrás intentarlo en"
            />
          ) : null}
          {contactFields.map(([name, label, type, autoComplete]) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input type={type} autoComplete={autoComplete} {...field} />
                  </FormControl>
                  <FormDescription>{helpers[name]}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <StaffRoleFields control={form.control} role={role} />
          {failure === null ? null : (
            <p role="alert" className="text-nota text-error-texto">
              {failure}
            </p>
          )}
        </SidePanelBody>
        <SidePanelFooter>
          <Button
            type="submit"
            size="lg"
            disabled={accountWait > 0}
            busy={change.isPending}
          >
            Guardar
          </Button>
        </SidePanelFooter>
      </form>
    </Form>
  );
}

export function StaffPanelForm({
  member,
  onDone,
}: {
  member: StaffMemberDto | undefined;
  onDone: (notice?: string) => void;
}) {
  const { data: principal } = useQuery(currentSessionQueryOptions());
  const ownStaffMemberId =
    principal?.identity.kind === "staff"
      ? principal.identity.staffMemberId
      : undefined;

  if (member === undefined) return <StaffCreateForm onDone={onDone} />;
  if (member.id === ownStaffMemberId) {
    return (
      <StaffReadOnly
        member={member}
        note="Es tu cuenta: no puedes cambiar tu rol ni desactivarla desde aquí."
      />
    );
  }
  if (member.status === "deactivated") {
    return (
      <StaffReadOnly
        member={member}
        note="Esta cuenta está desactivada: ya no puede entrar."
      />
    );
  }
  return <StaffEditForm member={member} onDone={onDone} />;
}
