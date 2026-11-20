import type { StaffProfileDto } from "@pilates/api-contracts";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { InlineError } from "../../components/ui/inline-error";
import { Separator } from "../../components/ui/separator";
import { cn } from "../../lib/cn";
import { roleLabelOf } from "./role-label";
import { useLogout } from "./use-logout";

const rowClass =
  "flex h-9 w-full items-center px-4 text-left tipo-compacto hover:bg-superficie-hundida focus-visible:bg-superficie-hundida focus-visible:shadow-none";

function LogoutConfirmation({ onCancel }: { onCancel: () => void }) {
  const { logout, failed, pending } = useLogout();

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="tipo-titulo-fila text-texto">¿Cerrar sesión?</p>
      <p className="tipo-compacto text-texto">
        Se descartará cualquier panel sin guardar.
      </p>
      {failed ? (
        <InlineError>
          No pudimos cerrar la sesión. Inténtalo de nuevo.
        </InlineError>
      ) : null}
      <Button
        variant="destructive"
        size="sm"
        busy={pending}
        onClick={() => void logout()}
      >
        Cerrar sesión
      </Button>
      <Button
        variant="link"
        size="sm"
        className="self-center"
        // The row that opened this is gone; focus lands on the way back.
        autoFocus
        onClick={onCancel}
      >
        Cancelar
      </Button>
    </div>
  );
}

// AW33: header with the Administrator, then its rows; "Cerrar sesión" only
// carries the Error tone on its text and asks before logging out. Follow-up
// 232 keeps only these two rows (Reglas del estudio moved to Ajustes).
export function AccountMenu({
  profile,
  onChangePassword,
}: {
  profile: StaffProfileDto | undefined;
  onChangePassword: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  if (confirming) {
    return (
      <LogoutConfirmation
        onCancel={() => {
          setConfirming(false);
          setCancelled(true);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col py-2">
      <div className="flex flex-col gap-0.5 px-4 pt-1 pb-3">
        <span className="tipo-titulo-fila text-texto">
          {profile?.name ?? ""}
        </span>
        <span className="tipo-secundario text-texto">
          {profile?.email ?? ""}
        </span>
        <span className="pt-1 tipo-secundario text-texto">
          {roleLabelOf(profile)}
        </span>
      </div>
      <Separator />
      <div className="flex flex-col pt-2">
        <button
          type="button"
          className={cn(rowClass, "text-texto")}
          onClick={onChangePassword}
        >
          Cambiar contraseña
        </button>
        <button
          type="button"
          className={cn(rowClass, "text-texto")}
          // Back from the confirmation, focus returns to the row it left.
          autoFocus={cancelled}
          onClick={() => setConfirming(true)}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
