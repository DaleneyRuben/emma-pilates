import type { StaffProfileDto } from "@pilates/api-contracts";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { useLogout } from "./use-logout";

// Same label the Staff app's Perfil uses (S23): a role, not a status pill.
const roleLabel = "Administración";

const rowClass =
  "flex h-9 w-full items-center px-4 text-left text-fila-menu hover:bg-hover-fila focus-visible:bg-hover-fila focus-visible:shadow-none";

function LogoutConfirmation({ onCancel }: { onCancel: () => void }) {
  const { logout, failed, pending } = useLogout();

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="font-medium text-texto">¿Cerrar sesión?</p>
      <p className="text-ayuda text-texto-tenue">
        Se descartará cualquier panel sin guardar.
      </p>
      {failed ? (
        <p role="alert" className="text-ayuda text-error-texto">
          No pudimos cerrar la sesión. Inténtalo de nuevo.
        </p>
      ) : null}
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => void logout()}
      >
        Cerrar sesión
      </Button>
      <Button
        variant="link"
        size="sm"
        className="self-center"
        onClick={onCancel}
      >
        Cancelar
      </Button>
    </div>
  );
}

// AW33: header with the Administrator, then two rows; "Cerrar sesión" only
// carries the Error tone on its text and asks before logging out.
export function AccountMenu({
  profile,
  onChangePassword,
}: {
  profile: StaffProfileDto | undefined;
  onChangePassword: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return <LogoutConfirmation onCancel={() => setConfirming(false)} />;
  }

  return (
    <div className="flex flex-col py-2">
      <div className="flex flex-col gap-0.5 px-4 pt-1 pb-3">
        <span className="text-[14px] font-medium text-texto">
          {profile?.name ?? ""}
        </span>
        <span className="text-ayuda text-texto-muy-tenue">
          {profile?.email ?? ""}
        </span>
        <span className="pt-1 text-ayuda text-texto-tenue">{roleLabel}</span>
      </div>
      <Separator />
      <div className="flex flex-col pt-2">
        <button
          type="button"
          className={`${rowClass} text-texto`}
          onClick={onChangePassword}
        >
          Cambiar contraseña
        </button>
        <button
          type="button"
          className={`${rowClass} text-error hover:text-error-texto`}
          onClick={() => setConfirming(true)}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
