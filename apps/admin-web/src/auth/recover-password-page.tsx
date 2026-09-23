import { zodResolver } from "@hookform/resolvers/zod";
import { requestPasswordRecovery } from "@pilates/api-contracts";
import { CircleCheck } from "lucide-react";
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
import { emailField } from "./auth-fields";
import { AuthLayout } from "./auth-layout";
import { BackToLoginLink } from "./back-to-login-link";
import { ThrottledNotice } from "./throttled-notice";
import { useCountdown } from "./use-countdown";

const recoverySchema = z.object({ email: emailField });
type RecoveryValues = z.infer<typeof recoverySchema>;

function SentState() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <CircleCheck
        size={40}
        strokeWidth={1.4}
        className="text-exito"
        aria-hidden="true"
      />
      <h1 className="font-serif text-titulo-2 text-texto">Revisa tu correo</h1>
      <p className="text-cuerpo text-texto-secundario">
        Si el correo corresponde a una cuenta, te enviamos un enlace para
        restablecer tu contraseña.
      </p>
      <p className="text-nota text-texto-tenue">
        El enlace vence en 30 minutos.
      </p>
      <BackToLoginLink />
    </div>
  );
}

// AW30: the response stays neutral (ADR-0029); only a broader client or
// network limit answers with a wait, and that wait comes from the server.
export function RecoverPasswordPage() {
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const [waitSeconds, startWait] = useCountdown();
  const form = useForm<RecoveryValues>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { email: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    setFailed(false);
    try {
      await requestPasswordRecovery(values, undefined, adminFetch);
      setSent(true);
    } catch (error) {
      if (isApiError(error) && error.status === 429) {
        startWait(error.problem.retryAfterSeconds ?? 60);
      } else {
        setFailed(true);
      }
    }
  });

  if (sent) {
    return (
      <AuthLayout>
        <SentState />
      </AuthLayout>
    );
  }

  const throttled = waitSeconds > 0;

  return (
    <AuthLayout>
      <h1 className="sr-only">Recuperar contraseña</h1>
      <p className="text-center text-cuerpo text-texto-secundario">
        Te enviaremos un enlace para restablecer tu contraseña.
      </p>
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
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {throttled ? <ThrottledNotice seconds={waitSeconds} /> : null}
          {!throttled && failed ? (
            <p role="alert" className="text-nota text-error-texto">
              No pudimos enviar el enlace. Inténtalo de nuevo en unos minutos.
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            disabled={throttled || form.formState.isSubmitting}
          >
            Enviar enlace
          </Button>
          <BackToLoginLink />
        </form>
      </Form>
    </AuthLayout>
  );
}
