import { useState } from "react";

import { ConfirmationSheet } from "../ui/confirmation-sheet";

/** «¿Cerrar sesión?» under Perfil in both apps (18, S23), as the confirmation sheet (UX-002). */
export function LogoutConfirmationSheet({
  logout,
  onDismiss,
  visible,
}: {
  logout: () => Promise<void>;
  onDismiss: () => void;
  visible: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
    }
  };
  return (
    <ConfirmationSheet
      busy={busy}
      confirmLabel="Cerrar sesión"
      confirmTestID="logout-confirm"
      dismissLabel="Cancelar"
      note="Vuelves al inicio de sesión y tendrás que entrar de nuevo con tu correo y contraseña."
      onConfirm={() => void confirm()}
      onDismiss={onDismiss}
      testID="logout-sheet"
      title="¿Cerrar sesión?"
      visible={visible}
    />
  );
}
