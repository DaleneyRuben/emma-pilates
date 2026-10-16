import { zodResolver } from "@hookform/resolvers/zod";
import {
  createAdminWebAuthenticationSession,
  type CurrentAuthenticationPrincipalDto,
} from "@pilates/api-contracts";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { adminFetch } from "../api/fetcher";
import { isApiError } from "../api/problem";
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
import { PasswordInput } from "../components/ui/password-input";
import { useStartSession } from "../session/use-start-session";
import { emailField } from "./auth-fields";
import { ThrottledNotice } from "./throttled-notice";
import { useCountdown } from "./use-countdown";

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Escribe tu contraseña."),
});

type LoginValues = z.infer<typeof loginSchema>;
type Failure = "rejected" | "untrusted" | "unavailable" | null;

// ADR-0029: one neutral message for every rejected Login; the throttled
// state only follows the server's Retry-After (follow-up 37).
export function LoginForm({ redirect }: { redirect: string | undefined }) {
  const startSession = useStartSession();
  const [failure, setFailure] = useState<Failure>(null);
  const [waitSeconds, startWait] = useCountdown();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      const response = await createAdminWebAuthenticationSession(
        values,
        undefined,
        adminFetch,
      );
      await startSession(
        response.data as CurrentAuthenticationPrincipalDto,
        redirect,
      );
    } catch (error) {
      if (isApiError(error) && error.code === "login_throttled") {
        startWait(error.problem.retryAfterSeconds ?? 30);
      } else if (isApiError(error) && error.code === "authentication_failed") {
        setFailure("rejected");
      } else if (isApiError(error) && error.code === "untrusted_origin") {
        setFailure("untrusted");
      } else {
        setFailure("unavailable");
      }
    }
  });

  const throttled = waitSeconds > 0;

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo electrónico</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="username"
                  placeholder="tu@correo.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {throttled ? <ThrottledNotice seconds={waitSeconds} /> : null}
        {!throttled && failure === "rejected" ? (
          <p role="alert" className="text-nota text-error-texto">
            El correo o la contraseña no son correctos.
          </p>
        ) : null}
        {!throttled && failure === "untrusted" ? (
          <p role="alert" className="text-nota text-error-texto">
            No podemos iniciar sesión desde esta dirección. Abre el panel desde
            su enlace habitual.
          </p>
        ) : null}
        {!throttled && failure === "unavailable" ? (
          <p role="alert" className="text-nota text-error-texto">
            No pudimos iniciar sesión. Inténtalo de nuevo en unos minutos.
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          disabled={throttled || form.formState.isSubmitting}
        >
          Iniciar sesión
        </Button>
        <Link
          to="/recuperar-contrasena"
          className="self-center text-nota font-medium text-primario underline-offset-4 hover:text-primario-presionado hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </form>
    </Form>
  );
}
