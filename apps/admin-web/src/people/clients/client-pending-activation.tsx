import {
  type ClientInvitationDto,
  formatListDate,
  getClientInvitation,
  getGetClientInvitationQueryKey,
  resendClientInvitation,
} from "@pilates/api-contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3 } from "lucide-react";
import { useState } from "react";
import { adminFetch } from "../../api/fetcher";
import { isApiError } from "../../api/problem";
import { fieldMessageClass } from "../../components/form/form";
import { avisoClass } from "../../components/ui/aviso";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/cn";
import { EmailLimitNotice } from "../staff/staff-email-limit";
import { isAccountEmailLimit } from "../staff/staff-problems";
import { useEmailLimit } from "../staff/use-email-limit";

type Result = { ok: boolean; message: string };

// Walkthrough finding 95, as in the Staff app: a lapsed link «venció».
const expiryLine = (expiresAt: string | null | undefined): string | null => {
  if (!expiresAt) return null;
  const verb = new Date(expiresAt).getTime() <= Date.now() ? "venció" : "vence";
  return `El enlace ${verb} el ${formatListDate(expiresAt)}.`;
};

/**
 * A staff-created Account still waiting for activation, drawn as a Rosa Emma
 * aviso with the Staff app's «Reenviar enlace» (S06). The resend is offered
 * only while her invitation can be read, so a self-registered Client
 * waiting for verification shows the notice alone.
 */
export function ClientPendingActivation({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const queryKey = getGetClientInvitationQueryKey(clientId);
  const invitation = useQuery({
    queryKey,
    queryFn: async ({ signal }) =>
      (await getClientInvitation(clientId, { signal }, adminFetch))
        .data as ClientInvitationDto,
    staleTime: 0,
  });
  const resend = useMutation({
    mutationFn: async () =>
      (await resendClientInvitation(clientId, undefined, adminFetch))
        .data as ClientInvitationDto,
  });
  const limit = useEmailLimit();
  const [result, setResult] = useState<Result | null>(null);

  const send = async () => {
    setResult(null);
    try {
      const renewed = await resend.mutateAsync();
      queryClient.setQueryData(queryKey, renewed);
      setResult({
        ok: true,
        message: "Enviamos un nuevo enlace de activación.",
      });
    } catch (error) {
      if (isAccountEmailLimit(error)) {
        limit.start("account", error.problem.retryAfterSeconds ?? 0);
        return;
      }
      if (isApiError(error) && error.code === "email_throttled") {
        limit.start("recipient", error.problem.retryAfterSeconds ?? 0);
        return;
      }
      setResult({
        ok: false,
        message:
          isApiError(error) && error.code === "client_invitation_not_found"
            ? "Ya activó su cuenta o la invitación ya no existe; vuelve a abrir la ficha."
            : "No pudimos reenviar el enlace. Inténtalo de nuevo.",
      });
    }
  };

  const expiry = expiryLine(invitation.data?.activationExpiresAt);
  // A 4xx means there is no invitation to follow up (a self-registered
  // Client, or one already activated); anything else can be read again.
  const unreadable =
    invitation.isError &&
    !(
      isApiError(invitation.error) &&
      invitation.error.status < 500 &&
      invitation.error.status > 0
    );

  return (
    <>
      <section className={cn(avisoClass, "flex items-start gap-3")}>
        <Clock3
          size={18}
          strokeWidth={1.4}
          className="mt-0.5 flex-none text-texto"
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="tipo-titulo-fila text-texto">
            Pendiente de activación
          </h3>
          <p className="tipo-secundario text-texto">
            Todavía no abrió el enlace del correo para crear su contraseña.
          </p>
          {expiry === null ? null : (
            <p className="tipo-secundario text-texto">{expiry}</p>
          )}
          {invitation.data === undefined ? null : (
            <Button
              variant="link"
              size="sm"
              className="h-auto self-start px-0"
              disabled={resend.isPending || limit.seconds > 0}
              busy={resend.isPending}
              onClick={() => void send()}
            >
              Reenviar enlace
            </Button>
          )}
          {unreadable ? (
            <div className="flex flex-wrap items-baseline gap-x-2">
              <p className="tipo-secundario text-texto">
                No pudimos comprobar su enlace de activación.
              </p>
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0"
                busy={invitation.isFetching}
                onClick={() => void invitation.refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : null}
          {result === null ? null : result.ok ? (
            <p role="status" className="tipo-secundario text-texto">
              {result.message}
            </p>
          ) : (
            <p role="alert" className={fieldMessageClass}>
              {result.message}
            </p>
          )}
        </div>
      </section>
      <EmailLimitNotice limit={limit} />
    </>
  );
}
