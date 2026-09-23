import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/form/form";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { newPasswordField, withMatchingConfirmation } from "./password-fields";

const createPasswordSchema = withMatchingConfirmation(
  z.object({
    newPassword: newPasswordField,
    confirmPassword: z.string().min(1),
  }),
);

type CreatePasswordValues = z.infer<typeof createPasswordSchema>;

export function CreatePasswordForm({
  failed,
  onSubmit,
}: {
  failed: boolean;
  onSubmit: (password: string) => Promise<void>;
}) {
  const form = useForm<CreatePasswordValues>({
    resolver: zodResolver(createPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
    mode: "onChange",
  });
  const { isSubmitting, isValid } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values.newPassword);
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña nueva</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar contraseña</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {failed ? (
          <p role="alert" className="text-nota text-error-texto">
            No pudimos guardar la contraseña. Inténtalo de nuevo en unos
            minutos.
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={!isValid || isSubmitting}>
          Guardar contraseña
        </Button>
      </form>
    </Form>
  );
}
