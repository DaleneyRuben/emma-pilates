import {
  getGetAdminClientQueryKey,
  getListAdminClientsQueryKey,
  grantCourtesyAccess,
  type AdminClientDetailDto,
} from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { adminFetch } from "../../api/fetcher";
import {
  idempotencyHeaders,
  useIdempotencyKey,
} from "../../api/idempotency-key";
import { isApiError } from "../../api/problem";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { addDays, boliviaToday, formatCivilDate } from "../../lib/bolivia-time";

const refusals: Record<string, string> = {
  subscription_not_expired:
    "Ya tiene un plan en uso. Puedes darle acceso de prueba cuando termine.",
  payment_pending_exists:
    "Tiene un pago por transferencia en revisión. Confírmalo o recházalo en Pagos y vuelve a intentarlo.",
  purchase_intent_open_exists:
    "Tiene una compra por transferencia sin terminar. Vuelve a intentarlo cuando venza.",
  courtesy_end_date_invalid: "Elige una fecha entre hoy y un año desde hoy.",
};
const failure = "No pudimos dar el acceso. Inténtalo de nuevo.";

// REL-011 (follow-up 160): the Administrator gives a closed-test tester or a
// store reviewer the hidden Bs 0 «Acceso de prueba» Plan of 16 classes until
// a chosen date. Only offered while the Client has no active Plan.
export function CourtesyAccessAction({
  client,
  onGranted,
}: {
  client: AdminClientDetailDto;
  onGranted: (notice: string) => void;
}) {
  const queryClient = useQueryClient();
  const keyFor = useIdempotencyKey();
  const dateId = useId();
  const [open, setOpen] = useState(false);
  const [endsOn, setEndsOn] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const today = boliviaToday();
  const latest = addDays(today, 365);
  const valid = endsOn !== "" && endsOn >= today && endsOn <= latest;
  const grant = useMutation({
    mutationFn: (body: { endsOn: string }) =>
      grantCourtesyAccess(
        client.id,
        body,
        idempotencyHeaders(keyFor({ clientId: client.id, ...body })),
        adminFetch,
      ),
  });

  const confirm = async () => {
    setProblem(null);
    try {
      await grant.mutateAsync({ endsOn });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getGetAdminClientQueryKey(client.id),
        }),
        queryClient.invalidateQueries({
          queryKey: getListAdminClientsQueryKey(),
        }),
      ]);
      setOpen(false);
      onGranted(`Acceso de prueba activo hasta el ${formatCivilDate(endsOn)}.`);
    } catch (error) {
      setProblem(
        (isApiError(error) ? refusals[error.code] : undefined) ?? failure,
      );
    }
  };

  return (
    <>
      <Button
        variant="neutral"
        size="sm"
        onClick={() => {
          setEndsOn(addDays(boliviaToday(), 30));
          setProblem(null);
          setOpen(true);
        }}
      >
        Acceso de prueba
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`¿Dar acceso de prueba a ${client.name}?`}
        confirmLabel="Dar acceso"
        tone="primary"
        busy={grant.isPending}
        pending={!valid}
        onConfirm={() => void confirm()}
      >
        <p>
          Recibe el plan «Acceso de prueba»: 16 clases sin costo, desde hoy
          hasta la fecha que elijas. Es para las testers de la prueba cerrada y
          las cuentas de revisión de las tiendas; no cuenta como ingreso.
        </p>
        <div className="flex flex-col gap-1.5 pt-1">
          <Label htmlFor={dateId}>Válido hasta</Label>
          <Input
            id={dateId}
            type="date"
            min={today}
            max={latest}
            value={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
          />
        </div>
        {problem === null ? null : (
          <div
            role="alert"
            className="flex flex-col gap-1 rounded-control bg-error/10 px-3 py-2 text-error-texto"
          >
            <span>{problem}</span>
            {problem === refusals.payment_pending_exists ? (
              <Link
                to="/back-office/pagos"
                className="font-medium text-primario"
              >
                Ir a Pagos
              </Link>
            ) : null}
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}
