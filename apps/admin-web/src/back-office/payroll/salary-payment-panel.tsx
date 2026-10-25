import { zodResolver } from "@hookform/resolvers/zod";
import type { AdminSalaryPaymentDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useIdempotencyKey } from "../../api/idempotency-key";
import { CivilDateInput } from "../../components/form/civil-date-input";
import { pastCivilDateField } from "../../components/form/date-field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/form/form";
import {
  bolivianosField,
  bolivianosText,
} from "../../components/form/money-field";
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { formatBolivianos } from "../../lib/money";
import { backOfficeProblem } from "../back-office-problems";
import { staffOptionLabel } from "./payroll-format";
import {
  payrollStaffQueryOptions,
  useSalaryPaymentChange,
} from "./payroll-queries";

const salarySchema = z.object({
  staffMemberId: z.string().min(1, "Elige a quién le pagaste."),
  amountCentavos: bolivianosField({
    invalid: "Escribe un monto como 3.500,00.",
    zero: "El monto debe ser mayor a cero.",
  }),
  date: pastCivilDateField("Elige la fecha del pago."),
});
type SalaryInput = z.input<typeof salarySchema>;
type SalaryOutput = z.output<typeof salarySchema>;

// AW12: only that a payment happened (who, how much, when); how the amount
// was worked out stays outside the system (back-office/CONTEXT.md).
export function SalaryPaymentPanelForm({
  payment,
  onDone,
}: {
  payment: AdminSalaryPaymentDto | undefined;
  onDone: (notice?: string) => void;
}) {
  const staff = useQuery(payrollStaffQueryOptions());
  const change = useSalaryPaymentChange();
  const keyFor = useIdempotencyKey();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<SalaryInput, unknown, SalaryOutput>({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      staffMemberId: payment?.staffMemberId ?? "",
      amountCentavos:
        payment === undefined ? "" : bolivianosText(payment.amountCentavos),
      date: payment?.paidOn ?? "",
    },
  });

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    const input = {
      staffMemberId: values.staffMemberId,
      amountCentavos: values.amountCentavos,
      paidOn: values.date,
    };
    const name =
      staff.data?.find((member) => member.id === input.staffMemberId)?.name ??
      payment?.staffMemberName ??
      "";
    try {
      if (payment === undefined) {
        await change.mutateAsync({
          kind: "record",
          input,
          idempotencyKey: keyFor(input),
        });
        onDone(
          `Pago de ${formatBolivianos(input.amountCentavos)} a ${name} registrado.`,
        );
        return;
      }
      if (
        input.staffMemberId === payment.staffMemberId &&
        input.amountCentavos === payment.amountCentavos &&
        input.paidOn === payment.paidOn
      ) {
        onDone();
        return;
      }
      await change.mutateAsync({
        kind: "correct",
        salaryPaymentId: payment.id,
        input,
      });
      onDone(`Guardamos la corrección del pago de ${name}.`);
    } catch (error) {
      const problem = backOfficeProblem(error);
      if (problem.field === "staffMemberId" || problem.field === "date") {
        form.setError(problem.field, { message: problem.message });
      } else {
        setFailure(problem.message);
      }
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
        <SidePanelBody>
          <FormField
            control={form.control}
            name="staffMemberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empleado</FormLabel>
                <FormControl>
                  <Select {...field} disabled={!staff.isSuccess}>
                    <option value="">
                      {staff.isPending
                        ? "Cargando al personal…"
                        : staff.isError
                          ? "No pudimos cargar al personal"
                          : "Elige a una persona"}
                    </option>
                    {(staff.data ?? []).map((member) => (
                      <option key={member.id} value={member.id}>
                        {staffOptionLabel(member)}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amountCentavos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto</FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="3.500,00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <FormControl>
                  <CivilDateInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
        </SidePanelFooter>
      </form>
    </Form>
  );
}
