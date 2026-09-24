import type { StaffMemberDto } from "@pilates/api-contracts";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { StatusPill } from "../../components/ui/status-pill";
import { boliviaParts, formatCivilDate } from "../../lib/bolivia-time";
import { staffProblem } from "./staff-problems";
import { useStaffChange } from "./staff-queries";

// Follow-ups 35 and 38: a pending member's link can be sent again (7 days
// each, inside a 30-day window); a suppressed resend keeps the current link.
export function PendingActivation({ member }: { member: StaffMemberDto }) {
  const change = useStaffChange();
  const [expiresAt, setExpiresAt] = useState(member.activationExpiresAt);
  const [result, setResult] = useState<
    { ok: true } | { ok: false; message: string } | null
  >(null);

  const resend = async () => {
    setResult(null);
    try {
      const updated = await change.mutateAsync({
        kind: "resend",
        staffMemberId: member.id,
      });
      setExpiresAt(updated.activationExpiresAt);
      setResult({ ok: true });
    } catch (error) {
      setResult({ ok: false, message: staffProblem(error).message });
    }
  };

  return (
    <section className="flex flex-col items-start gap-2 rounded-control border border-advertencia/40 bg-advertencia/10 px-3 py-3">
      <StatusPill tone="advertencia">Pendiente de activación</StatusPill>
      <p className="text-ayuda text-advertencia-texto">
        {expiresAt === null || expiresAt === undefined
          ? "El último enlace ya no es válido; envía uno nuevo."
          : `El enlace vence el ${formatCivilDate(boliviaParts(expiresAt).date)}.`}
      </p>
      <p className="text-ayuda text-texto-tenue">
        Si no activa su cuenta en 30 días desde el último envío, la invitación
        se elimina.
      </p>
      <Button
        variant="secondary"
        size="sm"
        disabled={change.isPending}
        onClick={() => void resend()}
      >
        Reenviar enlace
      </Button>
      {result === null ? null : result.ok ? (
        <p role="status" className="text-ayuda text-exito-texto">
          Enviamos un enlace nuevo a {member.email}.
        </p>
      ) : (
        <p role="alert" className="text-ayuda text-error-texto">
          {result.message}
        </p>
      )}
    </section>
  );
}

// Deactivation disables the Account and revokes every Authentication
// Session (ADR-0030); it is destructive, so it asks first.
export function DeactivateAction({
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

  const deactivate = async () => {
    try {
      await change.mutateAsync({
        kind: "deactivate",
        staffMemberId: member.id,
      });
      setConfirming(false);
      onDone(`${member.name} ya no tiene acceso: cerramos todas sus sesiones.`);
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
        Desactivar cuenta
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`¿Desactivar a ${member.name}?`}
        confirmLabel="Desactivar"
        pending={change.isPending}
        onConfirm={() => void deactivate()}
      >
        <p>
          Cerramos todas sus sesiones y ya no podrá entrar. Su historial se
          conserva.
        </p>
      </ConfirmDialog>
    </>
  );
}
