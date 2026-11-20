import {
  closeAdminClientAccount,
  getListAdminClientsQueryKey,
  type AdminClientDetailDto,
} from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { adminFetch } from "../../api/fetcher";
import { isApiError } from "../../api/problem";
import { ActionRow } from "../../components/panel/action-rows";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { InlineError } from "../../components/ui/inline-error";
import { TextLink } from "../../components/ui/text-link";
import { describeClosureForAdministrator } from "./close-client-account-lines";

type Outcome = "refused" | "failed" | null;

// BE-007 G2: the Administrator closes a Client's Account from AW22 after
// reading what it does; a pending transfer blocks it (G3).
export function CloseClientAccountAction({
  client,
  onClosed,
}: {
  client: AdminClientDetailDto;
  onClosed: (notice: string) => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const close = useMutation({
    mutationFn: () => closeAdminClientAccount(client.id, undefined, adminFetch),
  });
  const refused =
    outcome === "refused" || client.closure.transferPaymentPending;

  const confirm = async () => {
    setOutcome(null);
    try {
      await close.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: getListAdminClientsQueryKey(),
      });
      setOpen(false);
      onClosed(`Cuenta de ${client.name} cerrada.`);
    } catch (error) {
      setOutcome(
        isApiError(error) && error.code === "closure_payment_pending"
          ? "refused"
          : "failed",
      );
    }
  };

  return (
    <ActionRow
      label="Cerrar cuenta"
      onClick={() => {
        setOutcome(null);
        setOpen(true);
      }}
    >
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`¿Cerrar la cuenta de ${client.name}?`}
        confirmLabel="Cerrar cuenta"
        busy={close.isPending}
        pending={refused}
        onConfirm={() => void confirm()}
      >
        <ul className="flex list-disc flex-col gap-1.5 pl-4 text-texto">
          {describeClosureForAdministrator(client).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="tipo-titulo-fila text-texto">
          Esta acción no se puede deshacer.
        </p>
        {refused ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-1.5 rounded-[16px] bg-aviso px-[18px] py-3.5 tipo-titulo-fila text-texto inset-ring-[1.5px] inset-ring-borde-fuerte"
          >
            <span>
              No se puede cerrar todavía: tiene un pago por QR en revisión.
              Confírmalo o recházalo en Pagos y vuelve a intentarlo.
            </span>
            <TextLink asChild>
              <Link to="/dinero/pagos">Ir a Pagos</Link>
            </TextLink>
          </div>
        ) : null}
        {outcome === "failed" ? (
          <InlineError>
            No pudimos cerrar la cuenta. Inténtalo de nuevo.
          </InlineError>
        ) : null}
      </ConfirmDialog>
    </ActionRow>
  );
}
