import { zodResolver } from "@hookform/resolvers/zod";
import type { StaffMemberDto } from "@pilates/api-contracts";
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
import {
  emptyStaffForm,
  staffFormSchema,
  type StaffFormInput,
  type StaffFormOutput,
} from "./staff-form-schema";
import { staffProblem } from "./staff-problems";
import { useStaffChange } from "./staff-queries";
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
export function StaffPanelForm({
  onDone,
}: {
  member: StaffMemberDto | undefined;
  onDone: (notice?: string) => void;
}) {
  const change = useStaffChange();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<StaffFormInput, unknown, StaffFormOutput>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: emptyStaffForm(),
  });
  const role = useWatch({ control: form.control, name: "role" });

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await change.mutateAsync({
        kind: "create",
        input: {
          ...values,
          branchIds: values.role === "administrator" ? [] : values.branchIds,
        },
      });
      onDone(
        `Invitación enviada a ${values.email}: tiene 7 días para activar su cuenta.`,
      );
    } catch (error) {
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
          <Button type="submit" size="lg" disabled={change.isPending}>
            Guardar
          </Button>
        </SidePanelFooter>
      </form>
    </Form>
  );
}
