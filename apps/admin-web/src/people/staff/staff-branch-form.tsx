import { zodResolver } from "@hookform/resolvers/zod";
import type { StaffMemberDto } from "@pilates/api-contracts";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormMessage,
} from "../../components/form/form";
import { MultiChoiceChips } from "../../components/form/choice-chips";
import { activeBranchesQueryOptions } from "../../shell/branch/branch-queries";
import { useQuery } from "@tanstack/react-query";
import type { ControllerRenderProps } from "react-hook-form";
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { Button } from "../../components/ui/button";
import { staffProblem } from "./staff-problems";
import { useStaffChange } from "./staff-queries";
import { StaffContact } from "./staff-read-only";
import {
  staffFormSchema,
  type StaffFormInput,
  type StaffFormOutput,
} from "./staff-form-schema";

function BranchChips({
  field,
}: {
  field: ControllerRenderProps<StaffFormInput, "branchIds">;
}) {
  const branches = useQuery(activeBranchesQueryOptions());
  if (branches.isPending) {
    return <p className="text-ayuda text-texto-tenue">Cargando sucursales…</p>;
  }
  if (branches.isError) {
    return (
      <p role="alert" className="text-ayuda text-error-texto">
        No pudimos cargar las sucursales.
      </p>
    );
  }
  return (
    <FormItem>
      <MultiChoiceChips
        legend="Sucursales asignadas"
        name={field.name}
        values={field.value}
        options={branches.data.map(
          (branch) => [branch.id, branch.name] as const,
        )}
        onChange={field.onChange}
      />
      <FormMessage />
    </FormItem>
  );
}

// Decision 6: the Coordinator assigns a Trainer's Branches and nothing else.
export function StaffBranchForm({
  member,
  onDone,
}: {
  member: StaffMemberDto;
  onDone: (notice?: string) => void;
}) {
  const change = useStaffChange();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<StaffFormInput, unknown, StaffFormOutput>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: member.name,
      email: member.email,
      phone: member.phone ?? "",
      role: "trainer",
      branchIds: member.branchIds,
    },
  });

  const submit = form.handleSubmit(async ({ branchIds }) => {
    setFailure(null);
    try {
      await change.mutateAsync({
        kind: "branches",
        staffMemberId: member.id,
        branchIds,
      });
      onDone(`Guardamos las sucursales de ${member.name}.`);
    } catch (error) {
      const problem = staffProblem(error);
      if (problem.field === "branchIds") {
        form.setError("branchIds", { message: problem.message });
      } else {
        setFailure(problem.message);
      }
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          <p className="rounded-control border border-divisor bg-superficie px-3 py-2 text-ayuda text-texto-tenue">
            Solo administración invita y cambia roles. Puedes asignar las
            sucursales de una entrenadora.
          </p>
          <StaffContact member={member} />
          <FormField
            control={form.control}
            name="branchIds"
            render={({ field }) => <BranchChips field={field} />}
          />
          {failure !== null ? (
            <p role="alert" className="text-ayuda text-alerta">
              {failure}
            </p>
          ) : null}
        </SidePanelBody>
        <SidePanelFooter>
          <Button type="submit" disabled={change.isPending}>
            Guardar
          </Button>
        </SidePanelFooter>
      </form>
    </Form>
  );
}
