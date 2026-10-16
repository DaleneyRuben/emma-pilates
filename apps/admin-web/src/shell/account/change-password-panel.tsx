import { zodResolver } from "@hookform/resolvers/zod";
import { changeCurrentAccountPassword } from "@pilates/api-contracts";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { adminFetch } from "../../api/fetcher";
import { isApiError } from "../../api/problem";
import {
  newPasswordField,
  withMatchingConfirmation,
} from "../../auth/password-fields";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/form/form";
import { Button } from "../../components/ui/button";
import { PasswordInput } from "../../components/ui/password-input";
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";

const changePasswordSchema = withMatchingConfirmation(
  z.object({
    currentPassword: z.string().min(1),
    newPassword: newPasswordField,
    confirmPassword: z.string().min(1),
  }),
);

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

const fields = [
  ["currentPassword", "Contraseña actual", "current-password"],
  ["newPassword", "Contraseña nueva", "new-password"],
  ["confirmPassword", "Confirmar contraseña", "new-password"],
] as const;

// AW33 frame 2: the signed-in change keeps this session and the backend
// revokes every other one (ADR-0030). It is not the reset flow.
export function ChangePasswordPanel({ narrow }: { narrow: boolean }) {
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });
  const { isSubmitting, isValid } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setFailed(false);
    try {
      await changeCurrentAccountPassword(
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
        undefined,
        adminFetch,
      );
      setSaved(true);
    } catch (error) {
      if (isApiError(error) && error.code === "current_password_incorrect") {
        form.setError("currentPassword", {
          message: "La contraseña actual no es correcta.",
        });
      } else {
        setFailed(true);
      }
    }
  });

  return (
    <SheetContent
      side={narrow ? "full" : "right"}
      data-presentation={narrow ? "full-screen" : "side-panel"}
    >
      <SheetHeader className="pr-12">
        <SheetTitle>Cambiar contraseña</SheetTitle>
        <SheetDescription>
          Tu sesión seguirá abierta en este navegador.
        </SheetDescription>
      </SheetHeader>
      {saved ? (
        <p role="status" className="px-5 py-4 text-cuerpo text-exito-texto">
          Tu contraseña se actualizó. Cerramos tus otras sesiones abiertas.
        </p>
      ) : (
        <Form {...form}>
          <form
            onSubmit={submit}
            noValidate
            className="flex flex-1 flex-col justify-between"
          >
            <div className="flex flex-col gap-4 px-5 py-4">
              {fields.map(([name, label, autoComplete]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete={autoComplete} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              {failed ? (
                <p role="alert" className="text-nota text-error-texto">
                  No pudimos guardar la contraseña. Inténtalo de nuevo.
                </p>
              ) : null}
            </div>
            <div className="border-t border-borde px-5 py-4">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={!isValid}
                busy={isSubmitting}
              >
                Guardar contraseña
              </Button>
            </div>
          </form>
        </Form>
      )}
    </SheetContent>
  );
}
