import type { LoginNotice, LoginSearch } from "./auth-search";
import { AuthLayout } from "./auth-layout";

const noticeText: Record<LoginNotice, string> = {
  "session-ended": "Tu sesión terminó. Vuelve a iniciar sesión.",
  activated: "Tu cuenta está activa. Inicia sesión con tu nueva contraseña.",
  "password-updated":
    "Tu contraseña se actualizó. Inicia sesión con la nueva contraseña.",
};

export function LoginPage({ search }: { search: LoginSearch }) {
  return (
    <AuthLayout>
      <h1 className="sr-only">Iniciar sesión</h1>
      {search.notice === undefined ? null : (
        <p
          role="status"
          className="rounded-control bg-superficie px-3 py-2 text-nota text-texto-secundario"
        >
          {noticeText[search.notice]}
        </p>
      )}
    </AuthLayout>
  );
}
