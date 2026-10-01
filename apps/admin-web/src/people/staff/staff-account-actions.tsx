import type { StaffMemberDto } from "@pilates/api-contracts";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { staffProblem } from "./staff-problems";
import { useStaffChange } from "./staff-queries";

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
