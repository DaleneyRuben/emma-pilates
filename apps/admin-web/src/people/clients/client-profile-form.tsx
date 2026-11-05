import { zodResolver } from "@hookform/resolvers/zod";
import {
  getGetAdminClientQueryKey,
  getListAdminClientsQueryKey,
  updateAdminClientProfile,
  type AdminClientDetailDto,
} from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { adminFetch } from "../../api/fetcher";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/form/form";
import { PhoneFormField } from "../../components/form/phone-field";
import { phoneValue, requiredPhone } from "../../components/form/phone-value";
import { SummaryBlock, SummaryRow } from "../../components/panel/summary-rows";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribe el nombre de la clienta.")
    .max(100, "Usa como máximo 100 caracteres."),
  phone: requiredPhone,
});

type ProfileInput = z.input<typeof profileSchema>;
type ProfileValues = z.output<typeof profileSchema>;

// IDN-009 (follow-up 156): the Administrator and the Coordinator correct a
// Client's name and phone in place; the login email stays hers (IDN-008).
// FIX-037 (follow-up 236): the phone is the required «Celular» field.
export function ClientProfileForm({
  client,
  onCancel,
  onSaved,
}: {
  client: AdminClientDetailDto;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [failed, setFailed] = useState(false);
  const save = useMutation({
    mutationFn: async (values: ProfileValues) =>
      (
        await updateAdminClientProfile(
          client.id,
          {
            name: values.name,
            phone: values.phone,
          },
          undefined,
          adminFetch,
        )
      ).data as AdminClientDetailDto,
  });
  const form = useForm<ProfileInput, unknown, ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: client.name, phone: phoneValue(client.phone) },
  });

  const submit = form.handleSubmit(async (values) => {
    setFailed(false);
    try {
      const updated = await save.mutateAsync(values);
      queryClient.setQueryData(getGetAdminClientQueryKey(client.id), updated);
      await queryClient.invalidateQueries({
        queryKey: getListAdminClientsQueryKey(),
      });
      onSaved();
    } catch {
      setFailed(true);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <PhoneFormField control={form.control} name="phone" />
        <SummaryBlock title="Correo">
          <SummaryRow label="Correo">{client.email}</SummaryRow>
          <p className="px-3 py-2 text-ayuda text-texto-tenue">
            La clienta cambia su correo desde su app.
          </p>
        </SummaryBlock>
        {failed ? (
          <p role="alert" className="text-nota text-error-texto">
            No pudimos guardar los cambios. Inténtalo de nuevo.
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="button" variant="neutral" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" busy={save.isPending}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Form>
  );
}
