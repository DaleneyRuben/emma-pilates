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
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
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
    <>
      <Button
        variant="destructive"
        size="sm"
        className="self-start"
        onClick={() => {
          setOutcome(null);
          setOpen(true);
        }}
      >
        Cerrar cuenta
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`¿Cerrar la cuenta de ${client.name}?`}
        confirmLabel="Cerrar cuenta"
        pending={close.isPending || refused}
        onConfirm={() => void confirm()}
      >
        <ul className="flex list-disc flex-col gap-1.5 pl-4 text-texto">
          {describeClosureForAdministrator(client).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="font-medium text-texto">
          Esta acción no se puede deshacer.
        </p>
        {refused ? (
          <div
            role="alert"
            className="flex flex-col gap-1 rounded-control bg-error/10 px-3 py-2 text-error-texto"
          >
            <span>
              No se puede cerrar todavía: tiene un pago por transferencia en
              revisión. Confírmalo o recházalo en Pagos y vuelve a intentarlo.
            </span>
            <Link to="/back-office/pagos" className="font-medium text-primario">
              Ir a Pagos
            </Link>
          </div>
        ) : null}
        {outcome === "failed" ? (
          <p role="alert" className="text-error-texto">
            No pudimos cerrar la cuenta. Inténtalo de nuevo.
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
