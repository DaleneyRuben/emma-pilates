import type { StaffMemberDto } from "@pilates/api-contracts";
import { useId, useState } from "react";
import { isApiError } from "../../api/problem";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { StatusPill } from "../../components/ui/status-pill";
import { boliviaParts, formatCivilDate } from "../../lib/bolivia-time";
import { cn } from "../../lib/cn";
import type { EmailLimit } from "./use-email-limit";
import { isAccountEmailLimit, staffProblem } from "./staff-problems";
import { useStaffChange } from "./staff-queries";

type Result = { ok: true; message: string } | { ok: false; message: string };

// AW24 draws the card's actions as full-width 40 px white buttons whose
// disabled state keeps the white fill under a disabled-tone border.
const cardButton =
  "h-[40px] w-full bg-blanco text-fila-menu hover:text-primario disabled:border-deshabilitado disabled:bg-blanco";

/**
 * AW24's pending invitation (follow-ups 35–36, WEB-012): the address with
 * «Cambiar correo», the two lifetimes apart, and «Reenviar enlace»; the
 * panel draws the server's wait (`limit`) above the contact rows.
 */
export function PendingInvitation({
  limit,
  member,
}: {
  limit: EmailLimit;
  member: StaffMemberDto;
}) {
  const change = useStaffChange();
  const fieldId = useId();
  const [email, setEmail] = useState(member.email);
  const [expiresAt, setExpiresAt] = useState(member.activationExpiresAt);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(member.email);
  const [result, setResult] = useState<Result | null>(null);
  const waiting = limit.seconds > 0;
  const accountWaiting = waiting && limit.lane === "account";

  const run = async (
    work: () => Promise<StaffMemberDto>,
    sentTo: (updated: StaffMemberDto) => string,
  ) => {
    setResult(null);
    try {
      const updated = await work();
      // A new address has its own recipient lane: the old wait no longer applies.
      limit.start(limit.lane, 0);
      setEmail(updated.email);
      setExpiresAt(updated.activationExpiresAt);
      setEditing(false);
      setResult({
        ok: true,
        message: `Enviamos un enlace nuevo a ${sentTo(updated)}.`,
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
      setResult({ ok: false, message: staffProblem(error).message });
    }
  };

  const resend = () =>
    run(
      () => change.mutateAsync({ kind: "resend", staffMemberId: member.id }),
      (updated) => updated.email,
    );

  const correct = () =>
    run(
      () =>
        change.mutateAsync({
          kind: "correctEmail",
          staffMemberId: member.id,
          email: draft.trim(),
        }),
      (updated) => updated.email,
    );

  return (
    <section className="flex flex-col gap-2.5 rounded-panel border border-borde bg-superficie-sutil p-3.5">
      <div>
        <StatusPill tone="advertencia">Pendiente de activación</StatusPill>
      </div>
      {editing ? (
        <div className="flex w-full flex-col gap-2">
          <Label htmlFor={fieldId}>Nuevo correo</Label>
          <Input
            id={fieldId}
            type="email"
            autoComplete="email"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <p className="text-ayuda text-texto-muy-tenue">
            {`Los enlaces enviados a ${email} dejarán de funcionar; enviaremos uno nuevo de 7 días.`}
          </p>
          <div className="flex gap-2">
            <Button
              variant="neutral"
              className={cn(cardButton, "flex-1")}
              disabled={change.isPending || accountWaiting}
              onClick={() => void correct()}
            >
              Guardar correo
            </Button>
            <Button
              variant="neutral"
              className={cn(cardButton, "flex-1")}
              onClick={() => setEditing(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2.5">
          <span className="break-all text-fila-menu text-texto">{email}</span>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setDraft(email);
              setResult(null);
              setEditing(true);
            }}
          >
            Cambiar correo
          </Button>
        </div>
      )}
      <p className="text-[12.5px] leading-normal text-texto-secundario">
        {expiresAt === null || expiresAt === undefined
          ? "El último enlace ya no es válido; envía uno nuevo."
          : `El enlace vence el ${formatCivilDate(boliviaParts(expiresAt).date)}.`}
      </p>
      <p className="text-ayuda text-texto-muy-tenue">
        Si no activa su cuenta en 30 días desde el último envío o cambio, la
        invitación se elimina. Es distinto de los 7 días de cada enlace.
      </p>
      {editing ? null : (
        <Button
          variant="neutral"
          className={cardButton}
          disabled={change.isPending || waiting}
          onClick={() => void resend()}
        >
          Reenviar enlace
        </Button>
      )}
      {result === null ? null : result.ok ? (
        <p role="status" className="text-ayuda text-exito-texto">
          {result.message}
        </p>
      ) : (
        <p role="alert" className="text-ayuda text-error-texto">
          {result.message}
        </p>
      )}
    </section>
  );
}

/** AW24 «Cancelar invitación»: not a deactivation, only before activating. */
export function CancelInvitationAction({
  member,
  onDone,
  onFailure,
}: {
  member: StaffMemberDto;
  onDone: (notice: string) => void;
  onFailure: (message: string) => void;
}) {
  const change = useStaffChange();
  const [confirming, setConfirming] = useState(false);

  const cancel = async () => {
    try {
      await change.mutateAsync({
        kind: "cancelInvitation",
        staffMemberId: member.id,
      });
      setConfirming(false);
      onDone(`Cancelamos la invitación de ${member.name}.`);
    } catch (error) {
      setConfirming(false);
      onFailure(staffProblem(error).message);
    }
  };

  return (
    <>
      <Button
        variant="link"
        className="self-center text-error hover:text-error-texto"
        onClick={() => setConfirming(true)}
      >
        Cancelar invitación
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`¿Cancelar la invitación de ${member.name}?`}
        confirmLabel="Sí, cancelar invitación"
        pending={change.isPending}
        onConfirm={() => void cancel()}
      >
        <p>
          Se anularán los enlaces enviados, se liberará el correo y el miembro
          pendiente dejará de aparecer en Personal. Esto no desactiva a nadie
          que ya haya activado su cuenta.
        </p>
      </ConfirmDialog>
    </>
  );
}
