import type { StaffMemberDto } from "@pilates/api-contracts";
import { useId, useState } from "react";
import { isApiError } from "../../api/problem";
import { formatWait, useCountdown } from "../../auth/use-countdown";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { StatusPill } from "../../components/ui/status-pill";
import { boliviaParts, formatCivilDate } from "../../lib/bolivia-time";
import { staffProblem } from "./staff-problems";
import { useStaffChange } from "./staff-queries";

type Result = { ok: true; message: string } | { ok: false; message: string };

// AW24 «Reenvío limitado»: the recipient lane is full; the current link works.
const limitedMessage =
  "Ya enviamos un correo a esa dirección hace poco. El enlace vigente sigue sirviendo.";

/**
 * AW24's pending invitation (follow-ups 35–36, WEB-012): the address with
 * «Cambiar correo», the two lifetimes apart, «Reenviar enlace», and the
 * server's wait when the recipient lane is full.
 */
export function PendingInvitation({ member }: { member: StaffMemberDto }) {
  const change = useStaffChange();
  const fieldId = useId();
  const [email, setEmail] = useState(member.email);
  const [expiresAt, setExpiresAt] = useState(member.activationExpiresAt);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(member.email);
  const [result, setResult] = useState<Result | null>(null);
  const [waitSeconds, startWait] = useCountdown();

  const run = async (
    work: () => Promise<StaffMemberDto>,
    sentTo: (updated: StaffMemberDto) => string,
  ) => {
    setResult(null);
    try {
      const updated = await work();
      setEmail(updated.email);
      setExpiresAt(updated.activationExpiresAt);
      setEditing(false);
      setResult({
        ok: true,
        message: `Enviamos un enlace nuevo a ${sentTo(updated)}.`,
      });
    } catch (error) {
      if (isApiError(error) && error.code === "email_throttled") {
        startWait(error.problem.retryAfterSeconds ?? 0);
        setResult({ ok: false, message: limitedMessage });
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
    <section className="flex flex-col items-start gap-2 rounded-control border border-advertencia/40 bg-advertencia/10 px-3 py-3">
      <StatusPill tone="advertencia">Pendiente de activación</StatusPill>
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
          <p className="text-ayuda text-texto-tenue">
            {`Los enlaces enviados a ${email} dejarán de funcionar; enviaremos uno nuevo de 7 días.`}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={change.isPending}
              onClick={() => void correct()}
            >
              Guardar correo
            </Button>
            <Button variant="link" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <p className="flex flex-wrap items-baseline gap-x-3 text-nota text-texto">
          {email}
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
        </p>
      )}
      <p className="text-ayuda text-advertencia-texto">
        {expiresAt === null || expiresAt === undefined
          ? "El último enlace ya no es válido; envía uno nuevo."
          : `El enlace vence el ${formatCivilDate(boliviaParts(expiresAt).date)}.`}
      </p>
      <p className="text-ayuda text-texto-tenue">
        Si no activa su cuenta en 30 días desde el último envío o cambio, la
        invitación se elimina. Es distinto de los 7 días de cada enlace.
      </p>
      {editing ? null : (
        <Button
          variant="secondary"
          size="sm"
          disabled={change.isPending || waitSeconds > 0}
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
        <p
          role="alert"
          className={
            result.message === limitedMessage
              ? "text-ayuda text-texto"
              : "text-ayuda text-error-texto"
          }
        >
          {result.message}
        </p>
      )}
      {waitSeconds > 0 ? (
        <p className="text-ayuda tabular text-texto-secundario">
          {`Podrás reenviarlo en ${formatWait(waitSeconds)}.`}
        </p>
      ) : null}
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
