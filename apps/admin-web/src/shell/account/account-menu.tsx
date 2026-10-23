import type { StaffProfileDto } from "@pilates/api-contracts";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { cn } from "../../lib/cn";
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
// carries the Error tone on its text and asks before logging out.
export function AccountMenu({
  profile,
  onChangePassword,
  onNavigate,
}: {
  profile: StaffProfileDto | undefined;
  onChangePassword: () => void;
  onNavigate: () => void;
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
        <span className="text-celda font-medium text-texto">
          {profile?.name ?? ""}
        </span>
        <span className="text-ayuda text-texto-muy-tenue">
          {profile?.email ?? ""}
        </span>
        <span className="pt-1 text-ayuda text-texto-tenue">{roleLabel}</span>
      </div>
      <Separator />
      <div className="flex flex-col pt-2">
        {/* AW36 (BKM-004): the studio's rules live with the account, not
            in the sidebar every page draws (follow-up 130). */}
        <Link
          to="/reglas-del-estudio"
          className={cn(rowClass, "text-texto")}
          onClick={onNavigate}
        >
          Reglas del estudio
        </Link>
        <button
          type="button"
          className={cn(rowClass, "text-texto")}
          onClick={onChangePassword}
        >
          Cambiar contraseña
        </button>
        <button
          type="button"
          className={cn(rowClass, "text-error hover:text-error-texto")}
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
